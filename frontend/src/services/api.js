const AUDIUS_HOST = "https://discoveryprovider.audius.co";
const APP_NAME = "AuraSoundApp";

export function getApiBase() {
  const customUrl = localStorage.getItem('aurasound_backend_url');
  if (customUrl) {
    return customUrl.replace(/\/$/, '') + '/api';
  }
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '') + '/api';
  }
  return '/api';
}

function getAuthHeader() {
  const token = localStorage.getItem('aurasound_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Low-level HTTP requester to backend
async function request(endpoint, options = {}) {
  const url = `${getApiBase()}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.detail || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

// --- Audius Direct Client Fallback (Allows 100% Frontend Operation on Netlify without a Backend) ---
function formatAudiusTrack(raw) {
  const trackId = String(raw.id || '');
  const user = raw.user || {};
  const artistName = user.name || user.handle || "Unknown Artist";
  
  let artwork = null;
  if (raw.artwork) {
    artwork = raw.artwork['480x480'] || raw.artwork['150x150'] || raw.artwork['1000x1000'];
  }
  if (!artwork && raw.cover_art_sizes) {
    artwork = `https://creatornode.audius.co/ipfs/${raw.cover_art_sizes}/480x480.jpg`;
  }

  const duration = parseInt(raw.duration || 0, 10);
  const streamUrl = `${AUDIUS_HOST}/v1/tracks/${trackId}/stream?app_name=${APP_NAME}`;

  return {
    id: trackId,
    provider: "audius",
    title: raw.title || "Untitled Track",
    artist: artistName,
    artist_id: String(user.id || ''),
    album: raw.album_name || "Single",
    artwork_url: artwork,
    duration: duration,
    stream_url: streamUrl,
    playback_type: "direct_stream",
    genre: raw.genre,
    play_count: raw.play_count || 0,
    release_date: raw.release_date,
    is_explicit: Boolean(raw.is_explicit),
    provider_playback: {
      track_id: trackId,
      provider: "audius",
      stream_url: streamUrl,
      playback_type: "direct_stream",
      format: "mp3",
      duration: duration,
      requires_sdk: false,
      requires_user_auth: false
    }
  };
}

async function directAudiusFetch(endpoint, params = {}) {
  const url = new URL(`${AUDIUS_HOST}${endpoint}`);
  url.searchParams.set("app_name", APP_NAME);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Audius direct API status ${res.status}`);
  const json = await res.json();
  return json.data;
}

// LocalStorage helpers for standalone client mode
function getLocal(key, def) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : def;
  } catch {
    return def;
  }
}
function setLocal(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.debug("Local storage write error:", e);
  }
}

export const api = {
  // Auth
  register: async (userData) => {
    try {
      return await request('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
    } catch {
      // Standalone fallback
      const user = { id: 1, email: userData.email, username: userData.username, display_name: userData.display_name || userData.username, created_at: new Date().toISOString() };
      setLocal('aurasound_local_user', user);
      localStorage.setItem('aurasound_token', 'standalone-mock-token');
      return { access_token: 'standalone-mock-token', token_type: 'bearer', user };
    }
  },

  login: async (credentials) => {
    try {
      return await request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
    } catch {
      const user = getLocal('aurasound_local_user', { id: 1, email: credentials.email, username: credentials.email.split('@')[0], display_name: credentials.email.split('@')[0], created_at: new Date().toISOString() });
      localStorage.setItem('aurasound_token', 'standalone-mock-token');
      return { access_token: 'standalone-mock-token', token_type: 'bearer', user };
    }
  },

  getMe: async () => {
    try {
      return await request('/auth/me');
    } catch {
      return getLocal('aurasound_local_user', { id: 1, email: 'guest@aurasound.app', username: 'Guest Listener', display_name: 'Guest Listener', created_at: new Date().toISOString() });
    }
  },

  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    localStorage.removeItem('aurasound_token');
    return { message: "Logged out" };
  },

  // Catalog
  getHome: async () => {
    try {
      return await request('/home');
    } catch (e) {
      console.info("Backend not reachable, switching seamlessly to direct Audius catalog stream.");
      const trendingData = await directAudiusFetch('/v1/tracks/trending', { limit: 24 });
      const trending = (trendingData || []).map(formatAudiusTrack);
      
      let playlists = [];
      try {
        const plData = await directAudiusFetch('/v1/playlists/trending', { limit: 8 });
        playlists = (plData || []).map(p => ({
          id: String(p.id),
          provider: "audius",
          title: p.playlist_name || "Trending Playlist",
          description: p.description,
          artwork_url: p.artwork ? (p.artwork['480x480'] || p.artwork['150x150']) : null,
          user_name: p.user?.name || "Curator",
          track_count: p.total_play_count || 10
        }));
      } catch (plErr) {
        console.debug("Playlists direct error:", plErr);
      }

      return {
        provider: "audius",
        trending,
        featured_playlists: playlists,
        genres: [
          { id: "Electronic", name: "Electronic" },
          { id: "Hip-Hop/Rap", name: "Hip-Hop & Rap" },
          { id: "Pop", name: "Pop" },
          { id: "Rock", name: "Rock" },
          { id: "Lo-Fi", name: "Chill / Lo-Fi" },
          { id: "Ambient", name: "Ambient & Acoustic" },
          { id: "R&B", name: "R&B / Soul" },
        ],
        new_releases: trending.slice(0, 10)
      };
    }
  },

  search: async (q, type = 'all', limit = 20) => {
    try {
      return await request(`/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}`);
    } catch {
      const data = await directAudiusFetch('/v1/tracks/search', { query: q, limit: limit });
      const tracks = (data || []).map(formatAudiusTrack);
      
      let artists = [];
      try {
        const userResults = await directAudiusFetch('/v1/users/search', { query: q, limit: 6 });
        artists = (userResults || []).map(u => ({
          id: String(u.id),
          provider: "audius",
          name: u.name || u.handle,
          bio: u.bio,
          avatar_url: u.profile_picture ? (u.profile_picture['480x480'] || u.profile_picture['150x150']) : null,
          follower_count: u.follower_count || 0
        }));
      } catch (uErr) {
        console.debug("User search error:", uErr);
      }

      return {
        query: q,
        provider: "audius",
        tracks,
        artists,
        albums: [],
        playlists: []
      };
    }
  },

  getTrack: async (trackId) => {
    try {
      return await request(`/tracks/${trackId}`);
    } catch {
      const data = await directAudiusFetch(`/v1/tracks/${trackId}`);
      return formatAudiusTrack(data);
    }
  },

  getPlayback: async (trackId) => {
    try {
      return await request(`/tracks/${trackId}/playback`);
    } catch {
      const streamUrl = `${AUDIUS_HOST}/v1/tracks/${trackId}/stream?app_name=${APP_NAME}`;
      return {
        track_id: String(trackId),
        provider: "audius",
        stream_url: streamUrl,
        playback_type: "direct_stream",
        format: "mp3",
        duration: 0,
        requires_sdk: false,
        requires_user_auth: false
      };
    }
  },

  getArtist: async (artistId) => {
    try {
      return await request(`/artists/${artistId}`);
    } catch {
      const u = await directAudiusFetch(`/v1/users/${artistId}`);
      return {
        id: String(u.id),
        provider: "audius",
        name: u.name || u.handle,
        bio: u.bio,
        avatar_url: u.profile_picture ? (u.profile_picture['480x480'] || u.profile_picture['150x150']) : null,
        follower_count: u.follower_count || 0
      };
    }
  },

  getArtistTracks: async (artistId, limit = 20) => {
    try {
      return await request(`/artists/${artistId}/tracks?limit=${limit}`);
    } catch {
      const data = await directAudiusFetch(`/v1/users/${artistId}/tracks`, { limit });
      return (data || []).map(formatAudiusTrack);
    }
  },

  getAlbum: async (albumId) => {
    return await request(`/albums/${albumId}`);
  },

  // Playlists (With local fallback)
  getPlaylists: async () => {
    try {
      return await request('/playlists');
    } catch {
      return getLocal('aurasound_playlists', []);
    }
  },

  getPlaylist: async (id) => {
    try {
      return await request(`/playlists/${id}`);
    } catch {
      const list = getLocal('aurasound_playlists', []);
      const found = list.find(p => String(p.id) === String(id));
      if (!found) throw new Error("Playlist not found");
      return found;
    }
  },

  createPlaylist: async (playlistData) => {
    try {
      return await request('/playlists', { method: 'POST', body: JSON.stringify(playlistData) });
    } catch {
      const list = getLocal('aurasound_playlists', []);
      const newP = {
        id: Date.now(),
        user_id: 1,
        title: playlistData.title,
        description: playlistData.description || null,
        cover_image: null,
        is_public: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        track_count: 0,
        tracks: []
      };
      list.unshift(newP);
      setLocal('aurasound_playlists', list);
      return newP;
    }
  },

  deletePlaylist: async (id) => {
    try {
      return await request(`/playlists/${id}`, { method: 'DELETE' });
    } catch {
      const list = getLocal('aurasound_playlists', []);
      setLocal('aurasound_playlists', list.filter(p => String(p.id) !== String(id)));
      return null;
    }
  },

  addTrackToPlaylist: async (playlistId, trackData) => {
    try {
      return await request(`/playlists/${playlistId}/tracks`, { method: 'POST', body: JSON.stringify(trackData) });
    } catch {
      const list = getLocal('aurasound_playlists', []);
      const p = list.find(item => String(item.id) === String(playlistId));
      if (p) {
        p.tracks = p.tracks || [];
        p.tracks.push({
          id: Date.now(),
          playlist_id: playlistId,
          provider_track_id: trackData.provider_track_id,
          title: trackData.title,
          artist_name: trackData.artist_name,
          album_name: trackData.album_name,
          artwork_url: trackData.artwork_url,
          duration: trackData.duration,
          stream_url: trackData.stream_url,
          position: p.tracks.length,
          added_at: new Date().toISOString()
        });
        p.track_count = p.tracks.length;
        if (!p.cover_image && trackData.artwork_url) {
          p.cover_image = trackData.artwork_url;
        }
        setLocal('aurasound_playlists', list);
      }
      return trackData;
    }
  },

  removeTrackFromPlaylist: async (playlistId, trackId) => {
    try {
      return await request(`/playlists/${playlistId}/tracks/${trackId}`, { method: 'DELETE' });
    } catch {
      const list = getLocal('aurasound_playlists', []);
      const p = list.find(item => String(item.id) === String(playlistId));
      if (p && p.tracks) {
        p.tracks = p.tracks.filter(t => t.provider_track_id !== trackId);
        p.track_count = p.tracks.length;
        setLocal('aurasound_playlists', list);
      }
      return null;
    }
  },

  // Favorites (With local fallback)
  getFavorites: async () => {
    try {
      return await request('/favorites');
    } catch {
      return getLocal('aurasound_favorites', []);
    }
  },

  addFavorite: async (trackId, trackData) => {
    try {
      return await request(`/favorites/${trackId}`, { method: 'POST', body: JSON.stringify(trackData) });
    } catch {
      const favs = getLocal('aurasound_favorites', []);
      if (!favs.find(f => f.provider_track_id === trackId)) {
        favs.unshift({
          id: Date.now(),
          provider_track_id: trackId,
          title: trackData.title,
          artist_name: trackData.artist_name,
          album_name: trackData.album_name,
          artwork_url: trackData.artwork_url,
          duration: trackData.duration,
          stream_url: trackData.stream_url,
          created_at: new Date().toISOString()
        });
        setLocal('aurasound_favorites', favs);
      }
      return trackData;
    }
  },

  removeFavorite: async (trackId) => {
    try {
      return await request(`/favorites/${trackId}`, { method: 'DELETE' });
    } catch {
      const favs = getLocal('aurasound_favorites', []);
      setLocal('aurasound_favorites', favs.filter(f => f.provider_track_id !== trackId));
      return null;
    }
  },

  // History (With local fallback)
  getHistory: async () => {
    try {
      return await request('/history');
    } catch {
      return getLocal('aurasound_history', []);
    }
  },

  recordHistory: async (trackId, trackData) => {
    try {
      return await request(`/history/${trackId}`, { method: 'POST', body: JSON.stringify(trackData) });
    } catch {
      const hist = getLocal('aurasound_history', []);
      const filtered = hist.filter(h => h.provider_track_id !== trackId);
      filtered.unshift({
        id: Date.now(),
        provider_track_id: trackId,
        title: trackData.title,
        artist_name: trackData.artist_name,
        album_name: trackData.album_name,
        artwork_url: trackData.artwork_url,
        duration: trackData.duration,
        stream_url: trackData.stream_url,
        played_at: new Date().toISOString()
      });
      setLocal('aurasound_history', filtered.slice(0, 50));
      return trackData;
    }
  },

  clearHistory: async () => {
    try {
      return await request('/history', { method: 'DELETE' });
    } catch {
      setLocal('aurasound_history', []);
      return null;
    }
  },
};
