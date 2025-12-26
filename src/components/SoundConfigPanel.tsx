import { useState, useEffect, useRef } from 'react';
import { Upload, X, FileAudio } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { type AuscultationLocation, locations } from './ManikinDiagram';
import { useScenarioSounds, useCreateSound, useUpdateSound, type AuscultationSound } from '@/hooks/usePatientScenarios';
import { SoundLibrarySelector } from './SoundLibrarySelector';
import { type SoundLibraryItem } from '@/hooks/useSoundLibrary';

const SOUND_TYPES = {
  lung: ['normal', 'wheeze', 'crackles', 'rhonchi', 'stridor', 'diminished', 'absent'],
  heart: ['normal', 'murmur', 's3_gallop', 's4_gallop', 'pericardial_friction', 'irregular'],
};

interface SoundConfigPanelProps {
  scenarioId: string;
  selectedLocation: AuscultationLocation | null;
  onSoundConfigChange: (config: { soundType: string; volume: number }) => void;
}

export function SoundConfigPanel({ scenarioId, selectedLocation, onSoundConfigChange }: SoundConfigPanelProps) {
  const { data: sounds, refetch } = useScenarioSounds(scenarioId);
  const createSound = useCreateSound();
  const updateSound = useUpdateSound();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [soundType, setSoundType] = useState('normal');
  const [volume, setVolume] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const currentSound = sounds?.find(s => s.location === selectedLocation);
  const locationType = selectedLocation?.startsWith('heart') ? 'heart' : 'lung';
  const availableSoundTypes = SOUND_TYPES[locationType];

  useEffect(() => {
    if (currentSound) {
      setSoundType(currentSound.sound_type);
      setVolume(currentSound.volume);
      if (currentSound.sound_url) {
        const fileName = currentSound.sound_url.split('/').pop();
        setUploadedFileName(fileName || null);
      } else {
        setUploadedFileName(null);
      }
    } else {
      setSoundType('normal');
      setVolume(1);
      setUploadedFileName(null);
    }
  }, [currentSound, selectedLocation]);

  useEffect(() => {
    onSoundConfigChange({ soundType, volume });
  }, [soundType, volume, onSoundConfigChange]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedLocation) return;

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/x-wav'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an MP3, WAV, or OGG audio file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${scenarioId}/${selectedLocation}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('auscultation-sounds')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('auscultation-sounds')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Save or update sound record
      if (currentSound) {
        await updateSound.mutateAsync({
          id: currentSound.id,
          sound_url: publicUrl,
          sound_type: soundType,
          volume,
        });
      } else {
        await createSound.mutateAsync({
          scenario_id: scenarioId,
          location: selectedLocation,
          sound_type: soundType,
          volume,
          sound_url: publicUrl,
        });
      }

      setUploadedFileName(file.name);
      toast({ title: 'Audio uploaded successfully' });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAudio = async () => {
    if (!currentSound || !selectedLocation) return;

    try {
      const fileName = `${scenarioId}/${selectedLocation}`;
      
      // Remove from storage (try common extensions)
      for (const ext of ['mp3', 'wav', 'ogg']) {
        await supabase.storage
          .from('auscultation-sounds')
          .remove([`${fileName}.${ext}`]);
      }

      // Update record to remove URL
      await updateSound.mutateAsync({
        id: currentSound.id,
        sound_url: null,
      });

      setUploadedFileName(null);
      toast({ title: 'Audio removed' });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Failed to remove audio',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

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

  const handleLibrarySelect = async (librarySound: SoundLibraryItem) => {
    if (!selectedLocation) return;

    const newSoundType = librarySound.sound_type;
    setSoundType(newSoundType);

    if (currentSound) {
      await updateSound.mutateAsync({
        id: currentSound.id,
        sound_type: newSoundType,
        sound_url: librarySound.sound_url,
        volume,
      });
    } else {
      await createSound.mutateAsync({
        scenario_id: scenarioId,
        location: selectedLocation,
        sound_type: newSoundType,
        volume,
        sound_url: librarySound.sound_url,
      });
    }
    
    setUploadedFileName(librarySound.name);
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

        <Separator />

        {/* Sound Library Section */}
        <div className="space-y-2">
          <Label>Sound Library</Label>
          <SoundLibrarySelector 
            onSelectSound={handleLibrarySelect}
            currentSoundType={soundType}
          />
        </div>

        <Separator />

        {/* Audio Upload Section */}
        <div className="space-y-2">
          <Label>Custom Audio File</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/wav,audio/ogg,audio/mp3"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {uploadedFileName ? (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <FileAudio className="h-4 w-4 text-primary" />
              <span className="text-sm flex-1 truncate">{uploadedFileName}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemoveAudio}
                className="h-8 w-8 text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload Audio File'}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            MP3, WAV, or OGG (max 10MB)
          </p>
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
