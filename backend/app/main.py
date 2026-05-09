import sys
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.api_v1.api import api_router
from app.db.mongodb import connect_to_mongo, close_mongo_connection
import logging

# Ensure Unicode-safe console output on Windows
try:
    if sys.stdout.encoding is None or sys.stdout.encoding.lower() != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

try:
    if sys.stderr.encoding is None or sys.stderr.encoding.lower() != 'utf-8':
        sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title="ShedMaster",
    description="NEP 2020 compliant timetable generation for educational institutions with AI optimization",
    version="1.0.0",
    debug=True,
    lifespan=lifespan
)

# Custom validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"Validation error for {request.method} {request.url}")
    print(f"Request body: {await request.body()}")
    print(f"Validation errors: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "body": exc.body,
            "message": "Validation failed - check the required fields and data types"
        }
    )

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS if settings.ALLOWED_ORIGINS else ["*"],  # Use settings or allow all in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "ShedMaster",
        "description": "NEP 2020 compliant timetable generation for educational institutions",
        "version": "1.0.0",
        "features": [
            "Constraint-based timetable generation",
            "AI-powered optimization using Google Gemini",
            "Multi-format export (Excel, PDF, JSON)",
            "Faculty workload balancing",
            "Room assignment optimization",
            "NEP 2020 compliance"
        ],
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "AI Timetable Generator"}

@app.get("/test-cors")
async def test_cors():
    """Test CORS endpoint"""
    return {"message": "CORS is working", "timestamp": "2025-08-30"}

@app.post("/test-cors")
async def test_cors_post():
    """Test CORS POST endpoint"""
    return {"message": "CORS POST is working", "timestamp": "2025-08-30"}

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)
