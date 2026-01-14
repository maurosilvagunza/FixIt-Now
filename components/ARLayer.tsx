
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
    const duration = 10000; // 10 segundos
    const progress = Math.min(elapsed / duration, 1);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    markers.forEach(marker => {
      const x = (marker.x / 100) * width;
      const y = (marker.y / 100) * height;
      const colorMap = { red: '#ff4d4d', green: '#4ade80', blue: '#60a5fa', yellow: '#facc15' };
      const baseColor = colorMap[marker.color] || '#ffffff';

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
          ctx.translate(x, y);
          
          // Lógica de movimento baseada na ação
          let tx = 0, ty = 0, rot = 0, scale = 1;
          const cycle = (time % 2000) / 2000; // Ciclo de 2 segundos para o movimento

          if (label.includes("EMPURRAR") || label.includes("CONECTAR")) {
            // Move a mão para frente (profundidade simulada por escala e Y)
            ty = -30 * Math.max(0, Math.sin(cycle * Math.PI));
            scale = 1 + 0.3 * Math.max(0, Math.sin(cycle * Math.PI));
          } else if (label.includes("GIRAR")) {
            // Rotaciona a mão
            rot = cycle * Math.PI * 2;
          } else if (label.includes("PUXAR")) {
            // Move a mão para trás
            ty = 30 * Math.max(0, Math.sin(cycle * Math.PI));
            scale = 1 - 0.2 * Math.max(0, Math.sin(cycle * Math.PI));
          } else if (label.includes("PRESSIONAR")) {
            // Vibração ou pequeno pulso
            scale = 1 + 0.1 * Math.sin(time / 50);
          } else {
            // Movimento flutuante padrão
            ty = Math.sin(time / 300) * 10;
          }

          ctx.scale(scale, scale);
          ctx.rotate(rot);

          // Desenho técnico da mão holográfica
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2); // Palma
          // Dedos
          for (let i = 0; i < 4; i++) {
            const dx = -10 + (i * 7);
            ctx.moveTo(dx, -10);
            ctx.lineTo(dx, -35 + Math.sin(time / 150 + i) * 3);
          }
          // Polegar
          ctx.moveTo(12, 0);
          ctx.lineTo(25, -10);
          
          ctx.stroke();
          ctx.fillStyle = baseColor + '44';
          ctx.fill();
          break;

        case 'spatial_arrow':
          ctx.translate(x, y);
          if (marker.rotation) ctx.rotate((marker.rotation * Math.PI) / 180);
          // Animação de seta correndo
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
          ctx.beginPath();
          ctx.arc(x, y, 50 * zonePulse, 0, Math.PI * 2);
          ctx.setLineDash([8, 4]);
          ctx.lineDashOffset = -time / 40;
          ctx.stroke();
          ctx.fillStyle = baseColor + '15';
          ctx.fill();
          break;

        case 'exploded_view':
          ctx.translate(x, y);
          const expand = Math.sin(time / 500) * 10;
          ctx.strokeRect(-40 - expand, -40 - expand, 80 + expand*2, 80 + expand*2);
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(-15, -15, 30, 30);
          ctx.stroke();
          break;

        case 'circle':
          ctx.beginPath();
          ctx.arc(x, y, 35 + Math.sin(time / 150) * 8, 0, Math.PI * 2);
          ctx.stroke();
          break;

        case 'rect':
          ctx.strokeRect(x - 40, y - 40, 80, 80);
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
        ctx.fillText(marker.label.toUpperCase(), x, y + 75);
      }
      ctx.restore();
    });

    if (markers.length > 0 && progress < 1) {
      requestRef.current = requestAnimationFrame(animate);
    } else if (progress >= 1) {
        // Loop da animação de 10s se necessário, ou apenas limpa
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
