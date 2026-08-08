import { PDFDocument, StandardFonts, rgb, type Color, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';

// Kit de desenho compartilhado por generateBoletimPdf.ts e generateHistoricoPdf.ts.
// Não é usado pelos PDFs legais já existentes (contrato, guia de transferência,
// ata de conselho) — esses continuam com o layout de texto corrido deles,
// intocados, por serem documentos já assinados eletronicamente em produção.
// Aqui o objetivo é a identidade visual "produto" do ecossistema (paleta
// marfim+teal+coral+gold, ver skill novus-satellite-visual-identity) traduzida
// pro mundo de PDF: banda de cor cheia, tabela em grid com cabeçalho colorido,
// pílulas de status, barra de frequência — em vez de linhas de texto soltas.

export const PAGE_WIDTH = 595.28; // A4
export const PAGE_HEIGHT = 841.89;
export const MARGIN = 48;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const HEADER_HEIGHT = 116;
const FOOTER_RESERVED = 46;

export const BODY_FONT_SIZE = 9.5;
export const BODY_LINE_HEIGHT = 17;

export const BRAND = {
  teal: rgb(0.086, 0.416, 0.376),
  tealDeep: rgb(0.051, 0.251, 0.227),
  coral: rgb(0.929, 0.353, 0.196),
  gold: rgb(0.859, 0.635, 0.204),
  ink: rgb(0.067, 0.086, 0.086),
  muted: rgb(0.44, 0.46, 0.46),
  paperTint: rgb(0.967, 0.959, 0.933),
  white: rgb(1, 1, 1),
  track: rgb(0.85, 0.84, 0.79),
};

export function detectImageKind(bytes: Uint8Array): 'png' | 'jpeg' | null {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  return null;
}

export interface ReportHeaderInfo {
  title: string;
  kicker: string;
  organizationName: string;
  logo: PDFImage | null;
}

export interface ReportPdfContext {
  pdfDoc: PDFDocument;
  font: PDFFont;
  boldFont: PDFFont;
  page: PDFPage;
  y: number;
  pages: PDFPage[];
  header: ReportHeaderInfo;
}

// "Stadium" (retângulo com pontas 100% arredondadas — raio = metade da altura):
// pdf-lib não tem borderRadius em drawRectangle, então o formato é montado com
// um retângulo central + 2 semicírculos (drawEllipse) nas pontas, mesma cor.
// Usado pra pílula de status, chip do logo e barra de frequência — uma única
// primitiva pro "arredondado" em todo o kit, em vez de reinventar em cada uso.
function drawStadium(page: PDFPage, x: number, y: number, width: number, height: number, color: Color, opacity = 1) {
  const radius = height / 2;
  if (width <= height) {
    page.drawEllipse({ x: x + width / 2, y: y + radius, xScale: width / 2, yScale: radius, color, opacity });
    return;
  }
  page.drawRectangle({ x: x + radius, y, width: width - height, height, color, opacity });
  page.drawEllipse({ x: x + radius, y: y + radius, xScale: radius, yScale: radius, color, opacity });
  page.drawEllipse({ x: x + width - radius, y: y + radius, xScale: radius, yScale: radius, color, opacity });
}

function drawHeaderBand(ctx: Pick<ReportPdfContext, 'page' | 'font' | 'boldFont' | 'header'>) {
  const { page, font, boldFont, header } = ctx;
  const top = PAGE_HEIGHT;
  page.drawRectangle({ x: 0, y: top - HEADER_HEIGHT, width: PAGE_WIDTH, height: HEADER_HEIGHT, color: BRAND.teal });
  page.drawRectangle({ x: 0, y: top - HEADER_HEIGHT - 4, width: PAGE_WIDTH, height: 4, color: BRAND.gold });

  let textX = MARGIN;
  const logo = header.logo;
  if (logo) {
    const maxLogoWidth = 40;
    const maxLogoHeight = 40;
    const ratio = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height, 1);
    const width = logo.width * ratio;
    const height = logo.height * ratio;
    const chipPadding = 7;
    const chipWidth = width + chipPadding * 2;
    const chipHeight = height + chipPadding * 2;
    const chipY = top - 22 - chipHeight;
    // Chip claro atrás do logo: sem isso, um logo com texto escuro some contra
    // a banda teal escura (mesma armadilha de contraste documentada na skill
    // novus-satellite-visual-identity) — não dá pra inspecionar o pixel de
    // cada logo de organização em tempo de geração, então o chip resolve pra
    // qualquer logo sem depender disso.
    drawStadium(page, MARGIN, chipY, chipWidth, chipHeight, BRAND.white, 0.96);
    page.drawImage(logo, { x: MARGIN + chipPadding, y: chipY + chipPadding, width, height });
    textX = MARGIN + chipWidth + 14;
  }

  page.drawText(header.organizationName, {
    x: textX,
    y: top - 28,
    size: 9.5,
    font,
    color: rgb(1, 1, 1),
    opacity: 0.82,
  });
  page.drawText(header.title, { x: textX, y: top - 50, size: 25, font: boldFont, color: BRAND.white });
  page.drawText(header.kicker, { x: textX, y: top - 70, size: 10.5, font, color: BRAND.white, opacity: 0.85 });
}

export async function createReportPdf(input: {
  title: string;
  kicker: string;
  organizationName: string;
  logoBytes?: Uint8Array | null;
}): Promise<ReportPdfContext> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let logo: PDFImage | null = null;
  if (input.logoBytes && input.logoBytes.length > 0) {
    const kind = detectImageKind(input.logoBytes);
    try {
      if (kind === 'png') logo = await pdfDoc.embedPng(input.logoBytes);
      else if (kind === 'jpeg') logo = await pdfDoc.embedJpg(input.logoBytes);
    } catch {
      logo = null; // logo é decoração — nunca derruba a geração do documento
    }
  }

  const header: ReportHeaderInfo = { title: input.title, kicker: input.kicker, organizationName: input.organizationName, logo };
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const ctx: ReportPdfContext = { pdfDoc, font, boldFont, page, y: PAGE_HEIGHT - HEADER_HEIGHT - 30, pages: [page], header };
  drawHeaderBand(ctx);
  return ctx;
}

function newPage(ctx: ReportPdfContext) {
  const page = ctx.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.pages.push(page);
  ctx.page = page;
  ctx.y = PAGE_HEIGHT - HEADER_HEIGHT - 30;
  drawHeaderBand(ctx);
}

// pdf-lib não quebra nem corta texto sozinho — um valor real mais longo que o
// esperado (nome de período/turma/disciplina concatenado) simplesmente
// desenha além da coluna até sair da página (bug real pego no teste ao vivo:
// "PERÍODO" com nome de período+termo longos vazou até a margem direita da
// folha). Trunca com reticências antes de desenhar sempre que o texto não
// couber na largura disponível.
function truncateToWidth(font: PDFFont, text: string, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const ellipsis = '…';
  let end = text.length;
  while (end > 0 && font.widthOfTextAtSize(text.slice(0, end) + ellipsis, size) > maxWidth) {
    end -= 1;
  }
  return text.slice(0, end).trimEnd() + ellipsis;
}

export function ensureSpace(ctx: ReportPdfContext, needed: number) {
  if (ctx.y - needed < MARGIN + FOOTER_RESERVED) {
    newPage(ctx);
  }
}

export function drawSectionLabel(ctx: ReportPdfContext, text: string) {
  ensureSpace(ctx, 24);
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 9, width: 4, height: 12, color: BRAND.gold });
  ctx.page.drawText(text.toUpperCase(), { x: MARGIN + 10, y: ctx.y - 8, size: 11.5, font: ctx.boldFont, color: BRAND.teal });
  ctx.y -= 24;
}

export function drawKeyValueRow(ctx: ReportPdfContext, pairs: Array<{ label: string; value: string }>) {
  ensureSpace(ctx, BODY_LINE_HEIGHT);
  const colWidth = CONTENT_WIDTH / pairs.length;
  const valueMaxWidth = colWidth - 12; // respiro antes da próxima coluna (ou da margem da página, na última)
  pairs.forEach((pair, index) => {
    const x = MARGIN + index * colWidth;
    ctx.page.drawText(pair.label, { x, y: ctx.y, size: BODY_FONT_SIZE, font: ctx.boldFont, color: BRAND.muted });
    const value = truncateToWidth(ctx.font, pair.value, 11, valueMaxWidth);
    ctx.page.drawText(value, { x, y: ctx.y - 13, size: 11, font: ctx.font, color: BRAND.ink });
  });
  ctx.y -= BODY_LINE_HEIGHT + 14;
}

export type CellContent =
  | { kind: 'text'; text: string; bold?: boolean; color?: Color }
  | { kind: 'pill'; text: string; fill: Color }
  | { kind: 'bar'; percent: number; label: string };

export interface TableColumn<T> {
  header: string;
  width: number; // pontos, deve somar CONTENT_WIDTH
  align?: 'left' | 'center' | 'right';
  cell: (row: T) => CellContent;
}

const TABLE_HEADER_HEIGHT = 22;
const TABLE_ROW_HEIGHT = 23;

function drawCell(page: PDFPage, ctx: ReportPdfContext, content: CellContent, x: number, y: number, width: number, align: 'left' | 'center' | 'right') {
  const rowMidY = y + TABLE_ROW_HEIGHT / 2;
  if (content.kind === 'text') {
    const font = content.bold ? ctx.boldFont : ctx.font;
    const color = content.color ?? BRAND.ink;
    const text = truncateToWidth(font, content.text, BODY_FONT_SIZE, width - 12);
    const textWidth = font.widthOfTextAtSize(text, BODY_FONT_SIZE);
    const textX = align === 'right' ? x + width - textWidth - 8 : align === 'center' ? x + (width - textWidth) / 2 : x + 8;
    page.drawText(text, { x: textX, y: rowMidY - BODY_FONT_SIZE / 2 + 1, size: BODY_FONT_SIZE, font, color });
  } else if (content.kind === 'pill') {
    // Largura da pílula segue o texto (+ padding), nunca o contrário — uma
    // pílula mais estreita que o texto faria o texto branco vazar pra fora
    // dela e ficar ilegível sobre o fundo claro da linha (bug real pego no
    // teste visual desta fatia: "Progressão Parcial" cortado numa coluna
    // estreita demais).
    const pillHeight = 15;
    const pillWidth = ctx.boldFont.widthOfTextAtSize(content.text, 8.5) + 18;
    const pillX = align === 'center' ? x + (width - pillWidth) / 2 : x + 8;
    const pillY = rowMidY - pillHeight / 2;
    drawStadium(page, pillX, pillY, pillWidth, pillHeight, content.fill);
    const textWidth = ctx.boldFont.widthOfTextAtSize(content.text, 8.5);
    page.drawText(content.text, {
      x: pillX + (pillWidth - textWidth) / 2,
      y: pillY + pillHeight / 2 - 3,
      size: 8.5,
      font: ctx.boldFont,
      color: BRAND.white,
    });
  } else {
    const barHeight = 7;
    const barWidth = Math.max(width - 52, 24);
    const barX = x + 8;
    const barY = rowMidY - barHeight / 2;
    const clampedPercent = Math.max(0, Math.min(100, content.percent));
    drawStadium(page, barX, barY, barWidth, barHeight, BRAND.track);
    if (clampedPercent > 0) {
      const fillColor = clampedPercent >= 75 ? BRAND.teal : clampedPercent >= 50 ? BRAND.gold : BRAND.coral;
      drawStadium(page, barX, barY, (barWidth * clampedPercent) / 100, barHeight, fillColor);
    }
    page.drawText(content.label, { x: barX + barWidth + 8, y: rowMidY - BODY_FONT_SIZE / 2 + 1, size: BODY_FONT_SIZE, font: ctx.boldFont, color: BRAND.ink });
  }
}

export function drawTable<T>(ctx: ReportPdfContext, options: { columns: TableColumn<T>[]; rows: T[]; emptyMessage?: string }) {
  const { columns, rows, emptyMessage } = options;

  const drawTableHeader = () => {
    ensureSpace(ctx, TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT);
    let x = MARGIN;
    const headerY = ctx.y - TABLE_HEADER_HEIGHT;
    ctx.page.drawRectangle({ x: MARGIN, y: headerY, width: CONTENT_WIDTH, height: TABLE_HEADER_HEIGHT, color: BRAND.teal });
    columns.forEach((col) => {
      ctx.page.drawText(col.header.toUpperCase(), {
        x: x + 8,
        y: headerY + TABLE_HEADER_HEIGHT / 2 - 3.5,
        size: 8,
        font: ctx.boldFont,
        color: BRAND.white,
      });
      x += col.width;
    });
    ctx.y -= TABLE_HEADER_HEIGHT;
  };

  drawTableHeader();

  if (rows.length === 0) {
    ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - TABLE_ROW_HEIGHT, width: CONTENT_WIDTH, height: TABLE_ROW_HEIGHT, color: BRAND.paperTint });
    ctx.page.drawText(emptyMessage ?? 'Nenhum dado disponível.', {
      x: MARGIN + 8,
      y: ctx.y - TABLE_ROW_HEIGHT / 2 - 3,
      size: BODY_FONT_SIZE,
      font: ctx.font,
      color: BRAND.muted,
    });
    ctx.y -= TABLE_ROW_HEIGHT;
    return;
  }

  rows.forEach((row, rowIndex) => {
    if (ctx.y - TABLE_ROW_HEIGHT < MARGIN + FOOTER_RESERVED) {
      newPage(ctx);
      drawTableHeader();
    }
    const rowY = ctx.y - TABLE_ROW_HEIGHT;
    if (rowIndex % 2 === 1) {
      ctx.page.drawRectangle({ x: MARGIN, y: rowY, width: CONTENT_WIDTH, height: TABLE_ROW_HEIGHT, color: BRAND.paperTint });
    }
    let x = MARGIN;
    columns.forEach((col) => {
      drawCell(ctx.page, ctx, col.cell(row), x, rowY, col.width, col.align ?? 'left');
      x += col.width;
    });
    ctx.y -= TABLE_ROW_HEIGHT;
  });
}

export function finalizeFooters(ctx: ReportPdfContext, note: string) {
  ctx.pages.forEach((page, index) => {
    const y = MARGIN - 22;
    page.drawLine({
      start: { x: MARGIN, y: y + 14 },
      end: { x: PAGE_WIDTH - MARGIN, y: y + 14 },
      thickness: 0.5,
      color: BRAND.muted,
    });
    page.drawText(note, { x: MARGIN, y, size: 7.5, font: ctx.font, color: BRAND.muted });
    const label = `Página ${index + 1} de ${ctx.pages.length}`;
    const width = ctx.font.widthOfTextAtSize(label, 8);
    page.drawText(label, { x: PAGE_WIDTH - MARGIN - width, y, size: 8, font: ctx.font, color: BRAND.muted });
  });
}
