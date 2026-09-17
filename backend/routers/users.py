from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["Favorites & History"])

# --- Favorites Endpoints ---

@router.get("/favorites", response_model=List[schemas.FavoriteRead])
async def get_favorites(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all favorite tracks for the authenticated user."""
    query = (
        select(models.Favorite)
        .where(models.Favorite.user_id == current_user.id)
        .order_by(models.Favorite.created_at.desc())
    )
    result = await db.execute(query)
    favorites = result.scalars().all()
    return [schemas.FavoriteRead.from_orm(f) for f in favorites]

@router.post("/favorites/{track_id}", response_model=schemas.FavoriteRead, status_code=status.HTTP_201_CREATED)
async def add_favorite(
    track_id: str,
    track_in: schemas.FavoriteCreate,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a track to the user's favorites collection."""
    # Check if already in favorites
    query = select(models.Favorite).where(
        models.Favorite.user_id == current_user.id,
        models.Favorite.provider_track_id == track_id
    )
    result = await db.execute(query)
    existing = result.scalars().first()
    if existing:
        return schemas.FavoriteRead.from_orm(existing)

    fav = models.Favorite(
        user_id=current_user.id,
        provider_track_id=track_id,
        title=track_in.title,
        artist_name=track_in.artist_name,
        album_name=track_in.album_name,
        artwork_url=track_in.artwork_url,
        duration=track_in.duration,
        stream_url=track_in.stream_url
    )
    db.add(fav)
    await db.commit()
    await db.refresh(fav)
    return schemas.FavoriteRead.from_orm(fav)

@router.delete("/favorites/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    track_id: str,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a track from favorites."""
    query = select(models.Favorite).where(
        models.Favorite.user_id == current_user.id,
        models.Favorite.provider_track_id == track_id
    )
    result = await db.execute(query)
    fav = result.scalars().first()
    if fav:
        await db.delete(fav)
        await db.commit()
    return None

# --- Recently Played History Endpoints ---

@router.get("/history", response_model=List[schemas.RecentlyPlayedRead])
async def get_history(
    limit: int = 50,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve the user's recent listening history."""
    query = (
        select(models.RecentlyPlayed)
        .where(models.RecentlyPlayed.user_id == current_user.id)
        .order_by(models.RecentlyPlayed.played_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    history = result.scalars().all()
    return [schemas.RecentlyPlayedRead.from_orm(h) for h in history]

@router.post("/history/{track_id}", response_model=schemas.RecentlyPlayedRead)
async def record_played_track(
    track_id: str,
    track_in: schemas.FavoriteCreate, # Reusing metadata payload
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Record a played track into listening history or update timestamp if replayed."""
    query = select(models.RecentlyPlayed).where(
        models.RecentlyPlayed.user_id == current_user.id,
        models.RecentlyPlayed.provider_track_id == track_id
    )
    result = await db.execute(query)
    existing = result.scalars().first()

    if existing:
        existing.played_at = datetime.utcnow()
        await db.commit()
        await db.refresh(existing)
        return schemas.RecentlyPlayedRead.from_orm(existing)

    item = models.RecentlyPlayed(
        user_id=current_user.id,
        provider_track_id=track_id,
        title=track_in.title,
        artist_name=track_in.artist_name,
        album_name=track_in.album_name,
        artwork_url=track_in.artwork_url,
        duration=track_in.duration,
        stream_url=track_in.stream_url,
        played_at=datetime.utcnow()
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return schemas.RecentlyPlayedRead.from_orm(item)

@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_history(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Clear all listening history for the authenticated user."""
    query = select(models.RecentlyPlayed).where(models.RecentlyPlayed.user_id == current_user.id)
    result = await db.execute(query)
    for row in result.scalars().all():
        await db.delete(row)
    await db.commit()
    return None
