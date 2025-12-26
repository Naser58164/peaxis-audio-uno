import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PatientScenario {
  id: string;
  created_by: string | null;
  name: string;
  age: number | null;
  gender: string | null;
  condition_description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuscultationSound {
  id: string;
  scenario_id: string;
  location: string;
  sound_type: string;
  sound_url: string | null;
  volume: number;
  created_at: string;
}

export function usePatientScenarios() {
  return useQuery({
    queryKey: ['patient-scenarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_scenarios')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PatientScenario[];
    },
  });
}

export function usePatientScenario(id: string | null) {
  return useQuery({
    queryKey: ['patient-scenario', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('patient_scenarios')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as PatientScenario | null;
    },
    enabled: !!id,
  });
}

export function useScenarioSounds(scenarioId: string | null) {
  return useQuery({
    queryKey: ['scenario-sounds', scenarioId],
    queryFn: async () => {
      if (!scenarioId) return [];
      
      const { data, error } = await supabase
        .from('auscultation_sounds')
        .select('*')
        .eq('scenario_id', scenarioId);
      
      if (error) throw error;
      return data as AuscultationSound[];
    },
    enabled: !!scenarioId,
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (scenario: Omit<PatientScenario, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('patient_scenarios')
        .insert(scenario)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-scenarios'] });
      toast({ title: 'Scenario created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating scenario', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateScenario() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PatientScenario> & { id: string }) => {
      const { data, error } = await supabase
        .from('patient_scenarios')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['patient-scenario', data.id] });
      toast({ title: 'Scenario updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating scenario', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteScenario() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('patient_scenarios')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-scenarios'] });
      toast({ title: 'Scenario deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting scenario', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AuscultationSound> & { id: string }) => {
      const { data, error } = await supabase
        .from('auscultation_sounds')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scenario-sounds', data.scenario_id] });
    },
  });
}

export function useCreateSound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sound: Omit<AuscultationSound, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('auscultation_sounds')
        .insert(sound)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scenario-sounds', data.scenario_id] });
    },
  });
}
