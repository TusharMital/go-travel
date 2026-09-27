import React, { useEffect, useRef } from 'react';

interface Node {
  id: string;
  name: string;
  code: string;
  x: number;
  y: number;
  type: 'hub' | 'locker' | 'junction';
  pulse: number;
}

interface Particle {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
  color: string;
}

export const TransitShaderHero: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 160 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 650);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Initial Wayfinding Transit Nodes
    const nodes: Node[] = [
      { id: '1', name: 'BERLIN CENTRAL', code: 'BER-HBF', x: width * 0.22, y: height * 0.32, type: 'hub', pulse: 0 },
      { id: '2', name: 'MUSEUM LOCKERS', code: 'LCK-092', x: width * 0.38, y: height * 0.24, type: 'locker', pulse: 1 },
      { id: '3', name: 'ALEXANDERPLATZ', code: 'ALX-TRS', x: width * 0.52, y: height * 0.42, type: 'junction', pulse: 2 },
      { id: '4', name: 'POTSDAMER CORRIDOR', code: 'POT-771', x: width * 0.32, y: height * 0.68, type: 'locker', pulse: 3 },
      { id: '5', name: 'BER AERODROME', code: 'BER-AIR', x: width * 0.76, y: height * 0.58, type: 'hub', pulse: 4 },
      { id: '6', name: 'WESTEND DEPOT', code: 'WST-204', x: width * 0.14, y: height * 0.75, type: 'locker', pulse: 5 },
      { id: '7', name: 'KREUZBERG CORRIDOR', code: 'KRZ-501', x: width * 0.62, y: height * 0.78, type: 'junction', pulse: 6 },
    ];

    const connections: [number, number][] = [
      [0, 1],
      [1, 2],
      [0, 3],
      [3, 2],
      [2, 4],
      [3, 6],
      [6, 4],
      [0, 5],
      [5, 3],
    ];

    // Transit telemetry particles streaming across corridors
    const particles: Particle[] = Array.from({ length: 24 }).map((_, i) => ({
      fromNode: connections[i % connections.length][0],
      toNode: connections[i % connections.length][1],
      progress: Math.random(),
      speed: 0.003 + Math.random() * 0.005,
      color: i % 2 === 0 ? '#FF6B35' : '#E8ECF0',
    }));

    let radarAngle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Subtle Telemetry Grid & Range Rings
      ctx.strokeStyle = 'rgba(38, 48, 56, 0.4)';
      ctx.lineWidth = 1;

      // Draw concentric radar range rings around central hub
      const centerNode = nodes[0];
      [80, 160, 240, 320].forEach((r) => {
        ctx.beginPath();
        ctx.arc(centerNode.x, centerNode.y, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 2. Draw Radar Sweep Beam
      radarAngle += 0.015;
      const sweepLength = 320;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerNode.x, centerNode.y);
      ctx.arc(centerNode.x, centerNode.y, sweepLength, radarAngle, radarAngle + 0.35);
      ctx.closePath();
      const sweepGrad = ctx.createRadialGradient(
        centerNode.x,
        centerNode.y,
        0,
        centerNode.x,
        centerNode.y,
        sweepLength
      );
      sweepGrad.addColorStop(0, 'rgba(255, 107, 53, 0.15)');
      sweepGrad.addColorStop(1, 'rgba(255, 107, 53, 0)');
      ctx.fillStyle = sweepGrad;
      ctx.fill();
      ctx.restore();

      // 3. Draw Corridor Connections
      connections.forEach(([fromIdx, toIdx]) => {
        const from = nodes[fromIdx];
        const to = nodes[toIdx];

        ctx.strokeStyle = 'rgba(90, 104, 116, 0.35)';
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // 4. Update and Draw Moving Transit Telemetry Particles
      particles.forEach((p) => {
        p.progress += p.speed;
        if (p.progress >= 1) {
          p.progress = 0;
        }

        const from = nodes[p.fromNode];
        const to = nodes[p.toNode];
        const currentX = from.x + (to.x - from.x) * p.progress;
        const currentY = from.y + (to.y - from.y) * p.progress;

        // Particle trail
        ctx.beginPath();
        ctx.arc(currentX, currentY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 5. Draw Hub Nodes and Interactive Hover Callouts
      nodes.forEach((node) => {
        node.pulse += 0.03;
        const pulseSize = 4 + Math.sin(node.pulse) * 3;

        // Interactive mouse magnetism distance check
        const dx = mouseRef.current.x - node.x;
        const dy = mouseRef.current.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isHovered = dist < 70;

        // Pulsing ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8 + pulseSize, 0, Math.PI * 2);
        ctx.strokeStyle = node.type === 'hub' ? 'rgba(255, 107, 53, 0.35)' : 'rgba(232, 236, 240, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Node center marker
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.type === 'hub' ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = node.type === 'hub' ? '#FF6B35' : node.type === 'locker' ? '#E8ECF0' : '#F2C94C';
        ctx.fill();

        // Stenciled Label & Code
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = isHovered ? '#FF6B35' : '#8C9BA8';
        ctx.fillText(node.code, node.x + 14, node.y + 3);

        if (isHovered) {
          ctx.font = 'bold 11px "Cabinet Grotesk", sans-serif';
          ctx.fillStyle = '#E8ECF0';
          ctx.fillText(node.name, node.x + 14, node.y - 10);

          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillStyle = '#74D680';
          ctx.fillText('STATUS: ONLINE // 0ms GAPS', node.x + 14, node.y + 16);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-auto overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair opacity-85"
      />
      {/* Fallback for prefers-reduced-motion */}
      <div className="hidden motion-reduce:block absolute inset-0 bg-[#0B0F12] border-b border-[#263038] p-8">
        <div className="font-mono text-xs text-[#8C9BA8]">
          [STATIC TELEMETRY DISPATCH: ALL TRANSIT CORRIDORS ACTIVE]
        </div>
      </div>
    </div>
  );
};
