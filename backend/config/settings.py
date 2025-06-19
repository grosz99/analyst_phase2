"""
Application configuration settings
"""

import os
from typing import List
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """Application settings loaded from environment variables"""
    
    # Application
    APP_ENV: str = os.getenv('APP_ENV', 'development')
    DEBUG: bool = os.getenv('DEBUG', 'true').lower() == 'true'
    SECRET_KEY: str = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    # API Server
    API_HOST: str = os.getenv('API_HOST', '0.0.0.0')
    API_PORT: int = int(os.getenv('API_PORT', 8000))
    API_RELOAD: bool = os.getenv('API_RELOAD', 'true').lower() == 'true'
    
    # CORS
    CORS_ORIGINS: List[str] = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
    
    # Snowflake
    SNOWFLAKE_USER: str = os.getenv('SNOWFLAKE_USER', '')
    SNOWFLAKE_PASSWORD: str = os.getenv('SNOWFLAKE_PASSWORD', '')
    SNOWFLAKE_ACCOUNT: str = os.getenv('SNOWFLAKE_ACCOUNT', '')
    SNOWFLAKE_WAREHOUSE: str = os.getenv('SNOWFLAKE_WAREHOUSE', '')
    SNOWFLAKE_DATABASE: str = os.getenv('SNOWFLAKE_DATABASE', '')
    SNOWFLAKE_SCHEMA: str = os.getenv('SNOWFLAKE_SCHEMA', '')
    SNOWFLAKE_ROLE: str = os.getenv('SNOWFLAKE_ROLE', '')
    
    # Anthropic
    ANTHROPIC_API_KEY: str = os.getenv('ANTHROPIC_API_KEY', '')
    
    # Redis
    REDIS_URL: str = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    REDIS_HOST: str = os.getenv('REDIS_HOST', 'localhost')
    REDIS_PORT: int = int(os.getenv('REDIS_PORT', 6379))
    REDIS_DB: int = int(os.getenv('REDIS_DB', 0))
    REDIS_PASSWORD: str = os.getenv('REDIS_PASSWORD', '')
    
    # Cache Settings
    DATASET_CACHE_TTL: int = int(os.getenv('DATASET_CACHE_TTL', 3600))
    QUERY_CACHE_TTL: int = int(os.getenv('QUERY_CACHE_TTL', 1800))
    
    # Performance
    MAX_QUERY_ROWS: int = int(os.getenv('MAX_QUERY_ROWS', 50000))
    QUERY_TIMEOUT: int = int(os.getenv('QUERY_TIMEOUT', 300))
    MAX_CONCURRENT_QUERIES: int = int(os.getenv('MAX_CONCURRENT_QUERIES', 10))
    
    # Logging
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    
    def validate(self) -> bool:
        """Validate required settings"""
        required_settings = [
            'SNOWFLAKE_USER',
            'SNOWFLAKE_PASSWORD',
            'SNOWFLAKE_ACCOUNT',
            'ANTHROPIC_API_KEY'
        ]
        
        missing = [setting for setting in required_settings if not getattr(self, setting)]
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
        
        return True

# Global settings instance
settings = Settings()