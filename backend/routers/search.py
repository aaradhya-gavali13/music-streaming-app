import logging
from fastapi import APIRouter, Query, HTTPException, status
from typing import Optional

import schemas
from providers.music_provider import get_music_provider

router = APIRouter(prefix="/api", tags=["Search"])
logger = logging.getLogger("search_router")

@router.get("/search", response_model=schemas.SearchResponse)
async def search_catalog(
    q: str = Query(..., min_length=1, description="Search term for tracks, artists, albums"),
    type: Optional[str] = Query("all", description="Type of search: all, tracks, artists, albums, playlists"),
    limit: Optional[int] = Query(20, ge=1, le=50, description="Max results per category")
):
    """
    Search the authorized music catalog for tracks, artists, albums, and playlists.
    Connects directly to the active legal provider API without manual track uploads.
    """
    clean_q = q.strip()
    if not clean_q:
        return schemas.SearchResponse(
            query=q,
            provider="unknown",
            tracks=[],
            artists=[],
            albums=[],
            playlists=[]
        )

    provider = get_music_provider()
    try:
        results = await provider.search(query=clean_q, search_type=type, limit=limit)
        return results
    except Exception as e:
        logger.error(f"Search failed for query '{q}': {e}")
        # Return empty response instead of hard 500 so UI can display friendly empty state
        return schemas.SearchResponse(
            query=clean_q,
            provider=provider.provider_name,
            tracks=[],
            artists=[],
            albums=[],
            playlists=[]
        )
