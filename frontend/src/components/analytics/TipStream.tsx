import React, { useEffect, useRef, useState } from 'react';

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
    amount: number;
}

const TipStream: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<Particle[]>([]);
    const requestRef = useRef<number>();
    const [lastTip, setLastTip] = useState<{ name: string; amount: number } | null>(null);

    const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

    const createParticle = (x: number, y: number, amount: number) => {
        return {
            id: Math.random(),
            x,
            y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 2,
            size: Math.random() * 4 + 2 + (amount / 10),
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1,
            amount
        };
    };

    const animate = (_time: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update and draw particles
        particles.current = particles.current.filter(p => p.alpha > 0.01);

        particles.current.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha *= 0.98;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fill();
        });

        ctx.globalAlpha = 1;
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);

        // Simulate incoming tips
        const interval = setInterval(() => {
            const names = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve'];
            const name = names[Math.floor(Math.random() * names.length)];
            const amount = Math.floor(Math.random() * 50) + 1;

            setLastTip({ name, amount });

            const canvas = canvasRef.current;
            if (canvas) {
                for (let i = 0; i < 15; i++) {
                    particles.current.push(createParticle(canvas.width / 2, canvas.height / 2, amount));
                }
            }
        }, 2000);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="relative w-full h-[300px] bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="absolute top-4 left-6 z-10">
                <h3 className="text-xl font-bold text-white/90">Real-time Tip Stream</h3>
                <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Live Activity</p>
            </div>

            <canvas
                ref={canvasRef}
                width={600}
                height={300}
                className="w-full h-full"
            />

            {lastTip && (
                <div key={Date.now()} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center animate-bounce">
                    <div className="text-4xl font-black text-white drop-shadow-lg">
                        ${lastTip.amount}
                    </div>
                    <div className="text-sm font-medium text-white/70 italic">
                        from {lastTip.name}
                    </div>
                </div>
            )}

            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
        </div>
    );
};

export default TipStream;
