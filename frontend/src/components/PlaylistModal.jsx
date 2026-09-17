import React, { useState, useEffect } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { api } from '../services/api';

export default function PlaylistModal({ isOpen, onClose, trackToAdd = null, onPlaylistUpdated }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(!trackToAdd);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.getPlaylists()
        .then(data => {
          setPlaylists(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
      setIsCreating(!trackToAdd);
      setStatusMessage(null);
      setError(null);
    }
  }, [isOpen, trackToAdd]);

  if (!isOpen) return null;

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const created = await api.createPlaylist({
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        is_public: true
      });

      // If there was a track to add, add it to this newly created playlist
      if (trackToAdd) {
        await api.addTrackToPlaylist(created.id, {
          provider_track_id: trackToAdd.id,
          title: trackToAdd.title,
          artist_name: trackToAdd.artist,
          album_name: trackToAdd.album,
          artwork_url: trackToAdd.artwork_url,
          duration: trackToAdd.duration,
          stream_url: trackToAdd.stream_url
        });
        setStatusMessage(`Added "${trackToAdd.title}" to "${created.title}"!`);
      } else {
        setStatusMessage(`Created playlist "${created.title}"!`);
      }

      setNewTitle('');
      setNewDesc('');
      if (onPlaylistUpdated) onPlaylistUpdated();
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddToExisting = async (playlistId, playlistTitle) => {
    if (!trackToAdd) return;
    try {
      await api.addTrackToPlaylist(playlistId, {
        provider_track_id: trackToAdd.id,
        title: trackToAdd.title,
        artist_name: trackToAdd.artist,
        album_name: trackToAdd.album,
        artwork_url: trackToAdd.artwork_url,
        duration: trackToAdd.duration,
        stream_url: trackToAdd.stream_url
      });
      setStatusMessage(`Added to ${playlistTitle}!`);
      if (onPlaylistUpdated) onPlaylistUpdated();
      setTimeout(onClose, 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button 
          className="btn-icon" 
          style={{ position: 'absolute', top: '16px', right: '16px' }}
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <h3 style={{ marginBottom: '8px' }}>
          {trackToAdd ? 'Add to Playlist' : 'Create New Playlist'}
        </h3>
        {trackToAdd && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '18px' }}>
            Adding <strong>{trackToAdd.title}</strong> by {trackToAdd.artist}
          </p>
        )}

        {statusMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#6ee7b7',
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Check size={16} />
            <span>{statusMessage}</span>
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Option to create a new playlist */}
        {isCreating ? (
          <form onSubmit={handleCreatePlaylist}>
            <div className="form-group">
              <label className="form-label">Playlist Title</label>
              <input
                type="text"
                required
                placeholder="My Favorites 2026"
                className="form-input"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <textarea
                placeholder="Add an optional description"
                className="form-input"
                style={{ resize: 'none', height: '70px' }}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Save Playlist
              </button>
              {trackToAdd && (
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setIsCreating(false)}
                >
                  Back to List
                </button>
              )}
            </div>
          </form>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Select a playlist</span>
              <button 
                className="btn btn-ghost" 
                style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                onClick={() => setIsCreating(true)}
              >
                <Plus size={14} />
                <span>New Playlist</span>
              </button>
            </div>

            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {playlists.map(pl => (
                <div
                  key={pl.id}
                  className="nav-link"
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    justifyContent: 'space-between'
                  }}
                  onClick={() => handleAddToExisting(pl.id, pl.title)}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{pl.title}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {pl.track_count || 0} tracks
                  </span>
                </div>
              ))}
              {playlists.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No playlists created yet. Create your first playlist above!
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
