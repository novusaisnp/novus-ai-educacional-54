
-- **CRM EDUCACIONAL - VIEWS E RPCS**

-- 1. VIEW v_leads - Baseada em visitors com status derivado
CREATE OR REPLACE VIEW public.v_leads AS
SELECT 
  v.id,
  v.organization_id,
  v.full_name,
  v.document,
  v.phone,
  v.email,
  v.relation,
  v.visit_date,
  v.purpose,
  v.notes,
  v.created_at,
  v.updated_at,
  -- Status derivado: convertido se vinculado a guardian/student
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM guardians g 
      WHERE g.organization_id = v.organization_id 
      AND (g.phone = v.phone OR g.email = v.email)
    ) THEN 'convertido'
    WHEN v.visit_date > (CURRENT_DATE - INTERVAL '30 days') THEN 'ativo'
    WHEN v.visit_date > (CURRENT_DATE - INTERVAL '90 days') THEN 'morno'
    ELSE 'frio'
  END as status,
  -- Indicador se foi convertido
  EXISTS (
    SELECT 1 FROM guardians g 
    WHERE g.organization_id = v.organization_id 
    AND (g.phone = v.phone OR g.email = v.email)
  ) as convertido
FROM public.visitors v;

-- RLS para v_leads
ALTER VIEW public.v_leads OWNER TO postgres;
ALTER TABLE public.v_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRM leads access" ON public.v_leads
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = current_org_id() 
  AND get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario'])
);

-- 2. VIEW v_interactions - Interações com nome do responsável/lead
CREATE OR REPLACE VIEW public.v_interactions AS
SELECT 
  i.id,
  i.organization_id,
  i.entity_type,
  i.entity_id,
  i.direction,
  i.channel,
  i.summary,
  i.payload,
  i.performed_by,
  i.created_at,
  i.updated_at,
  -- Nome da entidade baseado no tipo
  CASE 
    WHEN i.entity_type = 'visitor' THEN (
      SELECT v.full_name FROM visitors v WHERE v.id = i.entity_id
    )
    WHEN i.entity_type = 'guardian' THEN (
      SELECT g.name FROM guardians g WHERE g.id = i.entity_id  
    )
    WHEN i.entity_type = 'student' THEN (
      SELECT CONCAT(s.first_name, ' ', s.last_name) FROM students s WHERE s.id = i.entity_id
    )
    ELSE 'Desconhecido'
  END as entity_name,
  -- Nome do usuário que executou
  CASE 
    WHEN i.performed_by IS NOT NULL THEN (
      SELECT p.full_name FROM profiles p WHERE p.id = i.performed_by
    )
    ELSE 'Sistema'
  END as performed_by_name
FROM public.interactions i;

-- RLS para v_interactions
ALTER VIEW public.v_interactions OWNER TO postgres;
ALTER TABLE public.v_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRM interactions access" ON public.v_interactions
FOR SELECT  
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = current_org_id()
  AND get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario', 'professor'])
);

-- 3. VIEW v_demandas - Baseada em requests com colunas específicas
CREATE OR REPLACE VIEW public.v_demandas AS
SELECT 
  r.id,
  r.organization_id,
  r.request_type as tipo,
  r.status,
  r.requester_type as origem,
  r.requester_id,
  r.payload->>'subject' as assunto,
  r.payload->>'description' as descricao,
  r.created_by,
  r.created_at,
  r.updated_at,
  -- Nome do solicitante baseado no tipo
  CASE 
    WHEN r.requester_type = 'guardian' THEN (
      SELECT g.name FROM guardians g WHERE g.id = r.requester_id
    )
    WHEN r.requester_type = 'student' THEN (
      SELECT CONCAT(s.first_name, ' ', s.last_name) FROM students s WHERE s.id = r.requester_id
    )
    WHEN r.requester_type = 'visitor' THEN (
      SELECT v.full_name FROM visitors v WHERE v.id = r.requester_id
    )
    ELSE 'Sistema'
  END as solicitante_nome,
  -- Nome do criador
  CASE 
    WHEN r.created_by IS NOT NULL THEN (
      SELECT p.full_name FROM profiles p WHERE p.id = r.created_by
    )
    ELSE 'Sistema'
  END as criado_por_nome
FROM public.requests r;

-- RLS para v_demandas
ALTER VIEW public.v_demandas OWNER TO postgres;
ALTER TABLE public.v_demandas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRM demandas access" ON public.v_demandas
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = current_org_id()
  AND get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario'])
);

-- 4. VIEW v_pendencias_doc - Pendências documentais
CREATE OR REPLACE VIEW public.v_pendencias_doc AS
SELECT 
  CONCAT('guardian_', g.id) as id,
  g.organization_id,
  'guardian' as entity_type,
  g.id as entity_id,
  g.name as entity_name,
  'Documentos do Responsável' as pendencia_tipo,
  CASE 
    WHEN COUNT(d.id) = 0 THEN 'Nenhum documento'
    WHEN COUNT(d.id) < 3 THEN 'Documentação incompleta'
    ELSE 'OK'
  END as status,
  COUNT(d.id) as documentos_count,
  g.created_at,
  g.updated_at
FROM public.guardians g
LEFT JOIN public.documents d ON d.owner_id = g.id AND d.owner_type = 'guardian'
WHERE g.organization_id = current_org_id()
GROUP BY g.id, g.organization_id, g.name, g.created_at, g.updated_at

UNION ALL

SELECT 
  CONCAT('student_', s.id) as id,
  s.organization_id,
  'student' as entity_type,
  s.id as entity_id,
  CONCAT(s.first_name, ' ', s.last_name) as entity_name,
  'Documentos do Aluno' as pendencia_tipo,
  CASE 
    WHEN COUNT(d.id) = 0 THEN 'Nenhum documento'
    WHEN COUNT(d.id) < 2 THEN 'Documentação incompleta'
    ELSE 'OK'
  END as status,
  COUNT(d.id) as documentos_count,
  s.created_at,
  s.updated_at
FROM public.students s
LEFT JOIN public.documents d ON d.owner_id = s.id AND d.owner_type = 'student'
WHERE s.organization_id = current_org_id()
GROUP BY s.id, s.organization_id, s.first_name, s.last_name, s.created_at, s.updated_at;

-- RLS para v_pendencias_doc
ALTER VIEW public.v_pendencias_doc OWNER TO postgres;
ALTER TABLE public.v_pendencias_doc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRM doc pendencies access" ON public.v_pendencias_doc
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = current_org_id()
  AND get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario'])
);

-- 5. RPC set_request_status - Alterar status de demanda com auditoria
CREATE OR REPLACE FUNCTION public.set_request_status(
  request_id uuid,
  new_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_status text;
  request_org uuid;
  user_role text;
  result json;
BEGIN
  -- Verificar autenticação
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  
  -- Obter role do usuário
  user_role := get_current_user_role();
  
  -- Verificar permissão
  IF user_role NOT IN ('admin', 'coordenacao', 'secretario') THEN
    RAISE EXCEPTION 'Sem permissão para alterar status de demandas';
  END IF;
  
  -- Buscar demanda e verificar organização
  SELECT r.status, r.organization_id INTO old_status, request_org
  FROM requests r
  WHERE r.id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demanda não encontrada';
  END IF;
  
  IF request_org != current_org_id() THEN
    RAISE EXCEPTION 'Demanda não pertence à sua organização';
  END IF;
  
  -- Validar novo status
  IF new_status NOT IN ('aberta', 'em_andamento', 'concluida', 'cancelada') THEN
    RAISE EXCEPTION 'Status inválido: %', new_status;
  END IF;
  
  -- Atualizar status
  UPDATE requests 
  SET status = new_status, updated_at = now()
  WHERE id = request_id;
  
  -- Registrar auditoria
  INSERT INTO audit_logs (
    organization_id,
    table_name,
    action,
    row_id,
    actor,
    diff
  ) VALUES (
    current_org_id(),
    'requests',
    'status_change',
    request_id,
    auth.uid(),
    json_build_object(
      'old_status', old_status,
      'new_status', new_status,
      'changed_by', user_role,
      'changed_at', now()
    )
  );
  
  -- Retornar resultado
  SELECT json_build_object(
    'success', true,
    'old_status', old_status,
    'new_status', new_status,
    'updated_at', now()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 6. RPC get_inadimplencia - Simulação de inadimplência (integração ERP)
CREATE OR REPLACE FUNCTION public.get_inadimplencia(org_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  guardian_record record;
  inadimplentes json[] := '{}';
BEGIN
  -- Verificar autenticação e organização
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  
  IF org_id != current_org_id() THEN
    RAISE EXCEPTION 'Organização inválida';
  END IF;
  
  -- Simular dados de inadimplência baseados em guardians
  -- Em produção, isto seria uma chamada ao ERP via withERP
  FOR guardian_record IN 
    SELECT g.id, g.name, g.phone, g.email
    FROM guardians g
    WHERE g.organization_id = org_id
    AND g.created_at < (now() - interval '60 days') -- Simular inadimplência
    LIMIT 10
  LOOP
    inadimplentes := inadimplentes || json_build_object(
      'guardian_id', guardian_record.id,
      'guardian_name', guardian_record.name,
      'valor_devido', (random() * 1000 + 100)::numeric(10,2),
      'dias_atraso', (random() * 60 + 1)::integer,
      'ultima_cobranca', now() - (random() * 30 || ' days')::interval,
      'phone', guardian_record.phone,
      'email', guardian_record.email
    );
  END LOOP;
  
  -- Montar resultado final
  SELECT json_build_object(
    'organization_id', org_id,
    'total_inadimplentes', array_length(inadimplentes, 1),
    'valor_total_devido', (
      SELECT sum((item->>'valor_devido')::numeric) 
      FROM unnest(inadimplentes) as item
    ),
    'inadimplentes', inadimplentes,
    'generated_at', now(),
    'is_mock_data', true
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 7. VIEW v_inadimplencia - Wrapper para RPC get_inadimplencia
CREATE OR REPLACE VIEW public.v_inadimplencia AS
SELECT 
  (get_inadimplencia(current_org_id())->>'organization_id')::uuid as organization_id,
  (get_inadimplencia(current_org_id())->>'total_inadimplentes')::integer as total_inadimplentes,
  (get_inadimplencia(current_org_id())->>'valor_total_devido')::numeric as valor_total_devido,
  get_inadimplencia(current_org_id())->>'generated_at' as generated_at,
  (get_inadimplencia(current_org_id())->>'is_mock_data')::boolean as is_mock_data
WHERE auth.uid() IS NOT NULL 
AND get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario']);

-- RLS para v_inadimplencia
ALTER VIEW public.v_inadimplencia OWNER TO postgres;
ALTER TABLE public.v_inadimplencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRM inadimplencia access" ON public.v_inadimplencia
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = current_org_id()
  AND get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario'])
);
