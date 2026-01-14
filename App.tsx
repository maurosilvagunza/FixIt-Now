
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeFrame, speakInstruction } from './services/geminiService';
import { RepairAnalysis, AppState } from './types';
import ARLayer from './components/ARLayer';
import ControlPanel from './components/ControlPanel';
import { Wrench, ShieldAlert, RefreshCcw, Zap } from 'lucide-react';

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
        setState(prev => ({ ...prev, error: "Câmera não acessível. Verifique as permissões." }));
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
      if (!ctx) throw new Error("Erro de contexto");

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      const analysis = await analyzeFrame(base64, prompt);
      
      setState(prev => ({ ...prev, isAnalyzing: false, analysis }));

      if (state.isTTSEnabled && analysis.instruction) {
        speakInstruction(analysis.instruction);
      }
    } catch (err: any) {
      console.error("Erro no diagnóstico:", err);
      let errorMessage = "Erro inesperado.";
      
      const rawError = err.message || "";
      if (rawError.includes("API_KEY_MISSING") || rawError.includes("API Key")) {
        errorMessage = "ERRO: VITE_API_KEY ausente no Vercel.";
      } else if (rawError.includes("RESOURCE_EXHAUSTED") || rawError.includes("429") || rawError.includes("Quota")) {
        errorMessage = "Cota Excedida: Aguarde 1 minuto (Limite Free).";
      } else if (rawError.includes("safety") || rawError.includes("blocked")) {
        errorMessage = "Conteúdo bloqueado por segurança da IA.";
      } else {
        errorMessage = "Falha técnica. Tente novamente.";
      }

      setState(prev => ({ ...prev, isAnalyzing: false, error: errorMessage }));
    }
  }, [state.isTTSEnabled]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-sans select-none touch-none">
      {/* Header Compacto - Escala melhor em Tablets */}
      <div className="absolute top-0 left-0 w-full p-3 md:p-6 z-30 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-2xl px-3 py-1.5 rounded-full border border-white/10 pointer-events-auto shadow-2xl w-fit">
          <Wrench className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400" />
          <h1 className="text-[10px] md:text-xs font-black tracking-tighter text-white uppercase">
            FixIt <span className="text-blue-400">Now</span>
          </h1>
          <div className="h-2.5 w-[1px] bg-slate-700 mx-0.5" />
          <div className="flex items-center gap-0.5">
            <Zap className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
            <span className="text-[8px] md:text-[9px] text-blue-300 font-mono font-bold uppercase">Flash</span>
          </div>
        </div>
      </div>

      <div className="relative w-full h-full flex items-center justify-center">
        {!state.isCameraReady && !state.error && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-slate-800 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-slate-500 font-mono text-[9px] tracking-widest uppercase animate-pulse">Vision Ready...</p>
          </div>
        )}

        {state.error && (
          <div className="z-50 bg-slate-950/95 backdrop-blur-3xl border border-red-500/20 p-6 rounded-[2rem] text-center max-w-[85%] md:max-w-sm mx-auto shadow-2xl animate-in zoom-in duration-300">
            <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <h2 className="text-white font-black text-base md:text-lg mb-2 uppercase">Status Crítico</h2>
            <p className="text-slate-400 text-xs md:text-sm mb-6 leading-relaxed">{state.error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-3.5 bg-white text-black rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Recarregar
            </button>
          </div>
        )}

        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`absolute w-full h-full object-cover transition-opacity duration-700 ${state.isCameraReady ? 'opacity-100' : 'opacity-0'}`} 
        />
        
        <canvas ref={canvasRef} className="hidden" />

        {state.isCameraReady && state.analysis && (
          <ARLayer markers={state.analysis.overlays} width={videoSize.width} height={videoSize.height} />
        )}

        {state.isAnalyzing && (
          <div className="absolute inset-0 z-20 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/80 shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-[scan_1.5s_infinite]" />
            <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
          </div>
        )}
      </div>

      {state.isCameraReady && !state.error && (
        <ControlPanel 
          analysis={state.analysis} 
          isAnalyzing={state.isAnalyzing} 
          onAnalyze={handleDiagnostic} 
          isTTSEnabled={state.isTTSEnabled} 
          onToggleTTS={() => setState(p => ({...p, isTTSEnabled: !p.isTTSEnabled}))} 
        />
      )}
    </div>
  );
};

export default App;
