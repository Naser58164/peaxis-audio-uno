import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type AuscultationLocation, locations } from './ManikinDiagram';
import { useScenarioSounds, useCreateSound, useUpdateSound, type AuscultationSound } from '@/hooks/usePatientScenarios';

const SOUND_TYPES = {
  lung: ['normal', 'wheeze', 'crackles', 'rhonchi', 'stridor', 'diminished', 'absent'],
  heart: ['normal', 'murmur', 's3_gallop', 's4_gallop', 'pericardial_friction', 'irreglar'],
};

interface SoundConfigPanelProps {
  scenarioId: string;
  selectedLocation: AuscultationLocation | null;
  onSoundConfigChange: (config: { soundType: string; volume: number }) => void;
}

export function SoundConfigPanel({ scenarioId, selectedLocation, onSoundConfigChange }: SoundConfigPanelProps) {
  const { data: sounds } = useScenarioSounds(scenarioId);
  const createSound = useCreateSound();
  const updateSound = useUpdateSound();
  
  const [soundType, setSoundType] = useState('normal');
  const [volume, setVolume] = useState(1);

  const currentSound = sounds?.find(s => s.location === selectedLocation);
  const locationType = selectedLocation?.startsWith('heart') ? 'heart' : 'lung';
  const availableSoundTypes = SOUND_TYPES[locationType];

  useEffect(() => {
    if (currentSound) {
      setSoundType(currentSound.sound_type);
      setVolume(currentSound.volume);
    } else {
      setSoundType('normal');
      setVolume(1);
    }
  }, [currentSound, selectedLocation]);

  useEffect(() => {
    onSoundConfigChange({ soundType, volume });
  }, [soundType, volume, onSoundConfigChange]);

  const handleSave = async () => {
    if (!selectedLocation) return;

    if (currentSound) {
      await updateSound.mutateAsync({
        id: currentSound.id,
        sound_type: soundType,
        volume,
      });
    } else {
      await createSound.mutateAsync({
        scenario_id: scenarioId,
        location: selectedLocation,
        sound_type: soundType,
        volume,
        sound_url: null,
      });
    }
  };

  if (!selectedLocation) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Select an auscultation point to configure sounds
          </p>
        </CardContent>
      </Card>
    );
  }

  const locationLabel = locations.find(l => l.id === selectedLocation)?.label;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{locationLabel} Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Sound Type</Label>
          <Select value={soundType} onValueChange={setSoundType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableSoundTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Volume: {Math.round(volume * 100)}%</Label>
          <Slider
            value={[volume * 100]}
            onValueChange={(values) => setVolume(values[0] / 100)}
            max={100}
            step={5}
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={createSound.isPending || updateSound.isPending}
          className="w-full"
        >
          {createSound.isPending || updateSound.isPending ? 'Saving...' : 'Save Configuration'}
        </Button>
      </CardContent>
    </Card>
  );
}
