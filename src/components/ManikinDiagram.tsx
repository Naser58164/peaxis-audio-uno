import { cn } from '@/lib/utils';

export type AuscultationLocation = 
  | 'lung_upper_left' 
  | 'lung_upper_right' 
  | 'lung_lower_left' 
  | 'lung_lower_right' 
  | 'heart_aortic' 
  | 'heart_mitral';

interface ManikinDiagramProps {
  selectedLocation: AuscultationLocation | null;
  onLocationSelect: (location: AuscultationLocation) => void;
  playingLocation: AuscultationLocation | null;
}

const locations: { id: AuscultationLocation; label: string; x: number; y: number; type: 'lung' | 'heart' }[] = [
  { id: 'lung_upper_left', label: 'Upper Left Lung', x: 35, y: 25, type: 'lung' },
  { id: 'lung_upper_right', label: 'Upper Right Lung', x: 65, y: 25, type: 'lung' },
  { id: 'lung_lower_left', label: 'Lower Left Lung', x: 35, y: 45, type: 'lung' },
  { id: 'lung_lower_right', label: 'Lower Right Lung', x: 65, y: 45, type: 'lung' },
  { id: 'heart_aortic', label: 'Aortic Area', x: 55, y: 30, type: 'heart' },
  { id: 'heart_mitral', label: 'Mitral Area', x: 45, y: 50, type: 'heart' },
];

export function ManikinDiagram({ selectedLocation, onLocationSelect, playingLocation }: ManikinDiagramProps) {
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Torso outline */}
      <svg viewBox="0 0 100 80" className="w-full h-auto">
        {/* Body shape */}
        <ellipse
          cx="50"
          cy="40"
          rx="35"
          ry="35"
          className="fill-muted stroke-border"
          strokeWidth="1"
        />
        
        {/* Head */}
        <circle
          cx="50"
          cy="2"
          r="8"
          className="fill-muted stroke-border"
          strokeWidth="1"
        />
        
        {/* Neck */}
        <rect
          x="46"
          y="8"
          width="8"
          height="6"
          className="fill-muted stroke-border"
          strokeWidth="1"
        />
        
        {/* Lung outlines */}
        <path
          d="M 25 20 Q 20 35 25 55 Q 35 60 45 55 Q 48 35 45 20 Q 35 15 25 20"
          className="fill-secondary/50 stroke-border"
          strokeWidth="0.5"
        />
        <path
          d="M 75 20 Q 80 35 75 55 Q 65 60 55 55 Q 52 35 55 20 Q 65 15 75 20"
          className="fill-secondary/50 stroke-border"
          strokeWidth="0.5"
        />
        
        {/* Heart outline */}
        <path
          d="M 50 35 Q 42 30 45 40 Q 42 50 50 55 Q 58 50 55 40 Q 58 30 50 35"
          className="fill-destructive/20 stroke-destructive/50"
          strokeWidth="0.5"
        />
        
        {/* Auscultation points */}
        {locations.map((loc) => {
          const isSelected = selectedLocation === loc.id;
          const isPlaying = playingLocation === loc.id;
          
          return (
            <g key={loc.id}>
              <circle
                cx={loc.x}
                cy={loc.y}
                r={isSelected || isPlaying ? 4 : 3}
                className={cn(
                  'cursor-pointer transition-all duration-200',
                  isPlaying 
                    ? 'fill-primary stroke-primary animate-pulse' 
                    : isSelected 
                      ? 'fill-primary stroke-primary-foreground' 
                      : loc.type === 'heart'
                        ? 'fill-destructive/60 stroke-destructive hover:fill-destructive'
                        : 'fill-accent-foreground/60 stroke-accent-foreground hover:fill-accent-foreground'
                )}
                strokeWidth="1"
                onClick={() => onLocationSelect(loc.id)}
              />
              {(isSelected || isPlaying) && (
                <circle
                  cx={loc.x}
                  cy={loc.y}
                  r="6"
                  className="fill-none stroke-primary animate-ping"
                  strokeWidth="0.5"
                />
              )}
            </g>
          );
        })}
      </svg>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-foreground/60" />
          <span className="text-muted-foreground">Lung Points</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive/60" />
          <span className="text-muted-foreground">Heart Points</span>
        </div>
      </div>
      
      {/* Selected location label */}
      {selectedLocation && (
        <div className="mt-4 text-center">
          <span className="text-sm font-medium">
            Selected: {locations.find(l => l.id === selectedLocation)?.label}
          </span>
        </div>
      )}
    </div>
  );
}

export { locations };
