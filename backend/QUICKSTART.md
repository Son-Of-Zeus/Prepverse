# PrepVerse Backend - Quick Start Guide

## Prerequisites

- Python 3.11 or higher
- Supabase account and project
- Auth0 account and application
- Google Gemini API key

## Step 1: Install uv (Package Manager)

```bash
# Install uv (fast Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## Step 2: Install Dependencies

```bash
cd backend
uv sync
```

This automatically creates a virtual environment and installs all dependencies.

## Step 3: Configure Environment

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Edit `.env` with your credentials:

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-anon-key-here

# Auth0
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api-identifier

# Google Gemini
GEMINI_API_KEY=your-gemini-api-key-here
```

## Step 4: Set Up Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database_schema.sql`
4. Run the SQL script to create all tables and policies

## Step 5: Configure Auth0

1. Create a new API in Auth0 Dashboard
2. Set the API Identifier (use this as AUTH0_AUDIENCE)
3. Enable RS256 algorithm
4. Add your backend URL to allowed origins

## Step 6: Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your .env file

## Step 7: Run the Server

Using the run script (recommended):
```bash
chmod +x run.sh
./run.sh
```

Or manually:
```bash
uvicorn app.main:app --reload
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Step 8: Test the API

1. Visit http://localhost:8000/docs
2. You should see the Swagger UI
3. Test the `/health` endpoint (no auth required)
4. For authenticated endpoints, you'll need a valid Auth0 JWT token

## Testing with Auth0 Token

1. Get a token from your frontend or use Auth0's test tool
2. Click "Authorize" in Swagger UI
3. Enter: `Bearer <your-token-here>`
4. Try the `/api/v1/auth/me` endpoint

## API Endpoints Overview

### Public Endpoints
- `GET /` - Root endpoint
- `GET /health` - Health check

### Authenticated Endpoints

#### Authentication
- `GET /api/v1/auth/me` - Get current user profile

#### Onboarding
- `GET /api/v1/onboarding/questions` - Get 10 random assessment questions
- `POST /api/v1/onboarding/submit` - Submit answers and get evaluation
- `GET /api/v1/onboarding/status` - Get onboarding completion status

#### Question Generation (AI)
- `POST /api/v1/questions/generate` - Generate questions with Gemini
- `POST /api/v1/questions/generate/study-plan` - Generate study plan

## Example API Calls

### Get Onboarding Questions
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/onboarding/questions
```

### Submit Onboarding Answers
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {"question_id": "onb_001", "selected_answer": "4"},
      {"question_id": "onb_002", "selected_answer": "2 and 3"},
      ...
    ]
  }' \
  http://localhost:8000/api/v1/onboarding/submit
```

### Generate Questions
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "mathematics",
    "topic": "calculus",
    "difficulty": "medium",
    "class_level": 12,
    "count": 5
  }' \
  http://localhost:8000/api/v1/questions/generate
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

### Import Errors
```bash
# Re-sync dependencies with uv
uv sync

# Or if using pip:
source venv/bin/activate
pip install -r requirements.txt
```

### Database Connection Issues
- Verify SUPABASE_URL and SUPABASE_KEY in .env
- Check that database tables are created
- Ensure RLS policies are configured correctly

### Auth0 Token Issues
- Verify AUTH0_DOMAIN and AUTH0_AUDIENCE
- Ensure token is not expired
- Check that API is configured in Auth0 dashboard

## Next Steps

1. Integrate with your React Native frontend
2. Add more question generation prompts
3. Implement study plan features
4. Add analytics and progress tracking

## Support

For issues and questions:
- Check the main README.md
- Review the API documentation at /docs
- Inspect server logs for error details
