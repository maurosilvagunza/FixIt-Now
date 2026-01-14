
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
        console.error("Erro ao acessar câmera:", err);
        setState(prev => ({ ...prev, error: "Câmera bloqueada. Permita o acesso para continuar." }));
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
      let errorMessage = err.message || "Ocorreu um erro inesperado.";
      
      if (err.message?.includes("API_KEY_MISSING")) {
        errorMessage = "ERRO: VITE_API_KEY não configurada no Vercel.";
      } else if (err.message?.includes("LIMITE_EXCEDIDO")) {
        errorMessage = "Cota Excedida: O Google pausou as requisições temporariamente. Tente novamente em 60 segundos.";
      }

      setState(prev => ({ ...prev, isAnalyzing: false, error: errorMessage }));
    }
  }, [state.isTTSEnabled]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full p-4 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-2xl px-4 py-2 rounded-full border border-white/10 pointer-events-auto shadow-2xl">
          <Wrench className="w-5 h-5 text-blue-400" />
          <h1 className="text-sm font-black tracking-tighter text-white uppercase">
            FixIt <span className="text-blue-400">Now</span>
          </h1>
          <div className="h-4 w-[1px] bg-slate-700 mx-1" />
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-[10px] text-blue-300 font-mono font-bold uppercase tracking-tight">Gemini 3 Flash</span>
          </div>
        </div>
      </div>

      <div className="relative w-full h-full flex items-center justify-center">
        {!state.isCameraReady && !state.error && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin" />
              <Wrench className="absolute inset-0 m-auto w-6 h-6 text-blue-500 animate-pulse" />
            </div>
            <p className="text-slate-400 font-mono text-xs tracking-widest uppercase animate-pulse">Iniciando Visão Computacional...</p>
          </div>
        )}

        {state.error && (
          <div className="z-50 bg-slate-950/98 backdrop-blur-3xl border border-red-500/20 p-8 rounded-[2.5rem] text-center max-w-md mx-4 shadow-2xl">
            <div className="bg-red-500/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce">
              <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-white font-black text-2xl mb-4 uppercase tracking-tighter">Atenção Necessária</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed font-medium">{state.error}</p>
            
            {state.error.includes("Cota") && (
              <div className="bg-blue-500/5 p-4 rounded-2xl mb-8 text-left border border-blue-500/20">
                <p className="text-[10px] text-blue-400 uppercase font-black mb-1">Dica Pro</p>
                <p className="text-[11px] text-slate-400">O plano gratuito do Gemini 3 tem limites por minuto. Evite múltiplos cliques rápidos no botão de diagnóstico.</p>
              </div>
            )}

            <button 
              onClick={() => window.location.reload()} 
              className="group w-full py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-tighter hover:bg-blue-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl"
            >
              <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
              Tentar Novamente
            </button>
          </div>
        )}

        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`absolute w-full h-full object-cover transition-opacity duration-1000 ${state.isCameraReady ? 'opacity-100' : 'opacity-0'}`} 
        />
        
        <canvas ref={canvasRef} className="hidden" />

        {state.isCameraReady && state.analysis && (
          <ARLayer markers={state.analysis.overlays} width={videoSize.width} height={videoSize.height} />
        )}

        {state.isAnalyzing && (
          <div className="absolute inset-0 z-20 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent animate-[scan_1.2s_infinite]" />
            <div className="absolute inset-0 bg-blue-500/5 backdrop-grayscale-[0.2] animate-pulse" />
          </div>
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
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default App;
