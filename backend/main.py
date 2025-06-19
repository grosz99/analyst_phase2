"""
Main FastAPI application for Snowflake + Anthropic integration
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import logging
from dotenv import load_dotenv

from services.snowflake_service import SnowflakeDataService

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO').upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Snowflake Analytics API",
    description="API for data analysis using Snowflake and Anthropic AI",
    version="1.0.0"
)

# Configure CORS
cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
snowflake_service = SnowflakeDataService()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Snowflake Analytics API is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": os.getenv('APP_ENV', 'development')
    }

# Placeholder for future API endpoints
@app.get("/api/datasets")
async def list_datasets():
    """List available datasets - placeholder"""
    return {"message": "Dataset listing endpoint - to be implemented"}

@app.post("/api/datasets/load")
async def load_dataset():
    """Load dataset from Snowflake - placeholder"""
    return {"message": "Dataset loading endpoint - to be implemented"}

@app.post("/api/analysis")
async def analyze_data():
    """Analyze data using Anthropic AI - placeholder"""
    return {"message": "Analysis endpoint - to be implemented"}

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv('API_HOST', '0.0.0.0')
    port = int(os.getenv('API_PORT', 8000))
    reload = os.getenv('API_RELOAD', 'true').lower() == 'true'
    
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload
    )