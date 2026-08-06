import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { ClassCouncilDecision } from '@/hooks/useClassCouncils';

export interface ClassCouncilPdfSubjectSummary {
  subjectName: string;
  finalGrade: number;
  status: 'aprovado' | 'progressao_parcial';
}

export interface ClassCouncilPdfStudentRow {
  studentName: string;
  subjects: ClassCouncilPdfSubjectSummary[];
  opinionText: string | null;
  decision: ClassCouncilDecision;
}

interface GenerateClassCouncilPdfInput {
  organizationName: string;
  className: string;
  termName: string;
  termDateStart: string;
  termDateEnd: string;
  signerName: string;
  finalizedAt: string; // ISO, vindo do finalized_at retornado pelo Postgres
  contentHash: string;
  students: ClassCouncilPdfStudentRow[];
}

// Mesma identidade visual de generateEnrollmentContractPdf.ts — reutilizar as
// constantes exatas mantém consistência entre os documentos gerados pelo app.
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const BODY_FONT_SIZE = 10.5;
const BODY_LINE_HEIGHT = BODY_FONT_SIZE + 6;
const SECTION_FONT_SIZE = 13.5;
const NAME_FONT_SIZE = 12;
const HEADER_HEIGHT = 92;
const FOOTER_HEIGHT = 30;
const ACCENT_COLOR = rgb(0.11, 0.4, 0.36);
const TEXT_COLOR = rgb(0.08, 0.08, 0.1);
const MUTED_COLOR = rgb(0.45, 0.47, 0.5);
const RETIDO_COLOR = rgb(0.6, 0.15, 0.15);

const DECISION_LABELS: Record<ClassCouncilDecision, string> = {
  aprovado: 'Aprovado',
  progressao_parcial: 'Progressão Parcial',
  retido: 'Retido',
};

function drawHeader(page: PDFPage, font: PDFFont, boldFont: PDFFont, organizationName: string, subtitle: string) {
  const top = PAGE_HEIGHT - MARGIN;
  page.drawText('ATA DE CONSELHO DE CLASSE', { x: MARGIN, y: top - 20, size: 17, font: boldFont, color: TEXT_COLOR });
  page.drawText(organizationName, { x: MARGIN, y: top - 39, size: 10, font, color: MUTED_COLOR });
  page.drawText(subtitle, { x: MARGIN, y: top - 54, size: 10, font, color: MUTED_COLOR });
  page.drawLine({
    start: { x: MARGIN, y: top - HEADER_HEIGHT + 20 },
    end: { x: PAGE_WIDTH - MARGIN, y: top - HEADER_HEIGHT + 20 },
    thickness: 1.5,
    color: ACCENT_COLOR,
  });
}

function drawFooter(page: PDFPage, font: PDFFont, pageNumber: number, totalPages: number) {
  const y = MARGIN - 20;
  page.drawLine({
    start: { x: MARGIN, y: y + 14 },
    end: { x: PAGE_WIDTH - MARGIN, y: y + 14 },
    thickness: 0.5,
    color: MUTED_COLOR,
  });
  const label = `Página ${pageNumber} de ${totalPages}`;
  const width = font.widthOfTextAtSize(label, 8);
  page.drawText(label, { x: PAGE_WIDTH - MARGIN - width, y, size: 8, font, color: MUTED_COLOR });
}

function wrapWords(words: string[], font: PDFFont, fontSize: number, maxWidth: number): string[][] {
  const lines: string[][] = [];
  let current: string[] = [];
  for (const word of words) {
    const candidate = [...current, word].join(' ');
    if (font.widthOfTextAtSize(candidate, fontSize) > maxWidth && current.length > 0) {
      lines.push(current);
      current = [word];
    } else {
      current.push(word);
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

export async function generateClassCouncilPdf({
  organizationName,
  className,
  termName,
  termDateStart,
  termDateEnd,
  signerName,
  finalizedAt,
  contentHash,
  students,
}: GenerateClassCouncilPdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const maxWidth = PAGE_WIDTH - MARGIN * 2;

  const dateRange = `${new Date(`${termDateStart}T00:00:00`).toLocaleDateString('pt-BR')} a ${new Date(`${termDateEnd}T00:00:00`).toLocaleDateString('pt-BR')}`;
  const subtitle = `Turma: ${className}  •  Período: ${termName} (${dateRange})`;

  const pages: PDFPage[] = [];
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(page);
  drawHeader(page, font, boldFont, organizationName, subtitle);
  let y = PAGE_HEIGHT - MARGIN - HEADER_HEIGHT - 22;

  const newPageIfNeeded = (extra = 0) => {
    if (y - extra < MARGIN + FOOTER_HEIGHT) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pages.push(page);
      drawHeader(page, font, boldFont, organizationName, subtitle);
      y = PAGE_HEIGHT - MARGIN - HEADER_HEIGHT - 22;
    }
  };

  const drawWrapped = (text: string, fontSize: number, useFont: PDFFont, color = TEXT_COLOR, prefixBold?: string) => {
    const prefixWidth = prefixBold ? boldFont.widthOfTextAtSize(`${prefixBold} `, fontSize) : 0;
    const words = text.split(' ').filter(Boolean);
    const lines = wrapWords(words, useFont, fontSize, maxWidth - prefixWidth);
    lines.forEach((lineWords, index) => {
      newPageIfNeeded(BODY_LINE_HEIGHT);
      if (index === 0 && prefixBold) {
        page.drawText(prefixBold, { x: MARGIN, y, size: fontSize, font: boldFont, color: TEXT_COLOR });
      }
      const x = MARGIN + (index === 0 ? prefixWidth : 0);
      page.drawText(lineWords.join(' '), { x, y, size: fontSize, font: useFont, color });
      y -= BODY_LINE_HEIGHT;
    });
  };

  students.forEach((student, index) => {
    newPageIfNeeded(NAME_FONT_SIZE + BODY_LINE_HEIGHT * 3);
    if (index > 0) y -= 8;

    page.drawText(student.studentName, { x: MARGIN, y, size: NAME_FONT_SIZE, font: boldFont, color: TEXT_COLOR });
    y -= NAME_FONT_SIZE + 6;

    const subjectsLine = student.subjects.length > 0
      ? student.subjects
          .map((s) => `${s.subjectName}: ${s.finalGrade.toFixed(1)} (${s.status === 'aprovado' ? 'Aprovado' : 'Progressão Parcial'})`)
          .join('  |  ')
      : 'Sem resultado calculado nas disciplinas.';
    drawWrapped(subjectsLine, 9.5, font, MUTED_COLOR);

    drawWrapped(student.opinionText || '—', BODY_FONT_SIZE, font, TEXT_COLOR, 'Parecer:');

    newPageIfNeeded(BODY_LINE_HEIGHT);
    const decisionLabel = DECISION_LABELS[student.decision];
    const decisionColor = student.decision === 'retido' ? RETIDO_COLOR : TEXT_COLOR;
    page.drawText('Decisão do Conselho:', { x: MARGIN, y, size: BODY_FONT_SIZE, font: boldFont, color: TEXT_COLOR });
    const labelWidth = boldFont.widthOfTextAtSize('Decisão do Conselho: ', BODY_FONT_SIZE);
    page.drawText(decisionLabel, { x: MARGIN + labelWidth, y, size: BODY_FONT_SIZE, font: boldFont, color: decisionColor });
    y -= BODY_LINE_HEIGHT;

    newPageIfNeeded(4);
    page.drawLine({
      start: { x: MARGIN, y: y + 4 },
      end: { x: PAGE_WIDTH - MARGIN, y: y + 4 },
      thickness: 0.5,
      color: MUTED_COLOR,
    });
  });

  newPageIfNeeded(90);
  y -= 20;
  page.drawText('ASSINATURA ELETRÔNICA', { x: MARGIN, y, size: SECTION_FONT_SIZE, font: boldFont, color: ACCENT_COLOR });
  y -= SECTION_FONT_SIZE + 10;
  page.drawText('Nome digitado:', { x: MARGIN, y, size: BODY_FONT_SIZE, font: boldFont, color: TEXT_COLOR });
  page.drawText(signerName, {
    x: MARGIN + boldFont.widthOfTextAtSize('Nome digitado: ', BODY_FONT_SIZE),
    y,
    size: BODY_FONT_SIZE,
    font,
    color: TEXT_COLOR,
  });
  y -= BODY_LINE_HEIGHT;
  page.drawText('Assinado em (registrado pelo servidor):', { x: MARGIN, y, size: BODY_FONT_SIZE, font: boldFont, color: TEXT_COLOR });
  const finalizedAtLabelWidth = boldFont.widthOfTextAtSize('Assinado em (registrado pelo servidor): ', BODY_FONT_SIZE);
  page.drawText(new Date(finalizedAt).toLocaleString('pt-BR'), {
    x: MARGIN + finalizedAtLabelWidth,
    y,
    size: BODY_FONT_SIZE,
    font,
    color: TEXT_COLOR,
  });
  y -= BODY_LINE_HEIGHT;
  page.drawText(`Hash SHA-256 do conteúdo da ata: ${contentHash}`, { x: MARGIN, y, size: 8, font, color: MUTED_COLOR });

  pages.forEach((p, i) => drawFooter(p, font, i + 1, pages.length));

  return pdfDoc.save();
}
