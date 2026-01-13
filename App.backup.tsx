import React, { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeFrame, speakInstruction } from './services/geminiService';
import { RepairAnalysis, AppState } from './types';
import ARLayer from './components/ARLayer';
import ControlPanel from './components/ControlPanel';
import { Wrench, ShieldAlert } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isAnalyzing: false,
    analysis: null,
    error: null,
    isCameraReady: false,
    isTTSEnabled: true,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              setVideoSize({
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight
              });
              setState(prev => ({ ...prev, isCameraReady: true }));
            }
          };
        }
      } catch (err) {
        console.error("Erro ao acessar câmera:", err);
        // Modo demonstração quando câmera não está disponível
        setVideoSize({ width: 1280, height: 720 });
        setState(prev => ({ 
          ...prev, 
          isCameraReady: true,
          error: null
        }));
      }
    };

    initCamera();
    
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const handleDiagnostic = useCallback(async (prompt?: string) => {
    if (!videoRef.current || !canvasRef.current) return;

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Erro ao acessar contexto do canvas");

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      const analysis = await analyzeFrame(base64, prompt);
      
      setState(prev => ({ ...prev, isAnalyzing: false, analysis }));

      if (state.isTTSEnabled && analysis.instruction) {
        speakInstruction(analysis.instruction);
      }
    } catch (err) {
      console.error("Erro no diagnóstico:", err);
      setState(prev => ({ ...prev, isAnalyzing: false, error: "Falha na análise. Tente novamente." }));
    }
  }, [state.isTTSEnabled]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full p-4 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/50 pointer-events-auto">
          <Wrench className="w-5 h-5 text-blue-400" />
          <h1 className="text-sm font-bold tracking-tight text-white uppercase">
            FixIt <span className="text-blue-400">Now</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-red-900/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-700/50 pointer-events-auto">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Modo Resgate</span>
        </div>
      </div>

      <div className="relative w-full h-full flex items-center justify-center bg-black">
        {!state.isCameraReady && (
          <div className="flex flex-col items-center gap-4 text-slate-400">
            <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm font-medium">Iniciando Visão Computacional...</p>
          </div>
        )}

        <video ref={videoRef} autoPlay playsInline muted className={`absolute w-full h-full object-cover transition-opacity duration-1000 ${state.isCameraReady ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`absolute w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-black transition-opacity duration-1000 ${state.isCameraReady ? 'opacity-0' : 'opacity-100'}`} />
        <canvas ref={canvasRef} className="hidden" />

        {state.isCameraReady && state.analysis && (
          <ARLayer markers={state.analysis.overlays} width={videoSize.width} height={videoSize.height} />
        )}

        {state.isAnalyzing && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent z-20 animate-[scan_2s_infinite]" />
        )}
      </div>

      {state.isCameraReady && (
        <ControlPanel 
          analysis={state.analysis} 
          isAnalyzing={state.isAnalyzing} 
          onAnalyze={handleDiagnostic} 
          isTTSEnabled={state.isTTSEnabled} 
          onToggleTTS={() => setState(p => ({...p, isTTSEnabled: !p.isTTSEnabled}))} 
        />
      )}

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default App;
