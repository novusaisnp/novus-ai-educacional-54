import {
  BRAND,
  CONTENT_WIDTH,
  createReportPdf,
  drawKeyValueRow,
  drawSectionLabel,
  drawTable,
  ensureSpace,
  finalizeFooters,
  type TableColumn,
} from './reportPdfKit';

export interface HistoricoSubjectResult {
  subjectName: string;
  finalGrade: number;
  status: 'aprovado' | 'progressao_parcial';
}

export interface HistoricoTermGroup {
  periodName: string;
  termName: string;
  className: string | null;
  subjects: HistoricoSubjectResult[];
  attendanceRate: number | null; // % geral do termo (presença+atraso / total) — null quando não há registro de frequência no intervalo
}

export interface GenerateHistoricoPdfInput {
  organizationName: string;
  logoBytes?: Uint8Array | null;
  studentName: string;
  studentBirthDate: string | null;
  studentDocumentId: string | null;
  termGroups: HistoricoTermGroup[];
  issuedAt: string; // ISO
  contentHash: string;
}

export async function generateHistoricoPdf(input: GenerateHistoricoPdfInput): Promise<Uint8Array> {
  const ctx = await createReportPdf({
    title: 'HISTÓRICO ESCOLAR',
    kicker: `Registro acumulado de ${input.termGroups.length} período(s) letivo(s)`,
    organizationName: input.organizationName,
    logoBytes: input.logoBytes,
  });

  drawSectionLabel(ctx, 'Dados do Aluno');
  drawKeyValueRow(ctx, [
    { label: 'ALUNO', value: input.studentName },
    {
      label: 'DATA DE NASCIMENTO',
      value: input.studentBirthDate ? new Date(`${input.studentBirthDate}T00:00:00`).toLocaleDateString('pt-BR') : 'Não informado',
    },
    { label: 'DOCUMENTO', value: input.studentDocumentId || 'Não informado' },
  ]);

  if (input.termGroups.length === 0) {
    drawSectionLabel(ctx, 'Histórico Acadêmico');
    ensureSpace(ctx, 20);
    ctx.page.drawText('Nenhum resultado de período calculado até o momento da emissão deste histórico.', {
      x: 48,
      y: ctx.y,
      size: 9.5,
      font: ctx.font,
      color: BRAND.muted,
    });
    ctx.y -= 20;
  }

  input.termGroups.forEach((group) => {
    const title = `${group.periodName} — ${group.termName}${group.className ? ` (Turma ${group.className})` : ''}`;
    drawSectionLabel(ctx, title);

    const columns: TableColumn<HistoricoSubjectResult>[] = [
      { header: 'Disciplina', width: CONTENT_WIDTH * 0.44, cell: (r) => ({ kind: 'text', text: r.subjectName, bold: true }) },
      { header: 'Nota Final', width: CONTENT_WIDTH * 0.2, align: 'center', cell: (r) => ({ kind: 'text', text: r.finalGrade.toFixed(1) }) },
      {
        header: 'Situação',
        width: CONTENT_WIDTH * 0.36,
        align: 'center',
        cell: (r) => ({
          kind: 'pill',
          text: r.status === 'aprovado' ? 'Aprovado' : 'Prog. Parcial',
          fill: r.status === 'aprovado' ? BRAND.teal : BRAND.coral,
        }),
      },
    ];
    drawTable(ctx, { columns, rows: group.subjects, emptyMessage: 'Nenhum resultado calculado para este período.' });

    if (group.attendanceRate !== null) {
      ctx.y -= 6; // respiro entre a última linha da tabela e esta nota — sem isso, colava visualmente na linha anterior
      ensureSpace(ctx, 16);
      ctx.page.drawText(`Frequência geral do período: ${Math.round(group.attendanceRate)}%`, {
        x: 48,
        y: ctx.y,
        size: 8.5,
        font: ctx.font,
        color: BRAND.muted,
      });
      ctx.y -= 16;
    }
    ctx.y -= 10;
  });

  finalizeFooters(
    ctx,
    `Documento emitido automaticamente pelo sistema NOVUS.AI Educacional em ${new Date(input.issuedAt).toLocaleString('pt-BR')} · Hash: ${input.contentHash.slice(0, 16)}`
  );

  return ctx.pdfDoc.save();
}
