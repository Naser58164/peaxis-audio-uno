-- Fix 1: Replace overly permissive examination_sessions policy
-- Drop the policy that exposes all sessions to everyone
DROP POLICY IF EXISTS "Everyone can view active sessions" ON public.examination_sessions;

-- Students can only view sessions they are participating in
CREATE POLICY "Students can view their sessions" 
ON public.examination_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM examination_attempts ea 
    WHERE ea.session_id = examination_sessions.id 
    AND ea.student_id = auth.uid()
  )
);

-- Fix 2: Allow students to update their own attempts (for completing exams, adding notes)
CREATE POLICY "Students can update own attempts" 
ON public.examination_attempts 
FOR UPDATE 
USING (auth.uid() = student_id);

-- Fix 3: Allow examiners to view student profiles for grading purposes
CREATE POLICY "Examiners can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'examiner'::app_role));