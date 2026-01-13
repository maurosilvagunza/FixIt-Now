
import React from 'react';
import { RepairAnalysis } from '../types';
import { ShieldAlert, Info, CheckCircle2, Volume2, VolumeX, Camera } from 'lucide-react';

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
    <div className="absolute bottom-0 left-0 w-full p-4 z-20 pointer-events-none">
      <div className="max-w-xl mx-auto space-y-4 pointer-events-auto">
        
        {analysis && (
          <div className={`rounded-2xl p-4 shadow-2xl backdrop-blur-md border ${
            analysis.priority === 'CRITICAL' ? 'bg-red-900/80 border-red-500' :
            analysis.priority === 'SAFETY_WARNING' ? 'bg-orange-900/80 border-orange-500' :
            'bg-slate-900/80 border-slate-700'
          }`}>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {analysis.priority === 'CRITICAL' && <ShieldAlert className="text-red-400 w-8 h-8 animate-pulse" />}
                {analysis.priority === 'SAFETY_WARNING' && <ShieldAlert className="text-orange-400 w-8 h-8" />}
                {analysis.priority === 'INFO' && <Info className="text-blue-400 w-8 h-8" />}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-1">
                  {analysis.instruction}
                </h3>
                {analysis.detailedSteps && analysis.detailedSteps.length > 0 && (
                  <ul className="text-sm text-slate-200 space-y-1 list-disc list-inside">
                    {analysis.detailedSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                    Diagnóstico: {analysis.detectedObject}
                  </span>
                  {analysis.isIssueResolved && (
                    <span className="flex items-center gap-1 text-green-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" /> RESOLVIDO
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => onAnalyze()}
            disabled={isAnalyzing}
            className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold shadow-lg transform transition active:scale-95 ${
              isAnalyzing 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-white text-slate-900 hover:bg-slate-200'
            }`}
          >
            {isAnalyzing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
                Analisando...
              </div>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                Diagnosticar Agora
              </>
            )}
          </button>

          <button
            onClick={onToggleTTS}
            className={`p-4 rounded-full transition ${
              isTTSEnabled ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
            title={isTTSEnabled ? 'Guia de Áudio Ligado' : 'Guia de Áudio Desligado'}
          >
            {isTTSEnabled ? <Volume2 /> : <VolumeX />}
          </button>
        </div>
        
        {!analysis && !isAnalyzing && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar justify-center">
            {["Vazamento", "Falta de Luz", "Chupeta Bateria", "Cheiro de Gás"].map(label => (
              <button
                key={label}
                onClick={() => onAnalyze(`Verificando: ${label}`)}
                className="bg-slate-800/60 hover:bg-slate-700/80 px-4 py-2 rounded-full text-xs font-medium border border-slate-600 transition whitespace-nowrap"
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
