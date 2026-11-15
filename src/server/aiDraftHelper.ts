import { applyNumeralStyle } from '../lib/dateUtils';
import { DocumentType, EnclosureItem, NumeralStyle, ReferenceItem } from '../lib/types';

export type AiDraftFormalityLevel = 'FORMAL_DETAILED' | 'EXECUTIVE_STRICT';

export interface DocumentDraftInput {
  docType: DocumentType;
  subject?: string;
  agency?: string;
  recipient?: string;
  officialReferenceNo?: string;
  documentDate?: string;
  numeralStyle?: NumeralStyle;
  urgency?: string;
  salutation?: string;
  valediction?: string;
  references?: ReferenceItem[];
  enclosures?: EnclosureItem[];
  backgroundParagraph?: string;
  factsParagraph?: string;
  proposalParagraph?: string;
  extraInstructions?: string;
  formalityLevel?: AiDraftFormalityLevel;
}

export interface DocumentDraftOutput {
  backgroundParagraph: string;
  factsParagraph: string;
  proposalParagraph: string;
}

export type OfficialTopicCategory =
  | 'APPROVAL_PROJECT'
  | 'COURTESY_REQUEST'
  | 'MEETING_INVITATION'
  | 'BORROW_ASSET'
  | 'REPORT_SUBMISSION'
  | 'POLICY_COMPLIANCE'
  | 'GENERAL_OFFICIAL';

function cleanText(value?: string): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

export function classifyOfficialTopic(subject: string, contextText = ''): OfficialTopicCategory {
  const combined = `${subject} ${contextText}`.toLowerCase();
  if (/รายงานผล|สรุปผล|ผลการจัด|completion|report/.test(combined)) {
    return 'REPORT_SUBMISSION';
  }
  if (/ขอยืม|ยืมพัสดุ|ยืมอุปกรณ์|ยืมครุภัณฑ์|ส่งคืน/.test(combined)) {
    return 'BORROW_ASSET';
  }
  if (/ขอเชิญประชุม|เชิญร่วมประชุม|เรียนเชิญ.*ประชุม|การประชุม|นัดประชุม|สัมมนา|เสวนา|หารือ/.test(combined)) {
    return 'MEETING_INVITATION';
  }
  if (/ขอความอนุเคราะห์|ขอความร่วมมือ|สนับสนุน|ประสานขอ|ประสานงาน/.test(combined)) {
    return 'COURTESY_REQUEST';
  }
  if (/อนุมัติ|ขอจัด|โครงการ|กิจกรรม|อบรม|จัดซื้อ|จัดจ้าง|งบประมาณ|หลักการ/.test(combined)) {
    return 'APPROVAL_PROJECT';
  }
  if (/นโยบาย|มาตรการ|แนวทางปฏิบัติ|ข้อสั่งการ|กำชับ|ซักซ้อม|ระเบียบ/.test(combined)) {
    return 'POLICY_COMPLIANCE';
  }
  return 'GENERAL_OFFICIAL';
}

function formatReferencesClause(references?: ReferenceItem[]): string {
  const valid = (references || []).filter(
    (r) => cleanText(r.bookType) || cleanText(r.bookNo) || cleanText(r.originAgency)
  );
  if (valid.length === 0) return '';
  const summary = valid
    .map((r) => {
      const parts = [
        cleanText(r.bookType) || 'หนังสือ',
        cleanText(r.originAgency) ? `ของ${cleanText(r.originAgency)}` : '',
        cleanText(r.bookNo) ? `ที่ ${cleanText(r.bookNo)}` : '',
        cleanText(r.bookDate) ? `ลงวันที่ ${cleanText(r.bookDate)}` : '',
      ].filter(Boolean);
      return parts.join(' ');
    })
    .join(' และ');
  return `อ้างถึง ${summary}`;
}

function formatEnclosuresClause(enclosures?: EnclosureItem[]): string {
  const valid = (enclosures || []).filter((e) => cleanText(e.title));
  if (valid.length === 0) return '';
  const titles = valid.map((e) => cleanText(e.title)).join(' และ');
  return `รายละเอียดปรากฏตามเอกสารสิ่งที่ส่งมาด้วย (${titles})`;
}

export function buildOfficialDraftSystemInstruction(
  formalityLevel: AiDraftFormalityLevel = 'FORMAL_DETAILED'
): string {
  const registerNote =
    formalityLevel === 'EXECUTIVE_STRICT'
      ? 'ให้ใช้ระดับภาษาราชการชั้นสูงระดับบริหารและหนังสือถึงหน่วยงานภายนอกระดับกระทรวง/กรม ใช้ถ้อยคำสละสลวย หนักแน่น รัดกุมเชิงนิติศาสตร์และการบริหารภาครัฐ (เช่น อนุวัติการตาม, สัมฤทธิผล, บูรณาการความร่วมมือ, ธรรมาภิบาล, โปร่งใสตรวจสอบได้, จักเป็นพระคุณยิ่ง)'
      : 'ให้ใช้ภาษาราชการไทยมาตรฐานระดับสูงตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณอย่างเคร่งครัด มีความละเอียด ครบถ้วน สมบูรณ์ อ่านแล้วน่าเชื่อถือและนำไปใช้งานราชการได้จริงทันที';

  return `คุณคือ "นิติกรและนักวิชาการสารบรรณอาวุโส" ผู้เชี่ยวชาญการยกร่างหนังสือราชการไทยตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 และที่แก้ไขเพิ่มเติม

หน้าที่ของคุณคือยกร่าง "เนื้อความในตัวหนังสือ" ทั้ง 3 ย่อหน้าให้มีความละเอียด ยาว ครบถ้วน และเป็นทางการสูง:
${registerNote}

โครงสร้างบังคับของเนื้อความทั้ง 3 ส่วน:
1. backgroundParagraph (ภาคเหตุ / ความเป็นมาและเหตุผลความจำเป็น):
   - ความยาวประมาณ 4-6 ประโยคเต็ม (ประมาณ 350-650 ตัวอักษร) ไม่ใช่ประโยคสั้นๆ ประโยคเดียว
   - ขึ้นต้นด้วยคำขึ้นต้นมาตรฐานงานสารบรรณ เช่น "ด้วย...", "เนื่องด้วย...", "ตามที่...", หรือ "สืบเนื่องจาก..." (หากมี "อ้างถึง" ให้เชื่อมโยงอ้างถึงอย่างถูกต้องตามแบบราชการ)
   - อธิบายบริบท ภารกิจ วัตถุประสงค์ เชิงนโยบาย/ยุทธศาสตร์ ความจำเป็นเร่งด่วนหรือความสำคัญต่อองค์กรและผู้รับบริการ รวมถึงความสอดคล้องกับมาตรฐานและระเบียบที่เกี่ยวข้อง

2. factsParagraph (ภาคความประสงค์ / ข้อเท็จจริง และแนวทางการดำเนินงาน):
   - ความยาวประมาณ 5-7 ประโยคเต็ม (ประมาณ 450-750 ตัวอักษร)
   - ขึ้นต้นด้วย "ในการนี้...", "ทั้งนี้...", หรือ "อนึ่ง..."
   - แจกแจงสาระสำคัญ ขอบเขตการดำเนินงาน ขั้นตอนปฏิบัติ กลุ่มเป้าหมายหรือผู้มีส่วนเกี่ยวข้อง การประสานบูรณาการร่วมกับหน่วยงานที่เกี่ยวข้อง การกำกับดูแลควบคุมคุณภาพ มาตรการตรวจสอบความถูกต้องตามระเบียบ รวมถึงการอ้างอิงเอกสารแนบ (หากมี "สิ่งที่ส่งมาด้วย")
   - หากผู้ใช้งานระบุข้อเท็จจริง วัน เวลา สถานที่ จำนวน หรือเงื่อนไขไว้ในข้อมูลนำเข้า ให้นำข้อมูลเหล่านั้นมาเรียบเรียงขยายความอย่างครบถ้วน

3. proposalParagraph (ภาคสรุป / ข้อเสนอเพื่อโปรดพิจารณา):
   - ความยาวประมาณ 2-3 ประโยคเต็ม (ประมาณ 140-280 ตัวอักษร)
   - ใช้คำลงท้ายเชิงเสนอเรื่องให้สอดคล้องกับประเภทหนังสือ:
     * บันทึกข้อความ (INTERNAL_MEMO): ใช้รูปแบบ "จึงเรียนมาเพื่อโปรดพิจารณา หากเห็นชอบโปรดพิจารณาอนุมัติ... และมอบหมาย..." โดยห้ามใส่ "ขอแสดงความนับถือ"
     * หนังสือภายนอก (EXTERNAL_LETTER): ใช้รูปแบบ "จึงเรียนมาเพื่อโปรดพิจารณาให้ความอนุเคราะห์/ร่วมมือ... จักเป็นพระคุณยิ่ง" (โดยไม่ต้องใส่ "ขอแสดงความนับถือ" ซ้ำ เพราะระบบวางไว้ในส่วนคำลงท้ายแยกต่างหากแล้ว)
     * รายงานผลการดำเนินงาน (COMPLETION_REPORT): ใช้รูปแบบ "จึงเรียนมาเพื่อโปรดทราบและพิจารณาผลการดำเนินงาน..."

ข้อห้ามเด็ดขาด (Strict Grounding & Formal Integrity):
- ห้ามแต่งเติมเลขที่หนังสือ วันที่เฉพาะเจาะจง ตัวเลขงบประมาณ หรือชื่อบุคคล/สถานที่เฉพาะที่ไม่ได้ปรากฏอยู่ในข้อมูลนำเข้าเด็ดขาด ให้เขียนอธิบายเชิงหลักการ กรอบการดำเนินงาน ขั้นตอน และการปฏิบัติตามระเบียบแทนในส่วนที่ไม่ได้ระบุตัวเลข
- ห้ามใช้ภาษาพูด คำย่อไม่เป็นทางการ หรืออีโมจิ
- ห้ามขึ้นต้นย่อหน้าด้วยเครื่องหมายย่อหน้า (ไม่ต้องใส่ Tab หรือเว้นวรรคนำหน้า เพราะตัวจัดหน้าเอกสารจะย่อหน้าอัตโนมัติ 2.5 ซม.)
- ตอบกลับเป็น JSON ที่มีฟิลด์ backgroundParagraph, factsParagraph, proposalParagraph เท่านั้น`;
}

export function buildOfficialDraftUserPrompt(input: DocumentDraftInput): string {
  const docTypeLabel =
    input.docType === 'EXTERNAL_LETTER'
      ? 'หนังสือภายนอก (ติดต่อหน่วยงานภายนอก)'
      : input.docType === 'COMPLETION_REPORT'
      ? 'บันทึก/หนังสือรายงานผลการดำเนินงาน'
      : 'บันทึกข้อความ (หนังสือภายใน)';

  const subject = cleanText(input.subject) || 'การดำเนินงานตามภารกิจของหน่วยงาน';
  const agency = cleanText(input.agency) || 'ส่วนราชการ/หน่วยงานเจ้าของเรื่อง';
  const recipient = cleanText(input.recipient) || 'ผู้มีอำนาจพิจารณาอนุมัติ';
  const urgency = cleanText(input.urgency) || 'ปกติ';
  const refClause = formatReferencesClause(input.references) || 'ไม่มีหนังสืออ้างถึง';
  const encClause = formatEnclosuresClause(input.enclosures) || 'ไม่มีเอกสารสิ่งที่ส่งมาด้วย';
  const formalityText =
    input.formalityLevel === 'EXECUTIVE_STRICT'
      ? 'ทางการระดับสูงพิเศษ (เสนอผู้บริหารระดับสูง / หน่วยงานภายนอก)'
      : 'ทางการละเอียดสมบูรณ์ (มาตรฐานหนังสือราชการ)';

  const numeralNote =
    input.numeralStyle === 'THAI'
      ? 'เลขไทย (๐-๙)'
      : input.numeralStyle === 'ARABIC'
      ? 'เลขอารบิก (0-9)'
      : 'ตามข้อมูลนำเข้า';

  return `กรุณายกร่างข้อความหนังสือราชการฉบับสมบูรณ์และละเอียดสูง ตามข้อมูลบริบทต่อไปนี้:

- ประเภทหนังสือ: ${docTypeLabel}
- ระดับความทางการ: ${formalityText}
- รูปแบบตัวเลขที่ต้องการในเอกสาร: ${numeralNote}
- เรื่อง: ${subject}
- ส่วนราชการเจ้าของเรื่อง: ${agency}
- เรียน (ผู้รับหนังสือ): ${recipient}
- ชั้นความเร็ว: ${urgency}
- อ้างถึง: ${refClause}
- สิ่งที่ส่งมาด้วย: ${encClause}
- ข้อมูลความเป็นมาที่ผู้ใช้กรอกไว้ (ถ้ามี): ${cleanText(input.backgroundParagraph) || '-'}
- ข้อเท็จจริง/รายละเอียดเบื้องต้นที่ผู้ใช้กรอกไว้ (ถ้ามี): ${cleanText(input.factsParagraph) || '-'}
- ข้อเสนอที่ผู้ใช้กรอกไว้ (ถ้ามี): ${cleanText(input.proposalParagraph) || '-'}
- ประเด็นหรือคำสำคัญเพิ่มเติมที่ต้องการให้ AI ขยายความ: ${cleanText(input.extraInstructions) || '-'}

โปรดสร้างเนื้อความทั้ง 3 ย่อหน้าที่ละเอียด ยาว สมบูรณ์ ใช้ภาษาราชการสละสลวยและเป็นทางการสูง สามารถนำไปเสนอลงนามได้ทันที`;
}

export function normalizeDraftOutput(
  candidate: Partial<DocumentDraftOutput> | null | undefined,
  input: DocumentDraftInput
): DocumentDraftOutput {
  const fallback = buildDetailedOfficialDraftFallback(input);
  const bg = cleanText(candidate?.backgroundParagraph);
  const facts = cleanText(candidate?.factsParagraph);
  const prop = cleanText(candidate?.proposalParagraph);

  return {
    backgroundParagraph: applyNumeralStyle(
      bg.length >= 80 ? bg : fallback.backgroundParagraph,
      input.numeralStyle
    ),
    factsParagraph: applyNumeralStyle(
      facts.length >= 80 ? facts : fallback.factsParagraph,
      input.numeralStyle
    ),
    proposalParagraph: applyNumeralStyle(
      prop.length >= 40 ? prop : fallback.proposalParagraph,
      input.numeralStyle
    ),
  };
}

export function buildDetailedOfficialDraftFallback(input: DocumentDraftInput): DocumentDraftOutput {
  const subject = cleanText(input.subject) || 'การดำเนินงานตามภารกิจและแผนงานของหน่วยงาน';
  const agency = cleanText(input.agency) || 'ส่วนราชการเจ้าของเรื่อง';
  const recipient = cleanText(input.recipient) || 'ผู้บริหาร/ผู้มีอำนาจพิจารณา';
  const urgency = cleanText(input.urgency);
  const extra = cleanText(input.extraInstructions);
  const existingFacts = cleanText(input.factsParagraph);
  const existingBg = cleanText(input.backgroundParagraph);
  const refClause = formatReferencesClause(input.references);
  const encClause = formatEnclosuresClause(input.enclosures);
  const topic = classifyOfficialTopic(subject, `${existingFacts} ${extra}`);
  const isStrict = input.formalityLevel === 'EXECUTIVE_STRICT';

  const urgencyNote =
    urgency && urgency !== 'ปกติ'
      ? ` ทั้งนี้ ด้วยเรื่องดังกล่าวมีความจำเป็นเร่งด่วนในระดับ "${urgency}" จึงจำเป็นต้องเร่งรัดประสานการดำเนินงานให้ทันต่อกรอบระยะเวลาที่กำหนด`
      : '';

  const userContextNotes = [existingFacts, extra].filter((v) => v && v !== subject).join(' และ');
  const userFactsSentence = userContextNotes
    ? ` โดยมีสาระสำคัญและประเด็นการดำเนินงานที่ต้องดำเนินการประกอบด้วย ${userContextNotes} เพื่อให้การขับเคลื่อนภารกิจเป็นไปอย่างตรงจุดและครอบคลุมทุกมิติ`
    : '';

  const refLead = refClause ? `ตาม${refClause} และ` : '';
  const encSentence = encClause
    ? ` พร้อมกันนี้ได้จัดส่งเอกสารหลักฐานประกอบการพิจารณา${encClause.replace(/^รายละเอียดปรากฏตามเอกสารสิ่งที่ส่งมาด้วย/, '')} เพื่อใช้เป็นข้อมูลอ้างอิงในการตรวจสอบและดำเนินการในส่วนที่เกี่ยวข้อง`
    : '';

  let backgroundParagraph = '';
  let factsParagraph = '';
  let proposalParagraph = '';

  switch (topic) {
    case 'APPROVAL_PROJECT': {
      backgroundParagraph = `${refLead}ด้วย ${agency} มีภารกิจสำคัญในการยกระดับประสิทธิภาพการดำเนินงานและการพัฒนาศักยภาพบุคลากรตลอดจนผู้มีส่วนเกี่ยวข้องให้สอดคล้องกับนโยบายและแผนปฏิบัติการประจำปี จึงได้จัดเตรียมแผนการดำเนินงานเรื่อง "${subject}" ขึ้น${existingBg ? ` สืบเนื่องจาก${existingBg}` : ''} เพื่อมุ่งเน้นให้เกิดการวางแผนงานที่เป็นระบบ มีความชัดเจนทั้งในด้านวัตถุประสงค์ ขอบเขตความรับผิดชอบ และผลสัมฤทธิ์ที่คาดว่าจะได้รับอย่างเป็นรูปธรรม อันจะเป็นกลไกสำคัญในการขับเคลื่อนภารกิจหลักของหน่วยงานให้บรรลุเป้าหมายตามมาตรฐานการบริหารจัดการภาครัฐและหลักธรรมาภิบาล`;

      factsParagraph = `ในการนี้ ${agency} ได้พิจารณาศึกษารายละเอียด องค์ประกอบ ขั้นตอนการดำเนินงาน ตลอดจนความพร้อมด้านทรัพยากรและบุคลากรผู้ปฏิบัติงานอย่างรอบคอบแล้ว เห็นควรกำหนดแนวทางการดำเนินงานเรื่อง "${subject}" ให้ครอบคลุมตั้งแต่การเตรียมความพร้อม การประสานบูรณาการร่วมกับหน่วยงานภายในและผู้เกี่ยวข้อง การกำหนดมาตรการกำกับดูแลให้เป็นไปตามระเบียบแบบแผนของทางราชการอย่างเคร่งครัด ตลอดจนการติดตามและประเมินผลหลังเสร็จสิ้นภารกิจอย่างเป็นระบบ${userFactsSentence}${encSentence}${urgencyNote}`;
      break;
    }

    case 'COURTESY_REQUEST': {
      backgroundParagraph = `${refLead}เนื่องด้วย ${agency} อยู่ระหว่างการขับเคลื่อนภารกิจสำคัญตามแผนปฏิบัติราชการในเรื่อง "${subject}"${existingBg ? ` โดย${existingBg}` : ''} ซึ่งจำเป็นต้องอาศัยความร่วมมือและการสนับสนุนเชิงบูรณาการจากภาคส่วนที่เกี่ยวข้องเพื่อให้การดำเนินงานบรรลุวัตถุประสงค์อย่างครบถ้วนสมบูรณ์ การประสานความร่วมมือในครั้งนี้ไม่เพียงช่วยเสริมสร้างประสิทธิภาพและความคล่องตัวในการปฏิบัติราชการเท่านั้น แต่ยังช่วยให้การบริการและการจัดสรรทรัพยากรเป็นไปอย่างคุ้มค่า โปร่งใส และเกิดประโยชน์สูงสุดต่อองค์กรและสาธารณชนโดยรวม`;

      factsParagraph = `ในการนี้ ${agency} ได้จัดเตรียมแผนประสานงาน กำหนดการ ขอบเขตการปฏิบัติงาน และมอบหมายเจ้าหน้าที่ผู้รับผิดชอบในการติดต่อประสานรายละเอียดร่วมกับ${recipient}ไว้อย่างชัดเจนแล้ว เพื่ออำนวยความสะดวกและลดผลกระทบต่อการปฏิบัติงานปกติของทุกฝ่ายให้มากที่สุด${userFactsSentence}${encSentence} ทั้งนี้ ทางหน่วยงานพร้อมดำเนินการตามเงื่อนไข ระเบียบวิธีปฏิบัติ และข้อกำหนดของหน่วยงานท่านอย่างเคร่งครัดตลอดระยะเวลาการดำเนินงาน${urgencyNote}`;
      break;
    }

    case 'MEETING_INVITATION': {
      backgroundParagraph = `${refLead}ด้วย ${agency} เห็นความสำคัญของการบูรณาการความร่วมมือและการแลกเปลี่ยนข้อคิดเห็นระหว่างผู้บริหาร คณะทำงาน และผู้แทนจากหน่วยงานที่เกี่ยวข้อง เพื่อร่วมกันกำหนดทิศทางและซักซ้อมความเข้าใจในการดำเนินงานเรื่อง "${subject}"${existingBg ? ` สืบเนื่องจาก${existingBg}` : ''} ให้เป็นไปในทิศทางเดียวกัน การหารือร่วมกันในคราวนี้จะมีส่วนสำคัญในการกลั่นกรองข้อมูล วิเคราะห์ข้อจำกัด และร่วมกันกำหนดมาตรการปฏิบัติที่สอดคล้องกับบริบทและกฎระเบียบที่เกี่ยวข้องอย่างรอบด้าน`;

      factsParagraph = `ในการนี้ ${agency} จึงได้จัดเตรียมระเบียบวาระการประชุม ข้อมูลประกอบการพิจารณา และกรอบประเด็นสำหรับการอภิปรายแลกเปลี่ยนข้อคิดเห็นไว้พร้อมสรรพแล้ว เพื่อให้การประชุมดำเนินไปอย่างกระชับ มีสาระ และนำไปสู่ข้อสรุปเชิงปฏิบัติที่สามารถขับเคลื่อนได้จริง${userFactsSentence}${encSentence} จึงใคร่ขอความอนุเคราะห์จาก${recipient}หรือผู้แทนผู้มีอำนาจตัดสินใจเข้าร่วมดำเนินการตามวัน เวลา และช่องทางที่ได้นัดหมายไว้เพื่อร่วมกันขับเคลื่อนภารกิจให้สัมฤทธิผล${urgencyNote}`;
      break;
    }

    case 'BORROW_ASSET': {
      backgroundParagraph = `${refLead}เนื่องด้วย ${agency} มีความจำเป็นต้องใช้ครุภัณฑ์ วัสดุอุปกรณ์ หรือทรัพยากรสนับสนุนเพื่อใช้ประกอบการปฏิบัติภารกิจในเรื่อง "${subject}"${existingBg ? ` โดย${existingBg}` : ''} ให้ดำเนินไปด้วยความเรียบร้อย รวดเร็ว และมีประสิทธิภาพสูงสุด การขออนุเคราะห์ใช้งานทรัพยากรดังกล่าวเป็นการบริหารจัดการทรัพยากรส่วนกลางร่วมกันให้เกิดประโยชน์สูงสุดตามหลักความประหยัดและคุ้มค่าของทางราชการ โดยหน่วยงานจะดำเนินการภายใต้กรอบเวลาและวัตถุประสงค์ที่ได้รับอนุญาตเท่านั้น`;

      factsParagraph = `ในการนี้ ${agency} ได้สำรวจรายการความต้องการ ตรวจสอบความพร้อม และจัดทำแผนการรับมอบ การใช้งาน การเก็บรักษา ตลอดจนกำหนดการส่งคืนในสภาพสมบูรณ์ครบถ้วนไว้เรียบร้อยแล้ว โดยมีเจ้าหน้าที่ผู้รับผิดชอบดูแลรับผิดชอบโดยตรงตลอดระยะเวลาการใช้งานและพร้อมรับผิดชอบหากเกิดความชำรุดเสียหายอันเกิดจากการใช้งาน${userFactsSentence}${encSentence}${urgencyNote}`;
      break;
    }

    case 'REPORT_SUBMISSION': {
      backgroundParagraph = `${refLead}ตามที่ ${agency} ได้รับมอบหมายให้ดำเนินการในเรื่อง "${subject}"${existingBg ? ` สืบเนื่องจาก${existingBg}` : ''} เพื่อขับเคลื่อนภารกิจให้เป็นไปตามเป้าหมายและตัวชี้วัดขององค์กร นั้น บัดนี้ การดำเนินงานในส่วนสำคัญได้ดำเนินการเสร็จสิ้นลงเรียบร้อยแล้วตามกรอบระยะเวลา แผนปฏิบัติงาน และระเบียบปฏิบัติของทางราชการอย่างครบถ้วน`;

      factsParagraph = `ในการนี้ ${agency} จึงได้รวบรวมข้อมูล ผลการปฏิบัติงาน ตัวชี้วัดความสำเร็จ ปัญหาอุปสรรค ตลอดจนข้อเสนอแนะเชิงพัฒนา พร้อมจัดทำเอกสารหลักฐานประกอบการรายงานไว้อย่างเป็นระบบและตรวจสอบได้${userFactsSentence}${encSentence} เพื่อเป็นฐานข้อมูลประกอบการประเมินผล การวางแผนงานในระยะต่อไป และการตรวจสอบติดตามผลการปฏิบัติราชการให้เกิดความต่อเนื่องและยั่งยืน${urgencyNote}`;
      break;
    }

    case 'POLICY_COMPLIANCE': {
      backgroundParagraph = `${refLead}ด้วย ${agency} ตระหนักถึงความสำคัญของการปฏิบัติตามนโยบาย มาตรการ และแนวทางปฏิบัติในเรื่อง "${subject}"${existingBg ? ` โดย${existingBg}` : ''} เพื่อให้การปฏิบัติราชการของทุกภาคส่วนเป็นมาตรฐานเดียวกัน มีความถูกต้องตามกฎหมาย กฎ ระเบียบ และมติที่เกี่ยวข้อง ตลอดจนเสริมสร้างความโปร่งใส ความรับผิดชอบ และประสิทธิภาพในการกำกับดูแลภายในหน่วยงานอย่างเข้มแข็ง`;

      factsParagraph = `ในการนี้ ${agency} ได้พิจารณาจัดทำแนวทางซักซ้อมความเข้าใจ กลไกการสื่อสารภายใน รวมถึงขั้นตอนการติดตามตรวจสอบการปฏิบัติตามมาตรการดังกล่าวอย่างเป็นรูปธรรม เพื่อลดความเสี่ยงด้านข้อผิดพลาดในการปฏิบัติงานและสนับสนุนให้เจ้าหน้าที่ทุกระดับสามารถปฏิบัติหน้าที่ได้อย่างถูกต้องมั่นใจ${userFactsSentence}${encSentence}${urgencyNote}`;
      break;
    }

    default: {
      backgroundParagraph = `${refLead}ด้วย ${agency} มีภารกิจและความรับผิดชอบในการดำเนินการเกี่ยวกับเรื่อง "${subject}"${existingBg ? ` สืบเนื่องจาก${existingBg}` : ''} เพื่อส่งเสริมการปฏิบัติงานให้สอดคล้องกับนโยบาย เป้าหมาย และแผนยุทธศาสตร์ของหน่วยงาน การดำเนินการในเรื่องดังกล่าวมีความสำคัญอย่างยิ่งต่อการยกระดับมาตรฐานการให้บริการ การประสานงาน และการบริหารจัดการภายในให้เกิดความคล่องตัว โปร่งใส และตรวจสอบได้ตามหลักการบริหารกิจการบ้านเมืองที่ดี`;

      factsParagraph = `ในการนี้ ${agency} ได้พิจารณาศึกษาข้อมูล ข้อกฎหมาย ระเบียบที่เกี่ยวข้อง ตลอดจนแนวทางปฏิบัติที่เหมาะสมอย่างรอบด้านแล้ว เห็นสมควรจัดเตรียมแผนดำเนินการ ประสานงานกับหน่วยงานและผู้ปฏิบัติงานที่เกี่ยวข้อง พร้อมกำหนดขั้นตอนการกำกับติดตามและประเมินผลการดำเนินงานอย่างเป็นระบบ เพื่อให้การปฏิบัติงานบรรลุวัตถุประสงค์และบังเกิดผลสัมฤทธิ์สูงสุด${userFactsSentence}${encSentence}${urgencyNote}`;
      break;
    }
  }

  if (input.docType === 'EXTERNAL_LETTER') {
    proposalParagraph = isStrict
      ? `จึงเรียนมาเพื่อโปรดพิจารณาให้ความอนุเคราะห์ดำเนินการในส่วนที่เกี่ยวข้อง ทั้งนี้ หากมีข้อขัดข้องหรือความประสงค์ให้ชี้แจงข้อมูลเพิ่มเติมประการใด โปรดแจ้งให้${agency}ทราบเพื่อประสานดำเนินการต่อไป จักเป็นพระคุณยิ่ง`
      : `จึงเรียนมาเพื่อโปรดพิจารณาให้ความอนุเคราะห์และสนับสนุนการดำเนินงานในเรื่องดังกล่าว ทั้งนี้ ${agency} ได้มอบหมายเจ้าหน้าที่เป็นผู้ประสานงานในรายละเอียดร่วมกับหน่วยงานของท่านต่อไปแล้ว จักเป็นพระคุณยิ่ง`;
  } else if (input.docType === 'COMPLETION_REPORT') {
    proposalParagraph = `จึงเรียนมาเพื่อโปรดทราบและพิจารณาผลการดำเนินงานดังกล่าวข้างต้น ทั้งนี้ หากมีข้อสั่งการหรือข้อเสนอแนะเพิ่มเติมประการใด ${agency} พร้อมนำไปดำเนินการปรับปรุงและยกระดับการปฏิบัติงานให้มีประสิทธิภาพยิ่งขึ้นต่อไป`;
  } else {
    proposalParagraph = isStrict
      ? `จึงเรียนมาเพื่อโปรดพิจารณา หากเห็นชอบโปรดพิจารณาอนุมัติหลักการและแนวทางการดำเนินงานดังกล่าว พร้อมทั้งมอบหมายหน่วยงานและเจ้าหน้าที่ผู้รับผิดชอบดำเนินการตามขั้นตอนและระเบียบของทางราชการต่อไป ทั้งนี้ จะได้รายงานผลการดำเนินงานให้ทราบเป็นลำดับต่อไป`
      : `จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติในหลักการและแนวทางการดำเนินงานดังกล่าวข้างต้น และโปรดมอบหมายให้เจ้าหน้าที่ผู้เกี่ยวข้องดำเนินการในส่วนที่เกี่ยวข้องตามระเบียบและขั้นตอนต่อไป ทั้งนี้ จะได้กำกับติดตามและรายงานผลให้ทราบเมื่อเสร็จสิ้นภารกิจ`;
  }

  return {
    backgroundParagraph,
    factsParagraph,
    proposalParagraph,
  };
}
