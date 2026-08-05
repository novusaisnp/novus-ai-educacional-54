-- Logo da instituição, usada no cabeçalho do PDF do contrato de matrícula (e,
-- futuramente, em outros documentos gerados). Guarda só a URL da imagem — o
-- arquivo em si não precisa de um bucket próprio aqui: pode ser uma URL pública
-- de qualquer origem (a intenção de longo prazo é reaproveitar a mesma logo já
-- cadastrada no novusai-erp via um endpoint de leitura ainda não construído lá,
-- ver docs/STATUS.md; por enquanto o caminho de carga fica pronto e testável
-- com qualquer URL de imagem, inclusive uma de teste).
--
-- `organizations` tinha só policy de SELECT — sem UPDATE ninguém conseguia
-- editar nem esse campo nem nenhum outro da própria organização.

ALTER TABLE public.organizations ADD COLUMN logo_url text;

CREATE POLICY "organizations_update" ON public.organizations
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao'])
  )
  WITH CHECK (id = public.current_org_id());
