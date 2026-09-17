import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  ListMusic, 
  Disc,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';
import { usePlayer } from '../hooks/usePlayer';

export default function Player() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    queue,
    queueIndex,
    isShuffle,
    repeatMode,
    isQueueOpen,
    isLoadingAudio,
    playbackError,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolumeLevel,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    removeFromQueue,
    playTrack,
    setIsQueueOpen
  } = usePlayer();

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeekChange = (e) => {
    setSeekValue(parseFloat(e.target.value));
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekEnd = (e) => {
    setIsSeeking(false);
    seek(parseFloat(e.target.value));
  };

  if (!currentTrack) {
    return (
      <footer className="bottom-player" style={{ justifyContent: 'center', opacity: 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
          <Disc size={20} className="animate-spin" />
          <span>Select any track to begin authorized streaming</span>
        </div>
      </footer>
    );
  }

  const activeDuration = duration || currentTrack.duration || 0;
  const displayCurrentTime = isSeeking ? seekValue : currentTime;

  return (
    <>
      <footer className="bottom-player">
        {/* Track Metadata Left */}
        <div className="player-track-meta">
          <img 
            src={currentTrack.artwork_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80'} 
            alt={currentTrack.title} 
            className="player-thumb" 
          />
          <div className="player-text">
            <div className="player-title" title={currentTrack.title}>
              {currentTrack.title}
              {currentTrack.is_explicit && (
                <span className="badge-explicit" style={{ marginLeft: '6px' }}>E</span>
              )}
            </div>
            <div className="player-artist" title={currentTrack.artist}>
              {currentTrack.artist}
            </div>
            <div className="provider-badge">
              {currentTrack.provider || 'Authorized'}
              {currentTrack.playback_type === '30s_preview' && ' (Preview)'}
            </div>
          </div>
        </div>

        {/* Central Controls */}
        <div className="player-controls">
          <div className="player-buttons">
            <button 
              className={`btn-icon ${isShuffle ? 'active' : ''}`} 
              onClick={toggleShuffle}
              title="Shuffle playback"
            >
              <Shuffle size={18} />
            </button>

            <button 
              className="btn-icon" 
              onClick={prevTrack}
              title="Previous"
            >
              <SkipBack size={20} />
            </button>

            <button 
              className="play-pause-btn" 
              onClick={togglePlay}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isLoadingAudio ? (
                <Loader2 size={20} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={20} />
              ) : (
                <Play size={20} style={{ marginLeft: '2px' }} />
              )}
            </button>

            <button 
              className="btn-icon" 
              onClick={nextTrack}
              title="Next"
            >
              <SkipForward size={20} />
            </button>

            <button 
              className={`btn-icon ${repeatMode !== 'off' ? 'active' : ''}`} 
              onClick={toggleRepeat}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </button>
          </div>

          {/* Progress Slider */}
          <div className="player-progress-bar">
            <span className="progress-time">{formatTime(displayCurrentTime)}</span>
            <input
              type="range"
              min="0"
              max={activeDuration || 100}
              value={displayCurrentTime}
              onMouseDown={handleSeekStart}
              onTouchStart={handleSeekStart}
              onChange={handleSeekChange}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              className="progress-slider"
            />
            <span className="progress-time">{formatTime(activeDuration)}</span>
          </div>

          {/* Optional Error Alert */}
          {playbackError && (
            <div style={{
              position: 'absolute',
              top: '-36px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              fontSize: '0.75rem',
              padding: '4px 14px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              <AlertCircle size={14} />
              <span>{playbackError}</span>
            </div>
          )}
        </div>

        {/* Volume & Queue Right */}
        <div className="player-extra-controls">
          <button 
            className={`btn-icon ${isQueueOpen ? 'active' : ''}`}
            onClick={() => setIsQueueOpen(prev => !prev)}
            title="Current Queue"
          >
            <ListMusic size={20} />
          </button>

          <button 
            className="btn-icon" 
            onClick={toggleMute}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
            className="volume-slider"
          />
        </div>
      </footer>

      {/* Queue Drawer */}
      {isQueueOpen && (
        <aside className="queue-drawer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4>Playback Queue ({queue.length})</h4>
            <button className="btn-icon" onClick={() => setIsQueueOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {queue.map((t, idx) => {
              const isCurrent = idx === queueIndex;
              return (
                <div
                  key={`${t.id}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    background: isCurrent ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: isCurrent ? '1px solid var(--accent-primary)' : '1px solid transparent',
                    cursor: 'pointer'
                  }}
                  onClick={() => playTrack(t)}
                >
                  <img
                    src={t.artwork_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=80'}
                    alt={t.title}
                    style={{ width: '38px', height: '38px', borderRadius: '4px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {t.artist}
                    </div>
                  </div>
                  <button
                    className="btn-icon"
                    style={{ width: '28px', height: '28px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(idx);
                    }}
                    title="Remove from queue"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>
      )}
    </>
  );
}
