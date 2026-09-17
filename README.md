# AuraSound - Production-Grade Legal Music Streaming Application

AuraSound is a full-stack, production-style music streaming application designed to provide rich music discovery and streaming through authorized music APIs and licensed catalog providers.

---

## 1. Legal Compliance & Rights Architecture

### The Core Law & Copyright Principle
AuraSound strictly adheres to the principle that **metadata access and audio playback rights are completely separate legal domains**:

1. **No Scraping & No DRM Bypass**:
   - The application **never** scrapes Spotify, YouTube, JioSaavn, Gaana, Apple Music, or other services.
   - It **never** extracts raw MP3s from unauthorized CDNs, reverse-engineers encrypted keys, or circumvents advertisements, subscription paywalls, or geographic fences.
   - It **never** downloads, caches, or redistributes copyrighted audio files without authorization.

2. **Storage of Metadata Only**:
   - The PostgreSQL/SQLite database stores only relational user data: user profiles, playlists, favorites, recently played history, and **provider IDs** (`provider_track_id`, `provider_artist_id`, `provider_album_id`).
   - No copyrighted audio files are ever written to disk or hosted on our servers.

3. **Provider Playback Resolution**:
   - When a user presses Play, the application resolves the authorized stream directly via the provider's officially sanctioned mechanisms:
     - **Audius Open Protocol**: Official HTTP stream endpoint (`/v1/tracks/{track_id}/stream`) legally open for third-party client playback.
     - **Jamendo Music**: Official Creative Commons audio streams under the Jamendo Developer API v3.0 agreement.
     - **Spotify Official Web API & SDK**: Official track metadata via Web API + full playback exclusively routed through the client-side **Spotify Web Playback SDK** (which legally requires a user OAuth consent and an active Spotify Premium subscription).

---

## 2. Catalog & Provider Comparison

| Feature | **Audius** (Default) | **Jamendo** | **Spotify Web API & SDK** |
| :--- | :--- | :--- | :--- |
| **Catalog Size** | 1,000,000+ tracks | 600,000+ tracks | 100,000,000+ tracks |
| **Licensing Model** | Decentralized / Open Protocol | Creative Commons | Commercial Royalty-bearing |
| **Playback Method** | Official Direct Stream | Official MP3 Stream URL | Web Playback SDK in Browser |
| **User Paywall** | Free (Zero cost) | Free (Non-commercial) | Requires Spotify Premium |
| **Setup Friction** | **Zero Setup** (Ready immediately) | Requires Client ID (Default provided) | Requires Spotify Developer App |
| **Terms Permitted** | Yes, 3rd party playback encouraged | Yes, 3rd party streaming permitted | Yes, via Official SDK only |

---

## 3. Project Architecture

```text
music_streaming_app/
│
├── backend/
│   ├── main.py                     # FastAPI app, lifespan, CORS, and router assembly
│   ├── database.py                 # Async SQLAlchemy engine (PostgreSQL + SQLite fallback)
│   ├── models.py                   # DB models: User, Playlist, PlaylistTrack, Favorite, History
│   ├── schemas.py                  # Pydantic v2 validation & response models
│   ├── auth.py                     # JWT token generator, password hashing, get_current_user
│   │
│   ├── routers/
│   │   ├── auth.py                 # /api/auth/register, /api/auth/login, /api/auth/me
│   │   ├── search.py               # /api/search?q=&type=&limit=
│   │   ├── tracks.py               # /api/home, /api/tracks/{id}, /api/artists/{id}, /api/albums/{id}
│   │   ├── playlists.py            # /api/playlists (CRUD & track management)
│   │   └── users.py                # /api/favorites and /api/history
│   │
│   ├── providers/
│   │   ├── base.py                 # MusicProvider abstract base class
│   │   └── music_provider.py       # AudiusProvider, JamendoProvider, SpotifyProvider & Factory
│   │
│   ├── tests/
│   │   └── test_backend.py         # Pytest test suite
│   ├── Dockerfile                  # Production container for backend
│   └── requirements.txt            # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx         # Sidebar navigation, playlists & legal catalog badge
│   │   │   ├── Navbar.jsx          # Live search trigger & user avatar/dropdown
│   │   │   ├── Player.jsx          # Persistent bottom music player with seek, volume & queue
│   │   │   ├── TrackRow.jsx        # Track list row with favorite toggle & playlist add
│   │   │   ├── MusicCard.jsx       # Reusable card for tracks, albums, artists, playlists
│   │   │   ├── AuthModal.jsx       # Glassmorphic Login & Sign-up modal
│   │   │   └── PlaylistModal.jsx   # Create playlist & Add-to-playlist dialog
│   │   │
│   │   ├── pages/
│   │   │   ├── HomePage.jsx        # Hero banner, trending tracks, genres & new releases
│   │   │   ├── SearchPage.jsx      # Live catalog search with filter tabs
│   │   │   ├── ArtistPage.jsx      # Artist profile, bio, follower count & discography
│   │   │   ├── PlaylistPage.jsx    # Custom playlist management & track deletion
│   │   │   ├── LibraryPage.jsx     # User collection overview & playlist cards
│   │   │   ├── FavoritesPage.jsx   # Liked songs collection with Play All & Shuffle
│   │   │   └── HistoryPage.jsx     # Recently played tracks with Clear History
│   │   │
│   │   ├── services/
│   │   │   └── api.js              # REST client with automatic JWT token attachment
│   │   ├── hooks/
│   │   │   ├── useAuth.jsx         # Authentication context (login, register, logout)
│   │   │   └── usePlayer.jsx       # Audio playback engine, queue & stream controller
│   │   ├── App.jsx                 # Main layout & router view controller
│   │   ├── main.jsx                # React DOM entry
│   │   └── index.css               # Design system, CSS tokens, glassmorphism & dark theme
│   │
│   ├── Dockerfile                  # Multi-stage production build container
│   ├── nginx.conf                  # Nginx proxy configuration
│   ├── package.json                # Frontend dependencies (React, Lucide, Vite)
│   └── vite.config.js              # Vite bundler configuration & /api proxy
│
├── .env.example                    # Template of all environment variables
├── docker-compose.yml              # Complete orchestration (Postgres, Redis, API, UI)
└── README.md                       # Complete documentation
```

---

## 4. Provider Abstraction Interface

The application isolates all catalog lookups and audio streaming logic behind the abstract `MusicProvider` base class:

```python
class MusicProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str: pass

    @abstractmethod
    async def search(self, query: str, search_type: str = "all", limit: int = 20) -> SearchResponse: pass

    @abstractmethod
    async def get_track(self, track_id: str) -> TrackItem: pass

    @abstractmethod
    async def get_artist(self, artist_id: str) -> ArtistItem: pass

    @abstractmethod
    async def get_artist_tracks(self, artist_id: str, limit: int = 20) -> List[TrackItem]: pass

    @abstractmethod
    async def get_album(self, album_id: str) -> AlbumItem: pass

    @abstractmethod
    async def get_playback(self, track_id: str) -> PlaybackInfo: pass

    @abstractmethod
    async def get_home_feed(self) -> HomeFeedResponse: pass
```

Switching providers requires changing a single environment variable (`MUSIC_PROVIDER=audius` or `MUSIC_PROVIDER=jamendo` or `MUSIC_PROVIDER=spotify`) without touching frontend or database code.

---

## 5. API Reference

### Authentication
- `POST /api/auth/register`: Register new user with email, username, and password. Returns JWT token and user profile.
- `POST /api/auth/login`: Authenticate existing user. Returns JWT token.
- `GET /api/auth/me`: Retrieve currently authenticated user profile (Protected).
- `POST /api/auth/logout`: Signal client session termination.

### Music Catalog & Discovery
- `GET /api/home`: Returns trending songs, featured playlists, genres, and new releases from active provider.
- `GET /api/search?q={query}&type={all|tracks|artists|playlists}&limit={n}`: Search the catalog in real-time.
- `GET /api/tracks/{track_id}`: Retrieve detailed track metadata.
- `GET /api/tracks/{track_id}/playback`: Get official authorized stream URL or SDK requirements.
- `GET /api/artists/{artist_id}`: Retrieve artist profile, avatar, follower counts, and bio.
- `GET /api/artists/{artist_id}/tracks`: Retrieve artist's top tracks.
- `GET /api/albums/{album_id}`: Retrieve album metadata and full track listing.

### User Playlists
- `POST /api/playlists`: Create new custom playlist (Protected).
- `GET /api/playlists`: List all playlists owned by the authenticated user (Protected).
- `GET /api/playlists/{id}`: Get playlist metadata and tracks.
- `DELETE /api/playlists/{id}`: Delete playlist owned by user (Protected).
- `POST /api/playlists/{id}/tracks`: Add a track to playlist (Protected).
- `DELETE /api/playlists/{id}/tracks/{track_id}`: Remove track from playlist (Protected).

### Favorites & Listening History
- `GET /api/favorites`: List user's saved tracks (Protected).
- `POST /api/favorites/{track_id}`: Save track to favorites (Protected).
- `DELETE /api/favorites/{track_id}`: Remove track from favorites (Protected).
- `GET /api/history`: Retrieve recent listening history (Protected).
- `POST /api/history/{track_id}`: Record recently played track (Protected).
- `DELETE /api/history`: Clear listening history (Protected).

---

## 6. Quick Start & Setup Instructions

### Option A: Running with Docker Compose (Recommended for Production)

1. Clone or navigate to the repository directory:
   ```bash
   cd music_streaming_app
   ```

2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

3. Launch all services:
   ```bash
   docker compose up --build
   ```

4. Open your browser:
   - **Frontend Web UI**: `http://localhost:3000`
   - **Backend REST API**: `http://localhost:8000`
   - **Interactive API Documentation (Swagger)**: `http://localhost:8000/docs`

---

### Option B: Local Developer Setup (Without Docker)

#### 1. Backend Setup (FastAPI)
```bash
cd music_streaming_app/backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend (defaults to SQLite + Audius provider out-of-the-box)
python -m uvicorn main:app --reload --port 8000
```

#### 2. Frontend Setup (React + Vite)
```bash
cd music_streaming_app/frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 7. Running Backend Tests

```bash
cd music_streaming_app/backend
pytest -v tests/test_backend.py
```

---

## 8. Summary of Legal & Ethical Commitments
- **No Scrapers**: The codebase contains 0 web scrapers or unauthorized stream rippers.
- **Official Streams**: All audio elements point to official endpoints verified under third-party developer terms.
- **Provider Pluggability**: Clean interface boundaries protect developers from platform lock-in and legal ambiguity.
