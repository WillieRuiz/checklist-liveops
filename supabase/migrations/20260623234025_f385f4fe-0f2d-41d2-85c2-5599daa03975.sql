DROP POLICY IF EXISTS "auth insert instalaciones" ON public.instalaciones;
DROP POLICY IF EXISTS "auth update instalaciones" ON public.instalaciones;

CREATE POLICY "auth insert instalaciones" ON public.instalaciones
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth update instalaciones" ON public.instalaciones
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);