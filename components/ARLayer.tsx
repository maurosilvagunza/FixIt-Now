
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
    const duration = 10000; // 10 segundos conforme solicitado
    
    // Se passaram os 10s, podemos parar a animação intensa ou resetar
    // Para uma experiência AR, manteremos o loop mas usaremos o progresso para efeitos
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

      // Efeito de opacidade baseado no tempo (fade in inicial + fade out final suave)
      let opacity = 1;
      if (progress < 0.1) opacity = progress * 10;
      if (progress > 0.9) opacity = (1 - progress) * 10;
      
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 4;
      
      // Brilho dinâmico (glow)
      const glowIntensity = 10 + Math.sin(time / 200) * 10;
      ctx.shadowBlur = glowIntensity;
      ctx.shadowColor = baseColor;

      switch (marker.type) {
        case 'ghost_hands':
          // Animação de movimento manual (segurar e girar)
          const moveOffset = Math.sin(time / 300) * 10;
          ctx.translate(x, y + moveOffset);
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          for (let i = 0; i < 4; i++) {
            ctx.moveTo(-10 + (i * 7), -10);
            ctx.lineTo(-10 + (i * 7), -30 + Math.sin(time / 150 + i) * 5);
          }
          ctx.stroke();
          ctx.fillStyle = baseColor + '33';
          ctx.fill();
          break;

        case 'spatial_arrow':
          // Seta deslizando na direção do vetor
          const arrowSlide = (time % 1000) / 1000 * 20;
          ctx.translate(x, y);
          if (marker.rotation) ctx.rotate((marker.rotation * Math.PI) / 180);
          ctx.beginPath();
          ctx.moveTo(-25, 25 + arrowSlide);
          ctx.lineTo(0, arrowSlide);
          ctx.lineTo(25, 25 + arrowSlide);
          ctx.lineWidth = 6;
          ctx.stroke();
          break;

        case 'glow_zone':
          // Pulsação circular de radar
          const pulseScale = 1 + Math.sin(time / 250) * 0.2;
          ctx.beginPath();
          ctx.arc(x, y, 40 * pulseScale, 0, Math.PI * 2);
          ctx.setLineDash([10, 5]);
          ctx.lineDashOffset = -time / 50;
          ctx.stroke();
          ctx.fillStyle = baseColor + '22';
          ctx.fill();
          break;

        case 'exploded_view':
          // Rotação sutil do frame de visualização explodida
          ctx.translate(x, y);
          ctx.rotate(Math.sin(time / 1000) * 0.05);
          ctx.strokeRect(-45, -45, 90, 90);
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(-20, -20, 40, 40);
          ctx.beginPath();
          ctx.moveTo(-45, -45); ctx.lineTo(-20, -20);
          ctx.moveTo(45, -45); ctx.lineTo(20, -20);
          ctx.stroke();
          break;

        case 'circle':
          ctx.beginPath();
          ctx.arc(x, y, 35 + Math.sin(time / 200) * 5, 0, Math.PI * 2);
          ctx.stroke();
          break;

        case 'rect':
          const rectPulse = Math.sin(time / 200) * 2;
          ctx.strokeRect(x - 40 - rectPulse, y - 40 - rectPulse, 80 + rectPulse * 2, 80 + rectPulse * 2);
          break;
      }

      if (marker.label) {
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'black';
        ctx.fillText(marker.label.toUpperCase(), x, y + 70);
      }
      ctx.restore();
    });

    // Continuar animação enquanto houver marcadores
    if (markers.length > 0) {
      requestRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    // Resetar o timer quando novos marcadores chegam
    startTimeRef.current = null;
    if (markers.length > 0) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.getContext('2d')?.clearRect(0, 0, width, height);
      }
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [markers, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className="absolute top-0 left-0 w-full h-full pointer-events-none z-10" />;
};

export default ARLayer;
