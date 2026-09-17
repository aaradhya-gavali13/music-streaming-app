import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(new Audio());
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);

  // Sync audio element volume
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoadingAudio(false);
    };

    const handleWaiting = () => {
      setIsLoadingAudio(true);
    };

    const handleCanPlay = () => {
      setIsLoadingAudio(false);
      setPlaybackError(null);
    };

    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else {
        handleNext();
      }
    };

    const handleError = (e) => {
      console.warn("Audio element error:", e);
      setIsLoadingAudio(false);
      setIsPlaying(false);
      if (currentTrack?.stream_url) {
        setPlaybackError("Audio stream temporarily unavailable from provider.");
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [repeatMode, queue, queueIndex, isShuffle, currentTrack]);

  // Play a specific track (and optionally load a new playlist queue)
  const playTrack = async (track, newQueue = null) => {
    if (!track) return;
    setPlaybackError(null);
    setIsLoadingAudio(true);

    let activeQueue = newQueue || queue;
    if (newQueue) {
      setQueue(newQueue);
      const idx = newQueue.findIndex(t => t.id === track.id);
      setQueueIndex(idx !== -1 ? idx : 0);
    } else {
      const idx = activeQueue.findIndex(t => t.id === track.id);
      if (idx !== -1) {
        setQueueIndex(idx);
      } else {
        setQueue([track, ...activeQueue]);
        setQueueIndex(0);
      }
    }

    setCurrentTrack(track);

    // Resolve stream URL if missing
    let streamUrl = track.stream_url;
    if (!streamUrl) {
      try {
        const playback = await api.getPlayback(track.id);
        streamUrl = playback.stream_url;
        track.stream_url = streamUrl;
      } catch (err) {
        console.error("Could not fetch playback URL:", err);
        setPlaybackError("Could not resolve stream URL from music provider.");
        setIsLoadingAudio(false);
        return;
      }
    }

    if (!streamUrl) {
      setPlaybackError("Track stream is not available or requires official provider SDK.");
      setIsLoadingAudio(false);
      return;
    }

    const audio = audioRef.current;
    audio.src = streamUrl;
    audio.load();

    try {
      await audio.play();
      setIsPlaying(true);
      setIsLoadingAudio(false);

      // Record to history if user is logged in
      const token = localStorage.getItem('aurasound_token');
      if (token) {
        api.recordHistory(track.id, {
          provider_track_id: track.id,
          title: track.title,
          artist_name: track.artist,
          album_name: track.album,
          artwork_url: track.artwork_url,
          duration: track.duration,
          stream_url: track.stream_url
        }).catch(err => console.debug("History recording skipped:", err));
      }
    } catch (playErr) {
      console.warn("Autoplay / stream error:", playErr);
      setIsPlaying(false);
      setIsLoadingAudio(false);
      setPlaybackError("Click Play to start audio streaming.");
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!currentTrack) {
      if (queue.length > 0) {
        playTrack(queue[0]);
      }
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error("Play failed:", err);
        setPlaybackError("Playback could not start. Please check audio stream.");
      });
    }
  };

  const handleNext = () => {
    if (queue.length === 0) return;
    let nextIdx;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeatMode === 'all') {
          nextIdx = 0;
        } else {
          setIsPlaying(false);
          return;
        }
      }
    }
    setQueueIndex(nextIdx);
    playTrack(queue[nextIdx]);
  };

  const handlePrev = () => {
    const audio = audioRef.current;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (queue.length === 0) return;
    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = queue.length - 1;
    }
    setQueueIndex(prevIdx);
    playTrack(queue[prevIdx]);
  };

  const seek = (seconds) => {
    const audio = audioRef.current;
    audio.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const setVolumeLevel = (newVolume) => {
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const toggleShuffle = () => {
    setIsShuffle(prev => !prev);
  };

  const toggleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const addToQueue = (track) => {
    setQueue(prev => [...prev, track]);
  };

  const removeFromQueue = (index) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
    if (index === queueIndex) {
      handleNext();
    } else if (index < queueIndex) {
      setQueueIndex(prev => prev - 1);
    }
  };

  return (
    <PlayerContext.Provider value={{
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
      playTrack,
      togglePlay,
      nextTrack: handleNext,
      prevTrack: handlePrev,
      seek,
      setVolumeLevel,
      toggleMute,
      toggleShuffle,
      toggleRepeat,
      addToQueue,
      removeFromQueue,
      setIsQueueOpen
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
