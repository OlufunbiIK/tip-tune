import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIdleDetection } from '@/hooks/useIdleDetection';
import { useReducedMotion } from '@/utils/animationUtils';
import { usePlayerOptional } from '@/contexts/PlayerContext';
import AudioVisualizer from './AudioVisualizer';
import AmbientTipFeed from './AmbientTipFeed';
import AmbientClock from './AmbientClock';

export interface AmbientModeProps {
  /** Idle timeout in ms. Default 60_000. */
  idleTimeoutMs?: number;
  /** Show clock. Default true. */
  showClock?: boolean;
  /** Callback when user exits ambient. */
  onExit?: () => void;
}

export default function AmbientMode({
  idleTimeoutMs = 60_000,
  showClock = true,
  onExit,
}: AmbientModeProps) {
  const player = usePlayerOptional();
  const currentTrack = player?.currentTrack ?? null;
  const audioRef = player?.audioRef ?? { current: null };
  const { isIdle, reset } = useIdleDetection({ timeoutMs: idleTimeoutMs });
  const reducedMotion = useReducedMotion();
  const bgRef = useRef<HTMLDivElement>(null);

  const isActive = isIdle && currentTrack != null;

  // Slow screensaver-style pan on album art (no React state per frame; respect reduced motion)
  useEffect(() => {
    if (reducedMotion || !isActive || !bgRef.current) return;
    const el = bgRef.current;
    const radius = 12;
    let rafId: number;
    const tick = (t: number) => {
      const x = Math.sin(t * 0.00008) * radius;
      const y = Math.cos(t * 0.00006) * radius;
      el.style.transform = `translate(${x}px, ${y}px)`;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isActive, reducedMotion]);

  const handleExit = () => {
    reset();
    onExit?.();
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
          onClick={handleExit}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleExit();
          }}
          role="button"
          tabIndex={0}
          aria-label="Exit ambient mode"
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              handleExit();
            }
          }}
        >
          {/* Full-screen blurred album art background with slow pan */}
          <div className="absolute inset-0 overflow-hidden bg-navy">
            {currentTrack?.coverArt && (
              <div
                ref={bgRef}
                className="absolute inset-0 scale-110 bg-cover bg-center will-change-transform"
                style={{
                  backgroundImage: `url(${currentTrack.coverArt})`,
                  filter: 'blur(40px) brightness(0.45)',
                }}
              />
            )}
          </div>

          {/* Gradient overlay for readability */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.75) 100%)',
            }}
          />

          {/* Top: clock (optional) */}
          {showClock && (
            <div className="relative z-10 pt-12 flex justify-center">
              <AmbientClock className="text-4xl sm:text-5xl" />
            </div>
          )}

          {/* Center: track info (minimal) */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
            {currentTrack?.coverArt && (
              <motion.div
                className="w-40 h-40 sm:w-52 sm:h-52 rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/10 mb-6"
                initial={reducedMotion ? false : { scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <img
                  src={currentTrack.coverArt}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </motion.div>
            )}
            <motion.p
              className="text-white text-xl sm:text-2xl font-semibold text-center truncate max-w-full"
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              {currentTrack?.title}
            </motion.p>
            <motion.p
              className="text-white/70 text-sm sm:text-base mt-1"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              {currentTrack?.artist?.artistName ?? '—'}
            </motion.p>

            {/* Audio visualizer */}
            <div className="w-full max-w-2xl mt-8 px-4">
              <AudioVisualizer
                audioRef={audioRef}
                height={80}
                barCount={48}
                barColor="rgba(255, 209, 102, 0.85)"
                className="rounded-lg"
              />
            </div>
          </div>

          {/* Bottom: live tip feed */}
          <div className="relative z-10 pb-12 pt-4 px-4">
            <AmbientTipFeed trackId={currentTrack?.id ?? null} className="max-w-full" />
          </div>

          {/* Hint */}
          <p className="absolute bottom-4 left-0 right-0 text-center text-white/50 text-xs pointer-events-none">
            Tap or click anywhere to exit
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
