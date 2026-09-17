import React, { useState, useEffect } from 'react';
import { Play, Shuffle, Trash2, ArrowLeft, Disc, Music } from 'lucide-react';
import { api } from '../services/api';
import TrackRow from '../components/TrackRow';
import { usePlayer } from '../hooks/usePlayer';
import { useAuth } from '../hooks/useAuth';

export default function PlaylistPage({ 
  playlistId, 
  onBack, 
  onPlaylistDeleted, 
  openAuthModal, 
  onAddToPlaylist 
}) {
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const { playTrack, toggleShuffle } = usePlayer();
  const { user } = useAuth();

  const loadPlaylist = async () => {
    setLoading(true);
    try {
      // Check if it's an internal DB playlist (numeric) or provider external playlist
      if (!isNaN(playlistId)) {
        const data = await api.getPlaylist(playlistId);
        setPlaylist(data);
      } else {
        // Fallback for provider playlist
        const data = await api.getAlbum(playlistId);
        setPlaylist({
          id: data.id,
          title: data.title,
          description: `Curated album/playlist by ${data.artist}`,
          cover_image: data.artwork_url,
          tracks: data.tracks.map((t, idx) => ({
            id: t.id,
            provider_track_id: t.id,
            title: t.title,
            artist_name: t.artist,
            album_name: t.album,
            artwork_url: t.artwork_url,
            duration: t.duration,
            stream_url: t.stream_url,
            position: idx
          }))
        });
      }
    } catch (err) {
      console.error("Failed to load playlist:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (playlistId) {
      loadPlaylist();
    }
  }, [playlistId]);

  const handleDeletePlaylist = async () => {
    if (!window.confirm(`Are you sure you want to delete "${playlist.title}"?`)) return;
    try {
      await api.deletePlaylist(playlist.id);
      if (onPlaylistDeleted) onPlaylistDeleted();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveTrack = async (providerTrackId) => {
    try {
      await api.removeTrackFromPlaylist(playlist.id, providerTrackId);
      setPlaylist(prev => ({
        ...prev,
        tracks: prev.tracks.filter(t => t.provider_track_id !== providerTrackId)
      }));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="scrollable-page" style={{ textAlign: 'center', padding: '60px' }}>
        <Disc size={36} className="animate-spin" style={{ margin: '0 auto 12px' }} />
        <p>Loading playlist...</p>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="scrollable-page">
        <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '16px' }}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <p>Playlist not found.</p>
      </div>
    );
  }

  const isOwner = user && user.id === playlist.user_id;
  const formattedTracks = (playlist.tracks || []).map(t => ({
    id: t.provider_track_id,
    title: t.title,
    artist: t.artist_name,
    album: t.album_name,
    artwork_url: t.artwork_url || playlist.cover_image,
    duration: t.duration,
    stream_url: t.stream_url
  }));

  const totalDurationSecs = formattedTracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const totalMins = Math.floor(totalDurationSecs / 60);

  return (
    <div className="scrollable-page">
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '20px' }}>
        <ArrowLeft size={16} />
        <span>Back</span>
      </button>

      {/* Playlist Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '24px',
        padding: '28px',
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(26, 29, 38, 0.8) 100%)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        marginBottom: '32px'
      }}>
        {playlist.cover_image ? (
          <img
            src={playlist.cover_image}
            alt={playlist.title}
            style={{
              width: '180px',
              height: '180px',
              borderRadius: 'var(--radius-md)',
              objectFit: 'cover',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
            }}
          />
        ) : (
          <div style={{
            width: '180px',
            height: '180px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}>
            <Music size={48} color="var(--text-muted)" />
          </div>
        )}

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Playlist
          </div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{playlist.title}</h1>
          {playlist.description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '12px' }}>
              {playlist.description}
            </p>
          )}
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>{formattedTracks.length} songs</span>
            {totalMins > 0 && <span>• {totalMins} min</span>}
          </div>
        </div>
      </div>

      {/* Playlist Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        {formattedTracks.length > 0 && (
          <button 
            className="btn btn-primary"
            onClick={() => playTrack(formattedTracks[0], formattedTracks)}
          >
            <Play size={18} fill="#ffffff" />
            <span>Play All</span>
          </button>
        )}

        {isOwner && (
          <button 
            className="btn btn-secondary"
            onClick={handleDeletePlaylist}
            style={{ color: '#f87171' }}
          >
            <Trash2 size={16} />
            <span>Delete Playlist</span>
          </button>
        )}
      </div>

      {/* Tracks List */}
      <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', padding: '8px' }}>
        {formattedTracks.map((t, idx) => (
          <TrackRow 
            key={`${t.id}-${idx}`} 
            track={t} 
            index={idx}
            playlistQueue={formattedTracks}
            onAddToPlaylist={onAddToPlaylist}
            openAuthModal={openAuthModal}
            onRemoveTrack={isOwner ? handleRemoveTrack : null}
          />
        ))}

        {formattedTracks.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>This playlist is empty.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
              Search for songs and click the <strong>+</strong> icon to add them here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
