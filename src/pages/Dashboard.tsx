import { useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { ManikinDiagram, type AuscultationLocation } from '@/components/ManikinDiagram';
import { AudioPlayer } from '@/components/AudioPlayer';
import { ScenarioSelector } from '@/components/ScenarioSelector';
import { SoundConfigPanel } from '@/components/SoundConfigPanel';
import { StudentGradingPanel } from '@/components/StudentGradingPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useScenarioSounds } from '@/hooks/usePatientScenarios';

export function Dashboard() {
  const { isExaminer } = useAuth();
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<AuscultationLocation | null>(null);
  const [playingLocation, setPlayingLocation] = useState<AuscultationLocation | null>(null);
  const [soundConfig, setSoundConfig] = useState({ soundType: 'normal', volume: 1 });

  const { data: sounds } = useScenarioSounds(selectedScenarioId);

  const handleLocationSelect = (location: AuscultationLocation) => {
    setSelectedLocation(location);
    setPlayingLocation(null);
  };

  const handlePlayingChange = useCallback((isPlaying: boolean) => {
    setPlayingLocation(isPlaying ? selectedLocation : null);
  }, [selectedLocation]);

  const handleSoundConfigChange = useCallback((config: { soundType: string; volume: number }) => {
    setSoundConfig(config);
  }, []);

  // Get sound config for selected location
  const currentSound = sounds?.find(s => s.location === selectedLocation);
  const activeSoundType = currentSound?.sound_type || soundConfig.soundType;
  const activeVolume = currentSound?.volume || soundConfig.volume;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Panel - Scenario Selection */}
          <div className="space-y-6">
            <ScenarioSelector
              selectedScenarioId={selectedScenarioId}
              onScenarioSelect={setSelectedScenarioId}
            />
            
            {/* Sound Configuration (Examiner Only) */}
            {isExaminer && selectedScenarioId && (
              <SoundConfigPanel
                scenarioId={selectedScenarioId}
                selectedLocation={selectedLocation}
                onSoundConfigChange={handleSoundConfigChange}
              />
            )}

            {/* Student Grading (Examiner Only) */}
            {isExaminer && (
              <StudentGradingPanel scenarioId={selectedScenarioId} />
            )}
          </div>

          {/* Center - Manikin Diagram */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <h2 className="text-lg font-semibold mb-4 text-center">Auscultation Points</h2>
              <ManikinDiagram
                selectedLocation={selectedLocation}
                onLocationSelect={handleLocationSelect}
                playingLocation={playingLocation}
              />
            </div>
          </div>

          {/* Right Panel - Audio Player */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Audio Playback</h2>
              <AudioPlayer
                location={selectedLocation}
                soundType={activeSoundType}
                soundUrl={currentSound?.sound_url}
                volume={activeVolume}
                onVolumeChange={(vol) => setSoundConfig(prev => ({ ...prev, volume: vol }))}
                onPlayingChange={handlePlayingChange}
                isExaminerView={isExaminer}
              />
            </div>

            {/* Instructions */}
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Instructions</h3>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Select a patient scenario from the dropdown</li>
                <li>Click on an auscultation point on the manikin</li>
                <li>Press play to hear the sound for that location</li>
                {isExaminer && (
                  <li>As an examiner, you can configure sounds for each point</li>
                )}
              </ol>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
