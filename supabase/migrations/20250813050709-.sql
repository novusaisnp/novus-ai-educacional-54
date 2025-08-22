-- Índices para melhorar performance das queries de avaliações e notas
create unique index if not exists ux_grades_unique
on public.grades (organization_id, assessment_id, student_id);

create index if not exists ix_grades_assessment
on public.grades (organization_id, assessment_id);

create index if not exists ix_assessments_class_subject_date
on public.assessments (organization_id, class_id, subject_id, date);