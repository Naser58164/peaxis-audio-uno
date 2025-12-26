-- Create storage bucket for auscultation sounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('auscultation-sounds', 'auscultation-sounds', true);

-- Storage policies for auscultation sounds bucket
CREATE POLICY "Anyone can view sounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'auscultation-sounds');

CREATE POLICY "Examiners can upload sounds"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'auscultation-sounds' 
  AND public.has_role(auth.uid(), 'examiner')
);

CREATE POLICY "Examiners can update sounds"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'auscultation-sounds' 
  AND public.has_role(auth.uid(), 'examiner')
);

CREATE POLICY "Examiners can delete sounds"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'auscultation-sounds' 
  AND public.has_role(auth.uid(), 'examiner')
);