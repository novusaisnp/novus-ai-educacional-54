-- Tabela para logs de predição de IA
CREATE TABLE public.prediction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  model_type TEXT NOT NULL CHECK (model_type IN ('inadimplencia', 'evasao', 'avaliacao')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('student', 'guardian')),
  entity_id UUID NOT NULL,
  prediction_score FLOAT CHECK (prediction_score >= 0 AND prediction_score <= 1),
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  factors JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint para evitar duplicatas
  UNIQUE(organization_id, model_type, entity_type, entity_id, DATE(created_at))
);

-- Tabela para feedback de avaliações com IA
CREATE TABLE public.assessments_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  ai_feedback JSONB,
  grammar_score FLOAT CHECK (grammar_score >= 0 AND grammar_score <= 10),
  coherence_score FLOAT CHECK (coherence_score >= 0 AND coherence_score <= 10),
  suggestions TEXT[],
  created_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint para evitar múltiplas correções do mesmo assessment/student
  UNIQUE(organization_id, assessment_id, student_id)
);

-- Enable RLS nas novas tabelas
ALTER TABLE public.prediction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies para prediction_logs
CREATE POLICY "prediction_logs_secure_access" 
ON public.prediction_logs 
FOR ALL
USING (is_authenticated() AND organization_id = current_org_id() AND get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario']))
WITH CHECK (organization_id = current_org_id());

-- RLS Policies para assessments_feedback  
CREATE POLICY "assessments_feedback_secure_access"
ON public.assessments_feedback
FOR ALL  
USING (is_authenticated() AND organization_id = current_org_id() AND get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'professor']))
WITH CHECK (organization_id = current_org_id());

-- View segura para risco de evasão com RLS
CREATE OR REPLACE VIEW public.v_risco_evasao 
WITH (security_barrier = true, security_invoker = true) AS
SELECT 
  s.id,
  s.first_name || ' ' || s.last_name as nome,
  s.organization_id,
  COALESCE(freq.avg_attendance, 0) as freq_media,
  COALESCE(notas.avg_grade, 0) as nota_media,
  CASE 
    WHEN COALESCE(freq.avg_attendance, 0) < 0.7 AND COALESCE(notas.avg_grade, 0) < 6 THEN 0.9
    WHEN COALESCE(freq.avg_attendance, 0) < 0.8 OR COALESCE(notas.avg_grade, 0) < 7 THEN 0.6
    ELSE 0.2
  END as risco_score,
  NOW() as calculated_at
FROM public.students s
LEFT JOIN (
  SELECT 
    student_id,
    AVG(CASE WHEN status = 'presente' THEN 1.0 ELSE 0.0 END) as avg_attendance
  FROM public.attendance 
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    AND organization_id = current_org_id()
  GROUP BY student_id
) freq ON s.id = freq.student_id
LEFT JOIN (
  SELECT 
    student_id,
    AVG(grade) as avg_grade
  FROM public.grades 
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
    AND organization_id = current_org_id()
  GROUP BY student_id
) notas ON s.id = notas.student_id
WHERE s.organization_id = current_org_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND organization_id = current_org_id() 
    AND role = ANY(ARRAY['admin', 'coordenacao', 'professor', 'secretario'])
  );

-- Triggers para updated_at
CREATE TRIGGER update_prediction_logs_updated_at
  BEFORE UPDATE ON public.prediction_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessments_feedback_updated_at
  BEFORE UPDATE ON public.assessments_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();