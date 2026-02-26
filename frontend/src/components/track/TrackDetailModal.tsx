import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Share2, Plus, Download, Heart, MessageCircle } from 'lucide-react';
import { Track, Tip } from '@/types';
import { TipButton } from '../tip';
import Modal from '../common/Modal';
import { useAudio } from '@/hooks/useAudio';
import { formatTime } from '@/utils/time';

export interface TrackDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  onTrackChange?: (trackId: string) => void;
  tracks?: Track[];
}

interface Comment {
  id: string;
  content: string;
  user: {
    username: string;
    avatar?: string;
  };
  createdAt: string;
  likesCount: number;
  repliesCount: number;
}

const TrackDetailModal: React.FC<TrackDetailModalProps> = ({
  isOpen,
  onClose,
  track,
  onTrackChange,
  tracks = [],
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Audio hook for track playback
  const {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlayPause,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
  } = useAudio({
    tracks: track ? [track] : [],
    initialTrackIndex: 0,
    onTrackChange: () => {},
    onPlayStateChange: (playing) => {
      // Handle play state changes
    },
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowRight':
          next();
          break;
        case 'ArrowLeft':
          previous();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, togglePlayPause, next, previous]);

  // TODO: Implement swipe gestures for mobile
  // const swipeHandlers = useSwipeable({
  //   onSwipedLeft: () => next(),
  //   onSwipedRight: () => previous(),
  //   preventScrollOnSwipe: true,
  //   trackMouse: true,
  // });

  // Focus trap for accessibility
  useEffect(() => {
    if (!isOpen) return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    firstElement.focus();
    document.addEventListener('keydown', handleTab);
    
    return () => {
      document.removeEventListener('keydown', handleTab);
    };
  }, [isOpen]);

  // Load comments when track changes
  useEffect(() => {
    if (!track?.id || !isOpen) return;

    const loadComments = async () => {
      setLoadingComments(true);
      try {
        // TODO: Implement actual API call
        // const response = await api.get(`/comments/track/${track.id}`);
        // setComments(response.data.comments);
        
        // Mock data for now
        setComments([
          {
            id: '1',
            content: 'Amazing track! Love the melody 🎵',
            user: { username: 'music_lover', avatar: '' },
            createdAt: '2024-01-15T10:30:00Z',
            likesCount: 12,
            repliesCount: 3,
          },
          {
            id: '2',
            content: 'The production quality is top notch!',
            user: { username: 'producer_max', avatar: '' },
            createdAt: '2024-01-15T09:15:00Z',
            likesCount: 8,
            repliesCount: 1,
          },
        ]);
      } catch (error) {
        console.error('Failed to load comments:', error);
      } finally {
        setLoadingComments(false);
      }
    };

    loadComments();
  }, [track?.id, isOpen]);

  if (!track) return null;

  const handleTip = async (amount: number, currency: string) => {
    // TODO: Implement tip functionality
    console.log(`Tipping ${amount} ${currency} to ${track.artist.artistName}`);
    // This should open the tip modal
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: track.title,
        text: `Check out this track by ${track.artist.artistName}`,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleAddToPlaylist = () => {
    // TODO: Open add to playlist modal
    console.log('Add to playlist');
  };

  const handleDownload = () => {
    // TODO: Implement download functionality
    console.log('Download track');
  };

  const handleLikeComment = async (commentId: string) => {
    setIsLiking(true);
    try {
      // TODO: Implement like comment API call
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, likesCount: comment.likesCount + 1 }
          : comment
      ));
    } catch (error) {
      console.error('Failed to like comment:', error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
        
      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed inset-0 z-10 overflow-y-auto"
        // {...swipeHandlers}
      >
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <div
            className="relative w-full max-w-4xl bg-navy-900 border border-navy-700 rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
            // {...swipeHandlers}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-navy-800">
              <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                {track.title}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-navy-800"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col lg:flex-row">
              {/* Left Column - Cover Art and Player */}
              <div className="lg:w-1/2 p-4 sm:p-6">
                {/* Cover Art */}
                <div className="relative mb-6">
                  <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl">
                    {track.coverArt ? (
                      <img
                        src={track.coverArt}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                        <div className="text-white/50">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Track Info */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">{track.title}</h3>
                  <p className="text-ice-blue mb-2">by {track.artist.artistName}</p>
                  {track.genre && (
                    <span className="inline-block px-3 py-1 bg-navy-800 text-ice-blue text-sm rounded-full">
                      {track.genre}
                    </span>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                    <span>🎵 {track.plays} plays</span>
                    <span>🪙 {track.tips} tips</span>
                    {track.duration && <span>⏱️ {formatTime(track.duration)}</span>}
                  </div>
                </div>

                {/* Player Controls */}
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <button
                      onClick={previous}
                      className="text-white hover:text-ice-blue transition-colors p-2 rounded-full hover:bg-navy-800"
                      aria-label="Previous track"
                    >
                      <SkipBack className="w-6 h-6" />
                    </button>
                    
                    <button
                      onClick={togglePlayPause}
                      disabled={isLoading}
                      className="bg-accent-gold text-navy-900 rounded-full p-4 hover:brightness-110 transition-all disabled:opacity-50"
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isLoading ? (
                        <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6" />
                      )}
                    </button>
                    
                    <button
                      onClick={next}
                      className="text-white hover:text-ice-blue transition-colors p-2 rounded-full hover:bg-navy-800"
                      aria-label="Next track"
                    >
                      <SkipForward className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <div
                      className="h-2 bg-navy-800 rounded-full cursor-pointer"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        seek(percent * duration);
                      }}
                    >
                      <div
                        className="h-full bg-accent-gold rounded-full transition-all"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleMute}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {isMuted || volume === 0 ? '🔇' : volume > 0.5 ? '🔊' : '🔈'}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="flex-1 h-1 bg-navy-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-gold"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <TipButton
                    amount={1}
                    currency="XLM"
                    onTip={handleTip}
                    variant="primary"
                    className="w-full"
                  />
                  
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-navy-800 text-white rounded-xl hover:bg-navy-700 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Share</span>
                  </button>
                  
                  <button
                    onClick={handleAddToPlaylist}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-navy-800 text-white rounded-xl hover:bg-navy-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add</span>
                  </button>
                  
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-navy-800 text-white rounded-xl hover:bg-navy-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">Download</span>
                  </button>
                </div>
              </div>

              {/* Right Column - Comments */}
              <div className="lg:w-1/2 p-4 sm:p-6 border-t lg:border-t-0 lg:border-l border-navy-800">
                <div className="h-full flex flex-col">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Comments ({comments.length})
                  </h3>
                  
                  <div className="flex-1 overflow-y-auto space-y-4">
                    {loadingComments ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="animate-pulse">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-navy-800 rounded-full" />
                              <div className="flex-1">
                                <div className="h-4 bg-navy-800 rounded w-1/4 mb-2" />
                                <div className="h-3 bg-navy-800 rounded w-3/4" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : comments.length > 0 ? (
                      comments.map((comment) => (
                        <div key={comment.id} className="bg-navy-800/50 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {comment.user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-white text-sm">
                                  {comment.user.username}
                                </span>
                                <span className="text-gray-500 text-xs">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-gray-300 text-sm mb-3">{comment.content}</p>
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={() => handleLikeComment(comment.id)}
                                  disabled={isLiking}
                                  className="flex items-center gap-1 text-gray-400 hover:text-ice-blue transition-colors text-sm disabled:opacity-50"
                                >
                                  <Heart className="w-4 h-4" />
                                  <span>{comment.likesCount}</span>
                                </button>
                                <button className="flex items-center gap-1 text-gray-400 hover:text-ice-blue transition-colors text-sm">
                                  <MessageCircle className="w-4 h-4" />
                                  <span>{comment.repliesCount}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500">No comments yet</p>
                        <p className="text-gray-600 text-sm mt-1">Be the first to comment!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackDetailModal;