# Backend - Snowflake + Anthropic Integration

This backend provides a FastAPI-based API for data analysis using Snowflake data warehouse and Anthropic AI.

## Quick Start

### 1. Environment Setup

Run the setup script to create a virtual environment and install dependencies:

```bash
cd backend
./setup_env.sh
```

### 2. Configure Environment Variables

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:
- Snowflake connection details
- Anthropic API key
- Redis configuration (if different from default)

### 3. Start the Development Server

Activate the virtual environment and start the server:

```bash
source venv/bin/activate
python main.py
```

Or using uvicorn directly:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: http://localhost:8000

## Project Structure

```
backend/
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies
├── setup_env.sh           # Environment setup script
├── .env.example           # Environment variables template
├── README.md              # This file
├── api/                   # API endpoint modules
├── config/                # Configuration settings
│   └── settings.py        # Application settings
├── models/                # Data models and schemas
├── services/              # Business logic services
│   ├── __init__.py
│   └── snowflake_service.py  # Snowflake data operations
└── utils/                 # Utility functions
```

## Key Dependencies

- **snowflake-snowpark-python**: Snowflake data processing
- **polars**: High-performance data manipulation
- **pandas**: Data analysis and manipulation
- **pyarrow**: Columnar data format
- **fastparquet**: Parquet file support
- **psutil**: System monitoring
- **anthropic**: Anthropic AI API client
- **fastapi**: Modern web framework
- **redis**: Caching and session management

## API Endpoints

### Health Check
- `GET /` - Basic health check
- `GET /health` - Detailed health information

### Data Operations (Planned)
- `GET /api/datasets` - List available datasets
- `POST /api/datasets/load` - Load dataset from Snowflake
- `POST /api/analysis` - Analyze data using Anthropic AI

## Configuration

All configuration is managed through environment variables. See `.env.example` for the complete list of available settings.

### Required Environment Variables

- `SNOWFLAKE_USER` - Your Snowflake username
- `SNOWFLAKE_PASSWORD` - Your Snowflake password  
- `SNOWFLAKE_ACCOUNT` - Your Snowflake account identifier
- `SNOWFLAKE_WAREHOUSE` - Snowflake warehouse name
- `SNOWFLAKE_DATABASE` - Snowflake database name
- `SNOWFLAKE_SCHEMA` - Snowflake schema name
- `ANTHROPIC_API_KEY` - Your Anthropic API key

### Optional Configuration

- `REDIS_URL` - Redis connection URL (default: redis://localhost:6379/0)
- `API_PORT` - Server port (default: 8000)
- `CORS_ORIGINS` - Allowed CORS origins
- `DATASET_CACHE_TTL` - Dataset cache duration in seconds
- `MAX_QUERY_ROWS` - Maximum rows per query

## Development

### Installing Additional Dependencies

```bash
source venv/bin/activate
pip install package_name
pip freeze > requirements.txt
```

### Running Tests

```bash
source venv/bin/activate
pytest tests/
```

### Code Formatting

```bash
source venv/bin/activate
black .
flake8 .
```

## Production Deployment

For production deployment:

1. Set `APP_ENV=production` in your environment
2. Use a production WSGI server like Gunicorn
3. Configure proper logging and monitoring
4. Set up SSL/TLS termination
5. Use a production Redis instance

Example production command:
```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Troubleshooting

### Common Issues

1. **Import errors**: Make sure you're in the virtual environment (`source venv/bin/activate`)
2. **Connection failures**: Verify your Snowflake credentials in `.env`
3. **Redis errors**: Ensure Redis is running locally or update `REDIS_URL`
4. **Permission errors**: Make sure `setup_env.sh` is executable (`chmod +x setup_env.sh`)

### Logs

The application logs to stdout by default. Set `LOG_LEVEL` in `.env` to control verbosity:
- `DEBUG` - Detailed debugging information
- `INFO` - General information (default)
- `WARNING` - Warning messages only
- `ERROR` - Error messages only