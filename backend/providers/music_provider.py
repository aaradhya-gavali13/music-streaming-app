import os
import time
import httpx
import logging
from typing import List, Optional, Dict, Any
from .base import MusicProvider
from schemas import (
    SearchResponse, TrackItem, ArtistItem, AlbumItem,
    PlaylistItem, PlaybackInfo, HomeFeedResponse
)

logger = logging.getLogger("music_provider")
logger.setLevel(logging.INFO)

# =====================================================================
# 1. Audius Provider (Default - Legitimate Open Catalog & Official Stream)
# =====================================================================
class AudiusProvider(MusicProvider):
    """
    Audius Protocol Provider.
    Catalog: 1,000,000+ tracks by independent artists, electronic, hip-hop, indie, and more.
    Legality: Audius provides an open decentralized API and officially provides an authorized
    streaming endpoint (/v1/tracks/{track_id}/stream) for third-party client playback.
    Requires no paid user subscription or DRM bypass.
    """

    def __init__(self, app_name: str = "ModernMusicStreamApp"):
        self.app_name = app_name
        self.default_host = "https://discoveryprovider.audius.co"
        self._cached_host: Optional[str] = None
        self._host_expiry: float = 0

    @property
    def provider_name(self) -> str:
        return "audius"

    @property
    def catalog_description(self) -> str:
        return "Audius Open Protocol: 1,000,000+ tracks legally streamable via official API."

    async def _get_host(self) -> str:
        """Resolve an active Audius Discovery node with caching and fallback."""
        now = time.time()
        if self._cached_host and now < self._host_expiry:
            return self._cached_host

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(f"https://api.audius.co?app_name={self.app_name}")
                if res.status_code == 200:
                    hosts = res.json().get("data", [])
                    if hosts:
                        self._cached_host = hosts[0].rstrip("/")
                        self._host_expiry = now + 1800 # 30 min cache
                        return self._cached_host
        except Exception as e:
            logger.warning(f"Could not discover Audius hosts dynamically: {e}. Using fallback.")

        self._cached_host = self.default_host
        return self._cached_host

    def _format_track(self, raw: Dict[str, Any], host: str) -> TrackItem:
        track_id = str(raw.get("id", ""))
        user = raw.get("user") or {}
        artist_name = user.get("name") or user.get("handle") or "Unknown Artist"
        artist_id = str(user.get("id") or "")
        
        # Resolve best artwork URL
        artwork = None
        artwork_dict = raw.get("artwork") or {}
        if isinstance(artwork_dict, dict):
            artwork = artwork_dict.get("480x480") or artwork_dict.get("150x150") or artwork_dict.get("1000x1000")
        if not artwork and raw.get("cover_art_sizes"):
            artwork = f"https://creatornode.audius.co/ipfs/{raw.get('cover_art_sizes')}/480x480.jpg"

        duration = int(raw.get("duration", 0))
        stream_url = f"{host}/v1/tracks/{track_id}/stream?app_name={self.app_name}"

        return TrackItem(
            id=track_id,
            provider="audius",
            title=raw.get("title", "Untitled Track"),
            artist=artist_name,
            artist_id=artist_id,
            album=raw.get("album_name") or "Single",
            artwork_url=artwork,
            duration=duration,
            stream_url=stream_url,
            playback_type="direct_stream",
            genre=raw.get("genre"),
            play_count=raw.get("play_count", 0),
            release_date=raw.get("release_date"),
            is_explicit=bool(raw.get("is_explicit", False)),
            provider_playback=PlaybackInfo(
                track_id=track_id,
                provider="audius",
                stream_url=stream_url,
                playback_type="direct_stream",
                format="mp3",
                duration=duration,
                requires_sdk=False,
                requires_user_auth=False,
                notes="Official Audius direct stream"
            )
        )

    def _format_artist(self, raw: Dict[str, Any]) -> ArtistItem:
        user_id = str(raw.get("id", ""))
        profile_picture = None
        pic_dict = raw.get("profile_picture") or {}
        if isinstance(pic_dict, dict):
            profile_picture = pic_dict.get("480x480") or pic_dict.get("150x150")
        
        banner = None
        banner_dict = raw.get("cover_photo") or {}
        if isinstance(banner_dict, dict):
            banner = banner_dict.get("640x") or banner_dict.get("2000x")

        return ArtistItem(
            id=user_id,
            provider="audius",
            name=raw.get("name") or raw.get("handle") or "Unknown Artist",
            bio=raw.get("bio"),
            avatar_url=profile_picture,
            banner_url=banner,
            track_count=raw.get("track_count", 0),
            follower_count=raw.get("follower_count", 0)
        )

    def _format_playlist(self, raw: Dict[str, Any]) -> PlaylistItem:
        playlist_id = str(raw.get("id", ""))
        artwork = None
        art_dict = raw.get("artwork") or {}
        if isinstance(art_dict, dict):
            artwork = art_dict.get("480x480") or art_dict.get("150x150")
        
        user = raw.get("user") or {}
        user_name = user.get("name") or user.get("handle") or "Audius User"

        return PlaylistItem(
            id=playlist_id,
            provider="audius",
            title=raw.get("playlist_name") or "Playlist",
            description=raw.get("description"),
            artwork_url=artwork,
            user_name=user_name,
            track_count=raw.get("total_play_count", 0) or len(raw.get("tracks", []))
        )

    async def search(self, query: str, search_type: str = "all", limit: int = 20) -> SearchResponse:
        host = await self._get_host()
        tracks: List[TrackItem] = []
        artists: List[ArtistItem] = []
        playlists: List[PlaylistItem] = []

        async with httpx.AsyncClient(timeout=8.0) as client:
            # Search tracks
            if search_type in ("all", "tracks"):
                try:
                    res = await client.get(
                        f"{host}/v1/tracks/search",
                        params={"query": query, "limit": limit, "app_name": self.app_name}
                    )
                    if res.status_code == 200:
                        for item in res.json().get("data", []):
                            tracks.append(self._format_track(item, host))
                except Exception as e:
                    logger.error(f"Audius search tracks failed: {e}")

            # Search users/artists
            if search_type in ("all", "artists"):
                try:
                    res = await client.get(
                        f"{host}/v1/users/search",
                        params={"query": query, "limit": limit, "app_name": self.app_name}
                    )
                    if res.status_code == 200:
                        for item in res.json().get("data", []):
                            artists.append(self._format_artist(item))
                except Exception as e:
                    logger.error(f"Audius search artists failed: {e}")

            # Search playlists
            if search_type in ("all", "playlists", "albums"):
                try:
                    res = await client.get(
                        f"{host}/v1/playlists/search",
                        params={"query": query, "limit": limit, "app_name": self.app_name}
                    )
                    if res.status_code == 200:
                        for item in res.json().get("data", []):
                            playlists.append(self._format_playlist(item))
                except Exception as e:
                    logger.error(f"Audius search playlists failed: {e}")

        return SearchResponse(
            query=query,
            provider="audius",
            tracks=tracks,
            artists=artists,
            albums=[],
            playlists=playlists
        )

    async def get_track(self, track_id: str) -> TrackItem:
        host = await self._get_host()
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(
                f"{host}/v1/tracks/{track_id}",
                params={"app_name": self.app_name}
            )
            if res.status_code != 200:
                raise ValueError(f"Track {track_id} not found on Audius")
            data = res.json().get("data")
            if not data:
                raise ValueError(f"Track {track_id} not found")
            return self._format_track(data, host)

    async def get_artist(self, artist_id: str) -> ArtistItem:
        host = await self._get_host()
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(
                f"{host}/v1/users/{artist_id}",
                params={"app_name": self.app_name}
            )
            if res.status_code != 200:
                raise ValueError(f"Artist {artist_id} not found on Audius")
            data = res.json().get("data")
            if not data:
                raise ValueError(f"Artist {artist_id} not found")
            return self._format_artist(data)

    async def get_artist_tracks(self, artist_id: str, limit: int = 20) -> List[TrackItem]:
        host = await self._get_host()
        tracks: List[TrackItem] = []
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(
                f"{host}/v1/users/{artist_id}/tracks",
                params={"limit": limit, "app_name": self.app_name}
            )
            if res.status_code == 200:
                for item in res.json().get("data", []):
                    tracks.append(self._format_track(item, host))
        return tracks

    async def get_album(self, album_id: str) -> AlbumItem:
        # Audius models albums as playlists with is_album=True
        host = await self._get_host()
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(
                f"{host}/v1/playlists/{album_id}",
                params={"app_name": self.app_name}
            )
            if res.status_code != 200:
                raise ValueError(f"Album/Playlist {album_id} not found")
            data = res.json().get("data", [])
            item = data[0] if isinstance(data, list) and data else data
            user = item.get("user") or {}
            
            artwork = None
            art_dict = item.get("artwork") or {}
            if isinstance(art_dict, dict):
                artwork = art_dict.get("480x480") or art_dict.get("150x150")

            # Fetch tracks inside playlist
            tracks_res = await client.get(
                f"{host}/v1/playlists/{album_id}/tracks",
                params={"app_name": self.app_name}
            )
            tracks: List[TrackItem] = []
            if tracks_res.status_code == 200:
                for t in tracks_res.json().get("data", []):
                    tracks.append(self._format_track(t, host))

            return AlbumItem(
                id=str(album_id),
                provider="audius",
                title=item.get("playlist_name", "Album"),
                artist=user.get("name") or "Artist",
                artist_id=str(user.get("id") or ""),
                artwork_url=artwork,
                release_date=item.get("updated_at"),
                track_count=len(tracks),
                tracks=tracks
            )

    async def get_playback(self, track_id: str) -> PlaybackInfo:
        host = await self._get_host()
        track = await self.get_track(track_id)
        stream_url = f"{host}/v1/tracks/{track_id}/stream?app_name={self.app_name}"
        return PlaybackInfo(
            track_id=track_id,
            provider="audius",
            stream_url=stream_url,
            playback_type="direct_stream",
            format="mp3",
            duration=track.duration,
            requires_sdk=False,
            requires_user_auth=False,
            notes="Official authorized Audius stream."
        )

    async def get_home_feed(self) -> HomeFeedResponse:
        host = await self._get_host()
        trending: List[TrackItem] = []
        playlists: List[PlaylistItem] = []

        async with httpx.AsyncClient(timeout=8.0) as client:
            try:
                res = await client.get(
                    f"{host}/v1/tracks/trending",
                    params={"limit": 24, "app_name": self.app_name}
                )
                if res.status_code == 200:
                    for item in res.json().get("data", []):
                        trending.append(self._format_track(item, host))
            except Exception as e:
                logger.error(f"Audius trending error: {e}")

            try:
                res = await client.get(
                    f"{host}/v1/playlists/trending",
                    params={"limit": 8, "app_name": self.app_name}
                )
                if res.status_code == 200:
                    for item in res.json().get("data", []):
                        playlists.append(self._format_playlist(item))
            except Exception as e:
                logger.error(f"Audius trending playlists error: {e}")

        genres = [
            {"id": "Electronic", "name": "Electronic", "color": "#6366f1"},
            {"id": "Hip-Hop/Rap", "name": "Hip-Hop & Rap", "color": "#ec4899"},
            {"id": "Pop", "name": "Pop", "color": "#f59e0b"},
            {"id": "Rock", "name": "Rock", "color": "#ef4444"},
            {"id": "Lo-Fi", "name": "Chill / Lo-Fi", "color": "#10b981"},
            {"id": "Ambient", "name": "Ambient & Acoustic", "color": "#06b6d4"},
            {"id": "R&B", "name": "R&B / Soul", "color": "#8b5cf6"},
            {"id": "Dance", "name": "House & Dance", "color": "#14b8a6"},
        ]

        return HomeFeedResponse(
            provider="audius",
            trending=trending,
            featured_playlists=playlists,
            genres=genres,
            new_releases=trending[:10]
        )


# =====================================================================
# 2. Jamendo Provider (Creative Commons / Free Licensed Music API)
# =====================================================================
class JamendoProvider(MusicProvider):
    """
    Jamendo Music Provider (v3.0).
    Catalog: 600,000+ tracks licensed under Creative Commons.
    Legality: Jamendo API explicitly provides stream URLs ('audio' field)
    for third-party non-commercial streaming under developer API terms.
    """

    def __init__(self, client_id: Optional[str] = None):
        # Default public client ID for testing if not set
        self.client_id = client_id or os.getenv("JAMENDO_CLIENT_ID", "56d30c95")
        self.base_url = "https://api.jamendo.com/v3.0"

    @property
    def provider_name(self) -> str:
        return "jamendo"

    @property
    def catalog_description(self) -> str:
        return "Jamendo: 600,000+ Creative Commons tracks with official audio streaming."

    async def search(self, query: str, search_type: str = "all", limit: int = 20) -> SearchResponse:
        tracks: List[TrackItem] = []
        async with httpx.AsyncClient(timeout=8.0) as client:
            try:
                res = await client.get(
                    f"{self.base_url}/tracks",
                    params={
                        "client_id": self.client_id,
                        "format": "json",
                        "limit": limit,
                        "namesearch": query,
                        "include": "musicinfo"
                    }
                )
                if res.status_code == 200:
                    data = res.json().get("results", [])
                    for item in data:
                        tracks.append(TrackItem(
                            id=str(item.get("id")),
                            provider="jamendo",
                            title=item.get("name", "Unknown Track"),
                            artist=item.get("artist_name", "Unknown Artist"),
                            artist_id=str(item.get("artist_id")),
                            album=item.get("album_name"),
                            album_id=str(item.get("album_id")),
                            artwork_url=item.get("image") or item.get("album_image"),
                            duration=int(item.get("duration", 0)),
                            stream_url=item.get("audio"),
                            playback_type="direct_stream",
                            genre=item.get("musicinfo", {}).get("vocalinstrumental")
                        ))
            except Exception as e:
                logger.error(f"Jamendo search error: {e}")

        return SearchResponse(
            query=query,
            provider="jamendo",
            tracks=tracks,
            artists=[],
            albums=[],
            playlists=[]
        )

    async def get_track(self, track_id: str) -> TrackItem:
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(
                f"{self.base_url}/tracks",
                params={"client_id": self.client_id, "format": "json", "id": track_id}
            )
            results = res.json().get("results", [])
            if not results:
                raise ValueError(f"Track {track_id} not found on Jamendo")
            item = results[0]
            return TrackItem(
                id=str(item.get("id")),
                provider="jamendo",
                title=item.get("name", "Unknown"),
                artist=item.get("artist_name", "Unknown"),
                artist_id=str(item.get("artist_id")),
                album=item.get("album_name"),
                artwork_url=item.get("image"),
                duration=int(item.get("duration", 0)),
                stream_url=item.get("audio"),
                playback_type="direct_stream"
            )

    async def get_artist(self, artist_id: str) -> ArtistItem:
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(
                f"{self.base_url}/artists",
                params={"client_id": self.client_id, "format": "json", "id": artist_id}
            )
            results = res.json().get("results", [])
            if not results:
                raise ValueError(f"Artist {artist_id} not found")
            item = results[0]
            return ArtistItem(
                id=str(item.get("id")),
                provider="jamendo",
                name=item.get("name"),
                avatar_url=item.get("image")
            )

    async def get_artist_tracks(self, artist_id: str, limit: int = 20) -> List[TrackItem]:
        tracks: List[TrackItem] = []
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(
                f"{self.base_url}/tracks",
                params={"client_id": self.client_id, "format": "json", "artist_id": artist_id, "limit": limit}
            )
            for item in res.json().get("results", []):
                tracks.append(TrackItem(
                    id=str(item.get("id")),
                    provider="jamendo",
                    title=item.get("name"),
                    artist=item.get("artist_name"),
                    artwork_url=item.get("image"),
                    duration=int(item.get("duration", 0)),
                    stream_url=item.get("audio"),
                    playback_type="direct_stream"
                ))
        return tracks

    async def get_album(self, album_id: str) -> AlbumItem:
        tracks: List[TrackItem] = []
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(
                f"{self.base_url}/tracks",
                params={"client_id": self.client_id, "format": "json", "album_id": album_id}
            )
            results = res.json().get("results", [])
            album_title = "Album"
            artist_name = "Artist"
            artwork = None
            if results:
                album_title = results[0].get("album_name") or "Album"
                artist_name = results[0].get("artist_name") or "Artist"
                artwork = results[0].get("album_image")
            for item in results:
                tracks.append(TrackItem(
                    id=str(item.get("id")),
                    provider="jamendo",
                    title=item.get("name"),
                    artist=item.get("artist_name"),
                    duration=int(item.get("duration", 0)),
                    stream_url=item.get("audio"),
                    artwork_url=artwork,
                    playback_type="direct_stream"
                ))
            return AlbumItem(
                id=str(album_id),
                provider="jamendo",
                title=album_title,
                artist=artist_name,
                artwork_url=artwork,
                track_count=len(tracks),
                tracks=tracks
            )

    async def get_playback(self, track_id: str) -> PlaybackInfo:
        track = await self.get_track(track_id)
        return PlaybackInfo(
            track_id=track_id,
            provider="jamendo",
            stream_url=track.stream_url,
            playback_type="direct_stream",
            format="mp3",
            duration=track.duration,
            requires_sdk=False,
            requires_user_auth=False,
            notes="Jamendo Creative Commons official stream"
        )

    async def get_home_feed(self) -> HomeFeedResponse:
        tracks: List[TrackItem] = []
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(
                f"{self.base_url}/tracks",
                params={"client_id": self.client_id, "format": "json", "limit": 20, "order": "popularity_total"}
            )
            for item in res.json().get("results", []):
                tracks.append(TrackItem(
                    id=str(item.get("id")),
                    provider="jamendo",
                    title=item.get("name"),
                    artist=item.get("artist_name"),
                    artwork_url=item.get("image"),
                    duration=int(item.get("duration", 0)),
                    stream_url=item.get("audio"),
                    playback_type="direct_stream"
                ))

        return HomeFeedResponse(
            provider="jamendo",
            trending=tracks,
            featured_playlists=[],
            genres=[],
            new_releases=tracks[:8]
        )


# =====================================================================
# 3. Spotify Provider (Official Web API & SDK Integration Adapter)
# =====================================================================
class SpotifyProvider(MusicProvider):
    """
    Spotify Web API Provider.
    Catalog: 100,000,000+ tracks.
    Legality and Rights:
    - Spotify Web API provides access to official track, artist, album metadata.
    - Spotify has deprecated open 30-sec previews on most endpoints.
    - Official full playback STRICTLY REQUIRES:
        1. Official Spotify Web Playback SDK (loaded in browser)
        2. User's active Spotify Premium subscription
        3. User OAuth authorization with 'streaming' scope.
    - Scraping or extracting audio files from Spotify is strictly forbidden by Spotify ToS.
    """

    def __init__(self, client_id: Optional[str] = None, client_secret: Optional[str] = None):
        self.client_id = client_id or os.getenv("MUSIC_PROVIDER_CLIENT_ID") or os.getenv("SPOTIFY_CLIENT_ID")
        self.client_secret = client_secret or os.getenv("MUSIC_PROVIDER_CLIENT_SECRET") or os.getenv("SPOTIFY_CLIENT_SECRET")
        self._access_token: Optional[str] = None
        self._token_expiry: float = 0

    @property
    def provider_name(self) -> str:
        return "spotify"

    @property
    def catalog_description(self) -> str:
        return "Spotify Official Catalog: 100M+ tracks metadata. Full playback requires Spotify Web Playback SDK + Premium."

    async def _get_token(self) -> str:
        now = time.time()
        if self._access_token and now < self._token_expiry:
            return self._access_token

        if not self.client_id or not self.client_secret:
            raise ValueError(
                "Spotify credentials not configured. Please set SPOTIFY_CLIENT_ID and "
                "SPOTIFY_CLIENT_SECRET in your .env or use MUSIC_PROVIDER=audius (no keys required)."
            )

        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post(
                "https://accounts.spotify.com/api/token",
                data={"grant_type": "client_credentials"},
                auth=(self.client_id, self.client_secret)
            )
            if res.status_code != 200:
                raise ValueError(f"Spotify token request failed: {res.text}")
            data = res.json()
            self._access_token = data["access_token"]
            self._token_expiry = now + data.get("expires_in", 3600) - 60
            return self._access_token

    def _headers(self, token: str) -> Dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    async def search(self, query: str, search_type: str = "all", limit: int = 20) -> SearchResponse:
        token = await self._get_token()
        types = "track,artist,album,playlist" if search_type == "all" else search_type.rstrip("s")

        tracks: List[TrackItem] = []
        artists: List[ArtistItem] = []
        albums: List[AlbumItem] = []

        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.get(
                "https://api.spotify.com/v1/search",
                headers=self._headers(token),
                params={"q": query, "type": types, "limit": limit}
            )
            if res.status_code == 200:
                data = res.json()
                for t in data.get("tracks", {}).get("items", []):
                    art = t.get("album", {}).get("images", [{}])[0].get("url") if t.get("album", {}).get("images") else None
                    tracks.append(TrackItem(
                        id=t["id"],
                        provider="spotify",
                        title=t["name"],
                        artist=t["artists"][0]["name"] if t.get("artists") else "Unknown",
                        artist_id=t["artists"][0]["id"] if t.get("artists") else None,
                        album=t.get("album", {}).get("name"),
                        album_id=t.get("album", {}).get("id"),
                        artwork_url=art,
                        duration=int(t.get("duration_ms", 0) / 1000),
                        stream_url=t.get("preview_url"),
                        playback_type="official_sdk" if not t.get("preview_url") else "30s_preview",
                        is_explicit=t.get("explicit", False),
                        provider_playback=PlaybackInfo(
                            track_id=t["id"],
                            provider="spotify",
                            stream_url=t.get("preview_url"),
                            playback_type="official_sdk",
                            requires_sdk=True,
                            requires_user_auth=True,
                            notes="Requires Spotify Web Playback SDK with Spotify Premium subscription."
                        )
                    ))

        return SearchResponse(query=query, provider="spotify", tracks=tracks, artists=artists, albums=albums, playlists=[])

    async def get_track(self, track_id: str) -> TrackItem:
        token = await self._get_token()
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(f"https://api.spotify.com/v1/tracks/{track_id}", headers=self._headers(token))
            if res.status_code != 200:
                raise ValueError(f"Spotify track {track_id} not found")
            t = res.json()
            art = t.get("album", {}).get("images", [{}])[0].get("url") if t.get("album", {}).get("images") else None
            return TrackItem(
                id=t["id"],
                provider="spotify",
                title=t["name"],
                artist=t["artists"][0]["name"] if t.get("artists") else "Unknown",
                album=t.get("album", {}).get("name"),
                artwork_url=art,
                duration=int(t.get("duration_ms", 0) / 1000),
                stream_url=t.get("preview_url"),
                playback_type="official_sdk"
            )

    async def get_artist(self, artist_id: str) -> ArtistItem:
        token = await self._get_token()
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(f"https://api.spotify.com/v1/artists/{artist_id}", headers=self._headers(token))
            if res.status_code != 200:
                raise ValueError(f"Artist {artist_id} not found")
            a = res.json()
            avatar = a.get("images", [{}])[0].get("url") if a.get("images") else None
            return ArtistItem(id=a["id"], provider="spotify", name=a["name"], avatar_url=avatar)

    async def get_artist_tracks(self, artist_id: str, limit: int = 20) -> List[TrackItem]:
        token = await self._get_token()
        tracks: List[TrackItem] = []
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(
                f"https://api.spotify.com/v1/artists/{artist_id}/top-tracks",
                headers=self._headers(token),
                params={"market": "US"}
            )
            if res.status_code == 200:
                for t in res.json().get("tracks", [])[:limit]:
                    art = t.get("album", {}).get("images", [{}])[0].get("url") if t.get("album", {}).get("images") else None
                    tracks.append(TrackItem(
                        id=t["id"],
                        provider="spotify",
                        title=t["name"],
                        artist=t["artists"][0]["name"],
                        artwork_url=art,
                        duration=int(t.get("duration_ms", 0) / 1000),
                        stream_url=t.get("preview_url"),
                        playback_type="official_sdk"
                    ))
        return tracks

    async def get_album(self, album_id: str) -> AlbumItem:
        token = await self._get_token()
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(f"https://api.spotify.com/v1/albums/{album_id}", headers=self._headers(token))
            if res.status_code != 200:
                raise ValueError(f"Album {album_id} not found")
            alb = res.json()
            art = alb.get("images", [{}])[0].get("url") if alb.get("images") else None
            tracks: List[TrackItem] = []
            for t in alb.get("tracks", {}).get("items", []):
                tracks.append(TrackItem(
                    id=t["id"],
                    provider="spotify",
                    title=t["name"],
                    artist=t["artists"][0]["name"],
                    artwork_url=art,
                    duration=int(t.get("duration_ms", 0) / 1000),
                    stream_url=t.get("preview_url"),
                    playback_type="official_sdk"
                ))
            return AlbumItem(
                id=alb["id"],
                provider="spotify",
                title=alb["name"],
                artist=alb["artists"][0]["name"],
                artwork_url=art,
                track_count=len(tracks),
                tracks=tracks
            )

    async def get_playback(self, track_id: str) -> PlaybackInfo:
        return PlaybackInfo(
            track_id=track_id,
            provider="spotify",
            stream_url=None,
            playback_type="official_sdk",
            format="spotify_uri",
            duration=0,
            requires_sdk=True,
            requires_user_auth=True,
            notes="Requires Spotify Web Playback SDK and active Spotify Premium user subscription."
        )

    async def get_home_feed(self) -> HomeFeedResponse:
        token = await self._get_token()
        releases: List[TrackItem] = []
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(
                "https://api.spotify.com/v1/browse/new-releases",
                headers=self._headers(token),
                params={"limit": 20}
            )
            if res.status_code == 200:
                for alb in res.json().get("albums", {}).get("items", []):
                    art = alb.get("images", [{}])[0].get("url") if alb.get("images") else None
                    releases.append(TrackItem(
                        id=alb["id"],
                        provider="spotify",
                        title=alb["name"],
                        artist=alb["artists"][0]["name"],
                        artwork_url=art,
                        duration=0,
                        playback_type="official_sdk"
                    ))
        return HomeFeedResponse(provider="spotify", trending=releases, featured_playlists=[], genres=[], new_releases=releases)


# =====================================================================
# 4. Provider Factory & Singleton
# =====================================================================
_provider_instance: Optional[MusicProvider] = None

def get_music_provider() -> MusicProvider:
    """
    Returns the configured MusicProvider singleton.
    Can be switched seamlessly via MUSIC_PROVIDER env variable:
    - 'audius' (Default, 1M+ tracks, official open REST streaming, no keys needed)
    - 'jamendo' (Creative Commons music, 600k+ tracks)
    - 'spotify' (Official metadata + Web Playback SDK)
    """
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    provider_type = os.getenv("MUSIC_PROVIDER", "audius").lower().strip()

    if provider_type == "spotify":
        logger.info("Initializing SpotifyProvider (Metadata + Official Web Playback SDK)")
        _provider_instance = SpotifyProvider()
    elif provider_type == "jamendo":
        logger.info("Initializing JamendoProvider (Creative Commons Licensed Catalog)")
        _provider_instance = JamendoProvider()
    else:
        logger.info("Initializing AudiusProvider (Default: 1,000,000+ open legal tracks)")
        _provider_instance = AudiusProvider()

    return _provider_instance
