import React, { useState, useEffect } from 'react';
import { Clock, Trash2, Disc } from 'lucide-react';
import { api } from '../services/api';
import TrackRow from '../components/TrackRow';

export default function HistoryPage({ openAuthModal, onAddToPlaylist }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory();
      setHistory(data);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClearHistory = async () => {
    if (!window.confirm("Clear your entire listening history?")) return;
    try {
      await api.clearHistory();
      setHistory([]);
    } catch (err) {
      alert(err.message);
    }
  };

  const formattedTracks = history.map(h => ({
    id: h.provider_track_id,
    title: h.title,
    artist: h.artist_name,
    album: h.album_name,
    artwork_url: h.artwork_url,
    duration: h.duration,
    stream_url: h.stream_url
  }));

  return (
    <div className="scrollable-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Clock size={28} color="var(--accent-primary)" />
          <h2>Recently Played</h2>
        </div>

        {history.length > 0 && (
          <button 
            className="btn btn-secondary"
            onClick={handleClearHistory}
            style={{ color: '#f87171', fontSize: '0.85rem' }}
          >
            <Trash2 size={16} />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <Disc size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p>Loading your history...</p>
        </div>
      ) : (
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', padding: '8px' }}>
          {formattedTracks.map((t, idx) => (
            <TrackRow 
              key={`${t.id}-${idx}`} 
              track={t} 
              index={idx}
              playlistQueue={formattedTracks}
              onAddToPlaylist={onAddToPlaylist}
              openAuthModal={openAuthModal}
            />
          ))}

          {formattedTracks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Clock size={44} style={{ opacity: 0.3, margin: '0 auto 14px' }} />
              <h3>No listening history yet</h3>
              <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
                Songs you stream will automatically appear here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
