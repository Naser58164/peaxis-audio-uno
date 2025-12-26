-- Sound library table for pre-built medical sounds
CREATE TABLE public.sound_library (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'heart' or 'lung'
    sound_type TEXT NOT NULL, -- e.g., 'normal', 'murmur', 'wheeze'
    description TEXT,
    sound_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sound_library ENABLE ROW LEVEL SECURITY;

-- Everyone can view library sounds
CREATE POLICY "Everyone can view sound library"
ON public.sound_library
FOR SELECT
USING (true);

-- Only examiners can manage library
CREATE POLICY "Examiners can manage sound library"
ON public.sound_library
FOR ALL
USING (has_role(auth.uid(), 'examiner'::app_role));

-- Student examination attempts table
CREATE TABLE public.examination_attempts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL,
    session_id UUID REFERENCES public.examination_sessions(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES public.patient_scenarios(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    total_score INTEGER,
    max_score INTEGER,
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.examination_attempts ENABLE ROW LEVEL SECURITY;

-- Students can view their own attempts
CREATE POLICY "Students can view own attempts"
ON public.examination_attempts
FOR SELECT
USING (auth.uid() = student_id);

-- Examiners can manage all attempts
CREATE POLICY "Examiners can manage attempts"
ON public.examination_attempts
FOR ALL
USING (has_role(auth.uid(), 'examiner'::app_role));

-- Individual location grades within an attempt
CREATE TABLE public.attempt_grades (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    attempt_id UUID REFERENCES public.examination_attempts(id) ON DELETE CASCADE NOT NULL,
    location TEXT NOT NULL,
    correct_identification BOOLEAN,
    score INTEGER DEFAULT 0,
    feedback TEXT,
    graded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attempt_grades ENABLE ROW LEVEL SECURITY;

-- Students can view their own grades
CREATE POLICY "Students can view own grades"
ON public.attempt_grades
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.examination_attempts ea
        WHERE ea.id = attempt_id AND ea.student_id = auth.uid()
    )
);

-- Examiners can manage all grades
CREATE POLICY "Examiners can manage grades"
ON public.attempt_grades
FOR ALL
USING (has_role(auth.uid(), 'examiner'::app_role));

-- Insert pre-built sound library entries
INSERT INTO public.sound_library (name, category, sound_type, description, sound_url) VALUES
-- Heart sounds
('Normal Heart Sound (S1-S2)', 'heart', 'normal', 'Normal lub-dub heart sounds', 'https://www.soundjay.com/medical/heartbeat-01a.mp3'),
('Systolic Murmur', 'heart', 'murmur', 'Heart murmur heard during systole', 'https://www.soundjay.com/medical/heartbeat-01a.mp3'),
('Diastolic Murmur', 'heart', 'murmur', 'Heart murmur heard during diastole', 'https://www.soundjay.com/medical/heartbeat-01a.mp3'),
('S3 Gallop', 'heart', 's3', 'Third heart sound indicating heart failure', 'https://www.soundjay.com/medical/heartbeat-01a.mp3'),
('S4 Gallop', 'heart', 's4', 'Fourth heart sound indicating stiff ventricle', 'https://www.soundjay.com/medical/heartbeat-01a.mp3'),
('Pericardial Friction Rub', 'heart', 'rub', 'Scratchy sound from inflamed pericardium', 'https://www.soundjay.com/medical/heartbeat-01a.mp3'),
-- Lung sounds
('Normal Vesicular Breath Sounds', 'lung', 'normal', 'Normal lung sounds heard over most lung fields', 'https://www.soundjay.com/medical/breathing-1.mp3'),
('Wheezes', 'lung', 'wheeze', 'High-pitched whistling sounds, often in asthma', 'https://www.soundjay.com/medical/breathing-1.mp3'),
('Crackles (Rales)', 'lung', 'crackles', 'Crackling sounds often heard in pneumonia', 'https://www.soundjay.com/medical/breathing-1.mp3'),
('Rhonchi', 'lung', 'rhonchi', 'Low-pitched rumbling sounds from airway secretions', 'https://www.soundjay.com/medical/breathing-1.mp3'),
('Stridor', 'lung', 'stridor', 'High-pitched sound from upper airway obstruction', 'https://www.soundjay.com/medical/breathing-1.mp3'),
('Pleural Friction Rub', 'lung', 'rub', 'Grating sound from inflamed pleura', 'https://www.soundjay.com/medical/breathing-1.mp3'),
('Diminished Breath Sounds', 'lung', 'diminished', 'Reduced breath sounds indicating effusion or pneumothorax', 'https://www.soundjay.com/medical/breathing-1.mp3'),
('Bronchial Breath Sounds', 'lung', 'bronchial', 'Loud, tubular sounds heard over consolidation', 'https://www.soundjay.com/medical/breathing-1.mp3');