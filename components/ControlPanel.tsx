
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
    <div className="absolute bottom-0 left-0 w-full px-3 pb-4 md:px-4 md:pb-10 z-20 pointer-events-none flex flex-col justify-end min-h-screen">
      <div className="max-w-xl mx-auto w-full flex flex-col gap-3 pointer-events-auto">
        
        {/* Card de Análise - Altura dinâmica com scroll interno para Mobile */}
        {analysis && (
          <div className={`rounded-2xl p-3 md:p-5 shadow-2xl backdrop-blur-xl border animate-in slide-in-from-bottom duration-500 flex flex-col overflow-hidden ${
            analysis.priority === 'CRITICAL' ? 'bg-red-950/85 border-red-500/40' :
            analysis.priority === 'SAFETY_WARNING' ? 'bg-orange-950/85 border-orange-500/40' :
            'bg-slate-900/85 border-slate-700/40'
          }`}>
            {/* Scrollable Content Area */}
            <div className="overflow-y-auto max-h-[30vh] md:max-h-[45vh] pr-1 custom-scrollbar">
              <div className="flex items-start gap-2 md:gap-3">
                <div className="shrink-0 mt-0.5">
                  {analysis.priority === 'CRITICAL' ? (
                    <ShieldAlert className="text-red-400 w-5 h-5 md:w-6 h-6 animate-pulse" />
                  ) : analysis.priority === 'SAFETY_WARNING' ? (
                    <ShieldAlert className="text-orange-400 w-5 h-5 md:w-6 h-6" />
                  ) : (
                    <Info className="text-blue-400 w-5 h-5 md:w-6 h-6" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm md:text-lg font-black leading-tight text-white uppercase tracking-tight mb-2">
                    {analysis.instruction}
                  </h3>
                  
                  {analysis.detailedSteps && analysis.detailedSteps.length > 0 && (
                    <ul className="text-[11px] md:text-xs text-slate-300 space-y-1.5 font-medium opacity-90 pb-2">
                      {analysis.detailedSteps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold shrink-0">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Footer do Card - Fixo no rodapé do card */}
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between shrink-0 bg-transparent">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[120px] md:max-w-none">
                {analysis.detectedObject}
              </span>
              {analysis.isIssueResolved && (
                <span className="flex items-center gap-1 text-green-400 font-black text-[9px] bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20 shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5" /> RESOLVIDO
                </span>
              )}
            </div>
          </div>
        )}

        {/* Controles de Ação - Redimensionados para garantir visibilidade */}
        <div className="flex items-stretch justify-center gap-2 md:gap-3">
          <button
            onClick={() => onAnalyze()}
            disabled={isAnalyzing}
            className={`flex-1 flex items-center justify-center gap-2 md:gap-3 px-4 py-3.5 md:py-5 rounded-xl md:rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-2xl transition-all active:scale-95 border-b-2 md:border-b-4 ${
              isAnalyzing 
                ? 'bg-slate-800 text-slate-500 border-slate-900 cursor-not-allowed' 
                : 'bg-white text-black border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 md:w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5 md:w-4 h-4" />
                <span>Diagnosticar</span>
              </>
            )}
          </button>

          <button
            onClick={onToggleTTS}
            className={`px-4 py-3.5 md:px-6 md:py-5 rounded-xl md:rounded-2xl transition-all shadow-xl active:scale-90 border-b-2 md:border-b-4 shrink-0 flex items-center justify-center ${
              isTTSEnabled 
                ? 'bg-blue-600 text-white border-blue-800' 
                : 'bg-slate-800 text-slate-400 border-slate-900'
            }`}
          >
            {isTTSEnabled ? <Volume2 className="w-4 h-4 md:w-6 h-6" /> : <VolumeX className="w-4 h-4 md:w-6 h-6" />}
          </button>
        </div>
        
        {/* Sugestões - Compactadas para mobile */}
        {!analysis && !isAnalyzing && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar justify-center px-1 animate-in fade-in duration-700">
            {["Vazamento", "Eletricidade", "Mecânica", "Gás"].map(label => (
              <button
                key={label}
                onClick={() => onAnalyze(`Emergência: ${label}`)}
                className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] font-black border border-white/5 text-slate-400 whitespace-nowrap active:bg-blue-600 active:text-white"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default ControlPanel;
