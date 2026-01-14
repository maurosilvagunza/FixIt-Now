
export type OverlayType = 'arrow' | 'circle' | 'rect' | 'ghost_hand' | 'glow_ring' | '3d_object';
export type OverlayColor = 'red' | 'green' | 'blue' | 'yellow';

export interface ARMarker {
  type: OverlayType;
  x: number; // 0-100 normalized
  y: number; // 0-100 normalized
  color: OverlayColor;
  label?: string;
  rotation?: number;
}

export interface RepairAnalysis {
  instruction: string;
  detailedSteps?: string[];
  priority: 'CRITICAL' | 'SAFETY_WARNING' | 'INFO';
  overlays: ARMarker[];
  isIssueResolved: boolean;
  detectedObject: string;
}

export interface AppState {
  isAnalyzing: boolean;
  analysis: RepairAnalysis | null;
  error: string | null;
  isCameraReady: boolean;
  isTTSEnabled: boolean;
}
