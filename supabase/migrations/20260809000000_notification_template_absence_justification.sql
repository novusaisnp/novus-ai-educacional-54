-- Template de notificacao por e-mail pra aprovacao/recusa de justificativa de falta
-- (mesmo padrao INSERT...SELECT...WHERE NOT EXISTS ja usado nos templates de
-- erp.receivable_due/docs.pending, migration 20250821214500).
--
-- {{status_label}}/{{review_note_block}} sao resolvidos no payload pelo client (nao
-- em dois templates separados) -- mais simples, um template so cobre os dois desfechos.
INSERT INTO public.notification_templates (organization_id, channel, event_type, name, subject, body_md)
SELECT
  o.id as organization_id,
  'email' as channel,
  'acad.absence_justification_reviewed' as event_type,
  'Justificativa de Falta Revisada' as name,
  'Justificativa de falta {{status_label}} - {{student_name}}' as subject,
  E'Ola **{{guardian_name}}**!\n\nA justificativa de falta enviada para o(a) aluno(a) **{{student_name}}** foi **{{status_label}}**.\n\n{{review_note_block}}\n\n[Acesse o Portal do Responsavel]({{link}}) para mais detalhes.\n\nAtenciosamente,\n{{organization_name}}' as body_md
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates nt
  WHERE nt.organization_id = o.id
    AND nt.channel = 'email'
    AND nt.event_type = 'acad.absence_justification_reviewed'
);
