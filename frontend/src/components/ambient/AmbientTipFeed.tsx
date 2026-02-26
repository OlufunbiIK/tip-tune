import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/utils/animationUtils';
import { Tip } from '@/types';
import { tipService } from '@/services/tipService';

export interface AmbientTipFeedProps {
  /** Track ID to load tips for. If null, shows mock or empty. */
  trackId: string | null;
  /** Max items to show. Default 20. */
  maxItems?: number;
  /** Poll interval in ms. Default 15_000. */
  pollIntervalMs?: number;
  className?: string;
}

const MOCK_TIPS: Tip[] = [
  { id: 'm1', tipperName: 'Alex', tipperAvatar: '', amount: 5, message: 'Love this!', timestamp: new Date().toISOString(), trackId: undefined },
  { id: 'm2', tipperName: 'Sam', tipperAvatar: '', amount: 10, message: '🔥', timestamp: new Date().toISOString(), trackId: undefined },
  { id: 'm3', tipperName: 'Jordan', tipperAvatar: '', amount: 2, message: '', timestamp: new Date().toISOString(), trackId: undefined },
];

function formatAmount(amount: number): string {
  return amount >= 1 ? amount.toFixed(1) : amount.toFixed(2);
}

export default function AmbientTipFeed({
  trackId,
  maxItems = 20,
  pollIntervalMs = 15_000,
  className = '',
}: AmbientTipFeedProps) {
  const [tips, setTips] = useState<Tip[]>([]);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!trackId) {
      setTips(MOCK_TIPS);
      return;
    }

    const fetchTips = async () => {
      try {
        const res = await tipService.getByTrack(trackId, 1, maxItems);
        if (res?.data?.length) setTips(res.data);
        else setTips(MOCK_TIPS);
      } catch {
        setTips(MOCK_TIPS);
      }
    };

    fetchTips();
    const interval = setInterval(fetchTips, pollIntervalMs);
    return () => clearInterval(interval);
  }, [trackId, maxItems, pollIntervalMs]);

  if (tips.length === 0) return null;

  const duration = reducedMotion ? 0 : 40;

  return (
    <div
      className={`overflow-hidden w-full ${className}`}
      aria-label="Recent tips"
    >
      <motion.div
        className="flex gap-6 whitespace-nowrap w-max"
        animate={{ x: [0, -1200] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration,
            ease: 'linear',
          },
        }}
      >
        {tips.concat(tips).map((tip) => (
          <div
            key={`${tip.id}-${tip.timestamp}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/90 text-sm"
          >
            <span className="font-semibold text-gold">{formatAmount(tip.amount)} XLM</span>
            <span className="text-white/80">{tip.tipperName}</span>
            {tip.message ? (
              <span className="text-white/60 max-w-[120px] truncate">— {tip.message}</span>
            ) : null}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
