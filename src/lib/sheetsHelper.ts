/**
 * Pure helper utilities for Google Sheets linking, payload formatting,
 * Apps Script Webhook integration, and UTF-8 BOM CSV exports.
 */

import { CaseRecord, DocumentRecord, TaskRecord, UserProfile } from './types';

export interface BackendSheetsDataset {
  generatedAt: string;
  sheets: Array<{
    name: string;
    headers: string[];
    rows: (string | number)[][];
  }>;
  summary: {
    cases: number;
    documents: number;
    tasks: number;
    incoming: number;
    members: number;
  };
}

/**
 * Extract Spreadsheet ID from either a full Google Sheets URL or a raw ID string.
 */
export function parseSpreadsheetId(input: string): string | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // Raw spreadsheet IDs are typically 20+ alphanumeric/-/_ characters without slashes or spaces
  if (/^[a-zA-Z0-9-_]{15,100}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Validate Google Apps Script Web App URL format.
 */
export function isValidAppsScriptUrl(url: string): boolean {
  const trimmed = (url || '').trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'script.google.com' || parsed.hostname.endsWith('.googleusercontent.com'))
    );
  } catch {
    return false;
  }
}

/**
 * Build structured 5-tab dataset representing all backend data.
 */
export function buildBackendSheetsDataset(input: {
  cases: CaseRecord[];
  documents: DocumentRecord[];
  tasks: TaskRecord[];
  incoming: any[];
  users: Omit<UserProfile, 'password'>[] | UserProfile[];
}): BackendSheetsDataset {
  const casesHeaders = [
    'รหัสเรื่องงาน',
    'ชื่อเรื่อง',
    'ประเภท',
    'หน่วยงาน/กลุ่มงาน',
    'ผู้รับผิดชอบ',
    'สถานะ',
    'ความเร่งด่วน',
    'วันที่เริ่ม',
    'กำหนดส่ง',
    'เลขหนังสือต้นทาง',
    'ไฟล์แนบต้นเรื่อง',
  ];
  const casesRows = (input.cases || []).map((c) => [
    c.code,
    c.title,
    c.type,
    c.departmentName,
    c.ownerName,
    c.status,
    c.priority,
    c.startedAt,
    c.dueDate || '-',
    c.externalBookNo || '-',
    (c.attachments || []).map((a) => a.fileName).join(', ') || '-',
  ]);

  const docsHeaders = [
    'รหัสเอกสาร',
    'รหัสเรื่องงาน',
    'ประเภทเอกสาร',
    'ชื่อเรื่องเอกสาร',
    'ส่วนราชการ',
    'ที่หนังสือ',
    'วันที่เอกสาร',
    'สถานะ',
    'ผู้จัดทำ',
    'ผู้ตรวจ',
  ];
  const docsRows = (input.documents || []).map((d) => [
    d.id,
    d.caseCode,
    d.type,
    d.title,
    d.currentFormData?.agency || '-',
    d.currentFormData?.officialReferenceNo || '-',
    d.currentFormData?.documentDate || '-',
    d.status,
    d.createdByName,
    d.reviewerName || '-',
  ]);

  const tasksHeaders = [
    'รหัสภารกิจ',
    'รหัสเรื่องงาน',
    'ชื่อภารกิจ',
    'ผู้ปฏิบัติงาน',
    'ผู้ตรวจรับรอง',
    'สถานะ',
    'ความสำคัญ',
    'วันที่เริ่ม',
    'กำหนดส่ง',
    'ต้องแนบหลักฐาน',
  ];
  const tasksRows = (input.tasks || []).map((t) => [
    t.id,
    t.caseCode,
    t.title,
    t.assigneeName,
    t.reviewerName,
    t.status,
    t.priority,
    t.startDate,
    t.dueDate,
    t.evidenceRequired ? 'ใช่' : 'ไม่ใช่',
  ]);

  const incomingHeaders = [
    'เลขทะเบียนรับ',
    'เลขที่หนังสือต้นทาง',
    'หน่วยงานต้นทาง',
    'ชื่อเรื่อง',
    'วันที่หนังสือ',
    'วันที่ลงรับ',
    'ชื่อไฟล์แนบ',
  ];
  const incomingRows = (input.incoming || []).map((inc) => [
    inc.intakeNo || '-',
    inc.externalRef || '-',
    inc.originatingAgency || '-',
    inc.subject || '-',
    inc.documentDate || '-',
    inc.receivedDate || '-',
    inc.fileName || '-',
  ]);

  const membersHeaders = [
    'รหัสผู้ใช้',
    'ชื่อ-นามสกุล',
    'อีเมล',
    'กลุ่มงาน',
    'บทบาทสิทธิ์',
    'สถานะบัญชี',
  ];
  const membersRows = (input.users || []).map((u) => [
    u.id,
    u.displayName,
    u.email,
    u.departmentName,
    (u.roles || []).join(', '),
    u.status,
  ]);

  return {
    generatedAt: new Date().toISOString(),
    sheets: [
      { name: 'Cases', headers: casesHeaders, rows: casesRows },
      { name: 'Documents', headers: docsHeaders, rows: docsRows },
      { name: 'Tasks', headers: tasksHeaders, rows: tasksRows },
      { name: 'Incoming', headers: incomingHeaders, rows: incomingRows },
      { name: 'Members', headers: membersHeaders, rows: membersRows },
    ],
    summary: {
      cases: casesRows.length,
      documents: docsRows.length,
      tasks: tasksRows.length,
      incoming: incomingRows.length,
      members: membersRows.length,
    },
  };
}

function escapeCsvCell(value: string | number): string {
  const s = String(value ?? '');
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Generate a UTF-8 BOM CSV containing all backend tables so users can always import into Google Sheets / Excel.
 */
export function buildBackendCsvExport(dataset: BackendSheetsDataset): string {
  const lines: string[] = [];
  dataset.sheets.forEach((sheet, idx) => {
    if (idx > 0) lines.push('');
    lines.push(`### ${sheet.name} ###`);
    lines.push(sheet.headers.map(escapeCsvCell).join(','));
    sheet.rows.forEach((row) => {
      lines.push(row.map(escapeCsvCell).join(','));
    });
  });
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Ready-to-paste Google Apps Script (Code.gs) that links any Google Sheet with GovFlow AI backend.
 */
export function generateGoogleAppsScriptCode(): string {
  return `function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = payload.sheets || [];
    var updated = [];

    for (var i = 0; i < sheets.length; i++) {
      var item = sheets[i];
      var sheet = ss.getSheetByName(item.name);
      if (!sheet) {
        sheet = ss.insertSheet(item.name);
      } else {
        sheet.clearContents();
      }
      var allRows = [item.headers].concat(item.rows || []);
      if (allRows.length > 0 && item.headers.length > 0) {
        sheet.getRange(1, 1, allRows.length, item.headers.length).setValues(allRows);
        sheet.getRange(1, 1, 1, item.headers.length).setFontWeight('bold').setBackground('#ede9fe');
        sheet.setFrozenRows(1);
      }
      updated.push(item.name + ' (' + (item.rows ? item.rows.length : 0) + ')');
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        sheetUrl: ss.getUrl(),
        sheetTitle: ss.getName(),
        updatedTabs: updated,
        syncedAt: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
}
