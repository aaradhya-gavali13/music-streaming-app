import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Disc, Mic2, Music, ListMusic, Play } from 'lucide-react';
import { api } from '../services/api';
import TrackRow from '../components/TrackRow';
import MusicCard from '../components/MusicCard';
import { usePlayer } from '../hooks/usePlayer';

export default function SearchPage({ 
  initialQuery = '', 
  onSelectArtist, 
  onSelectPlaylist, 
  openAuthModal, 
  onAddToPlaylist 
}) {
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'tracks' | 'artists' | 'playlists'
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const { playTrack } = usePlayer();

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery, activeTab);
    }
  }, [initialQuery]);

  const performSearch = async (searchTerm, type) => {
    if (!searchTerm.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const data = await api.search(searchTerm.trim(), type);
      setResults(data);
    } catch (err) {
      console.error("Search failed:", err);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (query.trim()) {
      performSearch(query, tab);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) {
      setResults(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      performSearch(query, activeTab);
    }
  };

  const tracks = results?.tracks || [];
  const artists = results?.artists || [];
  const playlists = results?.playlists || [];

  return (
    <div className="scrollable-page">
      {/* Search Input Bar on Page */}
      <div style={{ maxWidth: '640px', marginBottom: '16px' }}>
        <div className="navbar-search" style={{ width: '100%', padding: '12px 20px' }}>
          <SearchIcon size={20} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search songs, artists, Bollywood, Punjabi..."
            value={query}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
      </div>

      {/* Quick Search Chips: Popular Indian & Global Trends */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>
          🇮🇳 Quick Access & Trending in India:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[
            'Bollywood Hits',
            'Arijit Singh',
            'Sidhu Moose Wala',
            'Diljit Dosanjh',
            'Hindi Lo-Fi',
            'Punjabi Hits',
            'Desi Hip-Hop',
            'A.R. Rahman',
            'Shreya Ghoshal',
            'AP Dhillon',
            'South Indian Hits',
            'Indian Classical'
          ].map(tag => (
            <button
              key={tag}
              type="button"
              className="genre-pill"
              style={{
                fontSize: '0.8rem',
                padding: '4px 12px',
                background: query === tag ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.04)',
                color: query === tag ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-full)'
              }}
              onClick={() => {
                setQuery(tag);
                performSearch(tag, activeTab);
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        {[
          { id: 'all', label: 'All Results' },
          { id: 'tracks', label: 'Songs' },
          { id: 'artists', label: 'Artists' },
          { id: 'playlists', label: 'Playlists' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.85rem', padding: '6px 16px' }}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Disc size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p>Searching authorized catalog...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !results && !query && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <SearchIcon size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
          <h3>Discover Legal & Licensed Music</h3>
          <p style={{ marginTop: '8px', fontSize: '0.9rem', maxWidth: '400px', margin: '8px auto 0' }}>
            Type an artist, song title, or genre above to instantly query the provider's official catalog.
          </p>
        </div>
      )}

      {/* Search Results Display */}
      {!loading && results && (
        <>
          {/* Top Match Card */}
          {activeTab === 'all' && tracks.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.14), rgba(236, 72, 153, 0.08))',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px 24px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => playTrack(tracks[0], tracks)}
              >
                {tracks[0].artwork_url ? (
                  <img 
                    src={tracks[0].artwork_url} 
                    alt={tracks[0].title}
                    style={{ width: '84px', height: '84px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '84px', height: '84px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Music size={32} color="var(--accent-primary)" />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-primary)', fontWeight: 700 }}>
                    Exact / Best Match
                  </span>
                  <h2 style={{ fontSize: '1.4rem', margin: '4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tracks[0].title}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Song • <strong>{tracks[0].artist}</strong>
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    playTrack(tracks[0], tracks);
                  }}
                >
                  <Play size={20} fill="#ffffff" style={{ marginLeft: '2px' }} />
                </button>
              </div>
            </section>
          )}

          {/* Tracks section */}
          {(activeTab === 'all' || activeTab === 'tracks') && tracks.length > 0 && (
            <section style={{ marginBottom: '36px' }}>
              <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Music size={18} color="var(--accent-primary)" />
                <span>Songs ({tracks.length})</span>
              </h3>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', padding: '8px' }}>
                {tracks.map((t, idx) => (
                  <TrackRow 
                    key={t.id} 
                    track={t} 
                    index={idx}
                    playlistQueue={tracks}
                    onAddToPlaylist={onAddToPlaylist}
                    openAuthModal={openAuthModal}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Artists section */}
          {(activeTab === 'all' || activeTab === 'artists') && artists.length > 0 && (
            <section style={{ marginBottom: '36px' }}>
              <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mic2 size={18} color="var(--accent-primary)" />
                <span>Artists ({artists.length})</span>
              </h3>
              <div className="cards-grid">
                {artists.map(a => (
                  <MusicCard
                    key={a.id}
                    title={a.name}
                    subtitle={a.bio || `${a.track_count || 0} tracks`}
                    imageUrl={a.avatar_url}
                    onClick={() => onSelectArtist(a.id)}
                    badgeText="Artist"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Playlists section */}
          {(activeTab === 'all' || activeTab === 'playlists') && playlists.length > 0 && (
            <section style={{ marginBottom: '36px' }}>
              <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ListMusic size={18} color="var(--accent-primary)" />
                <span>Playlists ({playlists.length})</span>
              </h3>
              <div className="cards-grid">
                {playlists.map(pl => (
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

          {/* Zero results found */}
          {tracks.length === 0 && artists.length === 0 && playlists.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <h4>No matches found for "{results.query}"</h4>
              <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                Try searching for another artist, song, or genre term.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
