import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import auth, resume, applications, ats, exporter

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for AI ATS Optimizer",
    version="0.1.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)



# CORS Middleware Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(resume.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(ats.router, prefix="/api")
app.include_router(exporter.router, prefix="/api")

@app.get("/")
async def root():
    return {
        "message": f"Welcome to the {settings.APP_NAME}!",
        "status": "healthy",
        "version": "0.1.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
