# PrepVerse Web - Installation Guide

Complete installation and setup guide for the PrepVerse web application.

## Prerequisites

- Node.js v18+ installed
- npm installed
- Backend API running (see `backend/README.md`)
- Auth0 account configured (see `AUTH0_SETUP.md`)

## Installation

### 1. Install Dependencies

```bash
cd web
npm install
```

This installs:
- `react` - UI framework
- `axios` - HTTP client (with cookie support)
- `tailwindcss` - Styling
- Development tools (TypeScript, Vite, ESLint)

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Backend API URL
VITE_API_URL=http://localhost:8000

# Supabase (for real-time features)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **Note**: Auth0 credentials are NOT needed in the frontend. The backend handles all OAuth operations.

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
web/src/
├── api/
│   ├── client.ts          # Axios with withCredentials
│   └── onboarding.ts      # Onboarding API functions
├── components/
│   ├── ui/                # Base UI components
│   └── onboarding/        # Onboarding-specific components
├── hooks/
│   └── useAuth.ts         # Authentication hook
├── pages/
│   ├── Login.tsx          # Login page
│   └── Onboarding.tsx     # Onboarding flow
├── styles/
│   └── globals.css        # Tailwind imports
├── App.tsx                # Root component with routing
└── main.tsx               # Entry point
```

## Authentication Architecture

PrepVerse uses **server-side OAuth** with HTTP-only cookies:

1. No Auth0 SDK in frontend
2. Login redirects to backend `/api/v1/auth/login`
3. Backend handles OAuth with Auth0
4. Backend sets HTTP-only session cookie
5. All API requests include cookie automatically

### Key Files

| File | Purpose |
|------|---------|
| `hooks/useAuth.ts` | Auth hook - `loginWithGoogle`, `logout`, `user` |
| `api/client.ts` | Axios with `withCredentials: true` |
| `vite.config.ts` | Proxy config for `/api` routes |

## Vite Proxy Configuration

The Vite dev server proxies API requests to the backend:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
      },
    },
  },
});
```

This ensures:
- Cookies work correctly (same-origin)
- No CORS issues in development
- API calls go through `/api` path

## Testing the Integration

### 1. Start Both Servers

Terminal 1:
```bash
cd backend && ./run.sh
```

Terminal 2:
```bash
cd web && npm run dev
```

### 2. Test Login Flow

1. Visit `http://localhost:5173`
2. Click "Sign in with Google"
3. Complete authentication
4. Verify redirect to onboarding/dashboard

### 3. Verify Cookie

Open browser DevTools:
- Go to Application > Cookies
- Look for `prepverse_session` cookie
- It should be HttpOnly

### 4. Test API Calls

```typescript
import { apiClient } from './api/client';

const response = await apiClient.get('/auth/me');
console.log(response.data); // User profile
```

## Available Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API URL |
| `VITE_SUPABASE_URL` | For realtime | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | For realtime | Supabase anonymous key |

## Troubleshooting

### Login doesn't redirect

- Ensure backend is running on port 8000
- Check browser console for errors
- Verify `VITE_API_URL` in `.env`

### Cookie not being set

- Check Vite proxy configuration
- Verify `FRONTEND_URL` in backend `.env`
- Ensure using `localhost`, not `127.0.0.1`

### 401 Unauthorized on API calls

- Cookie may have expired (7-day max)
- Try logging out and back in
- Check if backend is validating cookies correctly

### CORS errors

- Vite proxy should handle this in development
- Check backend CORS configuration
- Ensure requests go through `/api` path

## Production Build

```bash
npm run build
```

Output in `dist/` folder. Deploy to any static hosting.

For production:
- Update `VITE_API_URL` to production backend
- Configure reverse proxy to handle `/api` routes
- Ensure HTTPS for secure cookies

## Related Documentation

- [QUICKSTART.md](./QUICKSTART.md) - 5-minute setup
- [AUTH0_SETUP.md](./AUTH0_SETUP.md) - Auth0 configuration
- [AUTH0_INTEGRATION_SUMMARY.md](./AUTH0_INTEGRATION_SUMMARY.md) - Architecture overview
