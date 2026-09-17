import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Search, 
  Compass, 
  Library, 
  Heart, 
  Clock, 
  PlusSquare, 
  Music, 
  Disc3,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

export default function Sidebar({ currentPage, setCurrentPage, openAuthModal, openCreatePlaylistModal }) {
  const { user, isAuthenticated } = useAuth();
  const [userPlaylists, setUserPlaylists] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      api.getPlaylists()
        .then(setUserPlaylists)
        .catch(err => console.debug("Could not load sidebar playlists:", err));
    } else {
      setUserPlaylists([]);
    }
  }, [isAuthenticated, currentPage]);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Your Library', icon: Library },
  ];

  const collectionItems = [
    { id: 'favorites', label: 'Liked Songs', icon: Heart },
    { id: 'history', label: 'Recently Played', icon: Clock },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" onClick={() => setCurrentPage('home')}>
        <div className="logo-icon">
          <Disc3 size={20} />
        </div>
        <span className="logo-title">AuraSound</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <div
              key={item.id}
              className={`nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-nav-title">Your Collection</div>
      <nav className="sidebar-nav">
        {collectionItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <div
              key={item.id}
              className={`nav-link ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (!isAuthenticated) {
                  openAuthModal();
                } else {
                  setCurrentPage(item.id);
                }
              }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </div>
          );
        })}

        <div
          className="nav-link"
          onClick={() => {
            if (!isAuthenticated) {
              openAuthModal();
            } else {
              openCreatePlaylistModal();
            }
          }}
        >
          <PlusSquare size={20} />
          <span>Create Playlist</span>
        </div>
      </nav>

      <div className="sidebar-nav-title" style={{ marginTop: '12px' }}>
        Playlists ({userPlaylists.length})
      </div>
      <div className="sidebar-playlists">
        {userPlaylists.map(pl => (
          <div
            key={pl.id}
            className={`nav-link ${currentPage === `playlist-${pl.id}` ? 'active' : ''}`}
            onClick={() => setCurrentPage(`playlist-${pl.id}`)}
            style={{ fontSize: '0.85rem', padding: '8px 12px' }}
          >
            <Music size={16} style={{ minWidth: '16px' }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pl.title}
            </span>
          </div>
        ))}
        {userPlaylists.length === 0 && (
          <div style={{ padding: '8px 12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {isAuthenticated ? 'No playlists yet' : 'Log in to create playlists'}
          </div>
        )}
      </div>

      <div style={{
        marginTop: 'auto',
        padding: '12px',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <ShieldCheck size={18} color="var(--accent-primary)" />
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.2' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Authorized Catalog</strong>
          <div>100% Legal Streaming</div>
        </div>
      </div>
    </aside>
  );
}
