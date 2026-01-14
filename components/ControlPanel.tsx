
import React from 'react';
import { RepairAnalysis } from '../types';
import { ShieldAlert, Info, CheckCircle2, Volume2, VolumeX, Camera, Loader2 } from 'lucide-react';

interface ControlPanelProps {
  analysis: RepairAnalysis | null;
  isAnalyzing: boolean;
  onAnalyze: (prompt?: string) => void;
  isTTSEnabled: boolean;
  onToggleTTS: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  analysis, 
  isAnalyzing, 
  onAnalyze,
  isTTSEnabled,
  onToggleTTS
}) => {
  return (
    <div className="absolute bottom-0 left-0 w-full z-20 pointer-events-none flex flex-col justify-end px-4 pb-[env(safe-area-inset-bottom,20px)] sm:pb-8">
      <div className="max-w-xl mx-auto w-full flex flex-col gap-3 pointer-events-auto">
        
        {/* Card de Diagnóstico - Adaptativo com Scroll */}
        {analysis && (
          <div className={`rounded-3xl p-4 shadow-2xl backdrop-blur-3xl border animate-in slide-in-from-bottom duration-500 overflow-hidden flex flex-col ${
            analysis.priority === 'CRITICAL' ? 'bg-red-950/80 border-red-500/30' :
            analysis.priority === 'SAFETY_WARNING' ? 'bg-orange-950/80 border-orange-500/30' :
            'bg-slate-900/80 border-slate-700/30'
          }`}>
            <div className="overflow-y-auto max-h-[25vh] md:max-h-[40vh] pr-2 custom-scrollbar">
              <div className="flex gap-3">
                <div className="shrink-0 mt-1">
                  {analysis.priority === 'CRITICAL' ? <ShieldAlert className="text-red-400 w-6 h-6 animate-pulse" /> : <Info className="text-blue-400 w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm md:text-base font-black text-white uppercase tracking-tight leading-tight mb-2">
                    {analysis.instruction}
                  </h3>
                  <div className="space-y-1">
                    {analysis.detailedSteps?.map((step, i) => (
                      <p key={i} className="text-[10px] md:text-xs text-slate-300 font-medium leading-relaxed opacity-80">
                        <span className="text-blue-400 mr-1.5">•</span>{step}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between shrink-0">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[50%]">
                LOC: {analysis.detectedObject}
              </span>
              {analysis.isIssueResolved && (
                <span className="flex items-center gap-1 text-green-400 font-black text-[9px] bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                  <CheckCircle2 className="w-2.5 h-2.5" /> CHECKED
                </span>
              )}
            </div>
          </div>
        )}

        {/* Grupo de Ação - Garantia de Visibilidade */}
        <div className="flex items-stretch gap-2">
          <button
            onClick={() => onAnalyze()}
            disabled={isAnalyzing}
            className={`flex-1 flex items-center justify-center gap-2 md:gap-3 py-4 md:py-5 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95 border-b-4 ${
              isAnalyzing 
                ? 'bg-slate-800 text-slate-500 border-slate-900' 
                : 'bg-white text-black border-slate-300 hover:bg-slate-50'
            }`}
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {isAnalyzing ? 'Scanning...' : 'Diagnosticar'}
          </button>

          <button
            onClick={onToggleTTS}
            className={`px-5 py-4 md:py-5 rounded-2xl transition-all border-b-4 shrink-0 ${
              isTTSEnabled ? 'bg-blue-600 text-white border-blue-800 shadow-blue-900/40' : 'bg-slate-800 text-slate-400 border-slate-900 shadow-black'
            }`}
          >
            {isTTSEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ControlPanel;
