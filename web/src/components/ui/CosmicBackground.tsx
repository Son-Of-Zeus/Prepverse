import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  color: string;
}

interface CosmicBackgroundProps {
  starCount?: number;
  showGrid?: boolean;
  showOrbs?: boolean;
}

/**
 * CosmicBackground - An animated background that creates the "verse" atmosphere
 * Features floating stars, a subtle grid, and glowing orbs
 */
export const CosmicBackground: React.FC<CosmicBackgroundProps> = ({
  starCount = 80,
  showGrid = true,
  showOrbs = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      const colors = [
        'rgba(229, 57, 53, 0.8)', // Red
        'rgba(255, 111, 96, 0.7)', // Light red
        'rgba(179, 136, 255, 0.6)', // Purple
        'rgba(0, 255, 209, 0.5)', // Cyan
        'rgba(255, 255, 255, 0.8)', // White
      ];

      starsRef.current = Array.from({ length: starCount }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.2,
        speed: Math.random() * 0.3 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)] ?? 'rgba(255, 255, 255, 0.8)',
      }));
    };

    const animate = () => {
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw stars
      starsRef.current.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = star.opacity + Math.sin(Date.now() * 0.001 + star.x) * 0.2;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Animate star movement
        star.y -= star.speed;
        if (star.y < -10) {
          star.y = canvas.height + 10;
          star.x = Math.random() * canvas.width;
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [starCount]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(229, 57, 53, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 20% 80%, rgba(83, 109, 254, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse 50% 30% at 80% 60%, rgba(179, 136, 255, 0.08) 0%, transparent 50%),
            linear-gradient(180deg, #0A0A0C 0%, #121218 100%)
          `,
        }}
      />

      {/* Grid overlay */}
      {showGrid && (
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(rgba(229, 57, 53, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(229, 57, 53, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
          }}
        />
      )}

      {/* Animated canvas for stars */}
      <canvas ref={canvasRef} className="absolute inset-0" style={{ opacity: 0.8 }} />

      {/* Glowing orbs */}
      {showOrbs && (
        <>
          <div
            className="absolute rounded-full animate-pulse-glow"
            style={{
              width: '400px',
              height: '400px',
              top: '-100px',
              right: '-100px',
              background: 'radial-gradient(circle, rgba(229, 57, 53, 0.2) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
          <div
            className="absolute rounded-full animate-pulse-glow"
            style={{
              width: '300px',
              height: '300px',
              bottom: '10%',
              left: '-50px',
              background: 'radial-gradient(circle, rgba(83, 109, 254, 0.15) 0%, transparent 70%)',
              filter: 'blur(30px)',
              animationDelay: '1s',
            }}
          />
          <div
            className="absolute rounded-full animate-pulse-glow"
            style={{
              width: '200px',
              height: '200px',
              top: '40%',
              right: '10%',
              background: 'radial-gradient(circle, rgba(179, 136, 255, 0.12) 0%, transparent 70%)',
              filter: 'blur(25px)',
              animationDelay: '2s',
            }}
          />
        </>
      )}

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default CosmicBackground;
