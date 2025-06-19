# Data Analysis API - Backend

Backend API for the Data Analysis Application, built with Express.js and designed for Vercel serverless deployment.

## 🚀 Quick Start

### Local Development
```bash
cd api
npm install
npm run dev
```

The API will be available at `http://localhost:3001`

### Test Endpoints
- **Health Check**: `GET /api/health`
- **System Status**: `GET /api/status`
- **API Info**: `GET /api`

## 📋 Deployment Milestones

### ✅ Milestone 1 (Current) - Backend Foundation
- Express.js server with health checks
- Vercel serverless function configuration
- CORS setup for frontend compatibility
- Basic error handling

**Status**: Ready for deployment - won't break existing frontend

### 🔄 Milestone 2 - API Layer
- Mock data endpoints
- Frontend-compatible API responses
- Graceful fallback mechanisms

### 🔄 Milestone 3 - Snowflake Integration
- Real database connections
- Dataset discovery and loading
- Fallback to demo mode

### 🔄 Milestone 4 - AI Integration
- Anthropic API integration
- Python code generation
- Enhanced analysis responses

### 🔄 Milestone 5 - Production Ready
- Caching layer
- Performance optimization
- Advanced monitoring

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp ../.env.example .env
```

**Milestone 1 Requirements** (minimal):
```env
NODE_ENV=development
PORT=3001
```

## 📡 API Endpoints

### Current (M1)
- `GET /api` - API information
- `GET /api/health` - Health check
- `GET /api/status` - System status

### Coming Soon (M2+)
- `GET /api/available-datasets` - List available datasets
- `POST /api/load-dataset` - Load and filter dataset
- `POST /api/ai-query` - Natural language data queries

## 🚀 Vercel Deployment

The API is configured as Vercel serverless functions:
- Functions are in `/api` directory
- Routes automatically mapped to `/api/*`
- Environment variables managed in Vercel dashboard

## 🧪 Testing

Test the deployment:
```bash
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "milestone": "M1 - Backend Foundation"
}
```

## 🔒 Security

- CORS configured for specific origins
- Environment variables for sensitive data
- Error messages sanitized in production
- Input validation on all endpoints