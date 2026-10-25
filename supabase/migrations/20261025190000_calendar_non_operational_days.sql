CREATE TABLE public.calendar_non_operational_days (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trade_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, trade_date)
);

ALTER TABLE public.calendar_non_operational_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own non-operational calendar days"
  ON public.calendar_non_operational_days
  FOR ALL
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
