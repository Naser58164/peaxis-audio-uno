-- Enable realtime for examination_attempts to monitor students
ALTER PUBLICATION supabase_realtime ADD TABLE public.examination_attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attempt_grades;

-- Add uploaded_by column to sound_library for custom sounds
ALTER TABLE public.sound_library ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id);

-- Update RLS policy to allow examiners to insert their own sounds
DROP POLICY IF EXISTS "Examiners can manage sound library" ON public.sound_library;
CREATE POLICY "Examiners can manage sound library" 
ON public.sound_library 
FOR ALL 
USING (has_role(auth.uid(), 'examiner'::app_role));