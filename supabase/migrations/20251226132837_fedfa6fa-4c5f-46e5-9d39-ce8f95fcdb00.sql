-- Create role enum
CREATE TYPE public.app_role AS ENUM ('examiner', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  UNIQUE (user_id, role)
);

-- Create patient scenarios table
CREATE TABLE public.patient_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  condition_description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create auscultation sounds table
CREATE TABLE public.auscultation_sounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES public.patient_scenarios(id) ON DELETE CASCADE NOT NULL,
  location TEXT NOT NULL, -- e.g., 'lung_upper_left', 'lung_upper_right', 'lung_lower_left', 'lung_lower_right', 'heart_aortic', 'heart_mitral'
  sound_type TEXT NOT NULL, -- e.g., 'normal', 'wheeze', 'crackles', 'murmur'
  sound_url TEXT, -- URL to audio file
  volume NUMERIC DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table (for tracking examination sessions)
CREATE TABLE public.examination_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  examiner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scenario_id UUID REFERENCES public.patient_scenarios(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auscultation_sounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examination_sessions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Examiners can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'examiner'));

-- Patient scenarios policies
CREATE POLICY "Everyone can view scenarios"
ON public.patient_scenarios FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Examiners can create scenarios"
ON public.patient_scenarios FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'examiner'));

CREATE POLICY "Examiners can update scenarios"
ON public.patient_scenarios FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'examiner'));

CREATE POLICY "Examiners can delete scenarios"
ON public.patient_scenarios FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'examiner'));

-- Auscultation sounds policies
CREATE POLICY "Everyone can view sounds"
ON public.auscultation_sounds FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Examiners can manage sounds"
ON public.auscultation_sounds FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'examiner'));

-- Examination sessions policies
CREATE POLICY "Everyone can view active sessions"
ON public.examination_sessions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Examiners can manage sessions"
ON public.examination_sessions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'examiner'));

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Default role is student
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();