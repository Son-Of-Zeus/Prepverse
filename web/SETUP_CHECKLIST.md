# PrepVerse Web - Setup Checklist

Use this checklist to ensure everything is properly configured.

## Pre-Setup

- [ ] Node.js v18+ installed
- [ ] npm installed
- [ ] Auth0 account created (https://auth0.com)
- [ ] Google Cloud project for OAuth (https://console.cloud.google.com)

## Frontend Installation

- [ ] Run `npm install` in `web/`
- [ ] Verify `axios` is installed (check `package.json`)
- [ ] Copy `.env.example` to `.env`
- [ ] Configure `VITE_API_URL=http://localhost:8000`
- [ ] Configure Supabase URLs (optional, for realtime)

> **Note**: No Auth0 credentials needed in frontend - backend handles OAuth.

## Backend Configuration

The backend handles all OAuth. Ensure these are set in `backend/.env`:

- [ ] `AUTH0_DOMAIN` - Your Auth0 tenant domain
- [ ] `AUTH0_CLIENT_ID` - Auth0 application client ID
- [ ] `AUTH0_CLIENT_SECRET` - Auth0 application client secret
- [ ] `AUTH0_AUDIENCE` - Auth0 API identifier
- [ ] `SESSION_SECRET_KEY` - Random string for signing cookies
- [ ] `FRONTEND_URL=http://localhost:5173`

## Auth0 Dashboard Configuration

### Application Setup

- [ ] Log in to Auth0 Dashboard
- [ ] Create application with type **Regular Web Application**
- [ ] Copy credentials to backend `.env`

### Application Settings

- [ ] Add Callback URL: `http://localhost:8000/api/v1/auth/callback`
- [ ] Add Logout URL: `http://localhost:5173`
- [ ] Add Web Origin: `http://localhost:5173`
- [ ] Click "Save Changes"

### Google Connection

- [ ] Navigate to Authentication > Social
- [ ] Enable Google connection
- [ ] Configure Google OAuth credentials
- [ ] Test the connection

### API Configuration

- [ ] Navigate to Applications > APIs
- [ ] Create API with identifier (e.g., `https://api.prepverse.com`)
- [ ] Copy identifier to `AUTH0_AUDIENCE` in backend

## File Verification

Verify these files exist:

### Frontend Files

- [ ] `web/src/hooks/useAuth.ts` - Auth hook
- [ ] `web/src/api/client.ts` - Axios with credentials
- [ ] `web/src/api/onboarding.ts` - API functions
- [ ] `web/src/pages/Login.tsx` - Login page
- [ ] `web/src/App.tsx` - Root component
- [ ] `web/vite.config.ts` - Has proxy configuration

### Backend Files

- [ ] `backend/app/core/oauth.py` - OAuth client
- [ ] `backend/app/core/session.py` - Session handling
- [ ] `backend/app/core/security.py` - Dual auth support
- [ ] `backend/app/api/v1/auth.py` - Auth endpoints

## Vite Proxy Verification

Check `vite.config.ts` has:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      cookieDomainRewrite: 'localhost',
    },
  },
},
```

## Testing Checklist

### Start Servers

- [ ] Start backend: `cd backend && ./run.sh`
- [ ] Start frontend: `cd web && npm run dev`
- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173

### Test Login Flow

- [ ] Visit `http://localhost:5173`
- [ ] Click "Sign in with Google"
- [ ] Redirects to Auth0/Google
- [ ] After auth, redirects back to frontend
- [ ] Cookie `prepverse_session` is set (check DevTools)

### Test API Calls

- [ ] `/auth/me` returns user profile
- [ ] Cookie included automatically
- [ ] No CORS errors

### Test Logout

- [ ] Logout clears session
- [ ] Cookie is removed
- [ ] Redirected to login page

## Error Handling

Test these scenarios:

- [ ] Session expired → Redirects to login
- [ ] Invalid cookie → Returns 401
- [ ] Network error → Shows user-friendly message

## Production Preparation

- [ ] Update Auth0 callback URL to production backend
- [ ] Update allowed origins to production frontend
- [ ] Set `DEBUG=False` in backend
- [ ] Ensure HTTPS for both frontend and backend
- [ ] Test full flow in staging environment

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Callback URL mismatch | Ensure Auth0 has backend callback URL |
| Cookie not set | Check `FRONTEND_URL` and Vite proxy |
| 401 on API calls | Try logging in again, check cookie |
| CORS errors | Verify Vite proxy is working |

## Quick Reference

```bash
# Frontend
cd web
npm install
npm run dev

# Backend
cd backend
./run.sh

# Generate session secret
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

**Status**: Check off each item as you complete it.
