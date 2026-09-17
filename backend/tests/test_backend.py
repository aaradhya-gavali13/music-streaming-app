import pytest
from httpx import AsyncClient
import os
import sys

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from database import init_db
from providers.music_provider import AudiusProvider, get_music_provider

@pytest.fixture(autouse=True)
async def setup_db():
    await init_db()

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "provider" in data

@pytest.mark.asyncio
async def test_provider_search():
    provider = get_music_provider()
    assert provider is not None
    assert provider.provider_name in ["audius", "jamendo", "spotify"]

@pytest.mark.asyncio
async def test_user_registration_and_login():
    import uuid
    unique_user = f"user_{uuid.uuid4().hex[:6]}"
    unique_email = f"{unique_user}@example.com"

    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Register
        reg_res = await ac.post("/api/auth/register", json={
            "email": unique_email,
            "username": unique_user,
            "password": "SecurePassword123!",
            "display_name": "Test User"
        })
        assert reg_res.status_code == 201
        reg_data = reg_res.json()
        assert "access_token" in reg_data
        assert reg_data["user"]["email"] == unique_email

        token = reg_data["access_token"]

        # Get Me
        me_res = await ac.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        assert me_res.json()["username"] == unique_user

        # Create Playlist
        pl_res = await ac.post("/api/playlists", json={
            "title": "My Chill Playlist",
            "description": "Relaxing music",
            "is_public": True
        }, headers={"Authorization": f"Bearer {token}"})
        assert pl_res.status_code == 201
        pl_data = pl_res.json()
        assert pl_data["title"] == "My Chill Playlist"
