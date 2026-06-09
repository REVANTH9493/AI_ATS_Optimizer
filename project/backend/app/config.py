import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "AI ATS Optimizer API"
    DEBUG: bool = True
    
    # CORS Origins
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",  # Next.js default port
        "http://localhost:5173",  # Vite default port
    ]
    
    # JWT Settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Google OAuth Settings
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv(
        "GOOGLE_REDIRECT_URI", 
        "http://localhost:8000/api/auth/google/callback"
    )
    
    # Database Settings
    DB_TYPE: str = os.getenv("DB_TYPE", "json")  # "json" or "supabase"
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

    # Hugging Face Settings
    HF_TOKEN: str = os.getenv("HF_TOKEN", "")
    HF_MODEL: str = "Qwen/Qwen2.5-7B-Instruct:together"

    # Gemini Settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")

    # Jina Reader API Settings
    JINA_API_KEY: str = os.getenv("JINA_API_KEY", "")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
