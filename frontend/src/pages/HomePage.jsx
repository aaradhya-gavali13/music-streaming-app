import React, { useState, useEffect } from 'react';
import { Play, Flame, Sparkles, Disc, Radio, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { usePlayer } from '../hooks/usePlayer';
import MusicCard from '../components/MusicCard';
import TrackRow from '../components/TrackRow';

export default function HomePage({ onSelectArtist, onSelectPlaylist, onSelectAlbum, onSearchGenre, openAuthModal, onAddToPlaylist }) {
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { playTrack } = usePlayer();

  const loadFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHome();
      setFeed(data);
    } catch (err) {
      console.error("Home feed load failed:", err);
      setError("Unable to connect to authorized music catalog. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const [backendInput, setBackendInput] = useState(localStorage.getItem('aurasound_backend_url') || '');

  const handleSaveBackendUrl = (e) => {
    e.preventDefault();
    if (backendInput.trim()) {
      localStorage.setItem('aurasound_backend_url', backendInput.trim());
      loadFeed();
    }
  };

  if (loading) {
    return (
      <div className="scrollable-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Disc size={36} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p>Connecting to authorized music catalog...</p>
          <p style={{ fontSize: '0.8rem', marginTop: '8px', color: 'var(--text-muted)' }}>
            (Render free servers take ~30 seconds to wake up on first load)
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="scrollable-page" style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '560px', margin: '0 auto' }}>
        <p style={{ color: '#f87171', marginBottom: '16px', fontSize: '1.05rem', fontWeight: 600 }}>{error}</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '24px', lineHeight: '1.5' }}>
          If your backend is hosted on Render, enter your Render backend URL below (e.g. <code>https://aurasound-backend.onrender.com</code>).
        </p>

        <form onSubmit={handleSaveBackendUrl} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <input
            type="url"
            placeholder="https://your-backend.onrender.com"
            value={backendInput}
            onChange={(e) => setBackendInput(e.target.value)}
            className="form-input"
            style={{ flex: 1 }}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
            Save & Connect
          </button>
        </form>

        <button className="btn btn-secondary" onClick={loadFeed} style={{ margin: '0 auto' }}>
          <RefreshCw size={16} />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  const trendingTracks = feed?.trending || [];
  const indianTracks = feed?.indian_trending || [];
  const featuredPlaylists = feed?.featured_playlists || [];
  const genres = feed?.genres || [];
  const newReleases = feed?.new_releases || [];
  const heroTrack = trendingTracks[0];

  return (
    <div className="scrollable-page">
      {/* Hero Banner */}
      {heroTrack && (
        <section className="hero-banner">
          <div className="hero-content">
            <div className="hero-badge">
              <Flame size={14} color="#f59e0b" />
              <span>Trending Worldwide on {feed?.provider ? feed.provider.toUpperCase() : 'CATALOG'}</span>
            </div>
            <h1 className="hero-title">{heroTrack.title}</h1>
            <p className="hero-desc">
              By <strong>{heroTrack.artist}</strong> • High-fidelity legal audio stream directly from official provider endpoints.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-primary"
                onClick={() => playTrack(heroTrack, trendingTracks)}
              >
                <Play size={18} fill="#ffffff" />
                <span>Play Now</span>
              </button>
              {heroTrack.artist_id && (
                <button 
                  className="btn btn-secondary"
                  onClick={() => onSelectArtist(heroTrack.artist_id)}
                >
                  View Artist
                </button>
              )}
            </div>
          </div>
          {heroTrack.artwork_url && (
            <img 
              src={heroTrack.artwork_url} 
              alt={heroTrack.title}
              style={{
                width: '240px',
                height: '240px',
                borderRadius: 'var(--radius-lg)',
                objectFit: 'cover',
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                display: 'none',
                zIndex: 2,
              }}
              className="d-md-block"
            />
          )}
        </section>
      )}

      {/* Indian Music Spotlight Section */}
      {indianTracks.length > 0 && (
        <section style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🇮🇳</span>
              <span>Popular in India & Desi Hits</span>
            </h2>
            <button 
              className="btn btn-ghost" 
              style={{ fontSize: '0.85rem' }}
              onClick={() => onSearchGenre('Bollywood')}
            >
              See All Bollywood →
            </button>
          </div>
          <div className="cards-grid">
            {indianTracks.slice(0, 6).map(t => (
              <MusicCard 
                key={t.id}
                title={t.title}
                subtitle={t.artist}
                imageUrl={t.artwork_url}
                onClick={() => playTrack(t, indianTracks)}
                onPlayClick={() => playTrack(t, indianTracks)}
                badgeText="Desi Hit"
              />
            ))}
          </div>
        </section>
      )}

      {/* Genre Pills Browser */}
      {genres.length > 0 && (
        <section>
          <h3 style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={18} color="var(--accent-primary)" />
            <span>Browse Genres</span>
          </h3>
          <div className="genre-pills">
            {genres.map(g => (
              <button 
                key={g.id} 
                className="genre-pill"
                onClick={() => onSearchGenre(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Trending Tracks Listing */}
      <section style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Top Trending Tracks</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Official {feed?.provider || 'Catalog'} Feed
          </span>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', padding: '8px' }}>
          {trendingTracks.slice(0, 8).map((t, idx) => (
            <TrackRow 
              key={t.id} 
              track={t} 
              index={idx} 
              playlistQueue={trendingTracks}
              onAddToPlaylist={onAddToPlaylist}
              openAuthModal={openAuthModal}
            />
          ))}
        </div>
      </section>

      {/* Featured Playlists */}
      {featuredPlaylists.length > 0 && (
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ marginBottom: '18px' }}>Featured Playlists</h2>
          <div className="cards-grid">
            {featuredPlaylists.map(pl => (
              <MusicCard 
                key={pl.id}
                title={pl.title}
                subtitle={`By ${pl.user_name || 'Curator'} • ${pl.track_count || 0} tracks`}
                imageUrl={pl.artwork_url}
                onClick={() => onSelectPlaylist(pl.id)}
                badgeText="Playlist"
              />
            ))}
          </div>
        </section>
      )}

      {/* Fresh Releases Grid */}
      {newReleases.length > 0 && (
        <section>
          <h2 style={{ marginBottom: '18px' }}>Fresh Music Discovery</h2>
          <div className="cards-grid">
            {newReleases.map(t => (
              <MusicCard 
                key={t.id}
                title={t.title}
                subtitle={t.artist}
                imageUrl={t.artwork_url}
                onClick={() => playTrack(t, newReleases)}
                onPlayClick={() => playTrack(t, newReleases)}
                badgeText="Track"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
