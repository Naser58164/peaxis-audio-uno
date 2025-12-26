import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { type AuscultationLocation } from './ManikinDiagram';

// Placeholder sound URLs - these would be replaced with actual medical sounds
const PLACEHOLDER_SOUNDS: Record<string, Record<string, string>> = {
  normal: {
    lung: 'https://www.soundjay.com/misc/sounds/breathing-1.mp3',
    heart: 'https://www.soundjay.com/human/sounds/heartbeat-01a.mp3',
  },
  wheeze: {
    lung: 'https://www.soundjay.com/misc/sounds/breathing-1.mp3',
  },
  crackles: {
    lung: 'https://www.soundjay.com/misc/sounds/breathing-1.mp3',
  },
  murmur: {
    heart: 'https://www.soundjay.com/human/sounds/heartbeat-01a.mp3',
  },
};

interface AudioPlayerProps {
  location: AuscultationLocation | null;
  soundType: string;
  soundUrl?: string | null;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onPlayingChange: (isPlaying: boolean) => void;
  isExaminerView?: boolean;
}

export function AudioPlayer({
  location,
  soundType,
  soundUrl,
  volume,
  onVolumeChange,
  onPlayingChange,
  isExaminerView = false,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const locationType = location?.startsWith('heart') ? 'heart' : 'lung';
  const audioUrl = soundUrl || PLACEHOLDER_SOUNDS[soundType]?.[locationType] || PLACEHOLDER_SOUNDS.normal[locationType];

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !location) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
    onPlayingChange(!isPlaying);
  }, [isPlaying, location, onPlayingChange]);

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    // Stop playing when location changes
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
      onPlayingChange(false);
    }
  }, [location, onPlayingChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      // Loop the audio
      audio.currentTime = 0;
      audio.play();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!location) {
    return (
      <div className="flex items-center justify-center h-24 bg-muted rounded-lg">
        <p className="text-muted-foreground text-sm">Select an auscultation point to play sounds</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-card border border-border rounded-lg">
      <audio ref={audioRef} src={audioUrl} loop />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={togglePlay}
            className="h-12 w-12"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration || 0)}
        </div>
      </div>
      
      {isExaminerView && (
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          
          <Slider
            value={[volume * 100]}
            onValueChange={(values) => onVolumeChange(values[0] / 100)}
            max={100}
            step={1}
            className="flex-1"
          />
          
          <span className="text-sm text-muted-foreground w-12">
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}
      
      <div className="text-sm">
        <span className="text-muted-foreground">Sound: </span>
        <span className="font-medium capitalize">{soundType}</span>
      </div>
    </div>
  );
}
