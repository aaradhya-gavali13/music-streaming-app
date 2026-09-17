from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter(prefix="/api/playlists", tags=["Playlists"])

@router.post("", response_model=schemas.PlaylistRead, status_code=status.HTTP_201_CREATED)
async def create_playlist(
    playlist_in: schemas.PlaylistCreate,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new playlist for the authenticated user."""
    new_playlist = models.Playlist(
        user_id=current_user.id,
        title=playlist_in.title,
        description=playlist_in.description,
        is_public=playlist_in.is_public
    )
    db.add(new_playlist)
    await db.commit()
    await db.refresh(new_playlist)

    return schemas.PlaylistRead(
        id=new_playlist.id,
        user_id=new_playlist.user_id,
        title=new_playlist.title,
        description=new_playlist.description,
        cover_image=new_playlist.cover_image,
        is_public=new_playlist.is_public,
        created_at=new_playlist.created_at,
        updated_at=new_playlist.updated_at,
        track_count=0,
        tracks=[]
    )

@router.get("", response_model=List[schemas.PlaylistRead])
async def get_my_playlists(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all playlists owned by the authenticated user."""
    query = (
        select(models.Playlist)
        .where(models.Playlist.user_id == current_user.id)
        .options(selectinload(models.Playlist.tracks))
        .order_by(models.Playlist.created_at.desc())
    )
    result = await db.execute(query)
    playlists = result.scalars().all()

    response: List[schemas.PlaylistRead] = []
    for p in playlists:
        tracks_read = [schemas.PlaylistTrackRead.from_orm(t) for t in p.tracks]
        response.append(schemas.PlaylistRead(
            id=p.id,
            user_id=p.user_id,
            title=p.title,
            description=p.description,
            cover_image=p.cover_image or (tracks_read[0].artwork_url if tracks_read else None),
            is_public=p.is_public,
            created_at=p.created_at,
            updated_at=p.updated_at,
            track_count=len(tracks_read),
            tracks=tracks_read
        ))
    return response

@router.get("/{playlist_id}", response_model=schemas.PlaylistRead)
async def get_playlist(
    playlist_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve details and track listing for a specific playlist."""
    query = (
        select(models.Playlist)
        .where(models.Playlist.id == playlist_id)
        .options(selectinload(models.Playlist.tracks))
    )
    result = await db.execute(query)
    playlist = result.scalars().first()
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")

    tracks_read = [schemas.PlaylistTrackRead.from_orm(t) for t in playlist.tracks]
    return schemas.PlaylistRead(
        id=playlist.id,
        user_id=playlist.user_id,
        title=playlist.title,
        description=playlist.description,
        cover_image=playlist.cover_image or (tracks_read[0].artwork_url if tracks_read else None),
        is_public=playlist.is_public,
        created_at=playlist.created_at,
        updated_at=playlist.updated_at,
        track_count=len(tracks_read),
        tracks=tracks_read
    )

@router.delete("/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_playlist(
    playlist_id: int,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a playlist owned by the authenticated user."""
    query = select(models.Playlist).where(
        models.Playlist.id == playlist_id,
        models.Playlist.user_id == current_user.id
    )
    result = await db.execute(query)
    playlist = result.scalars().first()
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found or unauthorized")

    await db.delete(playlist)
    await db.commit()
    return None

@router.post("/{playlist_id}/tracks", response_model=schemas.PlaylistTrackRead, status_code=status.HTTP_201_CREATED)
async def add_track_to_playlist(
    playlist_id: int,
    track_in: schemas.AddTrackRequest,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a track to a playlist owned by the authenticated user."""
    # Verify playlist ownership
    p_query = select(models.Playlist).where(
        models.Playlist.id == playlist_id,
        models.Playlist.user_id == current_user.id
    ).options(selectinload(models.Playlist.tracks))
    result = await db.execute(p_query)
    playlist = result.scalars().first()
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found or unauthorized")

    # Check if track already in playlist
    for t in playlist.tracks:
        if t.provider_track_id == track_in.provider_track_id:
            raise HTTPException(status_code=400, detail="Track is already in this playlist")

    new_track = models.PlaylistTrack(
        playlist_id=playlist_id,
        provider_track_id=track_in.provider_track_id,
        title=track_in.title,
        artist_name=track_in.artist_name,
        album_name=track_in.album_name,
        artwork_url=track_in.artwork_url,
        duration=track_in.duration,
        stream_url=track_in.stream_url,
        position=len(playlist.tracks)
    )
    db.add(new_track)
    await db.commit()
    await db.refresh(new_track)
    return schemas.PlaylistTrackRead.from_orm(new_track)

@router.delete("/{playlist_id}/tracks/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_track_from_playlist(
    playlist_id: int,
    track_id: str,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a track from a playlist by provider_track_id."""
    p_query = select(models.Playlist).where(
        models.Playlist.id == playlist_id,
        models.Playlist.user_id == current_user.id
    )
    result = await db.execute(p_query)
    if not result.scalars().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found or unauthorized")

    t_query = select(models.PlaylistTrack).where(
        models.PlaylistTrack.playlist_id == playlist_id,
        models.PlaylistTrack.provider_track_id == track_id
    )
    t_result = await db.execute(t_query)
    track = t_result.scalars().first()
    if not track:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Track not found in playlist")

    await db.delete(track)
    await db.commit()
    return None
