import React from 'react';
import { Play } from 'lucide-react';

export default function MusicCard({ 
  title, 
  subtitle, 
  imageUrl, 
  onClick, 
  onPlayClick,
  badgeText = null 
}) {
  return (
    <div className="music-card" onClick={onClick}>
      <div className="music-card-image-wrap">
        <img 
          src={imageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'} 
          alt={title} 
          className="music-card-image" 
          loading="lazy"
        />
        {onPlayClick && (
          <button 
            className="music-card-play-btn"
            onClick={(e) => {
              e.stopPropagation();
              onPlayClick();
            }}
            title={`Play ${title}`}
          >
            <Play size={20} fill="#ffffff" style={{ marginLeft: '2px' }} />
          </button>
        )}
        {badgeText && (
          <span style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            color: '#fff',
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)'
          }}>
            {badgeText}
          </span>
        )}
      </div>
      <div className="music-card-title" title={title}>
        {title}
      </div>
      <div className="music-card-subtitle" title={subtitle}>
        {subtitle}
      </div>
    </div>
  );
}
