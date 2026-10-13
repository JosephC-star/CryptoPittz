import { useEffect, useRef } from 'react';
export default function EmberField({ firing = false, enabled = true, lite = false }) {
  const canvas = useRef(null), burst = useRef(firing);
  useEffect(() => { burst.current = firing; }, [firing]);
  useEffect(() => {
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const node = canvas.current, ctx = node.getContext('2d');
    if (!ctx) return;
    let width = 0, height = 0, frame, previous = 0;
    const mobile = window.matchMedia('(max-width: 700px)').matches;
    const particles = Array.from({ length: lite ? 22 : mobile ? 45 : 95 }, () => ({}));
    function seed(p, initial = false) {
      p.x = Math.random() * width; p.y = initial ? Math.random() * height : height + 15;
      p.depth = .35 + Math.random() * .65; p.size = .6 + Math.random() * 2.3;
      p.speed = 18 + Math.random() * 48; p.drift = Math.random() * 34 - 17;
      p.phase = Math.random() * Math.PI * 2; p.life = Math.random() * .5 + .5;
    }
    function resize() {
      width = window.innerWidth; height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      node.width = width * dpr; node.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles.forEach(p => seed(p, true));
    }
    function draw(time) {
      const dt = Math.min((time - previous) / 1000 || .016, .04); previous = time;
      ctx.clearRect(0, 0, width, height);
      const boost = burst.current ? 2.4 : 1;
      for (const p of particles) {
        p.y -= p.speed * p.depth * dt * boost;
        p.x += (p.drift + Math.sin(time * .001 + p.phase) * 21) * dt * boost;
        if (p.y < -15 || p.x < -25 || p.x > width + 25) seed(p);
        const fade = Math.min(1, p.y / 100, (height - p.y + 20) / 80);
        const alpha = Math.max(0, fade) * p.life * (.5 + Math.sin(time * .003 + p.phase) * .2);
        ctx.shadowBlur = lite ? 0 : p.size * 5; ctx.shadowColor = '#ff651f';
        ctx.fillStyle = `rgba(255,${Math.floor(115 + p.depth * 100)},70,${alpha})`;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * p.depth, p.size * p.depth * 1.6, .7, 0, Math.PI * 2); ctx.fill();
        if (burst.current) { ctx.shadowBlur = 0; ctx.strokeStyle = `rgba(255,100,30,${alpha * .3})`; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.drift * .08, p.y + p.speed * .09); ctx.stroke(); }
      }
      frame = requestAnimationFrame(draw);
    }
    function visibility() { cancelAnimationFrame(frame); previous = 0; if (!document.hidden) frame = requestAnimationFrame(draw); }
    resize(); frame = requestAnimationFrame(draw);
    window.addEventListener('resize', resize); document.addEventListener('visibilitychange', visibility);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility); };
  }, [enabled, lite]);
  return <canvas className="pittensor-embers" ref={canvas} aria-hidden="true" />;
}
