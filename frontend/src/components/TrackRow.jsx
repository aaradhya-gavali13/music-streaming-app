import React, { useState } from 'react';
import { Play, Pause, Heart, Plus, MoreHorizontal } from 'lucide-react';
import { usePlayer } from '../hooks/usePlayer';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

export default function TrackRow({ 
  track, 
  index, 
  playlistQueue = null, 
  onAddToPlaylist, 
  openAuthModal,
  isFavorited = false,
  onFavoriteToggled,
  onRemoveTrack = null
}) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const { isAuthenticated } = useAuth();
  const [isFav, setIsFav] = useState(isFavorited);
  const isCurrent = currentTrack?.id === track.id;

  const formatDuration = (secs) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleRowClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, playlistQueue);
    }
  };

  const handleFavoriteClick = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    try {
      if (isFav) {
        await api.removeFavorite(track.id);
        setIsFav(false);
        if (onFavoriteToggled) onFavoriteToggled(track.id, false);
      } else {
        await api.addFavorite(track.id, {
          provider_track_id: track.id,
          title: track.title,
          artist_name: track.artist,
          album_name: track.album,
          artwork_url: track.artwork_url,
          duration: track.duration,
          stream_url: track.stream_url
        });
        setIsFav(true);
        if (onFavoriteToggled) onFavoriteToggled(track.id, true);
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const handleAddClick = (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (onAddToPlaylist) {
      onAddToPlaylist(track);
    }
  };

  return (
    <div className={`track-row ${isCurrent ? 'active' : ''}`} onClick={handleRowClick}>
      {/* Index or Play Icon */}
      <div className="track-index">
        {isCurrent && isPlaying ? (
          <Pause size={16} color="var(--accent-primary)" />
        ) : (
          index !== undefined ? index + 1 : <Play size={16} />
        )}
      </div>

      {/* Thumbnail */}
      <img
        src={track.artwork_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=80'}
        alt={track.title}
        className="track-thumb"
      />

      {/* Track & Artist Info */}
      <div className="track-info">
        <div className="track-title" title={track.title}>
          {track.title}
          {track.is_explicit && <span className="badge-explicit">E</span>}
        </div>
        <div className="track-artist" title={track.artist}>
          {track.artist}
        </div>
      </div>

      {/* Album */}
      <div className="track-album" title={track.album || 'Single'}>
        {track.album || 'Single'}
      </div>

      {/* Duration */}
      <div className="track-duration">
        {formatDuration(track.duration)}
      </div>

      {/* Action Buttons */}
      <div className="track-actions">
        <button 
          className={`btn-icon ${isFav ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          title={isFav ? "Remove from Liked Songs" : "Save to Liked Songs"}
          style={{ width: '32px', height: '32px' }}
        >
          <Heart size={16} fill={isFav ? "var(--accent-primary)" : "none"} color={isFav ? "var(--accent-primary)" : "currentColor"} />
        </button>

        <button 
          className="btn-icon"
          onClick={handleAddClick}
          title="Add to Playlist"
          style={{ width: '32px', height: '32px' }}
        >
          <Plus size={16} />
        </button>

        {onRemoveTrack && (
          <button 
            className="btn-icon"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveTrack(track.id);
            }}
            title="Remove from playlist"
            style={{ width: '32px', height: '32px', color: '#f87171' }}
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
