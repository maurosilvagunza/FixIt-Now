
import React, { useEffect, useRef } from 'react';
import { ARMarker } from '../types';

interface ARLayerProps {
  markers: ARMarker[];
  width: number;
  height: number;
}

const ARLayer: React.FC<ARLayerProps> = ({ markers, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const startTimeRef = useRef<number | null>(null);

  const animate = (time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const elapsed = time - startTimeRef.current;
    const duration = 10000;
    const progress = Math.min(elapsed / duration, 1);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    markers.forEach(marker => {
      const colorMap = { red: '#ff4d4d', green: '#4ade80', blue: '#60a5fa', yellow: '#facc15' };
      const baseColor = colorMap[marker.color] || '#ffffff';

      // Coordenadas do centro
      const cx = (marker.x / 100) * width;
      const cy = (marker.y / 100) * height;

      // Cálculo de dimensões via bbox ou default
      let bw = 80, bh = 80;
      if (marker.bbox) {
        const [ymin, xmin, ymax, xmax] = marker.bbox;
        bw = ((xmax - xmin) / 100) * width;
        bh = ((ymax - ymin) / 100) * height;
      }

      let opacity = 1;
      if (progress < 0.05) opacity = progress * 20;
      if (progress > 0.95) opacity = (1 - progress) * 20;
      
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 15;
      ctx.shadowColor = baseColor;

      const label = marker.label?.toUpperCase() || "";

      switch (marker.type) {
        case 'ghost_hands':
          ctx.translate(cx, cy);
          let ty = 0, scale = 1, rot = 0;
          const cycle = (time % 2000) / 2000;

          if (label.includes("EMPURRAR") || label.includes("CONECTAR")) {
            ty = -30 * Math.max(0, Math.sin(cycle * Math.PI));
            scale = 1 + 0.3 * Math.max(0, Math.sin(cycle * Math.PI));
          } else if (label.includes("GIRAR")) {
            rot = cycle * Math.PI * 2;
          } else if (label.includes("PUXAR")) {
            ty = 30 * Math.max(0, Math.sin(cycle * Math.PI));
            scale = 1 - 0.2 * Math.max(0, Math.sin(cycle * Math.PI));
          } else if (label.includes("PRESSIONAR")) {
            scale = 1 + 0.1 * Math.sin(time / 50);
          } else {
            ty = Math.sin(time / 300) * 10;
          }

          ctx.scale(scale, scale);
          ctx.rotate(rot);
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          for (let i = 0; i < 4; i++) {
            const dx = -10 + (i * 7);
            ctx.moveTo(dx, -10);
            ctx.lineTo(dx, -35 + Math.sin(time / 150 + i) * 3);
          }
          ctx.moveTo(12, 0);
          ctx.lineTo(25, -10);
          ctx.stroke();
          ctx.fillStyle = baseColor + '44';
          ctx.fill();
          break;

        case 'spatial_arrow':
          ctx.translate(cx, cy);
          if (marker.rotation) ctx.rotate((marker.rotation * Math.PI) / 180);
          const arrowOffset = (time % 800) / 800 * 40 - 20;
          ctx.beginPath();
          ctx.moveTo(-20, 20 + arrowOffset);
          ctx.lineTo(0, arrowOffset);
          ctx.lineTo(20, 20 + arrowOffset);
          ctx.lineWidth = 6;
          ctx.stroke();
          break;

        case 'glow_zone':
          const zonePulse = 1 + Math.sin(time / 200) * 0.15;
          ctx.setLineDash([8, 4]);
          ctx.lineDashOffset = -time / 40;
          if (marker.bbox) {
            ctx.strokeRect(cx - (bw / 2) * zonePulse, cy - (bh / 2) * zonePulse, bw * zonePulse, bh * zonePulse);
          } else {
            ctx.beginPath();
            ctx.arc(cx, cy, 50 * zonePulse, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.fillStyle = baseColor + '15';
          ctx.fill();
          break;

        case 'exploded_view':
          ctx.translate(cx, cy);
          const expand = Math.sin(time / 500) * 10;
          ctx.strokeRect(-bw/2 - expand, -bh/2 - expand, bw + expand*2, bh + expand*2);
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(-15, -15, 30, 30);
          ctx.stroke();
          break;

        case 'circle':
          ctx.beginPath();
          ctx.arc(cx, cy, 35 + Math.sin(time / 150) * 8, 0, Math.PI * 2);
          ctx.stroke();
          break;

        case 'rect':
          ctx.strokeRect(cx - bw/2, cy - bh/2, bw, bh);
          break;
      }

      if (marker.label) {
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'black';
        ctx.fillText(marker.label.toUpperCase(), cx, cy + (bh / 2) + 35);
      }
      ctx.restore();
    });

    if (markers.length > 0 && progress < 1) {
      requestRef.current = requestAnimationFrame(animate);
    } else if (progress >= 1) {
      startTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    startTimeRef.current = null;
    if (markers.length > 0) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      const canvas = canvasRef.current;
      if (canvas) canvas.getContext('2d')?.clearRect(0, 0, width, height);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [markers, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className="absolute top-0 left-0 w-full h-full pointer-events-none z-10" />;
};

export default ARLayer;
