-- Entidades del checklist por instalación (racks, gabinetes, tramos, zne, lamina)
CREATE TABLE public.checklist_entidades (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  deal_id      text        NOT NULL,
  entity_type  text        NOT NULL,  -- 'rack' | 'gabinete' | 'tramo' | 'zne' | 'lamina'
  entity_id    text        NOT NULL,
  config       text        NOT NULL DEFAULT '',
  nombre       text        NOT NULL DEFAULT '',
  UNIQUE (entity_id)
);

CREATE INDEX idx_checklist_entidades_deal ON public.checklist_entidades (deal_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_entidades TO authenticated;
GRANT ALL ON public.checklist_entidades TO service_role;

ALTER TABLE public.checklist_entidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read checklist_entidades"
  ON public.checklist_entidades FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth insert checklist_entidades"
  ON public.checklist_entidades FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth update checklist_entidades"
  ON public.checklist_entidades FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);


-- Revisiones del checklist (long format, una fila por check por guardado)
CREATE TABLE public.checklist_revisiones (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  deal_id       text        NOT NULL,
  entity_id     text        NOT NULL,
  concepto      text        NOT NULL,
  hito          text        NOT NULL DEFAULT '',
  check_item    text        NOT NULL,
  checked       boolean     NOT NULL DEFAULT false,
  revisor_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  revisor_email text        NOT NULL DEFAULT ''
);

CREATE INDEX idx_checklist_revisiones_deal ON public.checklist_revisiones (deal_id);

GRANT SELECT, INSERT ON public.checklist_revisiones TO authenticated;
GRANT ALL ON public.checklist_revisiones TO service_role;

ALTER TABLE public.checklist_revisiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read checklist_revisiones"
  ON public.checklist_revisiones FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth insert checklist_revisiones"
  ON public.checklist_revisiones FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
