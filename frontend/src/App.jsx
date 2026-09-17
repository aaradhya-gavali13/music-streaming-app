import React, { useState } from 'react';
import { AuthProvider } from './hooks/useAuth';
import { PlayerProvider } from './hooks/usePlayer';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Player from './components/Player';
import AuthModal from './components/AuthModal';
import PlaylistModal from './components/PlaylistModal';

import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ArtistPage from './pages/ArtistPage';
import PlaylistPage from './pages/PlaylistPage';
import LibraryPage from './pages/LibraryPage';
import FavoritesPage from './pages/FavoritesPage';
import HistoryPage from './pages/HistoryPage';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtistId, setSelectedArtistId] = useState(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [trackForPlaylist, setTrackForPlaylist] = useState(null);

  const openAuthModal = (mode = 'login') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const openCreatePlaylistModal = () => {
    setTrackForPlaylist(null);
    setIsPlaylistModalOpen(true);
  };

  const handleAddToPlaylist = (track) => {
    setTrackForPlaylist(track);
    setIsPlaylistModalOpen(true);
  };

  const handleSelectArtist = (artistId) => {
    setSelectedArtistId(artistId);
    setCurrentPage('artist');
  };

  const handleSelectPlaylist = (playlistId) => {
    setSelectedPlaylistId(playlistId);
    setCurrentPage(`playlist-${playlistId}`);
  };

  const handleSearchSubmit = (q) => {
    setSearchQuery(q);
    setCurrentPage('search');
  };

  const handleSearchGenre = (genreId) => {
    setSearchQuery(genreId);
    setCurrentPage('search');
  };

  // Render current view
  const renderCurrentView = () => {
    if (currentPage.startsWith('playlist-')) {
      const pId = currentPage.replace('playlist-', '');
      return (
        <PlaylistPage 
          playlistId={pId}
          onBack={() => setCurrentPage('library')}
          onPlaylistDeleted={() => setCurrentPage('library')}
          openAuthModal={openAuthModal}
          onAddToPlaylist={handleAddToPlaylist}
        />
      );
    }

    switch (currentPage) {
      case 'home':
        return (
          <HomePage 
            onSelectArtist={handleSelectArtist}
            onSelectPlaylist={handleSelectPlaylist}
            onSearchGenre={handleSearchGenre}
            openAuthModal={openAuthModal}
            onAddToPlaylist={handleAddToPlaylist}
          />
        );
      case 'search':
        return (
          <SearchPage 
            initialQuery={searchQuery}
            onSelectArtist={handleSelectArtist}
            onSelectPlaylist={handleSelectPlaylist}
            openAuthModal={openAuthModal}
            onAddToPlaylist={handleAddToPlaylist}
          />
        );
      case 'artist':
        return (
          <ArtistPage 
            artistId={selectedArtistId}
            onBack={() => setCurrentPage('home')}
            openAuthModal={openAuthModal}
            onAddToPlaylist={handleAddToPlaylist}
          />
        );
      case 'library':
        return (
          <LibraryPage 
            setCurrentPage={setCurrentPage}
            onSelectPlaylist={handleSelectPlaylist}
            openCreatePlaylistModal={openCreatePlaylistModal}
            openAuthModal={openAuthModal}
          />
        );
      case 'favorites':
        return (
          <FavoritesPage 
            openAuthModal={openAuthModal}
            onAddToPlaylist={handleAddToPlaylist}
          />
        );
      case 'history':
        return (
          <HistoryPage 
            openAuthModal={openAuthModal}
            onAddToPlaylist={handleAddToPlaylist}
          />
        );
      default:
        return (
          <HomePage 
            onSelectArtist={handleSelectArtist}
            onSelectPlaylist={handleSelectPlaylist}
            onSearchGenre={handleSearchGenre}
            openAuthModal={openAuthModal}
            onAddToPlaylist={handleAddToPlaylist}
          />
        );
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        openAuthModal={openAuthModal}
        openCreatePlaylistModal={openCreatePlaylistModal}
      />

      {/* Main Page Area */}
      <div className="main-content-wrapper">
        <Navbar 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          openAuthModal={openAuthModal}
          setCurrentPage={setCurrentPage}
        />
        {renderCurrentView()}
      </div>

      {/* Persistent Bottom Player */}
      <Player />

      {/* Modals */}
      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
      />

      <PlaylistModal 
        isOpen={isPlaylistModalOpen}
        onClose={() => {
          setIsPlaylistModalOpen(false);
          setTrackForPlaylist(null);
        }}
        trackToAdd={trackForPlaylist}
        onPlaylistUpdated={() => {}}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <AppContent />
      </PlayerProvider>
    </AuthProvider>
  );
}
