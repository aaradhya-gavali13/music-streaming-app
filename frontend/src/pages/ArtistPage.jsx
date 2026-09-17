import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, Users, Disc, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import TrackRow from '../components/TrackRow';
import { usePlayer } from '../hooks/usePlayer';

export default function ArtistPage({ 
  artistId, 
  onBack, 
  openAuthModal, 
  onAddToPlaylist 
}) {
  const [artist, setArtist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playTrack } = usePlayer();

  useEffect(() => {
    async function loadArtist() {
      setLoading(true);
      try {
        const [artistData, trackData] = await Promise.all([
          api.getArtist(artistId),
          api.getArtistTracks(artistId, 25)
        ]);
        setArtist(artistData);
        setTracks(trackData);
      } catch (err) {
        console.error("Failed to load artist:", err);
      } finally {
        setLoading(false);
      }
    }
    if (artistId) {
      loadArtist();
    }
  }, [artistId]);

  if (loading) {
    return (
      <div className="scrollable-page" style={{ textAlign: 'center', padding: '60px' }}>
        <Disc size={36} className="animate-spin" style={{ margin: '0 auto 12px' }} />
        <p>Loading artist profile...</p>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="scrollable-page">
        <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '16px' }}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <p>Artist could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="scrollable-page">
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '20px' }}>
        <ArrowLeft size={16} />
        <span>Back</span>
      </button>

      {/* Artist Profile Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '28px',
        padding: '32px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(26, 29, 38, 0.8) 100%)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        marginBottom: '36px'
      }}>
        <img
          src={artist.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
          alt={artist.name}
          style={{
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            objectFit: 'cover',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}
        />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
            <CheckCircle2 size={16} />
            <span>Verified Artist</span>
          </div>
          <h1 style={{ fontSize: '2.8rem', marginBottom: '8px' }}>{artist.name}</h1>
          {artist.bio && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '600px', marginBottom: '16px' }}>
              {artist.bio}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {tracks.length > 0 && (
              <button 
                className="btn btn-primary"
                onClick={() => playTrack(tracks[0], tracks)}
              >
                <Play size={18} fill="#ffffff" />
                <span>Play Discography</span>
              </button>
            )}
            {artist.follower_count > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Users size={16} />
                <span>{artist.follower_count.toLocaleString()} followers</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Tracks */}
      <section>
        <h2 style={{ marginBottom: '18px' }}>Top Songs ({tracks.length})</h2>
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
          {tracks.length === 0 && (
            <p style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>
              No tracks published yet by this artist.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
