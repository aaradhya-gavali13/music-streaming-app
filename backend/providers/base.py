from abc import ABC, abstractmethod
from typing import List, Optional
from schemas import SearchResponse, TrackItem, ArtistItem, AlbumItem, PlaylistItem, PlaybackInfo, HomeFeedResponse

class MusicProvider(ABC):
    """
    Abstract Base Class defining the interface for legal music catalog and playback providers.
    All provider integrations must inherit from this class and implement its methods using
    only authorized APIs and official streaming protocols.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g., 'audius', 'jamendo', 'spotify')."""
        pass

    @property
    @abstractmethod
    def catalog_description(self) -> str:
        """Brief description of the catalog size, licensing, and legal terms."""
        pass

    @abstractmethod
    async def search(self, query: str, search_type: str = "all", limit: int = 20) -> SearchResponse:
        """
        Search tracks, artists, albums, and playlists.
        search_type can be 'all', 'tracks', 'artists', 'albums', 'playlists'.
        """
        pass

    @abstractmethod
    async def get_track(self, track_id: str) -> TrackItem:
        """Retrieve complete metadata for a single track by provider ID."""
        pass

    @abstractmethod
    async def get_artist(self, artist_id: str) -> ArtistItem:
        """Retrieve artist profile metadata by provider ID."""
        pass

    @abstractmethod
    async def get_artist_tracks(self, artist_id: str, limit: int = 20) -> List[TrackItem]:
        """Retrieve tracks by an artist."""
        pass

    @abstractmethod
    async def get_album(self, album_id: str) -> AlbumItem:
        """Retrieve album metadata and its track listing."""
        pass

    @abstractmethod
    async def get_playback(self, track_id: str) -> PlaybackInfo:
        """
        Retrieve authorized playback information (stream URL, SDK requirements, preview flag).
        Must never proxy or redistribute unauthorized copyrighted audio.
        """
        pass

    @abstractmethod
    async def get_home_feed(self) -> HomeFeedResponse:
        """Retrieve trending tracks, featured playlists, genres, and new releases."""
        pass
