import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ExaminationAttempt {
  id: string;
  student_id: string;
  session_id: string | null;
  scenario_id: string;
  started_at: string;
  completed_at: string | null;
  total_score: number | null;
  max_score: number | null;
  notes: string | null;
}

export interface AttemptGrade {
  id: string;
  attempt_id: string;
  location: string;
  correct_identification: boolean | null;
  score: number;
  feedback: string | null;
  graded_at: string;
}

export function useExaminationAttempts(scenarioId?: string) {
  return useQuery({
    queryKey: ['examination-attempts', scenarioId],
    queryFn: async () => {
      let query = supabase
        .from('examination_attempts')
        .select('*')
        .order('started_at', { ascending: false });
      
      if (scenarioId) {
        query = query.eq('scenario_id', scenarioId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as ExaminationAttempt[];
    },
  });
}

export function useAttemptGrades(attemptId: string | null) {
  return useQuery({
    queryKey: ['attempt-grades', attemptId],
    queryFn: async () => {
      if (!attemptId) return [];
      
      const { data, error } = await supabase
        .from('attempt_grades')
        .select('*')
        .eq('attempt_id', attemptId)
        .order('graded_at', { ascending: true });
      
      if (error) throw error;
      return data as AttemptGrade[];
    },
    enabled: !!attemptId,
  });
}

export function useCreateAttempt() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (attempt: Omit<ExaminationAttempt, 'id' | 'started_at' | 'completed_at' | 'total_score' | 'max_score'>) => {
      const { data, error } = await supabase
        .from('examination_attempts')
        .insert(attempt)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['examination-attempts'] });
      toast({ title: 'Examination started' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error starting examination', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExaminationAttempt> & { id: string }) => {
      const { data, error } = await supabase
        .from('examination_attempts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examination-attempts'] });
    },
  });
}

export function useCreateGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (grade: Omit<AttemptGrade, 'id' | 'graded_at'>) => {
      const { data, error } = await supabase
        .from('attempt_grades')
        .insert(grade)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attempt-grades', data.attempt_id] });
    },
  });
}

export function useUpdateGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AttemptGrade> & { id: string }) => {
      const { data, error } = await supabase
        .from('attempt_grades')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attempt-grades', data.attempt_id] });
    },
  });
}
