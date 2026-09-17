const API_BASE = (import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '') : '') + '/api';

function getAuthHeader() {
  const token = localStorage.getItem('aurasound_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
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

export const api = {
  // Auth
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Catalog
  getHome: () => request('/home'),
  search: (q, type = 'all', limit = 20) => request(`/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}`),
  getTrack: (trackId) => request(`/tracks/${trackId}`),
  getPlayback: (trackId) => request(`/tracks/${trackId}/playback`),
  getArtist: (artistId) => request(`/artists/${artistId}`),
  getArtistTracks: (artistId) => request(`/artists/${artistId}/tracks`),
  getAlbum: (albumId) => request(`/albums/${albumId}`),

  // Playlists
  getPlaylists: () => request('/playlists'),
  getPlaylist: (id) => request(`/playlists/${id}`),
  createPlaylist: (playlistData) => request('/playlists', { method: 'POST', body: JSON.stringify(playlistData) }),
  deletePlaylist: (id) => request(`/playlists/${id}`, { method: 'DELETE' }),
  addTrackToPlaylist: (playlistId, trackData) => request(`/playlists/${playlistId}/tracks`, { method: 'POST', body: JSON.stringify(trackData) }),
  removeTrackFromPlaylist: (playlistId, trackId) => request(`/playlists/${playlistId}/tracks/${trackId}`, { method: 'DELETE' }),

  // Favorites
  getFavorites: () => request('/favorites'),
  addFavorite: (trackId, trackData) => request(`/favorites/${trackId}`, { method: 'POST', body: JSON.stringify(trackData) }),
  removeFavorite: (trackId) => request(`/favorites/${trackId}`, { method: 'DELETE' }),

  // History
  getHistory: () => request('/history'),
  recordHistory: (trackId, trackData) => request(`/history/${trackId}`, { method: 'POST', body: JSON.stringify(trackData) }),
  clearHistory: () => request('/history', { method: 'DELETE' }),
};
