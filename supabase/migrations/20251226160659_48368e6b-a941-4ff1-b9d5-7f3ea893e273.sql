-- Allow students to create their own examination attempts
CREATE POLICY "Students can create own attempts" 
ON public.examination_attempts 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);