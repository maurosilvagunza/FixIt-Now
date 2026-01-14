
export type OverlayType = 'ghost_hands' | 'spatial_arrow' | 'exploded_view' | 'glow_zone' | 'circle' | 'rect';
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
