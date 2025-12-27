# Auth0 Integration Setup Guide

This guide will help you set up Auth0 authentication for the PrepVerse web application.

## Prerequisites

- An Auth0 account (sign up at https://auth0.com if you don't have one)
- Node.js and npm installed
- Access to the PrepVerse backend API

## Installation

1. Install the required dependencies:

```bash
npm install @auth0/auth0-react axios
```

## Auth0 Configuration

### 1. Create an Auth0 Application

1. Log in to your [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to **Applications** > **Applications**
3. Click **Create Application**
4. Name it "PrepVerse Web" (or your preferred name)
5. Select **Single Page Web Applications**
6. Click **Create**

### 2. Configure Application Settings

In your Auth0 application settings:

1. **Allowed Callback URLs**: Add your callback URL
   ```
   http://localhost:5173/callback
   https://yourdomain.com/callback
   ```

2. **Allowed Logout URLs**: Add your logout redirect URL
   ```
   http://localhost:5173
   https://yourdomain.com
   ```

3. **Allowed Web Origins**: Add your application origin
   ```
   http://localhost:5173
   https://yourdomain.com
   ```

4. Click **Save Changes**

### 3. Configure Google Social Connection

1. In Auth0 Dashboard, navigate to **Authentication** > **Social**
2. Find **Google** and click the toggle to enable it
3. Click on the **Google** connection to configure
4. Enter your Google OAuth credentials (Client ID and Secret)
   - Get these from [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 credentials if you haven't already
5. Configure allowed callback URL (Auth0 provides this)
6. Click **Save**

### 4. Create an API (Optional but Recommended)

If you need to call your backend API with access tokens:

1. Navigate to **Applications** > **APIs**
2. Click **Create API**
3. Name: "PrepVerse API"
4. Identifier: `https://api.prepverse.com` (use your actual API URL)
5. Click **Create**

### 5. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Auth0 credentials in `.env`:
   ```env
   VITE_AUTH0_DOMAIN=your-tenant.auth0.com
   VITE_AUTH0_CLIENT_ID=your-client-id-from-auth0
   VITE_AUTH0_AUDIENCE=https://api.prepverse.com
   VITE_API_URL=http://localhost:8080/api
   ```

   You can find these values in your Auth0 Dashboard:
   - **Domain**: Application Settings > Domain
   - **Client ID**: Application Settings > Client ID
   - **Audience**: The API identifier you created

## Project Structure

```
web/
├── src/
│   ├── lib/
│   │   └── auth0.ts              # Auth0 configuration
│   ├── hooks/
│   │   └── useAuth.ts            # Custom authentication hook
│   ├── api/
│   │   ├── client.ts             # Axios instance with auth interceptor
│   │   └── onboarding.ts         # Onboarding API functions
│   ├── pages/
│   │   ├── Login.tsx             # Login page with Google sign-in
│   │   ├── Callback.tsx          # Auth0 callback handler
│   │   └── Onboarding.tsx        # Onboarding flow
│   ├── App.tsx                   # Main app component
│   └── main.tsx                  # App entry point with Auth0Provider
├── .env                          # Environment variables (gitignored)
└── .env.example                  # Environment template
```

## Usage

### Using the Auth Hook

The `useAuth` hook provides all authentication functionality:

```typescript
import { useAuth } from './hooks/useAuth';

function MyComponent() {
  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithGoogle,
    logout,
    getAccessToken
  } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <button onClick={loginWithGoogle}>Sign in with Google</button>;
  }

  return (
    <div>
      <p>Welcome, {user?.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Making Authenticated API Calls

The API client automatically adds the Bearer token to all requests:

```typescript
import { getOnboardingStatus, getOnboardingQuestions } from './api/onboarding';

// These functions automatically include the auth token
const status = await getOnboardingStatus();
const questions = await getOnboardingQuestions('10');
```

### Manual Token Usage

If you need the access token directly:

```typescript
const { getAccessToken } = useAuth();

const token = await getAccessToken();
// Use token for custom API calls
```

## Authentication Flow

1. User visits the app
2. App shows Login page
3. User clicks "Sign in with Google"
4. User is redirected to Auth0/Google for authentication
5. After authentication, Auth0 redirects back to `/callback`
6. Callback page processes the authentication result
7. User is redirected to the onboarding page (or dashboard if already onboarded)

## Security Features

- **Token Storage**: Tokens are stored in memory (not localStorage) for better XSS protection
- **Refresh Tokens**: Enabled for seamless re-authentication
- **HTTPS Only**: Production deployments should use HTTPS
- **Audience**: Access tokens are scoped to your API
- **Connection**: Restricted to Google OAuth2 only

## Troubleshooting

### "Invalid callback URL" error
- Ensure the callback URL in `.env` matches what's configured in Auth0 Dashboard
- Check that you've added the URL to "Allowed Callback URLs"

### "Access Denied" error
- Verify your Google OAuth credentials are correct in Auth0
- Check that the Google connection is enabled
- Ensure your Google Cloud project has the correct redirect URIs

### Token not being sent with API requests
- Verify `VITE_AUTH0_AUDIENCE` matches your Auth0 API identifier
- Check that the token getter is set up in `App.tsx`
- Ensure the API client is imported from `./api/client`

### CORS errors
- Add your frontend URL to the backend's CORS allowed origins
- For development, ensure both frontend and backend are running

## Development

Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Production Deployment

1. Update `.env` with production values
2. Ensure all Auth0 URLs include your production domain
3. Build the app:
   ```bash
   npm run build
   ```
4. Deploy the `dist` folder to your hosting provider

## Additional Resources

- [Auth0 React SDK Documentation](https://auth0.com/docs/libraries/auth0-react)
- [Auth0 Dashboard](https://manage.auth0.com)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
