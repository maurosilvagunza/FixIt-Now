
import React, { useEffect, useRef } from 'react';
import { ARMarker } from '../types';

interface ARLayerProps {
  markers: ARMarker[];
  width: number;
  height: number;
}

const ARLayer: React.FC<ARLayerProps> = ({ markers, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    markers.forEach(marker => {
      const x = (marker.x / 100) * width;
      const y = (marker.y / 100) * height;
      const colorMap = { red: '#ff4d4d', green: '#4ade80', blue: '#60a5fa', yellow: '#facc15' };
      const color = colorMap[marker.color] || '#ffffff';

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;

      switch (marker.type) {
        case 'ghost_hands':
          // Desenha ícone de mão cinético
          ctx.translate(x, y);
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          for (let i = 0; i < 4; i++) {
            ctx.moveTo(-10 + (i * 7), -10);
            ctx.lineTo(-10 + (i * 7), -30);
          }
          ctx.stroke();
          ctx.fillStyle = color + '33';
          ctx.fill();
          break;

        case 'spatial_arrow':
          ctx.translate(x, y);
          if (marker.rotation) ctx.rotate((marker.rotation * Math.PI) / 180);
          ctx.beginPath();
          ctx.moveTo(-25, 25);
          ctx.lineTo(0, 0);
          ctx.lineTo(25, 25);
          ctx.lineWidth = 6;
          ctx.stroke();
          break;

        case 'glow_zone':
          const pulse = (Math.sin(Date.now() / 200) + 1) * 5;
          ctx.beginPath();
          ctx.arc(x, y, 40 + pulse, 0, Math.PI * 2);
          ctx.setLineDash([10, 5]);
          ctx.stroke();
          ctx.fillStyle = color + '22';
          ctx.fill();
          break;

        case 'exploded_view':
          ctx.strokeRect(x - 45, y - 45, 90, 90);
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(x - 20, y - 20, 40, 40);
          ctx.beginPath();
          ctx.moveTo(x - 45, y - 45); ctx.lineTo(x - 20, y - 20);
          ctx.moveTo(x + 45, y - 45); ctx.lineTo(x + 20, y - 20);
          ctx.stroke();
          break;

        case 'circle':
          ctx.beginPath();
          ctx.arc(x, y, 35, 0, Math.PI * 2);
          ctx.stroke();
          break;

        case 'rect':
          ctx.strokeRect(x - 40, y - 40, 80, 80);
          break;
      }

      if (marker.label) {
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'black';
        ctx.fillText(marker.label.toUpperCase(), x, y + 60);
      }
      ctx.restore();
    });
  }, [markers, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className="absolute top-0 left-0 w-full h-full pointer-events-none z-10" />;
};

export default ARLayer;
