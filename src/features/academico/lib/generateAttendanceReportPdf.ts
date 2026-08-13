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

export interface AttendanceReportPdfRow {
  studentName: string;
  date: string;
  status: string;
  note: string;
  className: string;
  subjectName: string;
}

export interface GenerateAttendanceReportPdfInput {
  organizationName: string;
  logoBytes?: Uint8Array | null;
  className: string;
  subjectName: string;
  dateStart: string;
  dateEnd: string;
  summary: { presente: number; ausente: number; atraso: number; justificado: number; total: number; percentualPresenca: number };
  rows: AttendanceReportPdfRow[];
  issuedAt: string;
}

export async function generateAttendanceReportPdf(input: GenerateAttendanceReportPdfInput): Promise<Uint8Array> {
  const ctx = await createReportPdf({
    title: 'RELATÓRIO DE CHAMADA',
    kicker: `${input.dateStart} a ${input.dateEnd}`,
    organizationName: input.organizationName,
    logoBytes: input.logoBytes,
  });

  drawSectionLabel(ctx, 'Filtros do relatório');
  drawKeyValueRow(ctx, [
    { label: 'TURMA', value: input.className },
    { label: 'DISCIPLINA', value: input.subjectName },
    { label: 'PERÍODO', value: `${input.dateStart} a ${input.dateEnd}` },
  ]);

  drawSectionLabel(ctx, 'Resumo de frequência');
  drawKeyValueRow(ctx, [
    { label: 'PRESENTES', value: String(input.summary.presente) },
    { label: 'AUSENTES', value: String(input.summary.ausente) },
    { label: 'ATRASOS', value: String(input.summary.atraso) },
  ]);
  drawKeyValueRow(ctx, [
    { label: 'JUSTIFICADOS', value: String(input.summary.justificado) },
    { label: 'TOTAL', value: String(input.summary.total) },
    { label: 'PRESENÇA', value: `${input.summary.percentualPresenca}%` },
  ]);

  drawSectionLabel(ctx, 'Registros detalhados');
  const columns: TableColumn<AttendanceReportPdfRow>[] = [
    { header: 'Aluno', width: CONTENT_WIDTH * 0.24, cell: (row) => ({ kind: 'text', text: row.studentName, bold: true }) },
    { header: 'Data', width: CONTENT_WIDTH * 0.12, align: 'center', cell: (row) => ({ kind: 'text', text: row.date }) },
    { header: 'Status', width: CONTENT_WIDTH * 0.16, align: 'center', cell: (row) => ({ kind: 'pill', text: row.status, fill: row.status === 'Presente' ? BRAND.teal : row.status === 'Ausente' ? BRAND.coral : BRAND.gold }) },
    { header: 'Observação', width: CONTENT_WIDTH * 0.24, cell: (row) => ({ kind: 'text', text: row.note || '-', color: BRAND.muted }) },
    { header: 'Turma', width: CONTENT_WIDTH * 0.12, cell: (row) => ({ kind: 'text', text: row.className }) },
    { header: 'Disciplina', width: CONTENT_WIDTH * 0.12, cell: (row) => ({ kind: 'text', text: row.subjectName }) },
  ];
  drawTable(ctx, { columns, rows: input.rows, emptyMessage: 'Nenhum registro encontrado para os filtros selecionados.' });

  finalizeFooters(ctx, `Emitido automaticamente pelo NOVUS.AI Educacional em ${new Date(input.issuedAt).toLocaleString('pt-BR')}`);
  return ctx.pdfDoc.save();
}
