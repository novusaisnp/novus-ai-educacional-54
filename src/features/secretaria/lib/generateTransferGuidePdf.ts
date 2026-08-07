import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export interface TransferGuideSubjectResult {
  subjectName: string;
  finalGrade: number;
  status: 'aprovado' | 'progressao_parcial';
}

export interface TransferGuideTermGroup {
  termName: string;
  periodName: string;
  className: string | null;
  subjects: TransferGuideSubjectResult[];
}

interface GenerateTransferGuidePdfInput {
  organizationName: string;
  studentName: string;
  studentBirthDate: string | null;
  studentDocumentId: string | null;
  originClassName: string | null;
  destinationSchool: string | null;
  reason: string | null;
  transferDate: string;
  signerName: string;
  finalizedAt: string;
  contentHash: string;
  termGroups: TransferGuideTermGroup[];
}

// Mesma identidade visual de generateClassCouncilPdf.ts/generateEnrollmentContractPdf.ts.
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const BODY_FONT_SIZE = 10.5;
const BODY_LINE_HEIGHT = BODY_FONT_SIZE + 6;
const SECTION_FONT_SIZE = 13.5;
const HEADER_HEIGHT = 92;
const FOOTER_HEIGHT = 30;
const ACCENT_COLOR = rgb(0.11, 0.4, 0.36);
const TEXT_COLOR = rgb(0.08, 0.08, 0.1);
const MUTED_COLOR = rgb(0.45, 0.47, 0.5);

function drawHeader(page: PDFPage, font: PDFFont, boldFont: PDFFont, organizationName: string, subtitle: string) {
  const top = PAGE_HEIGHT - MARGIN;
  page.drawText('GUIA DE TRANSFERÊNCIA ESCOLAR', { x: MARGIN, y: top - 20, size: 17, font: boldFont, color: TEXT_COLOR });
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

export async function generateTransferGuidePdf({
  organizationName,
  studentName,
  studentBirthDate,
  studentDocumentId,
  originClassName,
  destinationSchool,
  reason,
  transferDate,
  signerName,
  finalizedAt,
  contentHash,
  termGroups,
}: GenerateTransferGuidePdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const subtitle = `Aluno: ${studentName}  •  Transferência em ${new Date(`${transferDate}T00:00:00`).toLocaleDateString('pt-BR')}`;

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

  const drawField = (label: string, value: string) => {
    newPageIfNeeded(BODY_LINE_HEIGHT);
    page.drawText(label, { x: MARGIN, y, size: BODY_FONT_SIZE, font: boldFont, color: TEXT_COLOR });
    const labelWidth = boldFont.widthOfTextAtSize(`${label} `, BODY_FONT_SIZE);
    page.drawText(value, { x: MARGIN + labelWidth, y, size: BODY_FONT_SIZE, font, color: TEXT_COLOR });
    y -= BODY_LINE_HEIGHT;
  };

  newPageIfNeeded(SECTION_FONT_SIZE + 10);
  page.drawText('DADOS DO ALUNO', { x: MARGIN, y, size: SECTION_FONT_SIZE, font: boldFont, color: ACCENT_COLOR });
  y -= SECTION_FONT_SIZE + 10;
  drawField('Nome:', studentName);
  drawField('Data de nascimento:', studentBirthDate ? new Date(`${studentBirthDate}T00:00:00`).toLocaleDateString('pt-BR') : 'Não informado');
  drawField('Documento:', studentDocumentId || 'Não informado');
  drawField('Última turma cursada nesta instituição:', originClassName || 'Não informado');

  y -= 12;
  newPageIfNeeded(SECTION_FONT_SIZE + 10);
  page.drawText('DADOS DA TRANSFERÊNCIA', { x: MARGIN, y, size: SECTION_FONT_SIZE, font: boldFont, color: ACCENT_COLOR });
  y -= SECTION_FONT_SIZE + 10;
  drawField('Data da transferência:', new Date(`${transferDate}T00:00:00`).toLocaleDateString('pt-BR'));
  drawField('Escola de destino:', destinationSchool || 'Não informado');
  drawField('Motivo:', reason || 'Não informado');

  y -= 12;
  newPageIfNeeded(SECTION_FONT_SIZE + 10);
  page.drawText('HISTÓRICO ACADÊMICO', { x: MARGIN, y, size: SECTION_FONT_SIZE, font: boldFont, color: ACCENT_COLOR });
  y -= SECTION_FONT_SIZE + 10;

  if (termGroups.length === 0) {
    newPageIfNeeded(BODY_LINE_HEIGHT);
    page.drawText('Nenhum resultado de período calculado até o momento da emissão desta guia.', {
      x: MARGIN,
      y,
      size: BODY_FONT_SIZE,
      font,
      color: MUTED_COLOR,
    });
    y -= BODY_LINE_HEIGHT;
  }

  termGroups.forEach((group, groupIndex) => {
    newPageIfNeeded(BODY_LINE_HEIGHT * 2);
    if (groupIndex > 0) y -= 8;

    const groupTitle = `${group.periodName} — ${group.termName}${group.className ? ` (${group.className})` : ''}`;
    page.drawText(groupTitle, { x: MARGIN, y, size: BODY_FONT_SIZE + 1, font: boldFont, color: TEXT_COLOR });
    y -= BODY_LINE_HEIGHT;

    group.subjects.forEach((subject) => {
      newPageIfNeeded(BODY_LINE_HEIGHT);
      const line = `${subject.subjectName}: ${subject.finalGrade.toFixed(1)} (${subject.status === 'aprovado' ? 'Aprovado' : 'Progressão Parcial'})`;
      page.drawText(line, { x: MARGIN + 12, y, size: BODY_FONT_SIZE, font, color: TEXT_COLOR });
      y -= BODY_LINE_HEIGHT;
    });

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
  drawField('Nome digitado:', signerName);
  drawField('Assinado em (registrado pelo servidor):', new Date(finalizedAt).toLocaleString('pt-BR'));
  newPageIfNeeded(BODY_LINE_HEIGHT);
  page.drawText(`Hash SHA-256 do conteúdo da guia: ${contentHash}`, { x: MARGIN, y, size: 8, font, color: MUTED_COLOR });

  pages.forEach((p, i) => drawFooter(p, font, i + 1, pages.length));

  return pdfDoc.save();
}
