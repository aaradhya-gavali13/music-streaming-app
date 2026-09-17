import logging
from fastapi import APIRouter, HTTPException, status
from typing import List

import schemas
from providers.music_provider import get_music_provider

router = APIRouter(prefix="/api", tags=["Tracks & Catalog"])
logger = logging.getLogger("tracks_router")

@router.get("/home", response_model=schemas.HomeFeedResponse)
async def get_home():
    """Retrieve home feed with trending tracks, featured playlists, genres, and new releases."""
    provider = get_music_provider()
    try:
        feed = await provider.get_home_feed()
        return feed
    except Exception as e:
        logger.error(f"Failed to fetch home feed: {e}")
        # Return graceful empty feed instead of crashing 500
        return schemas.HomeFeedResponse(
            provider=provider.provider_name,
            trending=[],
            featured_playlists=[],
            genres=[],
            new_releases=[]
        )

@router.get("/tracks/{track_id}", response_model=schemas.TrackItem)
async def get_track(track_id: str):
    """Retrieve full track metadata from the active authorized music provider."""
    provider = get_music_provider()
    try:
        return await provider.get_track(track_id)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Error fetching track {track_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Music provider error retrieving track: {str(e)}"
        )

@router.get("/tracks/{track_id}/playback", response_model=schemas.PlaybackInfo)
async def get_playback(track_id: str):
    """
    Retrieve legitimate playback info and stream URL for a track.
    Adheres to provider terms (full stream, 30s preview, or official SDK requirement).
    Never serves unauthorized copyrighted files.
    """
    provider = get_music_provider()
    try:
        return await provider.get_playback(track_id)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Error retrieving playback for track {track_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Provider playback error: {str(e)}"
        )

@router.get("/artists/{artist_id}", response_model=schemas.ArtistItem)
async def get_artist(artist_id: str):
    """Retrieve artist profile metadata."""
    provider = get_music_provider()
    try:
        return await provider.get_artist(artist_id)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Error fetching artist {artist_id}: {e}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

@router.get("/artists/{artist_id}/tracks", response_model=List[schemas.TrackItem])
async def get_artist_tracks(artist_id: str, limit: int = 20):
    """Retrieve discography/top tracks for an artist."""
    provider = get_music_provider()
    try:
        return await provider.get_artist_tracks(artist_id, limit=limit)
    except Exception as e:
        logger.error(f"Error fetching artist tracks: {e}")
        return []

@router.get("/albums/{album_id}", response_model=schemas.AlbumItem)
async def get_album(album_id: str):
    """Retrieve album metadata and full track listing."""
    provider = get_music_provider()
    try:
        return await provider.get_album(album_id)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Error fetching album {album_id}: {e}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
