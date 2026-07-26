import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';

/** Her raporun 1. sayfasının üst-ortasına basılacak zorunlu kurum başlığı. */
export const INSTITUTION_HEADER =
  'DENİZLİ ÇINAR GÖZLEM ÖZEL EĞİTİM ve REHABİLİTASYON MERKEZİ';

export interface ReportColumn {
  header: string;
  /** row nesnesindeki alan adı. */
  key: string;
  /** Sabit genişlik (pt). Verilmezse eşit dağıtılır. */
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export interface ReportOptions {
  /** Rapor başlığı (kurum başlığının altında). */
  title: string;
  subtitle?: string;
  /** Uygulanan filtreler (tarih, kişi, araç, öğrenci vb.) — başlığın altına yazılır. */
  filters?: Record<string, string | number | undefined>;
  columns: ReportColumn[];
  rows: Array<Record<string, unknown>>;
  /** İsteğe bağlı toplam satırı (ör: { Tutar: '12.500,00 ₺' }). */
  totals?: Record<string, string>;
}

const PAGE_MARGIN = 40;
const ROW_HEIGHT = 20;
const HEADER_FILL = '#1f4e5f';
const HEADER_TEXT = '#ffffff';
const ZEBRA_FILL = '#f2f6f7';

/**
 * Merkezi PDF rapor üreticisi. Tüm modüller bu servisi kullanır; böylece
 * kurum başlığı kuralı ve tablo/altbilgi biçimi tek yerden garanti edilir.
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly fontRegular: string;
  private readonly fontBold: string;

  constructor() {
    // Türkçe glifler (ğ, ş, İ, ı ...) standart Helvetica'da yoktur; varsa
    // Unicode TTF gömülür, yoksa Helvetica'ya düşülür.
    const dir = process.env.FONT_DIR ?? join(process.cwd(), 'assets', 'fonts');
    const regular = join(dir, 'DejaVuSans.ttf');
    const bold = join(dir, 'DejaVuSans-Bold.ttf');
    if (existsSync(regular) && existsSync(bold)) {
      this.fontRegular = regular;
      this.fontBold = bold;
    } else {
      this.logger.warn(
        `Unicode font bulunamadı (${dir}). Helvetica kullanılıyor — Türkçe karakterler eksik görünebilir.`,
      );
      this.fontRegular = 'Helvetica';
      this.fontBold = 'Helvetica-Bold';
    }
  }

  /** Raporu PDF Buffer olarak üretir. */
  buildReport(options: ReportOptions): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE_MARGIN,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );

    this.renderInstitutionHeader(doc); // ← yalnızca 1. sayfa, üst-orta
    this.renderTitleBlock(doc, options);
    this.renderTable(doc, options);
    this.renderFooters(doc);

    doc.end();
    return done;
  }

  // --- Kurum başlığı (ZORUNLU, sadece 1. sayfa üst-orta) -----------------
  private renderInstitutionHeader(doc: PDFKit.PDFDocument): void {
    doc
      .font(this.fontBold)
      .fontSize(13)
      .fillColor('#000000')
      .text(INSTITUTION_HEADER, PAGE_MARGIN, PAGE_MARGIN, {
        align: 'center',
        width: this.contentWidth(doc),
      });
    // Başlık altı ayraç çizgisi
    const y = doc.y + 6;
    doc
      .moveTo(PAGE_MARGIN, y)
      .lineTo(doc.page.width - PAGE_MARGIN, y)
      .strokeColor(HEADER_FILL)
      .lineWidth(1.2)
      .stroke();
    doc.moveDown(1);
  }

  private renderTitleBlock(doc: PDFKit.PDFDocument, o: ReportOptions): void {
    doc
      .font(this.fontBold)
      .fontSize(15)
      .fillColor('#000000')
      .text(o.title, { align: 'center', width: this.contentWidth(doc) });

    if (o.subtitle) {
      doc
        .font(this.fontRegular)
        .fontSize(10)
        .fillColor('#555555')
        .text(o.subtitle, { align: 'center', width: this.contentWidth(doc) });
    }

    if (o.filters && Object.keys(o.filters).length) {
      const parts = Object.entries(o.filters)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k}: ${v}`);
      if (parts.length) {
        doc
          .font(this.fontRegular)
          .fontSize(9)
          .fillColor('#333333')
          .text(parts.join('   |   '), {
            align: 'center',
            width: this.contentWidth(doc),
          });
      }
    }
    doc.moveDown(0.8);
  }

  // --- Tablo (sayfalama + başlık tekrarı) --------------------------------
  private renderTable(doc: PDFKit.PDFDocument, o: ReportOptions): void {
    const widths = this.resolveColumnWidths(doc, o.columns);
    let y = doc.y;

    const drawHeaderRow = (): void => {
      doc.rect(PAGE_MARGIN, y, this.contentWidth(doc), ROW_HEIGHT).fill(HEADER_FILL);
      let x = PAGE_MARGIN;
      o.columns.forEach((col, i) => {
        doc
          .font(this.fontBold)
          .fontSize(9)
          .fillColor(HEADER_TEXT)
          .text(col.header, x + 4, y + 6, {
            width: widths[i] - 8,
            align: col.align ?? 'left',
            lineBreak: false,
            ellipsis: true,
          });
        x += widths[i];
      });
      y += ROW_HEIGHT;
    };

    const ensureSpace = (): void => {
      if (y + ROW_HEIGHT > doc.page.height - PAGE_MARGIN - 20) {
        doc.addPage(); // kurum başlığı TEKRAR edilmez, sadece kolon başlığı
        y = PAGE_MARGIN;
        drawHeaderRow();
      }
    };

    drawHeaderRow();

    if (!o.rows.length) {
      doc
        .font(this.fontRegular)
        .fontSize(10)
        .fillColor('#777777')
        .text('Kayıt bulunamadı.', PAGE_MARGIN, y + 8, {
          width: this.contentWidth(doc),
          align: 'center',
        });
      doc.y = y + ROW_HEIGHT;
      return;
    }

    o.rows.forEach((row, idx) => {
      ensureSpace();
      if (idx % 2 === 1) {
        doc.rect(PAGE_MARGIN, y, this.contentWidth(doc), ROW_HEIGHT).fill(ZEBRA_FILL);
      }
      let x = PAGE_MARGIN;
      o.columns.forEach((col, i) => {
        const value = row[col.key];
        doc
          .font(this.fontRegular)
          .fontSize(9)
          .fillColor('#000000')
          .text(value === null || value === undefined ? '' : String(value), x + 4, y + 6, {
            width: widths[i] - 8,
            align: col.align ?? 'left',
            lineBreak: false,
            ellipsis: true,
          });
        x += widths[i];
      });
      y += ROW_HEIGHT;
    });

    // Toplam satırı
    if (o.totals) {
      ensureSpace();
      doc.rect(PAGE_MARGIN, y, this.contentWidth(doc), ROW_HEIGHT).fill('#dbe7ea');
      let x = PAGE_MARGIN;
      o.columns.forEach((col, i) => {
        const totalVal = o.totals?.[col.key];
        doc
          .font(this.fontBold)
          .fontSize(9)
          .fillColor('#000000')
          .text(i === 0 && totalVal === undefined ? 'TOPLAM' : totalVal ?? '', x + 4, y + 6, {
            width: widths[i] - 8,
            align: col.align ?? 'left',
            lineBreak: false,
            ellipsis: true,
          });
        x += widths[i];
      });
      y += ROW_HEIGHT;
    }
    doc.y = y;
  }

  // --- Altbilgi: her sayfada tarih + sayfa no ----------------------------
  private renderFooters(doc: PDFKit.PDFDocument): void {
    const range = doc.bufferedPageRange();
    const generated = new Date().toLocaleString('tr-TR');
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const y = doc.page.height - PAGE_MARGIN + 8;
      doc
        .font(this.fontRegular)
        .fontSize(8)
        .fillColor('#888888')
        .text(
          `Oluşturma: ${generated}`,
          PAGE_MARGIN,
          y,
          { align: 'left', width: this.contentWidth(doc) / 2, lineBreak: false },
        )
        .text(
          `Sayfa ${i + 1} / ${range.count}`,
          PAGE_MARGIN + this.contentWidth(doc) / 2,
          y,
          { align: 'right', width: this.contentWidth(doc) / 2, lineBreak: false },
        );
    }
  }

  // --- Yardımcılar -------------------------------------------------------
  private contentWidth(doc: PDFKit.PDFDocument): number {
    return doc.page.width - PAGE_MARGIN * 2;
  }

  private resolveColumnWidths(
    doc: PDFKit.PDFDocument,
    columns: ReportColumn[],
  ): number[] {
    const total = this.contentWidth(doc);
    const fixed = columns.reduce((s, c) => s + (c.width ?? 0), 0);
    const autoCols = columns.filter((c) => !c.width).length;
    const autoWidth = autoCols ? (total - fixed) / autoCols : 0;
    return columns.map((c) => c.width ?? autoWidth);
  }
}
