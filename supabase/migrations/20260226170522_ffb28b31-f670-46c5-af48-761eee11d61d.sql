
-- Horários de disponibilidade dos médicos
CREATE TABLE public.doctor_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, day_of_week)
);

ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read schedules" ON public.doctor_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert schedules" ON public.doctor_schedules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update schedules" ON public.doctor_schedules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete schedules" ON public.doctor_schedules FOR DELETE TO authenticated USING (true);

-- Ausências e férias dos médicos
CREATE TABLE public.doctor_absences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read absences" ON public.doctor_absences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert absences" ON public.doctor_absences FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update absences" ON public.doctor_absences FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete absences" ON public.doctor_absences FOR DELETE TO authenticated USING (true);

-- Preços de consultas para faturamento
CREATE TABLE public.consultation_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT 'Consulta geral',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, description)
);

ALTER TABLE public.consultation_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read prices" ON public.consultation_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert prices" ON public.consultation_prices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update prices" ON public.consultation_prices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete prices" ON public.consultation_prices FOR DELETE TO authenticated USING (true);

-- Permitir CRUD completo em doctors para gestão
CREATE POLICY "Authenticated can insert doctors" ON public.doctors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update doctors" ON public.doctors FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete doctors" ON public.doctors FOR DELETE TO authenticated USING (true);

-- Habilitar realtime nas novas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_absences;
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_prices;
