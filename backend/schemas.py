from typing import List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field

# --- Auth Schemas ---
class UserRegister(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, pattern=r"^[^@]+@[^@]+\.[^@]+$")
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)
    display_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str # email or username
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserRead"

class UserRead(BaseModel):
    id: int
    email: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Unified Catalog Schemas ---
class PlaybackInfo(BaseModel):
    track_id: str
    provider: str
    stream_url: Optional[str] = None
    playback_type: str = "direct_stream" # "direct_stream" | "30s_preview" | "official_sdk"
    format: str = "mp3"
    duration: int = 0
    requires_sdk: bool = False
    requires_user_auth: bool = False
    notes: Optional[str] = None

class TrackItem(BaseModel):
    id: str
    provider: str
    title: str
    artist: str
    artist_id: Optional[str] = None
    album: Optional[str] = None
    album_id: Optional[str] = None
    artwork_url: Optional[str] = None
    duration: int = 0 # seconds
    stream_url: Optional[str] = None
    playback_type: str = "direct_stream"
    genre: Optional[str] = None
    play_count: Optional[int] = 0
    release_date: Optional[str] = None
    is_explicit: bool = False
    provider_playback: Optional[PlaybackInfo] = None

class ArtistItem(BaseModel):
    id: str
    provider: str
    name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    track_count: Optional[int] = 0
    follower_count: Optional[int] = 0

class AlbumItem(BaseModel):
    id: str
    provider: str
    title: str
    artist: str
    artist_id: Optional[str] = None
    artwork_url: Optional[str] = None
    release_date: Optional[str] = None
    track_count: int = 0
    tracks: List[TrackItem] = []

class PlaylistItem(BaseModel):
    id: str
    provider: str
    title: str
    description: Optional[str] = None
    artwork_url: Optional[str] = None
    user_name: Optional[str] = None
    track_count: int = 0
    tracks: List[TrackItem] = []

class SearchResponse(BaseModel):
    query: str
    provider: str
    tracks: List[TrackItem] = []
    artists: List[ArtistItem] = []
    albums: List[AlbumItem] = []
    playlists: List[PlaylistItem] = []

class HomeFeedResponse(BaseModel):
    provider: str
    trending: List[TrackItem] = []
    featured_playlists: List[PlaylistItem] = []
    genres: List[dict] = []
    new_releases: List[TrackItem] = []

# --- Database User Content Schemas ---
class AddTrackRequest(BaseModel):
    provider_track_id: str
    title: str
    artist_name: str
    album_name: Optional[str] = None
    artwork_url: Optional[str] = None
    duration: int = 0
    stream_url: Optional[str] = None

class PlaylistTrackRead(BaseModel):
    id: int
    playlist_id: int
    provider_track_id: str
    title: str
    artist_name: str
    album_name: Optional[str] = None
    artwork_url: Optional[str] = None
    duration: int
    stream_url: Optional[str] = None
    position: int
    added_at: datetime

    class Config:
        from_attributes = True

class PlaylistCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    is_public: bool = True

class PlaylistUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None

class PlaylistRead(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    cover_image: Optional[str] = None
    is_public: bool
    created_at: datetime
    updated_at: datetime
    track_count: Optional[int] = 0
    tracks: List[PlaylistTrackRead] = []

    class Config:
        from_attributes = True

class FavoriteCreate(BaseModel):
    provider_track_id: str
    title: str
    artist_name: str
    album_name: Optional[str] = None
    artwork_url: Optional[str] = None
    duration: int = 0
    stream_url: Optional[str] = None

class FavoriteRead(BaseModel):
    id: int
    provider_track_id: str
    title: str
    artist_name: str
    album_name: Optional[str] = None
    artwork_url: Optional[str] = None
    duration: int
    stream_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class RecentlyPlayedRead(BaseModel):
    id: int
    provider_track_id: str
    title: str
    artist_name: str
    album_name: Optional[str] = None
    artwork_url: Optional[str] = None
    duration: int
    stream_url: Optional[str] = None
    played_at: datetime

    class Config:
        from_attributes = True
