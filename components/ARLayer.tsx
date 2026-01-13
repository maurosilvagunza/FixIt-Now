
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

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.fillStyle = color + '33'; // Semi-transparent fill

      if (marker.type === 'circle') {
        ctx.arc(x, y, 40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
        
        // Add a pulsing effect if critical? We can't do animations easily in standard 2D loop here without a raf
        // but simple static shapes work well.
      } else if (marker.type === 'rect') {
        ctx.strokeRect(x - 40, y - 40, 80, 80);
        ctx.fillRect(x - 40, y - 40, 80, 80);
      } else if (marker.type === 'arrow') {
        // Simple arrow pointing
        ctx.save();
        ctx.translate(x, y);
        if (marker.rotation) {
          ctx.rotate((marker.rotation * Math.PI) / 180);
        }
        ctx.beginPath();
        ctx.moveTo(-20, 20);
        ctx.lineTo(0, 0);
        ctx.lineTo(20, 20);
        ctx.stroke();
        ctx.restore();
      }

      if (marker.label) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(marker.label, x, y + 60);
      }
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
