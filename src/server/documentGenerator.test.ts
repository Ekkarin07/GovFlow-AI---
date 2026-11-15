import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  buildOfficialHtmlDocument,
  generateOfficialDocx,
  generateOfficialPdf,
} from './documentGenerator';
import { DocumentFormData, OfficialTemplate } from '../lib/types';

function extractWordDocumentXml(docxBuffer: Buffer): string {
  const tmpFile = path.join(os.tmpdir(), `govflow-test-${Date.now()}-${Math.random().toString(36).slice(2)}.docx`);
  fs.writeFileSync(tmpFile, docxBuffer);
  try {
    return execFileSync('unzip', ['-p', tmpFile, 'word/document.xml'], { encoding: 'utf8' });
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

const memoSampleData: DocumentFormData = {
  agency: 'สำนักบริหารกลาง กรมพัฒนาสังคมและสวัสดิการ',
  officialReferenceNo: 'พส ๐๑๐๑/๑๒๓๔',
  documentDate: '2026-11-10',
  subject: 'ขออนุมัติจัดโครงการพัฒนาทักษะดิจิทัล',
  recipient: 'อธิบดีกรมพัฒนาสังคมและสวัสดิการ',
  references: [],
  enclosures: [],
  backgroundParagraph: 'ด้วยกลุ่มงานมีภารกิจดำเนินการพัฒนาทักษะดิจิทัล',
  factsParagraph: 'การจัดโครงการจะมีขึ้นในวันที่ ๒๐ พฤศจิกายน ๒๕๖๙',
  proposalParagraph: 'จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ',
  customParagraphs: [],
  signerName: 'นายประสิทธิ์ มุ่งมั่น',
  signerPosition: 'นักวิชาการพัฒนาสังคมชำนาญการ',
  coordinatorName: 'นายสมชาย ประสานงาน',
  coordinatorPhone: '๐๘๑-๒๓๔๕๖๗๘',
};

const externalSampleData: DocumentFormData = {
  agency: 'กรมสารบรรณกลาง',
  senderAddress: 'ในอาคารบริหารกลาง\nกรุงเทพมหานคร ๑๐๒๐๐',
  officialReferenceNo: 'กห ๐๔๒๑/๓๑๑๓',
  documentDate: '2026-11-15',
  urgency: 'ด่วนมาก',
  subject: 'ขอความอนุเคราะห์เข้าร่วมประชุมหารือ',
  salutation: 'เรียน',
  recipient: 'ปลัดกระทรวงมหาดไทย',
  references: [],
  enclosures: [
    { id: 'enc-1', title: 'กำหนดการประชุม', quantity: 1, unit: 'ชุด' },
  ],
  backgroundParagraph: 'ด้วยกรมสารบรรณกลางมีกำหนดจัดการประชุมประสานงานประจำปี',
  factsParagraph: 'ในการนี้ จึงขอเรียนเชิญผู้แทนหน่วยงานเข้าร่วมการประชุมตามวันเวลาดังกล่าว',
  proposalParagraph: 'จึงเรียนมาเพื่อโปรดพิจารณา',
  customParagraphs: [],
  valediction: 'ขอแสดงความนับถือ',
  signerName: 'นายประสิทธิ์ มุ่งมั่น',
  signerPosition: 'อธิบดีกรมสารบรรณกลาง',
  contactDepartment: 'กองกลาง สำนักงานเลขานุการ',
  contactPhone: '๐ ๒๒๙๗ ๗๕๐๕ - ๗',
  contactFax: '๐ ๒๒๙๗ ๗๕๐๗',
  contactEmail: 'saraban@agency.go.th',
};

test('DOCX generator produces valid INTERNAL_MEMO and EXTERNAL_LETTER with TH Sarabun New, exact pt sizes, and strict bold/regular rules', async () => {
  const memoBuf = await generateOfficialDocx(
    'INTERNAL_MEMO',
    memoSampleData,
    'กรมพัฒนาสังคมและสวัสดิการ',
    {
      paperSize: 'A4',
      marginsMm: { top: 15, right: 20, bottom: 20, left: 30 },
      bodyFont: 'TH Sarabun New',
      bodyFontSizePt: 16,
      garudaHeightMm: 15,
      garudaPosition: 'LEFT',
    }
  );
  assert.ok(memoBuf.length > 5000, 'MEMO DOCX buffer should be substantial');
  assert.equal(memoBuf[0], 0x50);
  assert.equal(memoBuf[1], 0x4b);
  assert.ok(memoBuf.includes(Buffer.from('word/media/')), 'MEMO DOCX must embed Garuda');

  const memoXml = extractWordDocumentXml(memoBuf);
  assert.ok(memoXml.includes('TH Sarabun New'), 'MEMO DOCX must use TH Sarabun New font');
  assert.ok(memoXml.includes('w:sz w:val="58"'), 'MEMO DOCX must use 29pt (58 half-pt) for บันทึกข้อความ');
  assert.ok(memoXml.includes('w:sz w:val="40"'), 'MEMO DOCX must use 20pt (40 half-pt) for memo labels');
  assert.ok(memoXml.includes('w:sz w:val="32"'), 'MEMO DOCX must use 16pt (32 half-pt) for body & values');
  assert.ok(memoXml.includes('(ลงชื่อ)...................................................'), 'MEMO DOCX must include dotted signature line');
  assert.ok(!memoXml.includes('w:sz w:val="30"'), 'MEMO DOCX must NOT shrink coordinator block to 15pt (30 half-pt)');
  assert.ok(
    /<w:rPr>.*?TH Sarabun New.*?<w:b\/>(?:<w:bCs\/>)?<w:sz w:val="58"/.test(memoXml),
    'บันทึกข้อความ title run must be bold 29pt'
  );
  assert.ok(
    !/<w:b\/>[^<]*(?:<w:bCs\/>)?<w:sz w:val="32"[^>]*\/>(?:<w:szCs w:val="32"\/>)?<\/w:rPr><w:t[^>]*>เบอร์โทรติดต่อผู้ประสานงาน/.test(memoXml),
    'Coordinator block must NOT be bold'
  );
  assert.ok(
    !/<w:b\/>[^<]*(?:<w:bCs\/>)?<w:sz w:val="32"[^>]*\/>(?:<w:szCs w:val="32"\/>)?<\/w:rPr><w:t[^>]*>\(ลงชื่อ\)/.test(memoXml),
    'Signature dotted line must NOT be bold'
  );

  const extBuf = await generateOfficialDocx(
    'EXTERNAL_LETTER',
    externalSampleData,
    'กรมสารบรรณกลาง',
    {
      paperSize: 'A4',
      marginsMm: { top: 15, right: 20, bottom: 20, left: 30 },
      bodyFont: 'TH Sarabun New',
      bodyFontSizePt: 16,
      garudaHeightMm: 30,
      garudaPosition: 'CENTER',
    }
  );
  assert.ok(extBuf.length > 5000, 'EXTERNAL_LETTER DOCX buffer should be substantial');
  assert.equal(extBuf[0], 0x50);
  assert.equal(extBuf[1], 0x4b);
  assert.ok(extBuf.includes(Buffer.from('word/media/')), 'EXTERNAL_LETTER DOCX must embed Garuda');

  const extXml = extractWordDocumentXml(extBuf);
  assert.ok(extXml.includes('TH Sarabun New'), 'EXTERNAL_LETTER DOCX must use TH Sarabun New font');
  assert.ok(extXml.includes('w:sz w:val="40"'), 'EXTERNAL_LETTER urgency must be 20pt (40 half-pt)');
  assert.ok(extXml.includes('w:sz w:val="32"'), 'EXTERNAL_LETTER body/headers must be 16pt (32 half-pt)');
  // In EXTERNAL_LETTER with no confidentiality header, only the single urgency run ("ด่วนมาก") should be bold
  const boldCount = (extXml.match(/<w:b\/>/g) || []).length;
  assert.equal(boldCount, 1, 'EXTERNAL_LETTER should have ONLY urgency as bold (1 bold run)');
});

test('HTML & PDF generator embeds TH Sarabun New font faces and uses exact 16pt/20pt/29pt sizes without 0.86x scaling', async () => {
  const memoHtml = buildOfficialHtmlDocument(
    'INTERNAL_MEMO',
    memoSampleData,
    'กรมพัฒนาสังคมและสวัสดิการ',
    null
  );
  assert.ok(memoHtml.includes("font-family: 'TH Sarabun New'"), 'HTML must declare TH Sarabun New');
  assert.ok(memoHtml.includes('data:font/ttf;base64,'), 'HTML must embed base64 TTF font data');
  assert.ok(memoHtml.includes('font-size: 16pt;'), 'HTML body must use exact 16pt');
  assert.ok(memoHtml.includes('.memo-title {\n    font-size: 29pt;\n    font-weight: 700;'), 'HTML memo title must be 29pt bold');
  assert.ok(memoHtml.includes('.memo-label {\n    font-size: 20pt;\n    font-weight: 700;'), 'HTML memo labels must be 20pt bold');
  assert.ok(memoHtml.includes('.coordinator {\n    margin-top: auto;\n    padding-top: 8mm;\n    font-size: 16pt;'), 'HTML coordinator must be 16pt regular');
  assert.ok(memoHtml.includes('(ลงชื่อ)...................................................'), 'MEMO HTML must include dotted signature line');
  assert.ok(!memoHtml.includes('13.8pt'), 'HTML must not contain scaled 13.8pt');

  const completionHtml = buildOfficialHtmlDocument(
    'COMPLETION_REPORT',
    memoSampleData,
    'กรมพัฒนาสังคมและสวัสดิการ',
    null
  );
  assert.ok(completionHtml.includes('(ลงชื่อ)...................................................'), 'COMPLETION_REPORT HTML must include dotted signature line');

  const extHtml = buildOfficialHtmlDocument(
    'EXTERNAL_LETTER',
    externalSampleData,
    'กรมสารบรรณกลาง',
    null
  );
  assert.ok(extHtml.includes('.ext-footer {\n    margin-top: auto;\n    padding-top: 6mm;\n    text-align: left;\n    font-size: 16pt;'), 'External footer must be 16pt');
  assert.ok(extHtml.includes('.ext-urgency {'), 'External urgency style must exist');

  const memoPdf = await generateOfficialPdf('INTERNAL_MEMO', memoSampleData, 'กรมพัฒนาสังคมและสวัสดิการ');
  assert.ok(memoPdf.length > 5000, 'MEMO PDF should be substantial');
  assert.equal(memoPdf.slice(0, 5).toString('ascii'), '%PDF-');

  const extProfile: OfficialTemplate['formatProfile'] = {
    paperSize: 'A4',
    marginsMm: { top: 15, right: 20, bottom: 20, left: 30 },
    bodyFont: 'TH Sarabun New',
    bodyFontSizePt: 16,
    garudaHeightMm: 30,
    garudaPosition: 'CENTER',
  };
  const extPdf = await generateOfficialPdf(
    'EXTERNAL_LETTER',
    externalSampleData,
    'กรมสารบรรณกลาง',
    extProfile
  );
  assert.ok(extPdf.length > 5000, 'EXTERNAL_LETTER PDF should be substantial');
  assert.equal(extPdf.slice(0, 5).toString('ascii'), '%PDF-');
});

test('Urgency renders in red (DC2626 / #dc2626) and numeralStyle switches between THAI and ARABIC cleanly across DOCX & HTML', async () => {
  const thaiNumMemoData: DocumentFormData = {
    ...memoSampleData,
    urgency: 'ด่วนที่สุด',
    numeralStyle: 'THAI',
    officialReferenceNo: 'พส 0101/987',
    documentDate: '2026-11-15',
    backgroundParagraph: 'ตามแผนงานปี 2569 จำนวน 3 โครงการ',
    coordinatorPhone: '081-234-5678',
  };

  const memoThaiDocx = await generateOfficialDocx(
    'INTERNAL_MEMO',
    thaiNumMemoData,
    'กรมพัฒนาสังคมและสวัสดิการ'
  );
  const memoThaiXml = extractWordDocumentXml(memoThaiDocx);
  assert.ok(memoThaiXml.includes('w:color w:val="DC2626"'), 'INTERNAL_MEMO urgency must use red color DC2626 in DOCX');
  assert.ok(memoThaiXml.includes('๑๕ พฤศจิกายน ๒๕๖๙'), 'THAI numeralStyle must render Thai numerals in DOCX date');
  assert.ok(memoThaiXml.includes('พส ๐๑๐๑/๙๘๗'), 'THAI numeralStyle must convert reference number to Thai numerals');
  assert.ok(memoThaiXml.includes('จำนวน ๓ โครงการ'), 'THAI numeralStyle must convert body digits to Thai numerals');
  assert.ok(memoThaiXml.includes('๐๘๑-๒๓๔-๕๖๗๘'), 'THAI numeralStyle must convert coordinator phone to Thai numerals');

  const arabicExtData: DocumentFormData = {
    ...externalSampleData,
    urgency: 'ด่วนมาก',
    numeralStyle: 'ARABIC',
    officialReferenceNo: 'กห ๐๔๒๑/๓๑๑๓',
    documentDate: '2026-11-15',
    contactEmail: 'saraban2569@agency.go.th',
  };
  const extArabicDocx = await generateOfficialDocx('EXTERNAL_LETTER', arabicExtData, 'กรมสารบรรณกลาง');
  const extArabicXml = extractWordDocumentXml(extArabicDocx);
  assert.ok(extArabicXml.includes('w:color w:val="DC2626"'), 'EXTERNAL_LETTER urgency must use red color DC2626 in DOCX');
  assert.ok(extArabicXml.includes('15 พฤศจิกายน 2569'), 'ARABIC numeralStyle must render Arabic numerals in DOCX date');
  assert.ok(extArabicXml.includes('กห 0421/3113'), 'ARABIC numeralStyle must convert Thai digits to Arabic numerals');

  const extHtml = buildOfficialHtmlDocument('EXTERNAL_LETTER', arabicExtData, 'กรมสารบรรณกลาง', null);
  assert.ok(extHtml.includes('color: #dc2626;'), 'HTML CSS must render urgency in red (#dc2626)');
  assert.ok(extHtml.includes('กห 0421/3113'), 'HTML must convert reference to Arabic numerals');
  assert.ok(extHtml.includes('saraban2569@agency.go.th'), 'HTML must preserve email address');

  const memoThaiHtml = buildOfficialHtmlDocument('INTERNAL_MEMO', thaiNumMemoData, 'กรมพัฒนาสังคมและสวัสดิการ', null);
  assert.ok(memoThaiHtml.includes('<div class="urgency-text" style="margin-bottom:1mm;">ด่วนที่สุด</div>'));
  assert.ok(memoThaiHtml.includes('๑๕ พฤศจิกายน ๒๕๖๙'));
});
