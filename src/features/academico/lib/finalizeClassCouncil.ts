import { supabase } from '@/integrations/supabase/client';
import { generateClassCouncilPdf, type ClassCouncilPdfStudentRow } from './generateClassCouncilPdf';
import type { ClassCouncilDecision } from '@/hooks/useClassCouncils';

export interface FinalizeClassCouncilStudentInput {
  studentId: string;
  studentName: string;
  opinionText: string | null;
  decision: ClassCouncilDecision | null;
  subjects: { subjectName: string; finalGrade: number; status: 'aprovado' | 'progressao_parcial' }[];
}

export interface FinalizeClassCouncilInput {
  orgId: string;
  organizationName: string;
  classCouncilId: string;
  classId: string;
  termId: string;
  className: string;
  termName: string;
  termDateStart: string;
  termDateEnd: string;
  signerName: string;
  students: FinalizeClassCouncilStudentInput[];
}

async function hashContent(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildCanonicalText(input: FinalizeClassCouncilInput): string {
  const lines: string[] = [
    `ATA DE CONSELHO DE CLASSE — ${input.organizationName}`,
    `Turma: ${input.className}`,
    `Período: ${input.termName} (${input.termDateStart} a ${input.termDateEnd})`,
    '',
  ];
  for (const student of input.students) {
    lines.push(`Aluno: ${student.studentName}`);
    for (const subject of student.subjects) {
      lines.push(`  ${subject.subjectName}: ${subject.finalGrade.toFixed(2)} (${subject.status})`);
    }
    lines.push(`Parecer: ${student.opinionText || '-'}`);
    lines.push(`Decisão: ${student.decision}`);
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Finaliza e assina eletronicamente a ata de conselho de classe (nome
 * digitado + timestamp do servidor + hash do conteúdo), gera e anexa o PDF.
 * Diferente do contrato de matrícula (que nasce já assinado via INSERT), a
 * ata já existe em rascunho — a finalização é um UPDATE condicional
 * (WHERE status='rascunho') para evitar corrida de dupla finalização.
 */
export async function finalizeClassCouncil(input: FinalizeClassCouncilInput) {
  const missing = input.students.filter((s) => !s.decision);
  if (missing.length > 0) {
    throw new Error(
      `Preencha a decisão do conselho para todos os alunos antes de finalizar. Pendente(s): ${missing
        .map((s) => s.studentName)
        .join(', ')}`
    );
  }

  const contentHash = await hashContent(buildCanonicalText(input));

  // UPDATE condicional: só finaliza se ainda estiver em rascunho — evita
  // corrida de dupla finalização e garante que finalized_at (via trigger)
  // corresponde exatamente a esta chamada.
  const { data: council, error: updateError } = await supabase
    .from('class_councils')
    .update({ status: 'concluida', signer_name: input.signerName })
    .eq('id', input.classCouncilId)
    .eq('status', 'rascunho')
    .select('id, status, signer_name, finalized_at, document_id')
    .maybeSingle();
  if (updateError) throw updateError;
  if (!council) {
    throw new Error('Esta ata já foi finalizada (ou não foi encontrada). Recarregue a página.');
  }

  const pdfStudents: ClassCouncilPdfStudentRow[] = input.students.map((s) => ({
    studentName: s.studentName,
    subjects: s.subjects,
    opinionText: s.opinionText,
    decision: s.decision as ClassCouncilDecision,
  }));

  const pdfBytes = await generateClassCouncilPdf({
    organizationName: input.organizationName,
    className: input.className,
    termName: input.termName,
    termDateStart: input.termDateStart,
    termDateEnd: input.termDateEnd,
    signerName: input.signerName,
    finalizedAt: council.finalized_at as string,
    contentHash,
    students: pdfStudents,
  });

  const path = `${input.orgId}/classes/${input.classId}/ata-conselho-${input.classCouncilId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('docs')
    .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true });
  if (uploadError) throw uploadError;

  const { data: document, error: docError } = await supabase
    .from('documents')
    .insert({
      organization_id: input.orgId,
      owner_type: 'class',
      owner_id: input.classId,
      title: 'Ata de Conselho de Classe',
      file_path: `docs/${path}`,
      tags: ['ata_conselho_classe'],
      document_type: 'Ata de Conselho de Classe',
    })
    .select()
    .single();
  if (docError) throw docError;

  const { error: linkError } = await supabase
    .from('class_councils')
    .update({ document_id: document.id })
    .eq('id', input.classCouncilId);
  if (linkError) throw linkError;

  return { ...council, document_id: document.id };
}
