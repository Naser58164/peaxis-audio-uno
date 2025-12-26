import { useState, useRef } from 'react';
import { Upload, Music, Trash2, Play, Pause, Heart, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useSoundLibrary, type SoundLibraryItem } from '@/hooks/useSoundLibrary';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const categories = ['heart', 'lung'] as const;
const soundTypes = {
  heart: ['normal', 'murmur', 'arrhythmia', 'gallop', 's3', 's4'],
  lung: ['normal', 'crackles', 'wheezes', 'rhonchi', 'stridor', 'pleural_rub'],
};

export function SoundLibraryManager() {
  const { user } = useAuth();
  const { data: sounds, isLoading } = useSoundLibrary();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upload form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'heart' | 'lung'>('heart');
  const [soundType, setSoundType] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (soundId: string) => {
      const sound = sounds?.find(s => s.id === soundId);
      if (sound?.sound_url) {
        // Extract path from URL
        const urlParts = sound.sound_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const folder = urlParts[urlParts.length - 2];
        if (folder && fileName) {
          await supabase.storage.from('auscultation-sounds').remove([`library/${fileName}`]);
        }
      }
      const { error } = await supabase.from('sound_library').delete().eq('id', soundId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sound-library'] });
      toast({ title: 'Sound deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting sound', description: error.message, variant: 'destructive' });
    },
  });

  const handleUpload = async () => {
    if (!file || !name || !category || !soundType || !user) return;

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `library/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('auscultation-sounds')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('auscultation-sounds')
        .getPublicUrl(fileName);

      // Insert into sound_library
      const { error: insertError } = await supabase.from('sound_library').insert({
        name,
        category,
        sound_type: soundType,
        description: description || null,
        sound_url: urlData.publicUrl,
        uploaded_by: user.id,
      });

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['sound-library'] });
      toast({ title: 'Sound uploaded successfully' });
      setShowUploadDialog(false);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCategory('heart');
    setSoundType('');
    setDescription('');
    setFile(null);
  };

  const handlePlay = (sound: SoundLibraryItem) => {
    if (playingId === sound.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(sound.sound_url);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingId(null);
      setPlayingId(sound.id);
    }
  };

  const groupedSounds = sounds?.reduce((acc, sound) => {
    if (!acc[sound.category]) acc[sound.category] = [];
    acc[sound.category].push(sound);
    return acc;
  }, {} as Record<string, SoundLibraryItem[]>) || {};

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Music className="h-4 w-4" />
            Sound Library
          </CardTitle>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Upload className="h-4 w-4 mr-1" />
                Upload Sound
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Custom Sound</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Sound Name</Label>
                  <Input
                    placeholder="e.g., Mitral Regurgitation Murmur"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={(v: 'heart' | 'lung') => { setCategory(v); setSoundType(''); }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="heart">Heart</SelectItem>
                        <SelectItem value="lung">Lung</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sound Type</Label>
                    <Select value={soundType} onValueChange={setSoundType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {soundTypes[category].map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="Describe the sound characteristics..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Audio File</Label>
                  <Input
                    type="file"
                    accept="audio/mpeg,audio/wav,audio/ogg"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supported: MP3, WAV, OGG (max 10MB)
                  </p>
                </div>

                <Button 
                  onClick={handleUpload} 
                  disabled={!file || !name || !soundType || uploading}
                  className="w-full"
                >
                  {uploading ? 'Uploading...' : 'Upload Sound'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-4">Loading...</p>
          ) : Object.keys(groupedSounds).length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No sounds in library</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedSounds).map(([cat, catSounds]) => (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    {cat === 'heart' ? (
                      <Heart className="h-4 w-4 text-destructive" />
                    ) : (
                      <Wind className="h-4 w-4 text-primary" />
                    )}
                    <span className="font-medium capitalize">{cat} Sounds</span>
                    <Badge variant="secondary">{catSounds.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {catSounds.map((sound) => (
                      <div
                        key={sound.id}
                        className="flex items-center justify-between p-2 bg-muted rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{sound.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {sound.sound_type} {sound.description && `• ${sound.description.slice(0, 30)}...`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handlePlay(sound)}
                          >
                            {playingId === sound.id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(sound.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
