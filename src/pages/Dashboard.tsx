import { useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { ManikinDiagram, type AuscultationLocation } from '@/components/ManikinDiagram';
import { AudioPlayer } from '@/components/AudioPlayer';
import { ScenarioSelector } from '@/components/ScenarioSelector';
import { SoundConfigPanel } from '@/components/SoundConfigPanel';
import { StudentGradingPanel } from '@/components/StudentGradingPanel';
import { PerformanceAnalytics } from '@/components/PerformanceAnalytics';
import { LiveExamMonitor } from '@/components/LiveExamMonitor';
import { SoundLibraryManager } from '@/components/SoundLibraryManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
            
            {/* Examiner Tools */}
            {isExaminer && (
              <Tabs defaultValue="config" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="config">Config</TabsTrigger>
                  <TabsTrigger value="grading">Grading</TabsTrigger>
                  <TabsTrigger value="monitor">Live</TabsTrigger>
                  <TabsTrigger value="library">Library</TabsTrigger>
                </TabsList>
                <TabsContent value="config" className="mt-4">
                  {selectedScenarioId ? (
                    <SoundConfigPanel
                      scenarioId={selectedScenarioId}
                      selectedLocation={selectedLocation}
                      onSoundConfigChange={handleSoundConfigChange}
                    />
                  ) : (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      Select a scenario to configure sounds
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="grading" className="mt-4">
                  <StudentGradingPanel scenarioId={selectedScenarioId} />
                </TabsContent>
                <TabsContent value="monitor" className="mt-4">
                  <LiveExamMonitor />
                </TabsContent>
                <TabsContent value="library" className="mt-4">
                  <SoundLibraryManager />
                </TabsContent>
              </Tabs>
            )}

            {/* Performance Analytics (Examiner Only) */}
            {isExaminer && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold mb-4">Performance Analytics</h2>
                <PerformanceAnalytics />
              </div>
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
