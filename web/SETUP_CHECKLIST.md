# Auth0 Integration - Setup Checklist

Use this checklist to ensure everything is properly configured.

## Pre-Setup

- [ ] Node.js installed (v16 or higher)
- [ ] npm installed
- [ ] Auth0 account created (https://auth0.com)
- [ ] Google Cloud project for OAuth (https://console.cloud.google.com)

## Installation

- [ ] Run `npm install` in `/Users/vpranav/Desktop/Dev/PEC/web`
- [ ] Verify `@auth0/auth0-react` is installed
- [ ] Verify `axios` is installed
- [ ] Check `package.json` shows both dependencies

## Environment Configuration

- [ ] Copy `.env.example` to `.env`
- [ ] Add `VITE_AUTH0_DOMAIN`
- [ ] Add `VITE_AUTH0_CLIENT_ID`
- [ ] Add `VITE_AUTH0_AUDIENCE`
- [ ] Add `VITE_API_URL`
- [ ] Verify no variables are empty/placeholder values

## Auth0 Application Setup

- [ ] Log in to Auth0 Dashboard (https://manage.auth0.com)
- [ ] Create new application
- [ ] Choose "Single Page Application" type
- [ ] Name it (e.g., "PrepVerse Web")
- [ ] Copy Domain to `.env` (VITE_AUTH0_DOMAIN)
- [ ] Copy Client ID to `.env` (VITE_AUTH0_CLIENT_ID)

## Auth0 Application Settings

- [ ] Add Allowed Callback URL: `http://localhost:5173/callback`
- [ ] Add Allowed Callback URL: `https://yourdomain.com/callback` (production)
- [ ] Add Allowed Logout URL: `http://localhost:5173`
- [ ] Add Allowed Logout URL: `https://yourdomain.com` (production)
- [ ] Add Allowed Web Origin: `http://localhost:5173`
- [ ] Add Allowed Web Origin: `https://yourdomain.com` (production)
- [ ] Click "Save Changes"

## Google OAuth Setup (in Google Cloud Console)

- [ ] Go to Google Cloud Console
- [ ] Create/select a project
- [ ] Enable Google+ API
- [ ] Create OAuth 2.0 credentials
- [ ] Add authorized redirect URIs from Auth0
- [ ] Copy Client ID and Client Secret

## Google Connection in Auth0

- [ ] Navigate to Authentication > Social in Auth0
- [ ] Find Google and click to enable
- [ ] Enter Google Client ID
- [ ] Enter Google Client Secret
- [ ] Save changes
- [ ] Test the connection

## Auth0 API Configuration

- [ ] Navigate to Applications > APIs in Auth0
- [ ] Click "Create API"
- [ ] Name: "PrepVerse API"
- [ ] Identifier: Use your actual API URL (e.g., `https://api.prepverse.com`)
- [ ] Copy Identifier to `.env` (VITE_AUTH0_AUDIENCE)
- [ ] Click "Create"

## File Verification

Verify these files exist and are correct:

- [ ] `/Users/vpranav/Desktop/Dev/PEC/web/src/lib/auth0.ts`
- [ ] `/Users/vpranav/Desktop/Dev/PEC/web/src/hooks/useAuth.ts`
- [ ] `/Users/vpranav/Desktop/Dev/PEC/web/src/api/client.ts`
- [ ] `/Users/vpranav/Desktop/Dev/PEC/web/src/api/onboarding.ts`
- [ ] `/Users/vpranav/Desktop/Dev/PEC/web/src/pages/Callback.tsx`
- [ ] `/Users/vpranav/Desktop/Dev/PEC/web/src/main.tsx` (modified)
- [ ] `/Users/vpranav/Desktop/Dev/PEC/web/src/App.tsx` (modified)
- [ ] `/Users/vpranav/Desktop/Dev/PEC/web/src/pages/Login.tsx` (modified)
- [ ] `/Users/vpranav/Desktop/Dev/PEC/web/.env` (created from .env.example)

## Frontend Testing

- [ ] Run `npm run dev`
- [ ] App starts without errors
- [ ] Navigate to `http://localhost:5173`
- [ ] Login page loads correctly
- [ ] Click "Sign in with Google" button
- [ ] Redirected to Auth0/Google login
- [ ] After login, redirected to `/callback`
- [ ] Then redirected to onboarding page
- [ ] No console errors during flow

## Backend Configuration

- [ ] Backend accepts Bearer tokens in Authorization header
- [ ] Backend validates Auth0 JWT tokens
- [ ] Backend JWKS endpoint configured for Auth0
- [ ] Backend verifies token audience
- [ ] Backend verifies token issuer

## Backend Endpoints

Verify these endpoints exist on your backend:

- [ ] `GET /onboarding/status`
- [ ] `GET /onboarding/questions?class={10|12}`
- [ ] `POST /onboarding/submit`
- [ ] `POST /onboarding/skip` (optional)

## Backend CORS

- [ ] Backend allows origin: `http://localhost:5173`
- [ ] Backend allows origin: `https://yourdomain.com` (production)
- [ ] Backend allows header: `Content-Type`
- [ ] Backend allows header: `Authorization`
- [ ] Backend allows methods: `GET, POST, PUT, DELETE, OPTIONS`

## Integration Testing

- [ ] Login successfully with Google
- [ ] Token appears in browser dev tools (Application > Session Storage)
- [ ] API call to `/onboarding/status` succeeds
- [ ] Authorization header contains Bearer token
- [ ] Backend validates token successfully
- [ ] Logout works correctly
- [ ] After logout, redirected to login page

## Error Handling

Test these error scenarios:

- [ ] Invalid Auth0 credentials show error
- [ ] Network error shows user-friendly message
- [ ] 401 Unauthorized handled gracefully
- [ ] Auth0 callback error displays error page
- [ ] Missing environment variables show clear error

## Production Preparation

- [ ] Update `.env` with production values
- [ ] Add production URLs to Auth0 Dashboard
- [ ] Test production build: `npm run build`
- [ ] No build errors
- [ ] Preview production build: `npm run preview`
- [ ] Test login flow in production preview

## Security Review

- [ ] Tokens stored in memory (not localStorage)
- [ ] HTTPS enabled for production
- [ ] Refresh tokens enabled
- [ ] Token audience properly scoped
- [ ] No sensitive data in client-side code
- [ ] Environment variables not committed to git

## Documentation

- [ ] Read [AUTH0_SETUP.md](./AUTH0_SETUP.md)
- [ ] Read [INSTALLATION.md](./INSTALLATION.md)
- [ ] Read [QUICKSTART.md](./QUICKSTART.md)
- [ ] Read [AUTH0_INTEGRATION_SUMMARY.md](./AUTH0_INTEGRATION_SUMMARY.md)

## Final Checks

- [ ] All team members have access to Auth0 Dashboard
- [ ] `.env` file is in `.gitignore`
- [ ] Documentation is up to date
- [ ] Backend team has Auth0 configuration details
- [ ] Production deployment plan is ready

---

## Quick Command Reference

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

---

## Support Resources

- **Auth0 Documentation**: https://auth0.com/docs
- **Auth0 React SDK**: https://auth0.com/docs/libraries/auth0-react
- **Auth0 Dashboard**: https://manage.auth0.com
- **Google Cloud Console**: https://console.cloud.google.com

---

## Troubleshooting Reference

| Issue | Solution |
|-------|----------|
| "Missing required Auth0 configuration" | Check all `.env` variables are set |
| Callback URL error | Verify callback URL in Auth0 Dashboard |
| Google login fails | Check Google connection in Auth0 is enabled |
| 401 on API calls | Verify backend JWT validation is configured |
| CORS errors | Check backend CORS allows frontend origin |
| Token not in requests | Verify API client setup in App.tsx |

---

**Status**: Use this checklist to track your setup progress. Check off each item as you complete it.
