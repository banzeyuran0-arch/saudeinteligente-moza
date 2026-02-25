
-- Allow all authenticated users to update appointments (for executive panel)
-- Drop the restrictive patient-only update policy and replace with a broader one
DROP POLICY IF EXISTS "Patients can update own appointments" ON public.appointments;

CREATE POLICY "Authenticated can update appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (true);
