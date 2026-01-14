
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
    <div className="absolute bottom-0 left-0 w-full px-4 pb-8 md:pb-10 z-20 pointer-events-none">
      <div className="max-w-xl mx-auto flex flex-col gap-4 pointer-events-auto">
        
        {/* Card de Análise - Responsivo e com Scroll se necessário */}
        {analysis && (
          <div className={`rounded-3xl p-4 md:p-5 shadow-2xl backdrop-blur-xl border animate-in slide-in-from-bottom duration-500 max-h-[40vh] md:max-h-[50vh] flex flex-col ${
            analysis.priority === 'CRITICAL' ? 'bg-red-950/90 border-red-500/50' :
            analysis.priority === 'SAFETY_WARNING' ? 'bg-orange-950/90 border-orange-500/50' :
            'bg-slate-900/90 border-slate-700/50'
          }`}>
            <div className="flex items-start gap-3 overflow-y-auto no-scrollbar">
              <div className="shrink-0 mt-1">
                {analysis.priority === 'CRITICAL' ? (
                  <ShieldAlert className="text-red-400 w-6 h-6 animate-pulse" />
                ) : analysis.priority === 'SAFETY_WARNING' ? (
                  <ShieldAlert className="text-orange-400 w-6 h-6" />
                ) : (
                  <Info className="text-blue-400 w-6 h-6" />
                )}
              </div>
              
              <div className="flex-1 space-y-2">
                <h3 className="text-base md:text-lg font-black leading-tight text-white uppercase tracking-tight">
                  {analysis.instruction}
                </h3>
                
                {analysis.detailedSteps && analysis.detailedSteps.length > 0 && (
                  <ul className="text-xs text-slate-300 space-y-1.5 font-medium opacity-90 pb-2">
                    {analysis.detailedSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-500 font-bold">•</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Footer do Card */}
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[150px]">
                OBJ: {analysis.detectedObject}
              </span>
              {analysis.isIssueResolved && (
                <span className="flex items-center gap-1.5 text-green-400 font-black text-[10px] bg-green-400/10 px-2 py-1 rounded-full border border-green-400/20">
                  <CheckCircle2 className="w-3 h-3" /> RESOLVIDO
                </span>
              )}
            </div>
          </div>
        )}

        {/* Controles Principais - Compactos no Mobile */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => onAnalyze()}
            disabled={isAnalyzing}
            className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-6 md:px-10 py-4 md:py-5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest shadow-2xl transition-all active:scale-95 border-b-4 ${
              isAnalyzing 
                ? 'bg-slate-800 text-slate-500 border-slate-900 cursor-not-allowed opacity-80' 
                : 'bg-white text-black border-slate-300 hover:bg-slate-100 hover:-translate-y-0.5'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Diagnosticar Agora
              </>
            )}
          </button>

          <button
            onClick={onToggleTTS}
            className={`p-4 md:p-5 rounded-2xl transition-all shadow-xl active:scale-90 border-b-4 ${
              isTTSEnabled 
                ? 'bg-blue-600 text-white border-blue-800' 
                : 'bg-slate-800 text-slate-400 border-slate-900'
            }`}
          >
            {isTTSEnabled ? <Volume2 className="w-5 h-5 md:w-6 h-6" /> : <VolumeX className="w-5 h-5 md:w-6 h-6" />}
          </button>
        </div>
        
        {/* Sugestões Rápidas - Escondidas se houver análise para economizar espaço */}
        {!analysis && !isAnalyzing && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar justify-center px-2 animate-in fade-in duration-1000">
            {["Vazamento", "Falta de Luz", "Chupeta", "Cheiro Gás"].map(label => (
              <button
                key={label}
                onClick={() => onAnalyze(`Emergência: ${label}`)}
                className="bg-slate-900/80 backdrop-blur-md hover:bg-blue-600 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black border border-white/10 transition-all uppercase tracking-tighter text-slate-300"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
