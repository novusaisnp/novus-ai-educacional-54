import { supabase } from '@/integrations/supabase/client';
import { generateBoletimPdf, type BoletimAttendanceRow, type BoletimSubjectRow } from './generateBoletimPdf';
import { generateHistoricoPdf, type HistoricoTermGroup } from './generateHistoricoPdf';

const DEFAULT_MINIMUM_PASSING_AVERAGE = 6.0;

// Logo é decoração — nunca deve travar a emissão do boletim/histórico. Mesmo
// espírito de fetchLogoBytesSafely em signEnrollmentContract.ts, mas sem a
// prioridade de logo do ERP (fora de escopo desta fatia: só organizations.logo_url).
async function fetchLogoBytesSafely(logoUrl: string | null | undefined): Promise<Uint8Array | null> {
  if (!logoUrl) return null;
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
}

async function hashContent(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// documents não tem nenhuma UNIQUE constraint (só índices comuns em
// organization_id e (owner_type, owner_id) — conferido em
// supabase/migrations/20250812134534-.sql:206-220). Por isso o registro é
// select-then-insert/update explícito por file_path (determinístico por
// aluno+documento), não `.upsert(..., {onConflict})`, que quebraria com
// 400/42P10 sem uma constraint real por trás (mesma armadilha documentada no
// CLAUDE.md deste projeto).
async function upsertDocumentRecord(input: {
  orgId: string;
  studentId: string;
  storagePath: string;
  title: string;
  documentType: string;
  tag: string;
}): Promise<string> {
  const filePath = `docs/${input.storagePath}`;

  const { data: existing, error: selectError } = await supabase
    .from('documents')
    .select('id')
    .eq('organization_id', input.orgId)
    .eq('owner_id', input.studentId)
    .eq('file_path', filePath)
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const { error: updateError } = await supabase
      .from('documents')
      .update({ title: input.title, document_type: input.documentType, tags: [input.tag] })
      .eq('id', existing.id);
    if (updateError) throw updateError;
    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('documents')
    .insert({
      organization_id: input.orgId,
      owner_type: 'student',
      owner_id: input.studentId,
      title: input.title,
      file_path: filePath,
      tags: [input.tag],
      document_type: input.documentType,
    })
    .select('id')
    .single();
  if (insertError) throw insertError;
  return inserted.id;
}

interface AttendanceCounts {
  presente: number;
  falta: number;
  atraso: number;
  justificada: number;
}

function emptyCounts(): AttendanceCounts {
  return { presente: 0, falta: 0, atraso: 0, justificada: 0 };
}

function attendanceRateFromCounts(counts: AttendanceCounts): number | null {
  const total = counts.presente + counts.falta + counts.atraso + counts.justificada;
  if (total === 0) return null;
  return ((counts.presente + counts.atraso) / total) * 100;
}

export interface IssueBoletimInput {
  orgId: string;
  organizationName: string;
  logoUrl: string | null | undefined;
  studentId: string;
  classId: string;
  termId: string;
}

export interface IssueReportResult {
  documentId: string;
  storagePath: string;
}

export async function issueBoletim(input: IssueBoletimInput): Promise<IssueReportResult> {
  const [studentRes, classRes, termRes, classSubjectsRes, termResultsRes, settingsRes] = await Promise.all([
    supabase.from('students').select('first_name, last_name').eq('id', input.studentId).single(),
    supabase.from('classes').select('name').eq('id', input.classId).single(),
    supabase.from('academic_terms').select('name, date_start, date_end, periods(name)').eq('id', input.termId).single(),
    supabase
      .from('class_subjects')
      .select('subject_id, subjects(name), profiles(full_name)')
      .eq('organization_id', input.orgId)
      .eq('class_id', input.classId),
    supabase
      .from('term_results')
      .select('subject_id, original_average, recovery_grade, final_grade, status')
      .eq('organization_id', input.orgId)
      .eq('term_id', input.termId)
      .eq('class_id', input.classId)
      .eq('student_id', input.studentId),
    supabase.from('academic_settings').select('minimum_passing_average').eq('organization_id', input.orgId).maybeSingle(),
  ]);
  if (studentRes.error) throw studentRes.error;
  if (classRes.error) throw classRes.error;
  if (termRes.error) throw termRes.error;
  if (classSubjectsRes.error) throw classSubjectsRes.error;
  if (termResultsRes.error) throw termResultsRes.error;
  if (settingsRes.error) throw settingsRes.error;

  const term = termRes.data as unknown as { name: string; date_start: string; date_end: string; periods: { name: string } | null };
  const classSubjects = (classSubjectsRes.data || []) as unknown as Array<{
    subject_id: string;
    subjects: { name: string } | null;
    profiles: { full_name: string } | null;
  }>;
  const termResultsBySubject = new Map(
    (termResultsRes.data || []).map((r) => [r.subject_id, r as { original_average: number; recovery_grade: number | null; final_grade: number; status: 'aprovado' | 'progressao_parcial' }])
  );

  let attendanceCountsBySubject = new Map<string, AttendanceCounts>();
  if (classSubjects.length > 0) {
    const { data: attendanceRows, error: attendanceError } = await supabase
      .from('attendance')
      .select('subject_id, status')
      .eq('organization_id', input.orgId)
      .eq('class_id', input.classId)
      .eq('student_id', input.studentId)
      .gte('date', term.date_start)
      .lte('date', term.date_end);
    if (attendanceError) throw attendanceError;

    attendanceCountsBySubject = new Map(
      classSubjects.map((cs) => [cs.subject_id, emptyCounts()])
    );
    (attendanceRows || []).forEach((row) => {
      const counts = attendanceCountsBySubject.get(row.subject_id);
      if (counts && row.status in counts) {
        (counts as unknown as Record<string, number>)[row.status] += 1;
      }
    });
  }

  const studentName = `${studentRes.data.first_name} ${studentRes.data.last_name}`;
  const className = classRes.data.name;
  const minimumPassingAverage = settingsRes.data?.minimum_passing_average ?? DEFAULT_MINIMUM_PASSING_AVERAGE;

  const subjects: BoletimSubjectRow[] = classSubjects.map((cs) => {
    const result = termResultsBySubject.get(cs.subject_id);
    return {
      subjectName: cs.subjects?.name ?? 'Disciplina',
      teacherName: cs.profiles?.full_name ?? null,
      originalAverage: result?.original_average ?? null,
      recoveryGrade: result?.recovery_grade ?? null,
      finalGrade: result?.final_grade ?? null,
      status: result?.status ?? null,
    };
  });

  const attendance: BoletimAttendanceRow[] = classSubjects.map((cs) => {
    const counts = attendanceCountsBySubject.get(cs.subject_id) ?? emptyCounts();
    return { subjectName: cs.subjects?.name ?? 'Disciplina', ...counts };
  });

  const issuedAt = new Date().toISOString();
  const contentHash = await hashContent(
    JSON.stringify({ studentId: input.studentId, termId: input.termId, classId: input.classId, subjects, attendance })
  );

  const logoBytes = await fetchLogoBytesSafely(input.logoUrl);
  const pdfBytes = await generateBoletimPdf({
    organizationName: input.organizationName,
    logoBytes,
    studentName,
    className,
    periodName: term.periods?.name ?? 'Período',
    termName: term.name,
    minimumPassingAverage,
    subjects,
    attendance,
    issuedAt,
    contentHash,
  });

  const storagePath = `${input.orgId}/students/${input.studentId}/boletim-${input.termId}.pdf`;
  const { error: uploadError } = await supabase.storage.from('docs').upload(storagePath, pdfBytes, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const documentId = await upsertDocumentRecord({
    orgId: input.orgId,
    studentId: input.studentId,
    storagePath,
    title: `Boletim Escolar — ${term.name}`,
    documentType: 'Boletim Escolar',
    tag: 'boletim',
  });

  return { documentId, storagePath };
}

export interface IssueHistoricoInput {
  orgId: string;
  organizationName: string;
  logoUrl: string | null | undefined;
  studentId: string;
}

export async function issueHistorico(input: IssueHistoricoInput): Promise<IssueReportResult> {
  const [studentRes, resultsRes] = await Promise.all([
    supabase.from('students').select('first_name, last_name, birth_date, document_id').eq('id', input.studentId).single(),
    supabase
      .from('term_results')
      .select(
        'term_id, subject_id, final_grade, status, subjects(name), classes(name), academic_terms(name, date_start, date_end, periods(name))'
      )
      .eq('organization_id', input.orgId)
      .eq('student_id', input.studentId),
  ]);
  if (studentRes.error) throw studentRes.error;
  if (resultsRes.error) throw resultsRes.error;

  type ResultRow = {
    term_id: string;
    subject_id: string;
    final_grade: number;
    status: 'aprovado' | 'progressao_parcial';
    subjects: { name: string } | null;
    classes: { name: string } | null;
    academic_terms: { name: string; date_start: string; date_end: string; periods: { name: string } | null } | null;
  };
  const rows = (resultsRes.data || []) as unknown as ResultRow[];

  const groupsByTerm = new Map<string, ResultRow[]>();
  rows.forEach((row) => {
    const existing = groupsByTerm.get(row.term_id);
    if (existing) existing.push(row);
    else groupsByTerm.set(row.term_id, [row]);
  });

  const sortedTermIds = Array.from(groupsByTerm.keys()).sort((a, b) => {
    const dateA = groupsByTerm.get(a)?.[0]?.academic_terms?.date_start || '';
    const dateB = groupsByTerm.get(b)?.[0]?.academic_terms?.date_start || '';
    return dateA.localeCompare(dateB);
  });

  const termGroups: HistoricoTermGroup[] = await Promise.all(
    sortedTermIds.map(async (termId) => {
      const groupRows = groupsByTerm.get(termId) ?? [];
      const first = groupRows[0];
      const term = first.academic_terms;

      let attendanceRate: number | null = null;
      if (term) {
        const { data: attendanceRows, error: attendanceError } = await supabase
          .from('attendance')
          .select('status')
          .eq('organization_id', input.orgId)
          .eq('student_id', input.studentId)
          .gte('date', term.date_start)
          .lte('date', term.date_end);
        if (attendanceError) throw attendanceError;
        const counts = emptyCounts();
        (attendanceRows || []).forEach((row) => {
          if (row.status in counts) (counts as unknown as Record<string, number>)[row.status] += 1;
        });
        attendanceRate = attendanceRateFromCounts(counts);
      }

      return {
        periodName: term?.periods?.name ?? 'Período',
        termName: term?.name ?? 'Termo',
        className: first.classes?.name ?? null,
        subjects: groupRows.map((r) => ({
          subjectName: r.subjects?.name ?? 'Disciplina',
          finalGrade: r.final_grade,
          status: r.status,
        })),
        attendanceRate,
      };
    })
  );

  const studentName = `${studentRes.data.first_name} ${studentRes.data.last_name}`;
  const issuedAt = new Date().toISOString();
  const contentHash = await hashContent(JSON.stringify({ studentId: input.studentId, termGroups }));

  const logoBytes = await fetchLogoBytesSafely(input.logoUrl);
  const pdfBytes = await generateHistoricoPdf({
    organizationName: input.organizationName,
    logoBytes,
    studentName,
    studentBirthDate: studentRes.data.birth_date,
    studentDocumentId: studentRes.data.document_id,
    termGroups,
    issuedAt,
    contentHash,
  });

  const storagePath = `${input.orgId}/students/${input.studentId}/historico-escolar.pdf`;
  const { error: uploadError } = await supabase.storage.from('docs').upload(storagePath, pdfBytes, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const documentId = await upsertDocumentRecord({
    orgId: input.orgId,
    studentId: input.studentId,
    storagePath,
    title: 'Histórico Escolar',
    documentType: 'Histórico Escolar',
    tag: 'historico_escolar',
  });

  return { documentId, storagePath };
}
