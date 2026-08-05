import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from 'pdf-lib';

interface GenerateContractPdfInput {
  contractText: string;
  signerName: string;
  signedAt: string; // ISO, vindo do signed_at retornado pelo Postgres
  contractHash: string;
  organizationName: string;
  logoBytes?: Uint8Array | null;
}

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const BODY_FONT_SIZE = 11.5;
const BODY_LINE_HEIGHT = BODY_FONT_SIZE + 6.5;
const SECTION_FONT_SIZE = 13.5;
const PARAGRAPH_GAP = 10;
const HEADER_HEIGHT = 92;
const FOOTER_HEIGHT = 30;
const RULE_COLOR = rgb(0.2, 0.24, 0.3);
const ACCENT_COLOR = rgb(0.11, 0.4, 0.36); // mesma família teal do app, discreta no papel
const TEXT_COLOR = rgb(0.08, 0.08, 0.1);
const MUTED_COLOR = rgb(0.45, 0.47, 0.5);

const SECTION_HEADER_PATTERN = /^\d+\.\s/;
const SUB_ITEM_PATTERN = /^(\d+\.\d+\.)\s(.*)$/;
const LABEL_LINE_PATTERN = /^([A-ZÀ-Ü0-9()º° ]+:)\s?(.*)$/;

interface Block {
  kind: 'section' | 'label' | 'paragraph' | 'blank';
  text: string;
}

// Divide o texto em blocos lógicos (linha em branco separa blocos). Cada bloco
// não-vazio é uma unidade de layout própria: título de seção (negrito, maior),
// linha "LABEL: valor" do cabeçalho (label em negrito), ou parágrafo corrido
// (justificado, com destaque no número de item quando for um sub-item tipo "2.1.").
function splitIntoBlocks(text: string): Block[] {
  return text.split('\n').map((line): Block => {
    if (line.trim() === '') return { kind: 'blank', text: '' };
    if (SECTION_HEADER_PATTERN.test(line)) return { kind: 'section', text: line };
    if (LABEL_LINE_PATTERN.test(line)) return { kind: 'label', text: line };
    return { kind: 'paragraph', text: line };
  });
}

function detectImageKind(bytes: Uint8Array): 'png' | 'jpeg' | null {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  return null;
}

function drawHeader(page: PDFPage, font: PDFFont, boldFont: PDFFont, organizationName: string, logo: PDFImage | null) {
  const top = PAGE_HEIGHT - MARGIN;
  let textX = MARGIN;

  if (logo) {
    const maxLogoWidth = 100;
    const maxLogoHeight = 52;
    const ratio = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height, 1);
    const width = logo.width * ratio;
    const height = logo.height * ratio;
    page.drawImage(logo, { x: MARGIN, y: top - height, width, height });
    textX = MARGIN + width + 16;
  }

  page.drawText('CONTRATO DE MATRÍCULA', { x: textX, y: top - 20, size: 17, font: boldFont, color: TEXT_COLOR });
  page.drawText(organizationName, { x: textX, y: top - 39, size: 10, font, color: MUTED_COLOR });

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

// Quebra uma sequência de palavras em linhas que cabem em maxWidth, mantendo
// a lista de palavras de cada linha (não o texto já concatenado) — precisamos
// das palavras separadas pra poder justificar depois.
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

// Desenha uma linha justificada distribuindo o espaço sobrando entre as
// palavras. Linhas de uma palavra só, ou a expansão exigida ficaria absurda
// (linha muito curta), caem para alinhamento à esquerda normal.
function drawJustifiedLine(
  page: PDFPage,
  words: string[],
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  color = TEXT_COLOR
) {
  if (words.length <= 1) {
    page.drawText(words.join(' '), { x, y, size: fontSize, font, color });
    return;
  }
  const wordsWidth = words.reduce((sum, w) => sum + font.widthOfTextAtSize(w, fontSize), 0);
  const spaceCount = words.length - 1;
  const naturalSpaceWidth = font.widthOfTextAtSize(' ', fontSize);
  const extra = maxWidth - wordsWidth - naturalSpaceWidth * spaceCount;
  // Trava em [0.6x, 2.2x] o espaço natural: acima disso a linha fica com buracos
  // visuais grandes demais; abaixo disso (inclusive negativo, se wrapWords
  // permitiu uma linha no limite da largura por arredondamento) as palavras se
  // sobrepõem e o texto vira uma mancha ilegível — foi exatamente esse o bug
  // visto no teste (parecia um "risco"/tachado sobre uma linha inteira).
  const spaceWidth = Math.min(Math.max(naturalSpaceWidth + extra / spaceCount, naturalSpaceWidth * 0.6), naturalSpaceWidth * 2.2);

  let cx = x;
  for (let i = 0; i < words.length; i++) {
    page.drawText(words[i], { x: cx, y, size: fontSize, font, color });
    cx += font.widthOfTextAtSize(words[i], fontSize) + spaceWidth;
  }
}

function drawLeftLine(page: PDFPage, words: string[], x: number, y: number, font: PDFFont, fontSize: number, color = TEXT_COLOR) {
  page.drawText(words.join(' '), { x, y, size: fontSize, font, color });
}

export async function generateEnrollmentContractPdf({
  contractText,
  signerName,
  signedAt,
  contractHash,
  organizationName,
  logoBytes,
}: GenerateContractPdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const maxWidth = PAGE_WIDTH - MARGIN * 2;

  let logo: PDFImage | null = null;
  if (logoBytes && logoBytes.length > 0) {
    const kind = detectImageKind(logoBytes);
    try {
      if (kind === 'png') logo = await pdfDoc.embedPng(logoBytes);
      else if (kind === 'jpeg') logo = await pdfDoc.embedJpg(logoBytes);
    } catch {
      logo = null; // logo é só decoração — nunca deve derrubar a geração do contrato
    }
  }

  const pages: PDFPage[] = [];
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(page);
  drawHeader(page, font, boldFont, organizationName, logo);
  // Precisa subtrair MARGIN aqui: a régua de destaque do cabeçalho (drawHeader)
  // é posicionada a partir de `top = PAGE_HEIGHT - MARGIN`, então o texto do
  // corpo também precisa partir dali — sem o MARGIN, a 1ª linha nasce ~56pt
  // acima do esperado e a régua passa a cortar a 2ª linha do parágrafo (bug
  // visto em teste: parecia um "risco"/tachado sobre a linha).
  let y = PAGE_HEIGHT - MARGIN - HEADER_HEIGHT - 22;

  const newPageIfNeeded = (extra = 0) => {
    if (y - extra < MARGIN + FOOTER_HEIGHT) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pages.push(page);
      drawHeader(page, font, boldFont, organizationName, logo);
      y = PAGE_HEIGHT - MARGIN - HEADER_HEIGHT - 22;
    }
  };

  const blocks = splitIntoBlocks(contractText);

  for (const block of blocks) {
    if (block.kind === 'blank') {
      y -= PARAGRAPH_GAP;
      continue;
    }

    if (block.kind === 'section') {
      newPageIfNeeded(SECTION_FONT_SIZE + 8);
      page.drawText(block.text, { x: MARGIN, y, size: SECTION_FONT_SIZE, font: boldFont, color: ACCENT_COLOR });
      y -= SECTION_FONT_SIZE + 8;
      continue;
    }

    if (block.kind === 'label') {
      const match = block.text.match(LABEL_LINE_PATTERN)!;
      const [, label, value] = match;
      newPageIfNeeded(BODY_LINE_HEIGHT);
      page.drawText(label, { x: MARGIN, y, size: BODY_FONT_SIZE, font: boldFont, color: TEXT_COLOR });
      const labelWidth = boldFont.widthOfTextAtSize(`${label} `, BODY_FONT_SIZE);
      if (value) {
        page.drawText(value, { x: MARGIN + labelWidth, y, size: BODY_FONT_SIZE, font, color: TEXT_COLOR });
      }
      y -= BODY_LINE_HEIGHT;
      continue;
    }

    // Parágrafo corrido — se for um sub-item numerado ("2.1. Texto..."),
    // destaca o número em negrito e justifica o restante ao lado.
    const subItemMatch = block.text.match(SUB_ITEM_PATTERN);
    const prefix = subItemMatch ? subItemMatch[1] : null;
    const restText = subItemMatch ? subItemMatch[2] : block.text;
    const prefixWidth = prefix ? boldFont.widthOfTextAtSize(`${prefix} `, BODY_FONT_SIZE) : 0;

    const words = restText.split(' ').filter(Boolean);
    const firstLineWidth = maxWidth - prefixWidth;
    const wrapped = wrapWords(words, font, BODY_FONT_SIZE, firstLineWidth);
    // Linhas após a primeira não têm o recuo do prefixo — rewrap na largura cheia
    // pra não desperdiçar espaço (o prefixo só ocupa a primeira linha).
    const remainingWords = wrapped.slice(1).flat();
    const restWrapped = remainingWords.length > 0 ? wrapWords(remainingWords, font, BODY_FONT_SIZE, maxWidth) : [];
    const allLines = [wrapped[0] ?? [], ...restWrapped];

    allLines.forEach((lineWords, index) => {
      newPageIfNeeded(BODY_LINE_HEIGHT);
      const isFirstLine = index === 0;
      const isLastLine = index === allLines.length - 1;
      const x = MARGIN + (isFirstLine ? prefixWidth : 0);
      const width = maxWidth - (isFirstLine ? prefixWidth : 0);

      if (isFirstLine && prefix) {
        page.drawText(prefix, { x: MARGIN, y, size: BODY_FONT_SIZE, font: boldFont, color: TEXT_COLOR });
      }

      if (isLastLine) {
        drawLeftLine(page, lineWords, x, y, font, BODY_FONT_SIZE);
      } else {
        drawJustifiedLine(page, lineWords, x, y, font, BODY_FONT_SIZE, width);
      }
      y -= BODY_LINE_HEIGHT;
    });
  }

  newPageIfNeeded(80);
  y -= 14;
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
  const signedAtLabel = boldFont.widthOfTextAtSize('Assinado em (registrado pelo servidor): ', BODY_FONT_SIZE);
  page.drawText(new Date(signedAt).toLocaleString('pt-BR'), {
    x: MARGIN + signedAtLabel,
    y,
    size: BODY_FONT_SIZE,
    font,
    color: TEXT_COLOR,
  });
  y -= BODY_LINE_HEIGHT;
  page.drawText(`Hash SHA-256 do texto do contrato: ${contractHash}`, { x: MARGIN, y, size: 8, font, color: MUTED_COLOR });

  pages.forEach((p, index) => drawFooter(p, font, index + 1, pages.length));

  return pdfDoc.save();
}
