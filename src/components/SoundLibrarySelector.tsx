import { useState } from 'react';
import { Library, Heart, Wind, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSoundLibrary, type SoundLibraryItem } from '@/hooks/useSoundLibrary';

interface SoundLibrarySelectorProps {
  onSelectSound: (sound: SoundLibraryItem) => void;
  currentSoundType?: string;
}

export function SoundLibrarySelector({ onSelectSound, currentSoundType }: SoundLibrarySelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'heart' | 'lung'>('heart');
  const { data: sounds, isLoading } = useSoundLibrary();

  const heartSounds = sounds?.filter(s => s.category === 'heart') || [];
  const lungSounds = sounds?.filter(s => s.category === 'lung') || [];

  const handleSelect = (sound: SoundLibraryItem) => {
    onSelectSound(sound);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Library className="h-4 w-4 mr-2" />
          Select from Library
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sound Library</DialogTitle>
        </DialogHeader>
        
        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as 'heart' | 'lung')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="heart" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Heart Sounds
            </TabsTrigger>
            <TabsTrigger value="lung" className="flex items-center gap-2">
              <Wind className="h-4 w-4" />
              Lung Sounds
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="heart">
            <ScrollArea className="h-[300px] pr-4">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-4">Loading...</p>
              ) : (
                <div className="space-y-2">
                  {heartSounds.map((sound) => (
                    <SoundLibraryItem
                      key={sound.id}
                      sound={sound}
                      isSelected={currentSoundType === sound.sound_type}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="lung">
            <ScrollArea className="h-[300px] pr-4">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-4">Loading...</p>
              ) : (
                <div className="space-y-2">
                  {lungSounds.map((sound) => (
                    <SoundLibraryItem
                      key={sound.id}
                      sound={sound}
                      isSelected={currentSoundType === sound.sound_type}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function SoundLibraryItem({ 
  sound, 
  isSelected, 
  onSelect 
}: { 
  sound: SoundLibraryItem; 
  isSelected: boolean;
  onSelect: (sound: SoundLibraryItem) => void;
}) {
  return (
    <button
      onClick={() => onSelect(sound)}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected 
          ? 'border-primary bg-primary/10' 
          : 'border-border hover:border-primary/50 hover:bg-muted'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{sound.name}</p>
          {sound.description && (
            <p className="text-xs text-muted-foreground mt-1">{sound.description}</p>
          )}
          <p className="text-xs text-primary mt-1 capitalize">{sound.sound_type.replace('_', ' ')}</p>
        </div>
        {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
      </div>
    </button>
  );
}
