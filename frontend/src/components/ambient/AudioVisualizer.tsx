import { useRef, useEffect } from 'react';
import { useReducedMotion } from '@/utils/animationUtils';

export interface AudioVisualizerProps {
  /** Audio element to analyze (from useAudio). Must be playing for signal. */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** Canvas width. Default: container width. */
  width?: number;
  /** Canvas height. Default 120. */
  height?: number;
  /** Bar count. Default 64. */
  barCount?: number;
  /** Bar color (CSS color). Default theme accent. */
  barColor?: string;
  /** Gap between bars in px. Default 3. */
  gap?: number;
  className?: string;
}

const DEFAULT_HEIGHT = 120;
const DEFAULT_BAR_COUNT = 64;
const DEFAULT_GAP = 3;
const FFT_SIZE = 256;

export default function AudioVisualizer({
  audioRef,
  width,
  height = DEFAULT_HEIGHT,
  barCount = DEFAULT_BAR_COUNT,
  barColor = 'rgba(255, 209, 102, 0.85)',
  gap = DEFAULT_GAP,
  className = '',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const audio = audioRef?.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas || reducedMotion) return;

    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    audioContextRef.current = ctx;
    sourceRef.current = source;
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let rafId: number;

    const draw = () => {
      const a = analyserRef.current;
      const c = canvasRef.current;
      if (!a || !c) return;

      rafId = requestAnimationFrame(draw);
      a.getByteFrequencyData(dataArray);

      const cw = width ?? c.width;
      const ch = c.height;
      const g = canvas.getContext('2d');
      if (!g) return;

      g.clearRect(0, 0, cw, ch);
      const barWidth = (cw - (barCount - 1) * gap) / barCount;
      const step = Math.max(1, Math.floor(bufferLength / barCount));

      for (let i = 0; i < barCount; i++) {
        const sum = dataArray.slice(i * step, (i + 1) * step).reduce((a2, b) => a2 + b, 0);
        const avg = sum / step;
        const norm = avg / 255;
        const barHeight = Math.max(4, norm * ch * 0.9);
        const x = i * (barWidth + gap);
        const y = ch - barHeight;
        g.fillStyle = barColor;
        g.fillRect(x, y, barWidth, barHeight);
      }
    };

    if (ctx.state === 'suspended') ctx.resume().then(() => draw());
    else draw();

    return () => {
      cancelAnimationFrame(rafId);
      try {
        source.disconnect();
      } catch {
        // ignore
      }
      analyserRef.current = null;
      sourceRef.current = null;
      audioContextRef.current = null;
    };
  }, [audioRef, barCount, barColor, gap, reducedMotion, width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion) return;
    const w = width ?? canvas.parentElement?.clientWidth ?? 800;
    canvas.width = w;
    canvas.height = height;
  }, [height, width, reducedMotion]);

  if (reducedMotion) {
    return (
      <div
        className={className}
        style={{ height: `${height}px`, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}
        aria-hidden
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={width ?? 800}
      height={height}
      aria-hidden
      style={{ display: 'block', width: '100%', height: `${height}px`, maxWidth: '100%' }}
    />
  );
}
