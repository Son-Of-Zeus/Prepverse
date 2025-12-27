# Auth0 Setup Guide

This guide explains how to configure Auth0 for PrepVerse's server-side OAuth authentication.

## Prerequisites

- An Auth0 account (sign up at https://auth0.com)
- Backend running with FastAPI
- Access to Google Cloud Console for OAuth credentials

## Auth0 Configuration

### 1. Create an Auth0 Application

1. Log in to your [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to **Applications** > **Applications**
3. Click **Create Application**
4. Name it "PrepVerse" (or your preferred name)
5. Select **Regular Web Applications** (NOT Single Page Application)
6. Click **Create**

> **Important**: Choose "Regular Web Applications" because we use server-side OAuth. The backend handles all token exchange.

### 2. Configure Application Settings

In your Auth0 application settings:

1. **Allowed Callback URLs** (backend handles OAuth):
   ```
   http://localhost:8000/api/v1/auth/callback
   https://api.yourdomain.com/api/v1/auth/callback
   ```

2. **Allowed Logout URLs**:
   ```
   http://localhost:5173
   https://yourdomain.com
   ```

3. **Allowed Web Origins**:
   ```
   http://localhost:5173
   https://yourdomain.com
   ```

4. Click **Save Changes**

### 3. Get Your Credentials

From the Auth0 application settings page, copy:

- **Domain** → `AUTH0_DOMAIN`
- **Client ID** → `AUTH0_CLIENT_ID`
- **Client Secret** → `AUTH0_CLIENT_SECRET`

These go in your **backend** `.env` file (not frontend).

### 4. Configure Google Social Connection

1. In Auth0 Dashboard, navigate to **Authentication** > **Social**
2. Find **Google** and click to enable
3. You'll need Google OAuth credentials:

#### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client IDs**
5. Configure the consent screen if prompted
6. Application type: **Web application**
7. Add Authorized redirect URIs (get this from Auth0 Google connection page)
8. Copy the **Client ID** and **Client Secret**

#### Back in Auth0

1. Paste the Google Client ID and Client Secret
2. Click **Save**
3. Test the connection

### 5. Create an API (for JWT audience)

1. Navigate to **Applications** > **APIs**
2. Click **Create API**
3. Name: "PrepVerse API"
4. Identifier: `https://api.prepverse.com` (or your API URL)
5. Signing Algorithm: RS256
6. Click **Create**

The identifier becomes your `AUTH0_AUDIENCE` in the backend.

## Backend Configuration

Add these to `backend/.env`:

```env
# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://api.prepverse.com

# Session Configuration
SESSION_SECRET_KEY=generate-a-secure-random-string-at-least-32-chars
FRONTEND_URL=http://localhost:5173
```

### Generate a Session Secret

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Frontend Configuration

The frontend only needs the API URL:

```env
VITE_API_URL=http://localhost:8000
```

No Auth0 credentials are needed in the frontend because:
- Backend handles all OAuth operations
- Frontend just redirects to backend `/auth/login`
- Authentication state comes from HTTP-only cookies

## How It Works

### Login Flow

1. User clicks "Sign in with Google" on frontend
2. Frontend redirects to `GET /api/v1/auth/login`
3. Backend redirects to Auth0 with Google connection
4. User authenticates with Google
5. Auth0 redirects to `GET /api/v1/auth/callback`
6. Backend exchanges auth code for tokens
7. Backend creates session cookie
8. Backend redirects to frontend

### Logout Flow

1. User clicks logout
2. Frontend calls `POST /api/v1/auth/logout`
3. Backend clears session cookie
4. User is logged out

### API Requests

- All requests include cookies automatically (`withCredentials: true`)
- Backend validates session cookie on each request
- No token management needed on frontend

## Verification Checklist

- [ ] Auth0 application type is "Regular Web Applications"
- [ ] Callback URL points to backend: `http://localhost:8000/api/v1/auth/callback`
- [ ] Google social connection is enabled and configured
- [ ] Backend `.env` has all Auth0 credentials
- [ ] Backend `.env` has `SESSION_SECRET_KEY` and `FRONTEND_URL`
- [ ] Frontend only has `VITE_API_URL`
- [ ] Vite proxy is configured for `/api` routes

## Troubleshooting

### "callback URL mismatch" error

The callback URL in Auth0 must exactly match: `http://localhost:8000/api/v1/auth/callback`

### "access_denied" error

- Check Google connection is enabled in Auth0
- Verify Google OAuth credentials are correct
- Ensure your Google Cloud project consent screen is configured

### Cookie not being set

- Check `FRONTEND_URL` in backend matches your frontend URL
- Verify Vite proxy is working (check Network tab)
- Ensure `SameSite=lax` cookie policy is compatible with your setup

### Session invalid after restart

- `SESSION_SECRET_KEY` must be consistent
- Don't change the secret key between restarts

## Production Deployment

1. Update Auth0 callback URL to production backend URL
2. Update allowed logout/web origins to production frontend URL
3. Set `DEBUG=False` in backend (enables Secure cookie flag)
4. Use HTTPS for both frontend and backend
5. Consider reducing `SESSION_MAX_AGE` for security

---

**See Also**:
- [AUTH0_INTEGRATION_SUMMARY.md](./AUTH0_INTEGRATION_SUMMARY.md) - Implementation overview
- [QUICKSTART.md](./QUICKSTART.md) - Quick setup guide
