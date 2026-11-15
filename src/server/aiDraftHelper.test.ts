import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDetailedOfficialDraftFallback,
  buildOfficialDraftSystemInstruction,
  buildOfficialDraftUserPrompt,
  classifyOfficialTopic,
  normalizeDraftOutput,
} from './aiDraftHelper';

test('classifyOfficialTopic detects major official Thai document intents accurately', () => {
  assert.equal(classifyOfficialTopic('ขออนุมัติจัดโครงการอบรมเชิงปฏิบัติการ'), 'APPROVAL_PROJECT');
  assert.equal(classifyOfficialTopic('ขอความอนุเคราะห์ใช้ห้องประชุมและโสตทัศนูปกรณ์'), 'COURTESY_REQUEST');
  assert.equal(classifyOfficialTopic('ขอเชิญประชุมคณะกรรมการดำเนินงานประจำเดือน'), 'MEETING_INVITATION');
  assert.equal(classifyOfficialTopic('ขอยืมครุภัณฑ์คอมพิวเตอร์เพื่อปฏิบัติราชการ'), 'BORROW_ASSET');
  assert.equal(classifyOfficialTopic('รายงานผลการดำเนินงานโครงการพัฒนาบุคลากร'), 'REPORT_SUBMISSION');
});

test('buildDetailedOfficialDraftFallback generates rich multi-sentence formal Thai prose for INTERNAL_MEMO', () => {
  const result = buildDetailedOfficialDraftFallback({
    docType: 'INTERNAL_MEMO',
    subject: 'ขออนุมัติจัดโครงการอบรมเชิงปฏิบัติการด้านสารบรรณอิเล็กทรอนิกส์',
    agency: 'กลุ่มงานบริหารทั่วไป',
    recipient: 'ผู้อำนวยการสำนักงาน',
    factsParagraph: 'จัดอบรมในวันที่ 25 พฤศจิกายน 2569 ณ ห้องประชุมใหญ่ มีผู้เข้าร่วม 60 คน',
    extraInstructions: 'เน้นความถูกต้องตามระเบียบงานสารบรรณและลดการใช้กระดาษ',
    references: [
      {
        id: 'r1',
        bookType: 'หนังสือ',
        bookNo: 'นร 0101/ว 245',
        bookDate: '2569-11-01',
        originAgency: 'สำนักปลัด',
      },
    ],
    enclosures: [
      {
        id: 'e1',
        title: 'กำหนดการโครงการและบัญชีรายชื่อผู้เข้ารับการอบรม',
        quantity: 1,
        unit: 'ชุด',
      },
    ],
  });

  assert.ok(result.backgroundParagraph.length >= 250, 'backgroundParagraph should be detailed and multi-sentence');
  assert.ok(result.factsParagraph.length >= 250, 'factsParagraph should be detailed and multi-sentence');
  assert.ok(result.proposalParagraph.length >= 100, 'proposalParagraph should be formal and complete');
  assert.match(result.backgroundParagraph, /อ้างถึง.*นร 0101\/ว 245/);
  assert.match(result.factsParagraph, /วันที่ 25 พฤศจิกายน 2569/);
  assert.match(result.factsParagraph, /กำหนดการโครงการ/);
  assert.match(result.proposalParagraph, /^จึงเรียนมาเพื่อโปรดพิจารณา/);
  assert.equal(result.proposalParagraph.includes('ขอแสดงความนับถือ'), false);
});

test('buildDetailedOfficialDraftFallback tailors EXTERNAL_LETTER closing and respects EXECUTIVE_STRICT', () => {
  const result = buildDetailedOfficialDraftFallback({
    docType: 'EXTERNAL_LETTER',
    subject: 'ขอความอนุเคราะห์วิทยากรบรรยายพิเศษ',
    agency: 'กองแผนงานและยุทธศาสตร์',
    recipient: 'อธิบดีกรมพัฒนาทรัพยากรบุคคล',
    urgency: 'ด่วนที่สุด',
    formalityLevel: 'EXECUTIVE_STRICT',
  });

  assert.match(result.factsParagraph, /ด่วนที่สุด/);
  assert.match(result.proposalParagraph, /จักเป็นพระคุณยิ่ง/);
  assert.ok(result.backgroundParagraph.length >= 250);
  assert.ok(result.factsParagraph.length >= 250);
});

test('buildOfficialDraftSystemInstruction and UserPrompt enforce strict Thai Sarabun rules', () => {
  const sys = buildOfficialDraftSystemInstruction('EXECUTIVE_STRICT');
  const prompt = buildOfficialDraftUserPrompt({
    docType: 'EXTERNAL_LETTER',
    subject: 'ขอความร่วมมือจัดส่งข้อมูลสถิติ',
    agency: 'ฝ่ายสารสนเทศ',
    recipient: 'ผู้อำนวยการสำนักสถิติ',
    formalityLevel: 'EXECUTIVE_STRICT',
  });

  assert.match(sys, /ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ/);
  assert.match(sys, /4-6 ประโยคเต็ม/);
  assert.match(sys, /5-7 ประโยคเต็ม/);
  assert.match(prompt, /หนังสือภายนอก/);
  assert.match(prompt, /ขอความร่วมมือจัดส่งข้อมูลสถิติ/);
});

test('normalizeDraftOutput upgrades short or missing AI responses with detailed fallback', () => {
  const normalized = normalizeDraftOutput(
    {
      backgroundParagraph: 'สั้นเกินไป',
      factsParagraph: '',
      proposalParagraph: 'จึงเรียนมาเพื่อโปรดพิจารณา',
    },
    {
      docType: 'INTERNAL_MEMO',
      subject: 'ขออนุมัติจัดกิจกรรมวันไหว้ครู',
      agency: 'ฝ่ายกิจการนักเรียน',
      recipient: 'ผู้อำนวยการโรงเรียน',
    }
  );

  assert.ok(normalized.backgroundParagraph.length >= 250);
  assert.ok(normalized.factsParagraph.length >= 250);
  assert.ok(normalized.proposalParagraph.length >= 100);
});
