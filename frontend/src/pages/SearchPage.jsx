import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Disc, Mic2, Music, ListMusic } from 'lucide-react';
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
      <div style={{ maxWidth: '640px', marginBottom: '24px' }}>
        <div className="navbar-search" style={{ width: '100%', padding: '12px 20px' }}>
          <SearchIcon size={20} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search millions of tracks, artists, or playlists..."
            value={query}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            autoFocus
          />
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
