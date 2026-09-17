import React, { useState } from 'react';
import { Search, User, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Navbar({ searchQuery, setSearchQuery, onSearchSubmit, openAuthModal, setCurrentPage }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearchSubmit(searchQuery.trim());
    }
  };

  return (
    <header className="navbar">
      <form onSubmit={handleSubmit} className="navbar-search">
        <Search size={18} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Search songs, artists, albums, or playlists..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (window.location.hash !== '#search') {
              setCurrentPage('search');
            }
          }}
        />
      </form>

      <div className="navbar-user">
        {isAuthenticated ? (
          <div style={{ position: 'relative' }}>
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer'
              }}
              onClick={() => setShowDropdown(prev => !prev)}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                color: 'white'
              }}>
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '0.88rem', fontWeight: '600' }}>
                {user.display_name || user.username}
              </span>
            </div>

            {showDropdown && (
              <div style={{
                position: 'absolute',
                top: '46px',
                right: '0',
                width: '180px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
                padding: '6px',
                zIndex: 100
              }}>
                <div 
                  className="nav-link"
                  style={{ fontSize: '0.85rem' }}
                  onClick={() => {
                    setCurrentPage('library');
                    setShowDropdown(false);
                  }}
                >
                  <User size={16} />
                  <span>Your Profile</span>
                </div>
                <div 
                  className="nav-link"
                  style={{ fontSize: '0.85rem', color: '#f87171' }}
                  onClick={() => {
                    logout();
                    setShowDropdown(false);
                  }}
                >
                  <LogOut size={16} />
                  <span>Log Out</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => openAuthModal('login')}>
              <LogIn size={16} />
              <span>Log in</span>
            </button>
            <button className="btn btn-primary" onClick={() => openAuthModal('register')}>
              <span>Sign up</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
