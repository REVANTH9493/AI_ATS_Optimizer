from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
import httpx

from app.config import settings
from app.db import UserDB

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

# Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class GoogleAuthRequest(BaseModel):
    code: str
    mock: Optional[bool] = False

# Security Utilities
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": int(expire.timestamp())})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = UserDB.get_by_email(email)
    if user is None:
        raise credentials_exception
    return user

# Endpoints
@router.post("/register", response_model=TokenResponse)
async def register(user_in: UserRegister):
    existing_user = UserDB.get_by_email(user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    
    pwd_hash = hash_password(user_in.password)
    user = UserDB.create(
        email=user_in.email,
        password_hash=pwd_hash,
        name=user_in.name,
        provider="credentials"
    )
    
    access_token = create_access_token(data={"sub": user["email"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user["email"],
            "name": user["name"],
            "avatar": user["avatar"],
            "provider": user["provider"],
            "resume_url": user.get("resume_url")
        }
    }

@router.post("/login", response_model=TokenResponse)
async def login(user_in: UserLogin):
    user = UserDB.get_by_email(user_in.email)
    if not user or not user["password_hash"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    
    if not verify_password(user_in.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
        
    access_token = create_access_token(data={"sub": user["email"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user["email"],
            "name": user["name"],
            "avatar": user["avatar"],
            "provider": user["provider"],
            "resume_url": user.get("resume_url")
        }
    }

@router.get("/google/url")
async def get_google_oauth_url(mock: Optional[bool] = False):
    """
    Returns the Google OAuth redirect URL.
    If no client credentials are set, or if mock=True, it instructs the frontend
    to run in sandbox demo mode.
    """
    if mock or not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        return {
            "url": "http://localhost:3000/login?mock_google=true",
            "is_mock": True,
            "message": "Google Client Credentials not set. Running in development sandbox mode."
        }
        
    # Generate Google OAuth authorization URL
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?response_type=code"
        f"&client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
        f"&prompt=consent"
    )
    return {"url": auth_url, "is_mock": False}

@router.get("/google/callback")
async def google_callback(code: Optional[str] = None, mock: Optional[bool] = False):
    """
    Handles Google OAuth Callback code.
    If mock is True, it simulates google account verification for testing.
    """
    # 1. Mock Google Auth Flow (for local testing without client credentials)
    if mock or not code or not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        # Create a mock Google user
        email = "demo.google.user@example.com"
        name = "Google Demo User"
        avatar = "https://lh3.googleusercontent.com/a/default-user"
        
        user = UserDB.get_by_email(email)
        if not user:
            user = UserDB.create(
                email=email,
                password_hash=None,
                name=name,
                avatar=avatar,
                provider="google"
            )
            
        access_token = create_access_token(data={"sub": user["email"]})
        # Redirect to frontend callback route with token
        return RedirectResponse(
            url=f"http://localhost:3000/auth/callback?token={access_token}&email={user['email']}&name={user['name']}"
        )

    # 2. Real Google Auth Flow
    # Exchange authorization code for token
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    
    async with httpx.AsyncClient() as client:
        # Exchange code for access token
        token_response = await client.post(token_url, data=token_data)
        if token_response.status_code != 200:
            return RedirectResponse(
                url=f"http://localhost:3000/login?error=Failed+to+get+tokens+from+Google"
            )
        
        tokens = token_response.json()
        access_token_google = tokens.get("access_token")
        
        # Get user info using access token
        user_info_url = "https://openidconnect.googleapis.com/v1/userinfo"
        headers = {"Authorization": f"Bearer {access_token_google}"}
        user_info_response = await client.get(user_info_url, headers=headers)
        if user_info_response.status_code != 200:
            return RedirectResponse(
                url=f"http://localhost:3000/login?error=Failed+to+get+user+info+from+Google"
            )
            
        google_profile = user_info_response.json()
        email = google_profile.get("email")
        name = google_profile.get("name")
        avatar = google_profile.get("picture")
        
        if not email:
            return RedirectResponse(
                url=f"http://localhost:3000/login?error=Google+account+does+not+provide+email"
            )

        # Log in or register the user
        user = UserDB.get_by_email(email)
        if not user:
            user = UserDB.create(
                email=email,
                password_hash=None,
                name=name,
                avatar=avatar,
                provider="google"
            )
        else:
            # Update user info if name or avatar changed
            if name and user.get("name") != name or avatar and user.get("avatar") != avatar:
                user = UserDB.update_profile(
                    email,
                    {
                        "name": name or user.get("name"),
                        "avatar": avatar or user.get("avatar")
                    }
                )

        access_token = create_access_token(data={"sub": user["email"]})
        return RedirectResponse(
            url=f"http://localhost:3000/auth/callback?token={access_token}&email={user['email']}&name={user['name']}&resume_url={user.get('resume_url') or ''}"
        )

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    skills: Optional[list[str]] = None
    job_title: Optional[str] = None
    job_location: Optional[str] = None
    min_salary: Optional[float] = None

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "email": current_user["email"],
        "name": current_user.get("name"),
        "title": current_user.get("title"),
        "phone": current_user.get("phone"),
        "skills": current_user.get("skills", []),
        "job_title": current_user.get("job_title"),
        "job_location": current_user.get("job_location"),
        "min_salary": current_user.get("min_salary"),
        "avatar": current_user.get("avatar"),
        "provider": current_user.get("provider"),
        "resume_url": current_user.get("resume_url")
    }

@router.put("/profile")
async def update_profile(profile_in: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {}
    if profile_in.name is not None:
        update_data["name"] = profile_in.name
    if profile_in.title is not None:
        update_data["title"] = profile_in.title
    if profile_in.phone is not None:
        update_data["phone"] = profile_in.phone
    if profile_in.skills is not None:
        update_data["skills"] = profile_in.skills
    if profile_in.job_title is not None:
        update_data["job_title"] = profile_in.job_title
    if profile_in.job_location is not None:
        update_data["job_location"] = profile_in.job_location
    if profile_in.min_salary is not None:
        update_data["min_salary"] = profile_in.min_salary
        
    updated_user = UserDB.update_profile(current_user["email"], update_data)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found."
        )
    return {
        "status": "success",
        "user": {
            "email": updated_user["email"],
            "name": updated_user.get("name"),
            "title": updated_user.get("title"),
            "phone": updated_user.get("phone"),
            "skills": updated_user.get("skills", []),
            "job_title": updated_user.get("job_title"),
            "job_location": updated_user.get("job_location"),
            "min_salary": updated_user.get("min_salary"),
            "avatar": updated_user.get("avatar"),
            "provider": updated_user.get("provider"),
            "resume_url": updated_user.get("resume_url")
        }
    }

class ChangePasswordRequest(BaseModel):
    old_password: Optional[str] = None
    new_password: str

@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    user = UserDB.get_by_email(current_user["email"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
        
    # Check old password if a password exists
    if user.get("password_hash"):
        if not req.old_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Old password is required."
            )
        if not verify_password(req.old_password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect old password."
            )
            
    new_hash = hash_password(req.new_password)
    updated = UserDB.update_profile(user["email"], {"password_hash": new_hash})
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password in database."
        )
        
    return {"status": "success", "message": "Password changed successfully."}
