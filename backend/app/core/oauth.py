"""
OAuth client configuration for Auth0 with Google OAuth.
Uses Authlib for server-side OAuth flow.
"""
from authlib.integrations.starlette_client import OAuth
from app.config import get_settings

oauth = OAuth()


def configure_oauth() -> None:
    """
    Configure the Auth0 OAuth client.
    Must be called during app startup.
    """
    settings = get_settings()

    oauth.register(
        name="auth0",
        client_id=settings.AUTH0_CLIENT_ID,
        client_secret=settings.AUTH0_CLIENT_SECRET,
        server_metadata_url=f"https://{settings.AUTH0_DOMAIN}/.well-known/openid-configuration",
        client_kwargs={
            "scope": "openid profile email",
        },
    )
