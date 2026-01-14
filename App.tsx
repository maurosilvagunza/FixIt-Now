
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeFrame, speakInstruction } from './services/geminiService';
import { RepairAnalysis, AppState } from './types';
import ARLayer from './components/ARLayer';
import ControlPanel from './components/ControlPanel';
import { Wrench, ShieldAlert, Settings, RefreshCcw, Zap } from 'lucide-react';

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
        setState(prev => ({ ...prev, error: "Acesso à câmera negado ou não encontrado." }));
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
      let errorMessage = "Ocorreu um erro inesperado.";
      
      // Sanitização de erros gigantescos para não quebrar a UI
      const rawError = err.message || "";
      if (rawError.includes("API_KEY_MISSING") || rawError.includes("An API Key must be set")) {
        errorMessage = "ERRO: VITE_API_KEY não encontrada no Vercel.";
      } else if (rawError.includes("RESOURCE_EXHAUSTED") || rawError.includes("429") || rawError.includes("Quota")) {
        errorMessage = "LIMITE EXCEDIDO: O Google pausou as requisições temporariamente (Cota Free). Tente em 1 minuto.";
      } else if (rawError.includes("safety") || rawError.includes("blocked")) {
        errorMessage = "CONTEÚDO BLOQUEADO: A imagem ou prompt viola as políticas de segurança da IA.";
      } else {
        errorMessage = "Erro técnico: Verifique sua conexão ou API Key.";
      }

      setState(prev => ({ ...prev, isAnalyzing: false, error: errorMessage }));
    }
  }, [state.isTTSEnabled]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans select-none">
      {/* Top Header - Compacto em mobile */}
      <div className="absolute top-0 left-0 w-full p-4 pt-6 md:pt-4 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-2xl px-3 py-2 rounded-full border border-white/10 pointer-events-auto shadow-2xl scale-90 md:scale-100 origin-left">
          <Wrench className="w-4 h-4 text-blue-400" />
          <h1 className="text-xs font-black tracking-tighter text-white uppercase">
            FixIt <span className="text-blue-400">Now</span>
          </h1>
          <div className="h-3 w-[1px] bg-slate-700 mx-0.5" />
          <div className="flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
            <span className="text-[9px] text-blue-300 font-mono font-bold uppercase">Flash</span>
          </div>
        </div>
      </div>

      <div className="relative w-full h-full flex items-center justify-center">
        {!state.isCameraReady && !state.error && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-3 border-slate-800 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-slate-500 font-mono text-[10px] tracking-widest uppercase animate-pulse">Sincronizando Vision...</p>
          </div>
        )}

        {state.error && (
          <div className="z-50 bg-slate-950/95 backdrop-blur-3xl border border-red-500/20 p-6 rounded-[2rem] text-center max-w-[90%] md:max-w-md mx-auto shadow-2xl animate-in fade-in zoom-in duration-300">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-white font-black text-lg mb-2 uppercase">Sistema Pausado</h2>
            <p className="text-slate-400 text-sm mb-6 leading-tight">{state.error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-4 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Recarregar App
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
            <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/80 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-[scan_2s_infinite]" />
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
