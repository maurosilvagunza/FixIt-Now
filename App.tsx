
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeFrame, speakInstruction } from './services/geminiService';
import { RepairAnalysis, AppState } from './types';
import ARLayer from './components/ARLayer';
import ControlPanel from './components/ControlPanel';
import { Wrench, ShieldAlert, RefreshCcw, Target, Radio } from 'lucide-react';

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
              setVideoSize({ width: videoRef.current.videoWidth, height: videoRef.current.videoHeight });
              setState(prev => ({ ...prev, isCameraReady: true }));
            }
          };
        }
      } catch (err) {
        setState(prev => ({ ...prev, error: "Acesso à câmera negado." }));
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
    
    // Limpa a análise anterior IMEDIATAMENTE ao clicar para remover os hologramas da tela
    setState(prev => ({ ...prev, isAnalyzing: true, error: null, analysis: null }));
    
    try {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      const analysis = await analyzeFrame(base64, prompt);
      
      setState(prev => ({ ...prev, isAnalyzing: false, analysis }));
      if (state.isTTSEnabled && analysis.instruction) speakInstruction(analysis.instruction);
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        isAnalyzing: false, 
        error: err.message === "LIMITE_EXCEDIDO" ? "COTA EXCEDIDA. TENTE EM 1 MINUTO." : "FALHA NA TELEMETRIA." 
      }));
    }
  }, [state.isTTSEnabled]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none touch-none pb-[env(safe-area-inset-bottom)]">
      {/* Telemetria de Topo */}
      <div className="absolute top-[env(safe-area-inset-top,16px)] left-0 w-full px-4 z-30 flex justify-between items-start pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-3xl px-3 py-1.5 rounded-full border border-white/10 pointer-events-auto shadow-2xl">
          <Wrench className="w-3.5 h-3.5 text-blue-400" />
          <h1 className="text-[10px] font-black text-white uppercase tracking-tighter">FixIt <span className="text-blue-400">Now</span></h1>
          <div className="h-2.5 w-[1px] bg-slate-700 mx-0.5" />
          <Target className="w-2.5 h-2.5 text-green-500 animate-pulse" />
          <span className="text-[8px] text-green-300 font-bold uppercase">AR ACTIVE</span>
        </div>

        <div className="bg-red-600/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-red-500/30 pointer-events-auto flex items-center gap-2">
          <Radio className="w-3 h-3 text-red-500 animate-pulse" />
          <span className="text-[9px] text-red-100 font-black uppercase tracking-widest">RESGATE</span>
        </div>
      </div>

      <div className="relative w-full h-full flex items-center justify-center">
        {!state.isCameraReady && !state.error && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-slate-800 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-slate-500 font-mono text-[8px] tracking-widest uppercase animate-pulse">Iniciando Sensores...</p>
          </div>
        )}

        {state.error && (
          <div className="z-50 bg-slate-950/98 backdrop-blur-3xl border border-red-500/20 p-6 rounded-[2.5rem] text-center max-w-[80%] shadow-2xl animate-in zoom-in duration-300">
            <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <h2 className="text-white font-black text-sm uppercase mb-2 tracking-widest">Erro de Sistema</h2>
            <p className="text-slate-400 text-[10px] leading-relaxed mb-6 uppercase">{state.error}</p>
            <button onClick={() => window.location.reload()} className="w-full py-3.5 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-widest">Reiniciar</button>
          </div>
        )}

        <video ref={videoRef} autoPlay playsInline muted className={`absolute w-full h-full object-cover transition-opacity duration-1000 ${state.isCameraReady ? 'opacity-100' : 'opacity-0'}`} />
        <canvas ref={canvasRef} className="hidden" />

        {state.isCameraReady && state.analysis && <ARLayer markers={state.analysis.overlays} width={videoSize.width} height={videoSize.height} />}

        {state.isAnalyzing && (
          <div className="absolute inset-0 z-20 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,1)] animate-[scan_1.2s_infinite]" />
            <div className="absolute inset-0 bg-blue-500/5 backdrop-brightness-125" />
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
