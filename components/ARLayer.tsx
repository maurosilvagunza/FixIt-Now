
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
      const colorMap = {
        red: '#ef4444',
        green: '#22c55e',
        blue: '#3b82f6',
        yellow: '#eab308'
      };
      const color = colorMap[marker.color] || '#ffffff';

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.setLineDash([]);

      if (marker.type === 'circle' || marker.type === 'glow_ring') {
        ctx.beginPath();
        ctx.arc(x, y, 40, 0, Math.PI * 2);
        ctx.stroke();
        if (marker.type === 'glow_ring') {
          ctx.beginPath();
          ctx.setLineDash([5, 5]);
          ctx.arc(x, y, 50, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = color + '22';
          ctx.fill();
        }
      } else if (marker.type === 'rect' || marker.type === '3d_object') {
        ctx.strokeRect(x - 40, y - 40, 80, 80);
        if (marker.type === '3d_object') {
          // Draw wireframe box
          ctx.beginPath();
          ctx.moveTo(x - 30, y - 30);
          ctx.lineTo(x + 50, y - 30);
          ctx.lineTo(x + 50, y + 50);
          ctx.stroke();
          ctx.fillStyle = color + '11';
          ctx.fillRect(x - 40, y - 40, 80, 80);
        }
      } else if (marker.type === 'arrow') {
        ctx.translate(x, y);
        if (marker.rotation) ctx.rotate((marker.rotation * Math.PI) / 180);
        ctx.beginPath();
        ctx.moveTo(-20, 20);
        ctx.lineTo(0, 0);
        ctx.lineTo(20, 20);
        ctx.stroke();
      } else if (marker.type === 'ghost_hand') {
        // Simple hand representation
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        for(let i=0; i<4; i++) {
          ctx.moveTo(-10 + (i*6), -10);
          ctx.lineTo(-10 + (i*6), -30);
        }
        ctx.stroke();
        ctx.fillStyle = color + '44';
        ctx.fill();
      }

      if (marker.label) {
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'black';
        ctx.fillText(marker.label.toUpperCase(), x, y + 60);
      }
      ctx.restore();
    });
  }, [markers, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
    />
  );
};

export default ARLayer;
