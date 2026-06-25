
CREATE TABLE public.instalaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id text NOT NULL UNIQUE,
  cliente_nombre text,
  hito_actual integer NOT NULL DEFAULT 0,
  hitos_completados integer[] NOT NULL DEFAULT '{}',
  eventos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instalaciones TO authenticated;
GRANT ALL ON public.instalaciones TO service_role;

ALTER TABLE public.instalaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read instalaciones"
  ON public.instalaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert instalaciones"
  ON public.instalaciones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update instalaciones"
  ON public.instalaciones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_instalaciones_updated_at
BEFORE UPDATE ON public.instalaciones
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
