import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SoundLibraryItem {
  id: string;
  name: string;
  category: string;
  sound_type: string;
  description: string | null;
  sound_url: string;
  created_at: string;
}

export function useSoundLibrary(category?: string) {
  return useQuery({
    queryKey: ['sound-library', category],
    queryFn: async () => {
      let query = supabase
        .from('sound_library')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as SoundLibraryItem[];
    },
  });
}
