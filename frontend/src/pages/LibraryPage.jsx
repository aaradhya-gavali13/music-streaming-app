import React, { useState, useEffect } from 'react';
import { Library, Plus, Heart, Clock, Music, Disc } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import MusicCard from '../components/MusicCard';

export default function LibraryPage({ 
  setCurrentPage, 
  onSelectPlaylist, 
  openCreatePlaylistModal, 
  openAuthModal 
}) {
  const { user, isAuthenticated } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      Promise.all([
        api.getPlaylists().catch(() => []),
        api.getFavorites().catch(() => []),
        api.getHistory().catch(() => [])
      ]).then(([pls, favs, hist]) => {
        setPlaylists(pls);
        setFavoritesCount(favs.length);
        setHistoryCount(hist.length);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="scrollable-page" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <Library size={48} color="var(--accent-primary)" style={{ margin: '0 auto 16px' }} />
        <h2>Your Personal Music Library</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '12px auto 24px' }}>
          Sign in or create a free account to build custom playlists, bookmark your favorite tracks, and sync your listening history.
        </p>
        <button className="btn btn-primary" onClick={() => openAuthModal('login')}>
          Sign In to Access Library
        </button>
      </div>
    );
  }

  return (
    <div className="scrollable-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem' }}>Your Library</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Curate playlists, liked tracks, and personalized listening collections.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreatePlaylistModal}>
          <Plus size={16} />
          <span>New Playlist</span>
        </button>
      </div>

      {/* Quick Access Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '36px' }}>
        <div 
          className="music-card" 
          style={{ flexDirection: 'row', alignItems: 'center', gap: '16px', padding: '16px' }}
          onClick={() => setCurrentPage('favorites')}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Heart size={24} fill="#ffffff" color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Liked Songs</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{favoritesCount} tracks saved</div>
          </div>
        </div>

        <div 
          className="music-card" 
          style={{ flexDirection: 'row', alignItems: 'center', gap: '16px', padding: '16px' }}
          onClick={() => setCurrentPage('history')}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Clock size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Recently Played</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{historyCount} songs played</div>
          </div>
        </div>
      </div>

      {/* Playlists Collection */}
      <section>
        <h2 style={{ marginBottom: '18px' }}>Created Playlists ({playlists.length})</h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Disc size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <p>Loading playlists...</p>
          </div>
        ) : (
          <div className="cards-grid">
            {/* Create Playlist Placeholder Card */}
            <div 
              className="music-card"
              style={{
                border: '2px dashed var(--border-hover)',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '220px',
                textAlign: 'center'
              }}
              onClick={openCreatePlaylistModal}
            >
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <Plus size={24} color="var(--accent-primary)" />
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Create Playlist</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Custom music mix</div>
            </div>

            {playlists.map(pl => (
              <MusicCard 
                key={pl.id}
                title={pl.title}
                subtitle={`${pl.track_count || 0} songs`}
                imageUrl={pl.cover_image}
                onClick={() => onSelectPlaylist(pl.id)}
                badgeText="Playlist"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
