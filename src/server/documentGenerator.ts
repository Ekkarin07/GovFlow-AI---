/**
 * GovFlow AI - Official Thai Document Generator
 * Faithfully matches the official Thai government "บันทึกข้อความ" (Internal Memo)
 * and "หนังสือภายนอก" (External Letter) standards (ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ)
 * with exact margins, Garuda sizes/placement, and genuine TH Sarabun New typography.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { jsPDF } from 'jspdf';
import { applyNumeralStyle, formatOfficialThaiDate } from '../lib/dateUtils';
import { DocumentFormData, DocumentType, OfficialTemplate } from '../lib/types';

const execFileAsync = promisify(execFile);

const MM_TO_TWIPS = 56.6929;
const MM_TO_PX_96DPI = 3.7795;

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

const NO_CELL_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

function resolveProfile(
  type: DocumentType,
  formatProfile?: OfficialTemplate['formatProfile']
) {
  const marginTop = formatProfile?.marginsMm?.top ?? 15;
  const marginRight = formatProfile?.marginsMm?.right ?? 20;
  const marginBottom = formatProfile?.marginsMm?.bottom ?? 20;
  const marginLeft = formatProfile?.marginsMm?.left ?? 30;
  const garudaPosition =
    formatProfile?.garudaPosition ?? (type === 'INTERNAL_MEMO' ? 'LEFT' : 'CENTER');
  const garudaHeightMm =
    formatProfile?.garudaHeightMm ??
    (type === 'EXTERNAL_LETTER' ? 30 : type === 'INTERNAL_MEMO' ? 15 : 20);
  const garudaWidthMm = Number((garudaHeightMm * 0.9).toFixed(1));
  const bodyFont = formatProfile?.bodyFont || 'TH Sarabun New';
  const bodyFontSizePt = formatProfile?.bodyFontSizePt || 16;

  return {
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    garudaPosition,
    garudaHeightMm,
    garudaWidthMm,
    bodyFont,
    bodyFontSizePt,
  };
}

function loadGarudaBuffer(): Buffer | null {
  const candidates = [
    path.join(process.cwd(), 'public', 'assets', 'garuda.png'),
    path.resolve('public/assets/garuda.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p);
    }
  }
  return null;
}

function loadSarabunFontFaceCss(): string {
  const fontsDir = path.join(process.cwd(), 'public', 'assets', 'fonts');
  const ttfSpecs = [
    { file: 'THSarabunNew.ttf', weight: 400, style: 'normal' },
    { file: 'THSarabunNew-Bold.ttf', weight: 700, style: 'normal' },
    { file: 'THSarabunNew-Italic.ttf', weight: 400, style: 'italic' },
    { file: 'THSarabunNew-BoldItalic.ttf', weight: 700, style: 'italic' },
  ];

  const rules: string[] = [];
  for (const s of ttfSpecs) {
    const fullPath = path.join(fontsDir, s.file);
    if (fs.existsSync(fullPath)) {
      const b64 = fs.readFileSync(fullPath).toString('base64');
      rules.push(`
@font-face {
  font-family: 'TH Sarabun New';
  font-style: ${s.style};
  font-weight: ${s.weight};
  src: url('data:font/ttf;base64,${b64}') format('truetype');
}`);
    }
  }

  if (rules.length > 0) {
    return rules.join('\n');
  }

  // Fallback to @fontsource/sarabun only if local THSarabunNew TTF files are absent
  const filesDir = path.join(process.cwd(), 'node_modules', '@fontsource', 'sarabun', 'files');
  const woffSpecs = [
    { file: 'sarabun-thai-400-normal.woff2', weight: 400, range: 'U+02D7,U+0303,U+0331,U+0E01-0E5B,U+200C-200D,U+25CC' },
    { file: 'sarabun-latin-400-normal.woff2', weight: 400, range: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' },
    { file: 'sarabun-thai-700-normal.woff2', weight: 700, range: 'U+02D7,U+0303,U+0331,U+0E01-0E5B,U+200C-200D,U+25CC' },
    { file: 'sarabun-latin-700-normal.woff2', weight: 700, range: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' },
  ];

  for (const s of woffSpecs) {
    const fullPath = path.join(filesDir, s.file);
    if (fs.existsSync(fullPath)) {
      const b64 = fs.readFileSync(fullPath).toString('base64');
      rules.push(`
@font-face {
  font-family: 'TH Sarabun New';
  font-style: normal;
  font-weight: ${s.weight};
  src: url('data:font/woff2;base64,${b64}') format('woff2');
  unicode-range: ${s.range};
}`);
    }
  }
  return rules.join('\n');
}

function loadThaiFontBase64(weight: 'regular' | 'bold'): string | null {
  const sarabunFile = weight === 'bold' ? 'THSarabunNew-Bold.ttf' : 'THSarabunNew.ttf';
  const notoFile =
    weight === 'bold' ? 'NotoLoopedThai-Bold.ttf' : 'NotoLoopedThai-Regular.ttf';
  const candidates = [
    path.join(process.cwd(), 'public', 'assets', 'fonts', sarabunFile),
    path.join('/usr/share/fonts/truetype/noto', notoFile),
    path.join(
      '/usr/share/fonts/truetype/noto',
      weight === 'bold' ? 'NotoSansThai-Bold.ttf' : 'NotoSansThai-Regular.ttf'
    ),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p).toString('base64');
    }
  }
  return null;
}

export async function generateOfficialDocx(
  type: DocumentType,
  data: DocumentFormData,
  orgName: string,
  formatProfile?: OfficialTemplate['formatProfile']
): Promise<Buffer> {
  const profile = resolveProfile(type, formatProfile);
  const children: (Paragraph | Table)[] = [];
  const fmt = (val?: string | number | null) => applyNumeralStyle(val, data.numeralStyle);
  const dateTh = formatOfficialThaiDate(data.documentDate, data.numeralStyle);
  const garudaBuffer = loadGarudaBuffer();

  const garudaWidthPx = Math.round(profile.garudaWidthMm * MM_TO_PX_96DPI);
  const garudaHeightPx = Math.round(profile.garudaHeightMm * MM_TO_PX_96DPI);
  const bodySizeHalfPt = profile.bodyFontSizePt * 2; // 16pt = 32
  const fontFamily = profile.bodyFont || 'TH Sarabun New';

  const bodyParagraphs = [
    data.backgroundParagraph,
    data.factsParagraph,
    data.proposalParagraph,
    data.objectiveParagraph,
    ...(data.customParagraphs || []),
  ]
    .filter((p): p is string => Boolean(p && p.trim()))
    .map((p) => fmt(p));

  if (data.confidentiality) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 40 },
        children: [
          new TextRun({ text: data.confidentiality, bold: true, size: bodySizeHalfPt, font: fontFamily }),
        ],
      })
    );
  }

  if (type === 'EXTERNAL_LETTER') {
    // ==================== หนังสือภายนอก (EXTERNAL_LETTER - PDF Pages 5, 6, 10, 11) ====================
    // 1. Centered Garuda (or Left if explicitly configured) + Urgency beside it
    if (profile.garudaPosition === 'CENTER') {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: NO_BORDERS,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 34, type: WidthType.PERCENTAGE },
                  borders: NO_CELL_BORDERS,
                  verticalAlign: VerticalAlign.BOTTOM,
                  children: [
                    new Paragraph({
                      spacing: { before: 0, after: 0 },
                      children:
                        data.urgency && data.urgency !== 'ปกติ'
                          ? [
                              new TextRun({
                                text: data.urgency,
                                bold: true,
                                size: 40, // 20pt bold
                                color: 'DC2626',
                                font: fontFamily,
                              }),
                            ]
                          : [],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 32, type: WidthType.PERCENTAGE },
                  borders: NO_CELL_BORDERS,
                  verticalAlign: VerticalAlign.TOP,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 0, after: 0 },
                      children: garudaBuffer
                        ? [
                            new ImageRun({
                              data: garudaBuffer,
                              type: 'png',
                              transformation: { width: garudaWidthPx, height: garudaHeightPx },
                            }),
                          ]
                        : [],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 34, type: WidthType.PERCENTAGE },
                  borders: NO_CELL_BORDERS,
                  children: [new Paragraph({ children: [] })],
                }),
              ],
            }),
          ],
        })
      );
    } else {
      if (garudaBuffer) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 0, after: 60 },
            children: [
              new ImageRun({
                data: garudaBuffer,
                type: 'png',
                transformation: { width: garudaWidthPx, height: garudaHeightPx },
              }),
            ],
          })
        );
      }
      if (data.urgency && data.urgency !== 'ปกติ') {
        children.push(
          new Paragraph({
            spacing: { before: 20, after: 40 },
            children: [
              new TextRun({
                text: data.urgency,
                bold: true,
                size: 40,
                color: 'DC2626',
                font: fontFamily,
              }),
            ],
          })
        );
      }
    }

    // 2. Two-Column Header: Left "ที่ ..." | Right "ส่วนราชการเจ้าของหนังสือ + ที่ตั้ง"
    const addressLines = (data.senderAddress || '')
      .split('\n')
      .map((l) => fmt(l.trim()))
      .filter(Boolean);

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 56, type: WidthType.PERCENTAGE },
                borders: NO_CELL_BORDERS,
                children: [
                  new Paragraph({
                    spacing: { before: 60, after: 20 },
                    children: [
                      new TextRun({
                        text: `ที่  ${fmt(data.officialReferenceNo)}`,
                        size: bodySizeHalfPt,
                        font: fontFamily,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 44, type: WidthType.PERCENTAGE },
                borders: NO_CELL_BORDERS,
                children: [
                  new Paragraph({
                    spacing: { before: 60, after: 0 },
                    children: [
                      new TextRun({
                        text: fmt(data.agency || orgName),
                        size: bodySizeHalfPt,
                        font: fontFamily,
                      }),
                    ],
                  }),
                  ...addressLines.map(
                    (line) =>
                      new Paragraph({
                        spacing: { before: 0, after: 0 },
                        children: [new TextRun({ text: line, size: bodySizeHalfPt, font: fontFamily })],
                      })
                  ),
                ],
              }),
            ],
          }),
        ],
      })
    );

    // 3. Date Row (NO "วันที่" label, starts around ~45% from left margin)
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 45, type: WidthType.PERCENTAGE },
                borders: NO_CELL_BORDERS,
                children: [new Paragraph({ children: [] })],
              }),
              new TableCell({
                width: { size: 55, type: WidthType.PERCENTAGE },
                borders: NO_CELL_BORDERS,
                children: [
                  new Paragraph({
                    spacing: { before: 120, after: 120 },
                    children: [
                      new TextRun({
                        text: dateTh !== '-' ? dateTh : '',
                        size: bodySizeHalfPt,
                        font: fontFamily,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    // 4. เรื่อง / คำขึ้นต้น / อ้างถึง / สิ่งที่ส่งมาด้วย (16pt regular)
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({ text: `เรื่อง  ${fmt(data.subject)}`, size: bodySizeHalfPt, font: fontFamily }),
        ],
      })
    );

    children.push(
      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({
            text: `${data.salutation || 'เรียน'}  ${fmt(data.recipient)}`,
            size: bodySizeHalfPt,
            font: fontFamily,
          }),
        ],
      })
    );

    if (data.references && data.references.length > 0) {
      data.references.forEach((ref, idx) => {
        children.push(
          new Paragraph({
            spacing: { before: 20, after: 40 },
            children: [
              new TextRun({
                text: `${idx === 0 ? 'อ้างถึง  ' : '          '}${fmt(ref.bookType)} ที่ ${fmt(ref.bookNo)} ลงวันที่ ${formatOfficialThaiDate(ref.bookDate, data.numeralStyle)}`,
                size: bodySizeHalfPt,
                font: fontFamily,
              }),
            ],
          })
        );
      });
    }

    if (data.enclosures && data.enclosures.length > 0) {
      data.enclosures.forEach((enc, idx) => {
        children.push(
          new Paragraph({
            spacing: { before: 20, after: 60 },
            children: [
              new TextRun({
                text: `${idx === 0 ? 'สิ่งที่ส่งมาด้วย  ' : '                 '}${fmt(enc.title)}   จำนวน ${fmt(enc.quantity)} ${fmt(enc.unit)}`,
                size: bodySizeHalfPt,
                font: fontFamily,
              }),
            ],
          })
        );
      });
    }

    // 5. Body Paragraphs with 2.5cm indent
    bodyParagraphs.forEach((text, i) => {
      const isLast = i === bodyParagraphs.length - 1;
      children.push(
        new Paragraph({
          spacing: { before: 120, after: isLast ? 140 : 80 },
          indent: { firstLine: 1417 },
          children: [new TextRun({ text, size: bodySizeHalfPt, font: fontFamily })],
        })
      );
    });

    // 6. Valediction + Signature (Right side, NO "ตำแหน่ง" prefix per Page 5-6)
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 44, type: WidthType.PERCENTAGE },
                borders: NO_CELL_BORDERS,
                children: [new Paragraph({ children: [] })],
              }),
              new TableCell({
                width: { size: 56, type: WidthType.PERCENTAGE },
                borders: NO_CELL_BORDERS,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 240, after: 360 },
                    children: [
                      new TextRun({
                        text: data.valediction || 'ขอแสดงความนับถือ',
                        size: bodySizeHalfPt,
                        font: fontFamily,
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 120, after: 20 },
                    children: [
                      new TextRun({
                        text: `( ${fmt(data.signerName) || '...........................................'} )`,
                        size: bodySizeHalfPt,
                        font: fontFamily,
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 200 },
                    children: [
                      new TextRun({
                        text: fmt(data.signerPosition) || '...........................................',
                        size: bodySizeHalfPt,
                        font: fontFamily,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    // 7. Bottom-Left Owning Agency Contact Block
    if (
      data.contactDepartment ||
      data.contactPhone ||
      data.contactFax ||
      data.contactEmail ||
      data.coordinatorPhone ||
      data.coordinatorName
    ) {
      if (data.contactDepartment || data.agency) {
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 0 },
            children: [
              new TextRun({
                text: fmt(data.contactDepartment || data.agency),
                size: bodySizeHalfPt,
                font: fontFamily,
              }),
            ],
          })
        );
      }
      if (data.contactPhone || data.coordinatorPhone) {
        children.push(
          new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [
              new TextRun({
                text: `โทร. ${fmt(data.contactPhone || data.coordinatorPhone)}`,
                size: bodySizeHalfPt,
                font: fontFamily,
              }),
            ],
          })
        );
      }
      if (data.contactFax) {
        children.push(
          new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [
              new TextRun({
                text: `โทรสาร ${fmt(data.contactFax)}`,
                size: bodySizeHalfPt,
                font: fontFamily,
              }),
            ],
          })
        );
      }
      if (data.contactEmail) {
        children.push(
          new Paragraph({
            spacing: { before: 0, after: 40 },
            children: [
              new TextRun({
                text: `ไปรษณีย์อิเล็กทรอนิกส์ ${data.contactEmail}`,
                size: bodySizeHalfPt,
                font: fontFamily,
              }),
            ],
          })
        );
      }
    }
  } else {
    // ==================== บันทึกข้อความ / รายงาน (INTERNAL_MEMO / COMPLETION_REPORT - PDF Pages 14, 15) ====================
    const isMemo = type === 'INTERNAL_MEMO';
    const headerLabelSizeHalfPt = 40; // 20pt Bold ONLY for ส่วนราชการ / ที่ / วันที่ / เรื่อง

    if (profile.garudaPosition === 'LEFT') {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: NO_BORDERS,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  borders: NO_CELL_BORDERS,
                  verticalAlign: VerticalAlign.TOP,
                  children: [
                    new Paragraph({
                      spacing: { before: 0, after: 0 },
                      children: garudaBuffer
                        ? [
                            new ImageRun({
                              data: garudaBuffer,
                              type: 'png',
                              transformation: { width: garudaWidthPx, height: garudaHeightPx },
                            }),
                          ]
                        : [],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 60, type: WidthType.PERCENTAGE },
                  borders: NO_CELL_BORDERS,
                  verticalAlign: VerticalAlign.BOTTOM,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 80, after: 40 },
                      children: [
                        new TextRun({
                          text: isMemo ? 'บันทึกข้อความ' : 'รายงานสรุปผลการปฏิบัติงาน',
                          bold: true,
                          size: isMemo ? 58 : 48, // 29pt Bold for memo, 24pt Bold for report
                          font: fontFamily,
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  borders: NO_CELL_BORDERS,
                  children: [new Paragraph({ children: [] })],
                }),
              ],
            }),
          ],
        })
      );
    } else {
      if (garudaBuffer) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 60 },
            children: [
              new ImageRun({
                data: garudaBuffer,
                type: 'png',
                transformation: { width: garudaWidthPx, height: garudaHeightPx },
              }),
            ],
          })
        );
      }
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 20, after: 80 },
          children: [
            new TextRun({
              text: isMemo ? 'บันทึกข้อความ' : 'รายงานสรุปผลการปฏิบัติงาน',
              bold: true,
              size: isMemo ? 58 : 48,
              font: fontFamily,
            }),
          ],
        })
      );
    }

    if (data.urgency && data.urgency !== 'ปกติ') {
      children.push(
        new Paragraph({
          spacing: { before: 20, after: 40 },
          children: [
            new TextRun({
              text: data.urgency,
              bold: true,
              size: 40,
              color: 'DC2626',
              font: fontFamily,
            }), // 20pt Bold Red
          ],
        })
      );
    }

    // ส่วนราชการ (20pt Bold label + 16pt value)
    children.push(
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({ text: 'ส่วนราชการ  ', bold: true, size: headerLabelSizeHalfPt, font: fontFamily }),
          new TextRun({ text: fmt(data.agency || orgName), size: bodySizeHalfPt, font: fontFamily }),
        ],
      })
    );

    // ที่ and วันที่ (20pt Bold labels + 16pt values)
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 52, type: WidthType.PERCENTAGE },
                borders: NO_CELL_BORDERS,
                children: [
                  new Paragraph({
                    spacing: { before: 20, after: 40 },
                    children: [
                      new TextRun({ text: 'ที่  ', bold: true, size: headerLabelSizeHalfPt, font: fontFamily }),
                      new TextRun({ text: fmt(data.officialReferenceNo), size: bodySizeHalfPt, font: fontFamily }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 48, type: WidthType.PERCENTAGE },
                borders: NO_CELL_BORDERS,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { before: 20, after: 40 },
                    children: [
                      new TextRun({ text: 'วันที่  ', bold: true, size: headerLabelSizeHalfPt, font: fontFamily }),
                      new TextRun({ text: dateTh !== '-' ? dateTh : '', size: bodySizeHalfPt, font: fontFamily }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    // เรื่อง (20pt Bold label + 16pt value)
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 60 },
        children: [
          new TextRun({ text: 'เรื่อง  ', bold: true, size: headerLabelSizeHalfPt, font: fontFamily }),
          new TextRun({ text: fmt(data.subject), size: bodySizeHalfPt, font: fontFamily }),
        ],
      })
    );

    // เรียน (16pt normal per PDF Page 14)
    children.push(
      new Paragraph({
        spacing: { before: 60, after: 100 },
        children: [
          new TextRun({ text: `${data.salutation || 'เรียน'}  `, size: bodySizeHalfPt, font: fontFamily }),
          new TextRun({ text: fmt(data.recipient), size: bodySizeHalfPt, font: fontFamily }),
        ],
      })
    );

    if (data.references && data.references.length > 0) {
      data.references.forEach((ref, idx) => {
        children.push(
          new Paragraph({
            spacing: { before: 20, after: 20 },
            children: [
              new TextRun({
                text: `${idx === 0 ? 'อ้างถึง  ' : '            '}${fmt(ref.bookType)} ที่ ${fmt(ref.bookNo)} ลงวันที่ ${formatOfficialThaiDate(ref.bookDate, data.numeralStyle)}`,
                size: bodySizeHalfPt,
                font: fontFamily,
              }),
            ],
          })
        );
      });
    }

    if (data.enclosures && data.enclosures.length > 0) {
      data.enclosures.forEach((enc, idx) => {
        children.push(
          new Paragraph({
            spacing: { before: 20, after: 40 },
            children: [
              new TextRun({
                text: `${idx === 0 ? 'สิ่งที่ส่งมาด้วย  ' : '                       '}${fmt(enc.title)} จำนวน ${fmt(enc.quantity)} ${fmt(enc.unit)}`,
                size: bodySizeHalfPt,
                font: fontFamily,
              }),
            ],
          })
        );
      });
    }

    bodyParagraphs.forEach((text, i) => {
      const isLast = i === bodyParagraphs.length - 1;
      children.push(
        new Paragraph({
          spacing: { before: 80, after: isLast ? 140 : 60 },
          indent: { firstLine: 1417 },
          children: [new TextRun({ text, size: bodySizeHalfPt, font: fontFamily })],
        })
      );
    });

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 46, type: WidthType.PERCENTAGE },
                borders: NO_CELL_BORDERS,
                children: [new Paragraph({ children: [] })],
              }),
              new TableCell({
                width: { size: 54, type: WidthType.PERCENTAGE },
                borders: NO_CELL_BORDERS,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 420, after: 40 },
                    children: [
                      new TextRun({
                        text: '(ลงชื่อ)...................................................',
                        size: bodySizeHalfPt,
                        font: fontFamily,
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 20, after: 40 },
                    children: [
                      new TextRun({
                        text: `( ${fmt(data.signerName) || '...........................................'} )`,
                        size: bodySizeHalfPt,
                        font: fontFamily,
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 20, after: 220 },
                    children: [
                      new TextRun({
                        text: `ตำแหน่ง ${fmt(data.signerPosition) || '...........................................'}`,
                        size: bodySizeHalfPt,
                        font: fontFamily,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    if (data.coordinatorName || data.coordinatorPhone) {
      children.push(
        new Paragraph({
          spacing: { before: 320, after: 20 },
          children: [
            new TextRun({ text: 'เบอร์โทรติดต่อผู้ประสานงาน', size: bodySizeHalfPt, font: fontFamily }),
          ],
        })
      );
      if (data.coordinatorPhone) {
        children.push(
          new Paragraph({
            spacing: { before: 10, after: 20 },
            children: [
              new TextRun({ text: `เบอร์โทรศัพท์ ${fmt(data.coordinatorPhone)}`, size: bodySizeHalfPt, font: fontFamily }),
            ],
          })
        );
      }
      if (data.coordinatorName) {
        children.push(
          new Paragraph({
            spacing: { before: 10, after: 40 },
            children: [new TextRun({ text: fmt(data.coordinatorName), size: bodySizeHalfPt, font: fontFamily })],
          })
        );
      }
    }
  }

  if (data.confidentiality) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 0 },
        children: [
          new TextRun({ text: data.confidentiality, bold: true, size: bodySizeHalfPt, font: fontFamily }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: Math.round(profile.marginTop * MM_TO_TWIPS),
              right: Math.round(profile.marginRight * MM_TO_TWIPS),
              bottom: Math.round(profile.marginBottom * MM_TO_TWIPS),
              left: Math.round(profile.marginLeft * MM_TO_TWIPS),
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildOfficialHtmlDocument(
  type: DocumentType,
  data: DocumentFormData,
  orgName: string,
  garudaDataUri: string | null,
  formatProfile?: OfficialTemplate['formatProfile']
): string {
  const profile = resolveProfile(type, formatProfile);
  const sarabunFontFaces = loadSarabunFontFaceCss();
  const fmt = (val?: string | number | null) => applyNumeralStyle(val, data.numeralStyle);
  const dateTh = formatOfficialThaiDate(data.documentDate, data.numeralStyle);

  const bodyParagraphs = [
    data.backgroundParagraph,
    data.factsParagraph,
    data.proposalParagraph,
    data.objectiveParagraph,
    ...(data.customParagraphs || []),
  ]
    .filter((p): p is string => Boolean(p && p.trim()))
    .map((p) => fmt(p));

  const addressLines = (data.senderAddress || '')
    .split('\n')
    .map((l) => fmt(l.trim()))
    .filter(Boolean);

  const referencesHtml =
    data.references && data.references.length > 0
      ? `<div class="meta-list">${data.references
          .map(
            (ref, idx) =>
              `<div class="meta-row"><span class="label-gap">${
                idx === 0 ? 'อ้างถึง' : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
              }</span><span>${escapeHtml(fmt(ref.bookType))} ที่ ${escapeHtml(
                fmt(ref.bookNo)
              )} ลงวันที่ ${escapeHtml(formatOfficialThaiDate(ref.bookDate, data.numeralStyle))}</span></div>`
          )
          .join('')}</div>`
      : '';

  const enclosuresHtml =
    data.enclosures && data.enclosures.length > 0
      ? `<div class="meta-list">${data.enclosures
          .map(
            (enc, idx) =>
              `<div class="enc-row"><div class="meta-row" style="margin-bottom:0;"><span class="label-gap">${
                idx === 0 ? 'สิ่งที่ส่งมาด้วย' : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
              }</span><span>${escapeHtml(fmt(enc.title))}</span></div><span class="nowrap">จำนวน ${escapeHtml(
                fmt(enc.quantity)
              )} ${escapeHtml(fmt(enc.unit))}</span></div>`
          )
          .join('')}</div>`
      : '';

  const confidentialityTop = data.confidentiality
    ? `<div class="confidentiality">${escapeHtml(data.confidentiality)}</div>`
    : '';
  const confidentialityBottom = data.confidentiality
    ? `<div class="confidentiality" style="margin-top:auto;padding-top:4mm;">${escapeHtml(data.confidentiality)}</div>`
    : '';

  let contentHtml = '';

  if (type === 'EXTERNAL_LETTER') {
    const garudaBlock = `
      <div class="ext-garuda-wrap ${profile.garudaPosition === 'LEFT' ? 'left' : 'center'}" style="min-height:${profile.garudaHeightMm}mm;">
        ${
          garudaDataUri
            ? `<img src="${garudaDataUri}" style="width:${profile.garudaWidthMm}mm;height:${profile.garudaHeightMm}mm;object-fit:contain;" alt="ตราครุฑ" />`
            : ''
        }
        ${
          profile.garudaPosition === 'CENTER' && data.urgency && data.urgency !== 'ปกติ'
            ? `<div class="ext-urgency">${escapeHtml(data.urgency)}</div>`
            : ''
        }
      </div>
      ${
        profile.garudaPosition === 'LEFT' && data.urgency && data.urgency !== 'ปกติ'
          ? `<div class="urgency-text" style="margin-top:1mm;">${escapeHtml(data.urgency)}</div>`
          : ''
      }
    `;

    const ownerFooter =
      data.contactDepartment ||
      data.contactPhone ||
      data.contactFax ||
      data.contactEmail ||
      data.coordinatorPhone ||
      data.coordinatorName
        ? `<div class="ext-footer">
            ${data.contactDepartment || data.agency ? `<div>${escapeHtml(fmt(data.contactDepartment || data.agency))}</div>` : ''}
            ${
              data.contactPhone || data.coordinatorPhone
                ? `<div>โทร. ${escapeHtml(fmt(data.contactPhone || data.coordinatorPhone || ''))}</div>`
                : ''
            }
            ${data.contactFax ? `<div>โทรสาร ${escapeHtml(fmt(data.contactFax))}</div>` : ''}
            ${data.contactEmail ? `<div>ไปรษณีย์อิเล็กทรอนิกส์ ${escapeHtml(data.contactEmail)}</div>` : ''}
            ${
              data.coordinatorName && !data.contactDepartment
                ? `<div>ผู้ประสานงาน: ${escapeHtml(fmt(data.coordinatorName))}</div>`
                : ''
            }
          </div>`
        : '';

    contentHtml = `
      ${garudaBlock}
      <div class="ext-top-grid">
        <div class="ext-top-left">ที่&nbsp;&nbsp;${escapeHtml(fmt(data.officialReferenceNo))}</div>
        <div class="ext-top-right">
          <div>${escapeHtml(fmt(data.agency || orgName))}</div>
          ${addressLines.map((l) => `<div>${escapeHtml(l)}</div>`).join('')}
        </div>
      </div>
      <div class="ext-date">${escapeHtml(dateTh !== '-' ? dateTh : '')}</div>
      <div class="meta-row"><span class="label-gap">เรื่อง</span><span>${escapeHtml(fmt(data.subject))}</span></div>
      <div class="meta-row"><span class="label-gap">${escapeHtml(data.salutation || 'เรียน')}</span><span>${escapeHtml(fmt(data.recipient))}</span></div>
      ${referencesHtml}
      ${enclosuresHtml}
      <div class="body-section">
        ${bodyParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
      </div>
      <div class="ext-signature">
        <div>${escapeHtml(data.valediction || 'ขอแสดงความนับถือ')}</div>
        <div style="height:14mm;"></div>
        <div>( ${escapeHtml(fmt(data.signerName) || '...........................................')} )</div>
        <div>${escapeHtml(fmt(data.signerPosition) || '...........................................')}</div>
      </div>
      ${ownerFooter}
    `;
  } else if (type === 'INTERNAL_MEMO') {
    const headerHtml =
      profile.garudaPosition === 'LEFT'
        ? `<div class="memo-header" style="min-height:${Math.max(profile.garudaHeightMm, 16)}mm;">
            ${
              garudaDataUri
                ? `<img src="${garudaDataUri}" class="garuda-memo-left" style="width:${profile.garudaWidthMm}mm;height:${profile.garudaHeightMm}mm;" alt="ตราครุฑ" />`
                : ''
            }
            <div class="memo-title">บันทึกข้อความ</div>
          </div>`
        : `<div class="memo-header-center">
            ${
              garudaDataUri
                ? `<img src="${garudaDataUri}" style="width:${profile.garudaWidthMm}mm;height:${profile.garudaHeightMm}mm;object-fit:contain;margin-bottom:1mm;" alt="ตราครุฑ" />`
                : ''
            }
            <div class="memo-title">บันทึกข้อความ</div>
          </div>`;

    const coordinatorHtml =
      data.coordinatorName || data.coordinatorPhone
        ? `<div class="coordinator">
            <div>เบอร์โทรติดต่อผู้ประสานงาน</div>
            ${data.coordinatorPhone ? `<div>เบอร์โทรศัพท์ ${escapeHtml(fmt(data.coordinatorPhone))}</div>` : ''}
            ${data.coordinatorName ? `<div>${escapeHtml(fmt(data.coordinatorName))}</div>` : ''}
          </div>`
        : '';

    contentHtml = `
      ${headerHtml}
      ${
        data.urgency && data.urgency !== 'ปกติ'
          ? `<div class="urgency-text" style="margin-bottom:1mm;">${escapeHtml(data.urgency)}</div>`
          : ''
      }
      <div class="meta-row"><span class="memo-label">ส่วนราชการ</span><span>${escapeHtml(fmt(data.agency || orgName))}</span></div>
      <div class="two-col">
        <div class="col-left"><span class="memo-label">ที่</span><span>${escapeHtml(fmt(data.officialReferenceNo))}</span></div>
        <div class="col-right"><span class="memo-label">วันที่</span><span>${escapeHtml(dateTh !== '-' ? dateTh : '')}</span></div>
      </div>
      <div class="meta-row"><span class="memo-label">เรื่อง</span><span>${escapeHtml(fmt(data.subject))}</span></div>
      <div class="meta-row" style="margin-bottom: 2.5mm;"><span class="label-gap">${escapeHtml(data.salutation || 'เรียน')}</span><span>${escapeHtml(fmt(data.recipient))}</span></div>
      ${referencesHtml}
      ${enclosuresHtml}
      <div class="body-section">
        ${bodyParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
      </div>
      <div class="signature">
        <div class="sig-label">(ลงชื่อ)...................................................</div>
        <div>( ${escapeHtml(fmt(data.signerName) || '...........................................')} )</div>
        <div>ตำแหน่ง ${escapeHtml(fmt(data.signerPosition) || '...........................................')}</div>
      </div>
      ${coordinatorHtml}
    `;
  } else {
    contentHtml = `
      <div class="memo-header-center" style="${profile.garudaPosition === 'LEFT' ? 'align-items:flex-start;' : ''}">
        ${
          garudaDataUri
            ? `<img src="${garudaDataUri}" style="width:${profile.garudaWidthMm}mm;height:${profile.garudaHeightMm}mm;object-fit:contain;margin-bottom:1.5mm;" alt="ตราครุฑ" />`
            : ''
        }
        <div style="width:100%;text-align:center;font-size:24pt;font-weight:700;line-height:1.1;">รายงานสรุปผลการปฏิบัติงาน</div>
      </div>
      ${
        data.urgency && data.urgency !== 'ปกติ'
          ? `<div class="urgency-text" style="margin-bottom:1mm;">${escapeHtml(data.urgency)}</div>`
          : ''
      }
      <div class="meta-row"><span class="memo-label">ส่วนราชการ</span><span>${escapeHtml(fmt(data.agency || orgName))}</span></div>
      <div class="two-col">
        <div class="col-left"><span class="memo-label">ที่</span><span>${escapeHtml(fmt(data.officialReferenceNo))}</span></div>
        <div class="col-right"><span class="memo-label">วันที่</span><span>${escapeHtml(dateTh !== '-' ? dateTh : '')}</span></div>
      </div>
      <div class="meta-row"><span class="memo-label">เรื่อง</span><span>${escapeHtml(fmt(data.subject))}</span></div>
      <div class="meta-row" style="margin-bottom:2.5mm;"><span class="label-gap">${escapeHtml(data.salutation || 'เรียน')}</span><span>${escapeHtml(fmt(data.recipient))}</span></div>
      <div class="body-section">
        ${bodyParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
      </div>
      <div class="signature">
        <div class="sig-label">(ลงชื่อ)...................................................</div>
        <div>( ${escapeHtml(fmt(data.signerName) || '...........................................')} )</div>
        <div>ตำแหน่ง ${escapeHtml(fmt(data.signerPosition) || '...........................................')}</div>
      </div>
    `;
  }

  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<style>
  ${sarabunFontFaces}
  @page {
    size: A4 portrait;
    margin: ${profile.marginTop}mm ${profile.marginRight}mm ${profile.marginBottom}mm ${profile.marginLeft}mm;
  }
  * {
    box-sizing: border-box;
  }
  html, body {
    margin: 0;
    padding: 0;
    font-family: 'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', 'Noto Looped Thai', sans-serif;
    font-size: ${profile.bodyFontSizePt}pt;
    font-weight: 400;
    line-height: 1.2;
    font-synthesis: none;
    color: #000000;
  }
  .page {
    width: 100%;
    min-height: ${297 - profile.marginTop - profile.marginBottom}mm;
    display: flex;
    flex-direction: column;
  }
  .bold {
    font-weight: 700;
  }
  .nowrap {
    white-space: nowrap;
  }
  .confidentiality {
    text-align: center;
    font-weight: 700;
    font-size: 16pt;
    margin-bottom: 1mm;
  }
  .label-gap {
    margin-right: 2.5mm;
    flex-shrink: 0;
  }
  /* Internal Memo Header */
  .memo-header {
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    margin-bottom: 2.5mm;
  }
  .memo-header-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 2.5mm;
  }
  .garuda-memo-left {
    position: absolute;
    left: 0;
    top: 0;
    object-fit: contain;
  }
  .memo-title {
    font-size: 29pt;
    font-weight: 700;
    line-height: 1;
    padding-bottom: 0.5mm;
  }
  .memo-label {
    font-size: 20pt;
    font-weight: 700;
    line-height: 1.15;
    margin-right: 2.5mm;
    flex-shrink: 0;
  }
  /* External Letter Header */
  .ext-garuda-wrap {
    position: relative;
    display: flex;
  }
  .ext-garuda-wrap.center {
    justify-content: center;
  }
  .ext-garuda-wrap.left {
    justify-content: flex-start;
  }
  .ext-urgency {
    position: absolute;
    left: 0;
    bottom: 0;
    font-weight: 700;
    font-size: 20pt;
    line-height: 1.1;
    color: #dc2626;
  }
  .urgency-text {
    font-weight: 700;
    font-size: 20pt;
    line-height: 1.1;
    color: #dc2626;
  }
  .ext-top-grid {
    display: flex;
    align-items: flex-start;
    margin-top: 1.5mm;
    font-size: 16pt;
    font-weight: 400;
  }
  .ext-top-left {
    width: 58%;
    padding-right: 3mm;
  }
  .ext-top-right {
    width: 42%;
    line-height: 1.2;
  }
  .ext-date {
    margin-left: 43%;
    margin-top: 2mm;
    margin-bottom: 2mm;
  }
  .ext-signature {
    margin-top: 7mm;
    margin-left: 42%;
    width: 58%;
    text-align: center;
    font-size: 16pt;
    font-weight: 400;
    line-height: 1.2;
  }
  .ext-footer {
    margin-top: auto;
    padding-top: 6mm;
    text-align: left;
    font-size: 16pt;
    font-weight: 400;
    line-height: 1.2;
  }
  /* Metadata & Body */
  .meta-row {
    display: flex;
    align-items: baseline;
    margin-bottom: 1.2mm;
    font-size: 16pt;
    font-weight: 400;
  }
  .enc-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 4mm;
    margin-bottom: 1.2mm;
    font-size: 16pt;
    font-weight: 400;
  }
  .two-col {
    display: flex;
    align-items: baseline;
    margin-bottom: 1.2mm;
    font-size: 16pt;
    font-weight: 400;
  }
  .col-left {
    width: 52%;
    padding-right: 3mm;
    display: flex;
    align-items: baseline;
  }
  .col-right {
    width: 48%;
    display: flex;
    align-items: baseline;
  }
  .meta-list {
    margin-bottom: 1.6mm;
  }
  .body-section {
    margin-top: 1.6mm;
    text-align: left;
    font-size: 16pt;
    font-weight: 400;
    line-height: 1.2;
  }
  .body-section p {
    margin: 0 0 1.6mm 0;
    text-indent: 25mm;
  }
  .signature {
    margin-top: 14mm;
    margin-left: 42%;
    width: 58%;
    text-align: center;
    font-size: 16pt;
    font-weight: 400;
    line-height: 1.2;
  }
  .sig-label {
    margin-bottom: 1.5mm;
  }
  .coordinator {
    margin-top: auto;
    padding-top: 8mm;
    font-size: 16pt;
    font-weight: 400;
    line-height: 1.2;
    text-align: left;
  }
</style>
</head>
<body>
  <div class="page">
    ${confidentialityTop}
    ${contentHtml}
    ${confidentialityBottom}
  </div>
</body>
</html>`;
}

function findChromeHeadlessPath(): string | null {
  const candidates = [
    '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell',
    process.env.CHROME_PATH || '',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

export async function generateOfficialPdf(
  type: DocumentType,
  data: DocumentFormData,
  orgName: string,
  formatProfile?: OfficialTemplate['formatProfile']
): Promise<Buffer> {
  const garudaBuffer = loadGarudaBuffer();
  const garudaDataUri = garudaBuffer
    ? `data:image/png;base64,${garudaBuffer.toString('base64')}`
    : null;

  const chromePath = findChromeHeadlessPath();
  if (chromePath) {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const htmlPath = path.join(os.tmpdir(), `govflow-doc-${uniqueId}.html`);
    const pdfPath = path.join(os.tmpdir(), `govflow-doc-${uniqueId}.pdf`);
    try {
      const html = buildOfficialHtmlDocument(type, data, orgName, garudaDataUri, formatProfile);
      fs.writeFileSync(htmlPath, html, 'utf-8');
      await execFileAsync(
        chromePath,
        [
          '--headless',
          '--no-sandbox',
          '--disable-gpu',
          '--no-pdf-header-footer',
          `--print-to-pdf=${pdfPath}`,
          `file://${htmlPath}`,
        ],
        { timeout: 15000 }
      );
      if (fs.existsSync(pdfPath)) {
        return fs.readFileSync(pdfPath);
      }
    } catch (err) {
      console.warn('Headless Chromium PDF generation failed, falling back to jsPDF:', err);
    } finally {
      try {
        if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      } catch {
        // ignore cleanup errors
      }
    }
  }

  // Fallback jsPDF generator
  const profile = resolveProfile(type, formatProfile);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const regularFontB64 = loadThaiFontBase64('regular');
  const boldFontB64 = loadThaiFontBase64('bold');
  let fontName = 'helvetica';
  if (regularFontB64) {
    doc.addFileToVFS('ThaiFont-Regular.ttf', regularFontB64);
    doc.addFont('ThaiFont-Regular.ttf', 'ThaiFont', 'normal');
    if (boldFontB64) {
      doc.addFileToVFS('ThaiFont-Bold.ttf', boldFontB64);
      doc.addFont('ThaiFont-Bold.ttf', 'ThaiFont', 'bold');
    } else {
      doc.addFont('ThaiFont-Regular.ttf', 'ThaiFont', 'bold');
    }
    fontName = 'ThaiFont';
  }

  const fmt = (val?: string | number | null) => applyNumeralStyle(val, data.numeralStyle);
  const dateTh = formatOfficialThaiDate(data.documentDate, data.numeralStyle);
  const leftMargin = profile.marginLeft;
  const contentWidth = 210 - profile.marginLeft - profile.marginRight;
  let currentY = profile.marginTop;

  if (type === 'EXTERNAL_LETTER') {
    if (garudaDataUri) {
      const x = profile.garudaPosition === 'LEFT' ? leftMargin : 105 - profile.garudaWidthMm / 2;
      doc.addImage(garudaDataUri, 'PNG', x, currentY, profile.garudaWidthMm, profile.garudaHeightMm);
      currentY += profile.garudaHeightMm + 3;
    }
    if (data.urgency && data.urgency !== 'ปกติ') {
      doc.setFont(fontName, 'bold');
      doc.setFontSize(20);
      doc.setTextColor(220, 38, 38);
      doc.text(data.urgency, leftMargin, currentY);
      doc.setTextColor(0, 0, 0);
      currentY += 8;
    }
    doc.setFont(fontName, 'normal');
    doc.setFontSize(16);
    doc.text(`ที่  ${fmt(data.officialReferenceNo)}`, leftMargin, currentY);
    doc.text(`${fmt(data.agency || orgName)}`, 120, currentY);
    currentY += 8;
    doc.text(`${dateTh !== '-' ? dateTh : ''}`, 105, currentY);
    currentY += 7;
    doc.text(`เรื่อง  ${fmt(data.subject)}`, leftMargin, currentY);
    currentY += 7;
    doc.text(`${data.salutation || 'เรียน'}  ${fmt(data.recipient)}`, leftMargin, currentY);
    currentY += 9;
  } else {
    if (garudaDataUri) {
      const x = profile.garudaPosition === 'LEFT' ? leftMargin : 105 - profile.garudaWidthMm / 2;
      doc.addImage(garudaDataUri, 'PNG', x, currentY, profile.garudaWidthMm, profile.garudaHeightMm);
    }
    doc.setFont(fontName, 'bold');
    doc.setFontSize(type === 'INTERNAL_MEMO' ? 29 : 24);
    doc.text(type === 'INTERNAL_MEMO' ? 'บันทึกข้อความ' : 'รายงานสรุปผลการปฏิบัติงาน', 110, currentY + 13, {
      align: 'center',
    });
    currentY += 20;

    if (data.urgency && data.urgency !== 'ปกติ') {
      doc.setFont(fontName, 'bold');
      doc.setFontSize(20);
      doc.setTextColor(220, 38, 38);
      doc.text(data.urgency, leftMargin, currentY);
      doc.setTextColor(0, 0, 0);
      currentY += 7;
    }

    doc.setFont(fontName, 'bold');
    doc.setFontSize(20);
    doc.text('ส่วนราชการ ', leftMargin, currentY);
    doc.setFont(fontName, 'normal');
    doc.setFontSize(16);
    doc.text(fmt(data.agency || orgName), leftMargin + 26, currentY);
    currentY += 7;
    doc.setFont(fontName, 'bold');
    doc.setFontSize(20);
    doc.text('ที่ ', leftMargin, currentY);
    doc.setFont(fontName, 'normal');
    doc.setFontSize(16);
    doc.text(fmt(data.officialReferenceNo), leftMargin + 8, currentY);
    doc.setFont(fontName, 'bold');
    doc.setFontSize(20);
    doc.text('วันที่ ', 113, currentY);
    doc.setFont(fontName, 'normal');
    doc.setFontSize(16);
    doc.text(dateTh !== '-' ? dateTh : '', 126, currentY);
    currentY += 7;
    doc.setFont(fontName, 'bold');
    doc.setFontSize(20);
    doc.text('เรื่อง ', leftMargin, currentY);
    doc.setFont(fontName, 'normal');
    doc.setFontSize(16);
    doc.text(fmt(data.subject), leftMargin + 14, currentY);
    currentY += 7;
    doc.text(`${data.salutation || 'เรียน'} ${fmt(data.recipient)}`, leftMargin, currentY);
    currentY += 9;
  }

  const bodyParagraphs = [
    data.backgroundParagraph,
    data.factsParagraph,
    data.proposalParagraph,
    data.objectiveParagraph,
    ...(data.customParagraphs || []),
  ]
    .filter((p): p is string => Boolean(p && p.trim()))
    .map((p) => fmt(p));

  for (const para of bodyParagraphs) {
    const lines = doc.splitTextToSize(para, contentWidth);
    doc.text(lines, leftMargin, currentY);
    currentY += lines.length * 6 + 3;
  }

  currentY += 14;
  doc.text(
    type === 'EXTERNAL_LETTER'
      ? data.valediction || 'ขอแสดงความนับถือ'
      : '(ลงชื่อ)...................................................',
    147,
    currentY,
    { align: 'center' }
  );
  currentY += type === 'EXTERNAL_LETTER' ? 12 : 6;
  doc.text(`( ${fmt(data.signerName)} )`, 147, currentY, { align: 'center' });
  currentY += 6;
  doc.text(
    type === 'EXTERNAL_LETTER' ? fmt(data.signerPosition) : `ตำแหน่ง ${fmt(data.signerPosition)}`,
    147,
    currentY,
    { align: 'center' }
  );

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
