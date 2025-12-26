-- Add time_limit column to patient_scenarios (in seconds, null means unlimited)
ALTER TABLE public.patient_scenarios 
ADD COLUMN IF NOT EXISTS time_limit integer DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.patient_scenarios.time_limit IS 'Exam time limit in seconds. NULL means unlimited time.';