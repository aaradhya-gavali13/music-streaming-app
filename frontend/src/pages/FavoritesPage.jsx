import React, { useState, useEffect } from 'react';
import { Play, Heart, Disc, Shuffle } from 'lucide-react';
import { api } from '../services/api';
import TrackRow from '../components/TrackRow';
import { usePlayer } from '../hooks/usePlayer';

export default function FavoritesPage({ openAuthModal, onAddToPlaylist }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playTrack, toggleShuffle } = usePlayer();

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const data = await api.getFavorites();
      setFavorites(data);
    } catch (err) {
      console.error("Failed to load favorites:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleFavoriteToggled = (trackId, isFav) => {
    if (!isFav) {
      setFavorites(prev => prev.filter(f => f.provider_track_id !== trackId));
    }
  };

  const formattedTracks = favorites.map(f => ({
    id: f.provider_track_id,
    title: f.title,
    artist: f.artist_name,
    album: f.album_name,
    artwork_url: f.artwork_url,
    duration: f.duration,
    stream_url: f.stream_url
  }));

  return (
    <div className="scrollable-page">
      {/* Liked Songs Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '24px',
        padding: '32px',
        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.25) 0%, rgba(26, 29, 38, 0.8) 100%)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        marginBottom: '32px'
      }}>
        <div style={{
          width: '160px',
          height: '160px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 28px rgba(236, 72, 153, 0.4)'
        }}>
          <Heart size={64} fill="#ffffff" color="#ffffff" />
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Collection
          </div>
          <h1 style={{ fontSize: '2.8rem', marginBottom: '8px' }}>Liked Songs</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {favorites.length} saved {favorites.length === 1 ? 'song' : 'songs'}
          </p>
        </div>
      </div>

      {/* Action Bar */}
      {formattedTracks.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button 
            className="btn btn-primary"
            onClick={() => playTrack(formattedTracks[0], formattedTracks)}
          >
            <Play size={18} fill="#ffffff" />
            <span>Play All</span>
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              toggleShuffle();
              const randomIdx = Math.floor(Math.random() * formattedTracks.length);
              playTrack(formattedTracks[randomIdx], formattedTracks);
            }}
          >
            <Shuffle size={16} />
            <span>Shuffle</span>
          </button>
        </div>
      )}

      {/* Tracks Listing */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <Disc size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p>Loading your liked tracks...</p>
        </div>
      ) : (
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', padding: '8px' }}>
          {formattedTracks.map((t, idx) => (
            <TrackRow 
              key={t.id} 
              track={t} 
              index={idx}
              playlistQueue={formattedTracks}
              onAddToPlaylist={onAddToPlaylist}
              openAuthModal={openAuthModal}
              isFavorited={true}
              onFavoriteToggled={handleFavoriteToggled}
            />
          ))}

          {formattedTracks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Heart size={44} style={{ opacity: 0.3, margin: '0 auto 14px' }} />
              <h3>No liked songs yet</h3>
              <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
                Click the heart icon on any song to save it to your collection.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
