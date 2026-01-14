
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeFrame, speakInstruction } from './services/geminiService';
import { RepairAnalysis, AppState } from './types';
import ARLayer from './components/ARLayer';
import ControlPanel from './components/ControlPanel';
import { Wrench, ShieldAlert, Settings, RefreshCcw } from 'lucide-react';

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
      let errorMessage = err.message || "Ocorreu um erro na análise. Tente novamente.";
      
      if (err.message?.includes("CONFIG_MISSING") || err.message?.includes("API_KEY")) {
        errorMessage = "ERRO DE CONFIGURAÇÃO: A variável VITE_API_KEY não foi encontrada. Configure-a no Vercel e faça um novo deploy.";
      }

      setState(prev => ({ ...prev, isAnalyzing: false, error: errorMessage }));
    }
  }, [state.isTTSEnabled]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full p-4 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-xl px-4 py-2 rounded-full border border-slate-700/50 pointer-events-auto shadow-xl">
          <Wrench className="w-5 h-5 text-blue-400" />
          <h1 className="text-sm font-black tracking-tighter text-white uppercase">
            FixIt <span className="text-blue-400">Now</span>
          </h1>
          <div className="h-4 w-[1px] bg-slate-700 mx-1" />
          <span className="text-[10px] text-blue-300 font-mono font-bold">GEMINI 3 PRO</span>
        </div>
      </div>

      <div className="relative w-full h-full flex items-center justify-center">
        {!state.isCameraReady && !state.error && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin" />
              <Wrench className="absolute inset-0 m-auto w-6 h-6 text-blue-500 animate-pulse" />
            </div>
            <p className="text-slate-400 font-mono text-xs tracking-widest uppercase animate-pulse">Sincronizando com Gemini 3 Pro...</p>
          </div>
        )}

        {state.error && (
          <div className="z-50 bg-slate-950/95 backdrop-blur-3xl border border-red-500/30 p-8 rounded-[2rem] text-center max-w-md mx-4 shadow-[0_0_80px_rgba(239,68,68,0.15)]">
            <div className="bg-red-500/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-white font-black text-xl mb-3 uppercase tracking-tight">Falha no Sistema</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed font-medium">{state.error}</p>
            
            <div className="bg-slate-900/50 p-4 rounded-2xl mb-8 text-left border border-slate-800">
              <p className="text-[10px] text-blue-400 uppercase font-black mb-2 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" /> Checklist de Reparo
              </p>
              <ul className="text-[11px] text-slate-300 space-y-2 list-disc list-inside opacity-80">
                <li>Variável <b className="text-white">VITE_API_KEY</b> no Vercel</li>
                <li>Status do Deploy: <b className="text-green-400">Sucesso</b></li>
                <li>Permissão de Câmera: <b className="text-blue-400">Ativa</b></li>
              </ul>
            </div>

            <button 
              onClick={() => window.location.reload()} 
              className="group w-full py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-tighter hover:bg-blue-500 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              Reiniciar e Sincronizar
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
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-[scan_1.5s_infinite]" />
            <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
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
