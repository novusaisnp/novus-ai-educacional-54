import {
  BRAND,
  CONTENT_WIDTH,
  createReportPdf,
  drawKeyValueRow,
  drawSectionLabel,
  drawTable,
  finalizeFooters,
  type TableColumn,
} from './reportPdfKit';

export interface BoletimSubjectRow {
  subjectName: string;
  teacherName: string | null;
  originalAverage: number | null;
  recoveryGrade: number | null;
  finalGrade: number | null;
  status: 'aprovado' | 'progressao_parcial' | null; // null = term_results ainda não calculado pra esta disciplina
}

export interface BoletimAttendanceRow {
  subjectName: string;
  presente: number;
  falta: number;
  atraso: number;
  justificada: number;
}

export interface GenerateBoletimPdfInput {
  organizationName: string;
  logoBytes?: Uint8Array | null;
  studentName: string;
  className: string;
  periodName: string;
  termName: string;
  minimumPassingAverage: number;
  subjects: BoletimSubjectRow[];
  attendance: BoletimAttendanceRow[];
  issuedAt: string; // ISO
  contentHash: string;
}

const gradeText = (value: number | null): string => (value === null ? '—' : value.toFixed(1));

export async function generateBoletimPdf(input: GenerateBoletimPdfInput): Promise<Uint8Array> {
  const ctx = await createReportPdf({
    title: 'BOLETIM ESCOLAR',
    kicker: `${input.termName} · ${input.periodName} · Turma ${input.className}`,
    organizationName: input.organizationName,
    logoBytes: input.logoBytes,
  });

  drawSectionLabel(ctx, 'Dados do Aluno');
  drawKeyValueRow(ctx, [
    { label: 'ALUNO', value: input.studentName },
    { label: 'TURMA', value: input.className },
    { label: 'PERÍODO', value: `${input.periodName} — ${input.termName}` },
  ]);

  drawSectionLabel(ctx, 'Desempenho por Disciplina');
  const gradeColumns: TableColumn<BoletimSubjectRow>[] = [
    { header: 'Disciplina', width: CONTENT_WIDTH * 0.27, cell: (r) => ({ kind: 'text', text: r.subjectName, bold: true }) },
    { header: 'Professor', width: CONTENT_WIDTH * 0.23, cell: (r) => ({ kind: 'text', text: r.teacherName ?? 'Não atribuído', color: BRAND.muted }) },
    { header: 'Média', width: CONTENT_WIDTH * 0.1, align: 'center', cell: (r) => ({ kind: 'text', text: gradeText(r.originalAverage) }) },
    { header: 'Recup.', width: CONTENT_WIDTH * 0.1, align: 'center', cell: (r) => ({ kind: 'text', text: gradeText(r.recoveryGrade) }) },
    { header: 'Final', width: CONTENT_WIDTH * 0.1, align: 'center', cell: (r) => ({ kind: 'text', text: gradeText(r.finalGrade), bold: true }) },
    {
      header: 'Situação',
      width: CONTENT_WIDTH * 0.2,
      align: 'center',
      cell: (r) =>
        r.status === null
          ? { kind: 'text', text: 'Pendente', color: BRAND.muted }
          : { kind: 'pill', text: r.status === 'aprovado' ? 'Aprovado' : 'Prog. Parcial', fill: r.status === 'aprovado' ? BRAND.teal : BRAND.coral },
    },
  ];
  drawTable(ctx, { columns: gradeColumns, rows: input.subjects, emptyMessage: 'Nenhuma disciplina atribuída a esta turma.' });

  ctx.y -= 4;
  ctx.page.drawText(`Média mínima para aprovação: ${input.minimumPassingAverage.toFixed(1)}`, {
    x: 48,
    y: ctx.y,
    size: 8.5,
    font: ctx.font,
    color: BRAND.muted,
  });
  ctx.y -= 20;

  drawSectionLabel(ctx, 'Frequência por Disciplina');
  const attendanceColumns: TableColumn<BoletimAttendanceRow>[] = [
    { header: 'Disciplina', width: CONTENT_WIDTH * 0.26, cell: (r) => ({ kind: 'text', text: r.subjectName, bold: true }) },
    { header: 'Presenças', width: CONTENT_WIDTH * 0.13, align: 'center', cell: (r) => ({ kind: 'text', text: String(r.presente) }) },
    { header: 'Faltas', width: CONTENT_WIDTH * 0.13, align: 'center', cell: (r) => ({ kind: 'text', text: String(r.falta) }) },
    { header: 'Atrasos', width: CONTENT_WIDTH * 0.13, align: 'center', cell: (r) => ({ kind: 'text', text: String(r.atraso) }) },
    { header: 'Justif.', width: CONTENT_WIDTH * 0.13, align: 'center', cell: (r) => ({ kind: 'text', text: String(r.justificada) }) },
    {
      header: '% Frequência',
      width: CONTENT_WIDTH * 0.22,
      cell: (r) => {
        const total = r.presente + r.falta + r.atraso + r.justificada;
        const percent = total > 0 ? Math.round(((r.presente + r.atraso) / total) * 100) : 0;
        return { kind: 'bar', percent, label: total > 0 ? `${percent}%` : '—' };
      },
    },
  ];
  drawTable(ctx, { columns: attendanceColumns, rows: input.attendance, emptyMessage: 'Nenhum registro de frequência lançado neste período.' });

  finalizeFooters(
    ctx,
    `Documento emitido automaticamente pelo sistema NOVUS.AI Educacional em ${new Date(input.issuedAt).toLocaleString('pt-BR')} · Hash: ${input.contentHash.slice(0, 16)}`
  );

  return ctx.pdfDoc.save();
}
