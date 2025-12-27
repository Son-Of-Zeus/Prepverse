# PrepVerse Backend Deployment Guide

This guide covers deployment options for the PrepVerse FastAPI backend.

## Deployment Options

1. Railway (Recommended - Easy)
2. Render
3. Google Cloud Run
4. AWS EC2
5. DigitalOcean App Platform
6. Heroku (Legacy)

---

## Option 1: Railway (Recommended)

Railway provides easy deployment with automatic HTTPS and environment management.

### Steps:

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your PrepVerse backend repository

3. **Configure Environment Variables**
   - Go to Variables tab
   - Add all variables from `.env`:
     ```
     SUPABASE_URL=https://xxxxx.supabase.co
     SUPABASE_KEY=your-key
     AUTH0_DOMAIN=your-domain.auth0.com
     AUTH0_AUDIENCE=https://api-identifier
     GEMINI_API_KEY=your-gemini-key
     ```

4. **Configure Start Command**
   - Railway auto-detects Python apps
   - If needed, add in Settings:
     ```
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```

5. **Deploy**
   - Railway automatically deploys on git push
   - Get your public URL from Railway dashboard
   - Update CORS settings in `config.py` with your domain

### Railway Configuration File

Create `railway.json` in backend root:
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## Option 2: Render

### Steps:

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create Web Service**
   - Click "New" → "Web Service"
   - Connect your GitHub repository

3. **Configure Service**
   - Name: `prepverse-api`
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. **Add Environment Variables**
   - Add all your .env variables in Render dashboard

5. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically

---

## Option 3: Google Cloud Run

### Steps:

1. **Create Dockerfile**

Create `Dockerfile` in backend root:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
ENV PORT 8080
EXPOSE 8080

# Run application
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

2. **Build and Deploy**
```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Set project
gcloud config set project YOUR_PROJECT_ID

# Build image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/prepverse-api

# Deploy to Cloud Run
gcloud run deploy prepverse-api \
  --image gcr.io/YOUR_PROJECT_ID/prepverse-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars SUPABASE_URL=xxx,SUPABASE_KEY=xxx,...
```

---

## Option 4: Docker Compose (Self-Hosted)

### docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - AUTH0_DOMAIN=${AUTH0_DOMAIN}
      - AUTH0_AUDIENCE=${AUTH0_AUDIENCE}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Run with Docker Compose

```bash
docker-compose up -d
```

---

## Production Configuration Checklist

### 1. Environment Variables
- [ ] All environment variables set
- [ ] No hardcoded secrets in code
- [ ] DEBUG=False in production

### 2. CORS Configuration
```python
# In config.py, update CORS_ORIGINS
CORS_ORIGINS: list[str] = [
    "https://your-frontend-domain.com",
    "https://www.your-frontend-domain.com",
    "exp://your-expo-app"  # For React Native
]
```

### 3. Database
- [ ] Supabase connection tested
- [ ] RLS policies enabled
- [ ] Database indexes created
- [ ] Backup strategy in place

### 4. Auth0
- [ ] Production Auth0 tenant configured
- [ ] Callback URLs updated
- [ ] API audience set correctly
- [ ] Rate limiting configured

### 5. Security
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] API rate limiting (if needed)
- [ ] Input validation enabled

### 6. Monitoring
- [ ] Health check endpoint tested
- [ ] Error logging configured
- [ ] Performance monitoring setup

---

## Post-Deployment Testing

### 1. Test Health Endpoint
```bash
curl https://your-api-domain.com/health
```

### 2. Test Authentication
```bash
curl -H "Authorization: Bearer <token>" \
  https://your-api-domain.com/api/v1/auth/me
```

### 3. Test Onboarding Flow
```bash
# Get questions
curl -H "Authorization: Bearer <token>" \
  https://your-api-domain.com/api/v1/onboarding/questions

# Submit answers (use actual question IDs from response)
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"answers": [...]}' \
  https://your-api-domain.com/api/v1/onboarding/submit
```

### 4. Test AI Generation
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "mathematics",
    "topic": "algebra",
    "difficulty": "medium",
    "class_level": 10,
    "count": 5
  }' \
  https://your-api-domain.com/api/v1/questions/generate
```

---

## Performance Optimization

### 1. Add Caching
Install Redis and update dependencies:
```python
# requirements.txt
redis==5.0.1
fastapi-cache2==0.2.1
```

### 2. Database Connection Pooling
Supabase client handles this automatically, but monitor connection usage.

### 3. Add Rate Limiting
```python
# requirements.txt
slowapi==0.1.9

# In main.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# In endpoints
@limiter.limit("100/minute")
async def generate_questions(...):
    pass
```

---

## Monitoring and Logging

### 1. Add Structured Logging
```python
# requirements.txt
python-json-logger==2.0.7

# Create app/core/logging.py
import logging
from pythonjsonlogger import jsonlogger

def setup_logging():
    logger = logging.getLogger()
    handler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter()
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
```

### 2. Add Sentry for Error Tracking
```python
# requirements.txt
sentry-sdk[fastapi]==1.39.2

# In main.py
import sentry_sdk

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    traces_sample_rate=1.0,
)
```

---

## Scaling Considerations

### Vertical Scaling
- Start with 1 CPU, 512MB RAM
- Monitor and increase as needed
- Most platforms allow easy scaling

### Horizontal Scaling
- Deploy multiple instances
- Use load balancer
- Ensure stateless application
- Use external cache (Redis)

### Database Scaling
- Supabase handles this automatically
- Monitor query performance
- Add indexes as needed
- Consider read replicas for high traffic

---

## Backup Strategy

### 1. Database Backups
- Supabase provides automatic daily backups
- Enable PITR (Point-in-Time Recovery) if available
- Test restore procedures

### 2. Code Backups
- Use Git for version control
- Tag releases
- Maintain deployment history

---

## CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt

    - name: Run tests
      run: |
        cd backend
        pytest

    - name: Deploy to Railway
      env:
        RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
      run: |
        npm i -g @railway/cli
        railway up
```

---

## Support and Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check if app is running on correct port
   - Verify environment variables
   - Check application logs

2. **Database Connection Failed**
   - Verify SUPABASE_URL and SUPABASE_KEY
   - Check network/firewall rules
   - Ensure database is accessible

3. **Auth0 Token Invalid**
   - Verify AUTH0_DOMAIN and AUTH0_AUDIENCE
   - Check token expiration
   - Ensure JWKS endpoint is accessible

### Getting Help
- Check application logs
- Review deployment platform documentation
- Test locally first with production environment variables
