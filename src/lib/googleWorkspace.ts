/**
 * Google Workspace Real Integration Services
 * - Google Drive: Upload documents (.docx, .pdf)
 * - Google Docs: Export to live editable Google Doc
 * - Google Sheets: Export cases and tasks registry
 * - Gmail: Send official correspondence emails
 *
 * Adheres strictly to Workspace skill rules:
 * - Client-side token authentication
 * - Explicit user confirmation dialogs before mutating/sending
 */

import { CaseRecord, DocumentRecord, TaskRecord, UserProfile } from './types';
import { getAccessToken, googleSignIn } from './firebaseClient';
import { buildBackendSheetsDataset, parseSpreadsheetId } from './sheetsHelper';

/**
 * Ensure valid access token or trigger sign-in popup
 */
export async function getValidToken(): Promise<string> {
  let token = await getAccessToken();
  if (!token) {
    try {
      const res = await googleSignIn();
      if (!res || !res.accessToken) {
        throw new Error('ไม่ได้รับสิทธิ์ Access Token จาก Google Workspace กรุณากด "ดำเนินการต่อ" ในหน้าต่าง Google แล้วอนุญาตสิทธิ์');
      }
      token = res.accessToken;
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';
      if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
        throw new Error(
          'หน้าต่างล็อกอิน Google ถูกปิดก่อนอนุญาตสิทธิ์ (หากพบข้อความ "Google ยังไม่ได้ยืนยันแอปนี้" ให้กด "ดำเนินการต่อ" ด้านล่างซ้าย หรือใช้วิธีเชื่อมโยงผ่าน Apps Script Webhook แทน)'
        );
      }
      if (code === 'auth/popup-blocked') {
        throw new Error('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป Google กรุณาอนุญาตป๊อปอัปสำหรับเว็บไซต์นี้แล้วลองใหม่');
      }
      if (msg.includes('access_denied') || msg.includes('403')) {
        throw new Error(
          'บัญชี Google นี้ถูกจำกัดสิทธิ์ OAuth (403 access_denied) แนะนำให้ใช้ "เชื่อมโยงผ่าน Google Apps Script Webhook URL" ซึ่งใช้งานได้ทุกบัญชีโดยไม่ติดหน้ายืนยันแอป'
        );
      }
      throw new Error(msg || 'ไม่สามารถเชื่อมต่อ Google Workspace ได้');
    }
  }
  return token;
}

/**
 * 1. GOOGLE DRIVE: Upload file (Word or PDF) to Google Drive
 */
export async function uploadDocumentToDrive(
  docId: string,
  fileName: string,
  fileType: 'pdf' | 'docx'
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const token = await getValidToken();

  // 1. Fetch generated blob from server
  const endpoint = `/api/v1/documents/${docId}/export/${fileType}`;
  const fileRes = await fetch(endpoint);
  if (!fileRes.ok) {
    throw new Error('ไม่สามารถดาวน์โหลดไฟล์เอกสารจากระบบได้');
  }
  const fileBlob = await fileRes.blob();
  const mimeType =
    fileType === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  // 2. Multipart upload to Google Drive v3
  const metadata = {
    name: `${fileName}.${fileType}`,
    mimeType,
    description: 'เอกสารราชการส่งออกจากระบบ GovFlow AI',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const reader = new FileReader();
  const base64Data = await new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(fileBlob);
  });

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n` +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Data +
    closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Google Drive Upload Error: ${errText}`);
  }

  const result = await uploadRes.json();
  return {
    id: result.id,
    name: result.name,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
  };
}

/**
 * 2. GOOGLE DOCS: Create a formatted official memo in Google Docs
 */
export async function createGoogleDocFromMemo(payload: {
  title: string;
  agency: string;
  referenceNo: string;
  documentDate: string;
  subject: string;
  recipient: string;
  paragraphs: string[];
  signerName: string;
  signerPosition: string;
  coordinatorName?: string;
  coordinatorPhone?: string;
}): Promise<{ documentId: string; docUrl: string }> {
  const token = await getValidToken();

  // Step A: Create Document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `[GovFlow AI] ${payload.title || payload.subject}`,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Google Docs Create Failed: ${err}`);
  }

  const doc = await createRes.json();
  const documentId = doc.documentId;

  // Step B: Build official memo text in accordance with Thai Gov Standard
  const fullText =
    `\n` +
    `                                 บันทึกข้อความ\n\n` +
    `ส่วนราชการ: ${payload.agency}\n` +
    `ที่: ${payload.referenceNo || 'ที่ อว.......'}                  วันที่: ${payload.documentDate}\n` +
    `เรื่อง: ${payload.subject}\n` +
    `--------------------------------------------------------------------------------------------------------\n` +
    `เรียน  ${payload.recipient}\n\n` +
    payload.paragraphs
      .filter((p) => p && p.trim())
      .map((p) => `        ${p.trim()}`)
      .join('\n\n') +
    `\n\n` +
    `                                                      (ลงชื่อ)........................................................\n` +
    `                                                             (${payload.signerName})\n` +
    `                                                      ตำแหน่ง ${payload.signerPosition}\n\n` +
    (payload.coordinatorName
      ? `___________________________________________________\n` +
        `เบอร์โทรติดต่อผู้ประสานงาน\n` +
        `โทรศัพท์ ${payload.coordinatorPhone || '๐๘๓-๒๓๒๐๒๐๔'}\n` +
        `${payload.coordinatorName}\n`
      : '');

  // Step C: Insert content via batchUpdate
  await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: fullText,
          },
        },
      ],
    }),
  });

  return {
    documentId,
    docUrl: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

/**
 * 3. GOOGLE SHEETS: Export Cases and Tasks registry into a spreadsheet
 */
export async function exportCasesToGoogleSheet(
  cases: CaseRecord[],
  tasks: TaskRecord[]
): Promise<{ spreadsheetId: string; sheetUrl: string }> {
  const token = await getValidToken();

  const title = `ทะเบียนงานและภารกิจราชการ GovFlow AI (${new Date().toLocaleDateString('th-TH')})`;

  // Step A: Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: 'ทะเบียนเรื่องงาน (Cases)' } },
        { properties: { title: 'รายการภารกิจ (Tasks)' } },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Google Sheets Create Failed: ${err}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // Step B: Build Cases rows
  const casesHeader = [
    'รหัสเรื่องงาน',
    'ชื่อเรื่อง',
    'ประเภทงาน',
    'กลุ่มงาน/สาขาวิชา',
    'ผู้รับผิดชอบ',
    'สถานะ',
    'ระดับความเร่งด่วน',
    'วันที่เริ่ม',
    'กำหนดส่ง',
    'เลขหนังสือภายนอก',
  ];

  const casesRows = cases.map((c) => [
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
  ]);

  // Step C: Build Tasks rows
  const tasksHeader = [
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

  const tasksRows = tasks.map((t) => [
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

  // Step D: Write values via batchUpdate
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: "'ทะเบียนเรื่องงาน (Cases)'!A1:J",
          values: [casesHeader, ...casesRows],
        },
        {
          range: "'รายการภารกิจ (Tasks)'!A1:I",
          values: [tasksHeader, ...tasksRows],
        },
      ],
    }),
  });

  return {
    spreadsheetId,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

/**
 * 3B. GOOGLE SHEETS FULL SYNC: Sync ALL backend tables (Cases, Documents, Tasks, Incoming, Members)
 * Supports either creating a brand-new Google Sheet OR linking/updating an existing Sheet URL/ID.
 */
export async function syncAllBackendToGoogleSheet(payload: {
  spreadsheetIdOrUrl?: string;
  title?: string;
  cases: CaseRecord[];
  documents: DocumentRecord[];
  tasks: TaskRecord[];
  incoming: any[];
  users: Omit<UserProfile, 'password'>[] | UserProfile[];
}): Promise<{
  spreadsheetId: string;
  sheetUrl: string;
  title: string;
  summary: { cases: number; documents: number; tasks: number; incoming: number; members: number };
}> {
  const token = await getValidToken();
  const dataset = buildBackendSheetsDataset({
    cases: payload.cases,
    documents: payload.documents,
    tasks: payload.tasks,
    incoming: payload.incoming,
    users: payload.users,
  });

  let spreadsheetId = payload.spreadsheetIdOrUrl
    ? parseSpreadsheetId(payload.spreadsheetIdOrUrl)
    : null;
  let sheetTitle = payload.title || `ฐานข้อมูลหลังบ้าน GovFlow AI (${new Date().toLocaleDateString('th-TH')})`;

  if (payload.spreadsheetIdOrUrl && payload.spreadsheetIdOrUrl.trim() && !spreadsheetId) {
    throw new Error('รูปแบบลิงก์หรือรหัส Google Spreadsheet ไม่ถูกต้อง (ตัวอย่าง: https://docs.google.com/spreadsheets/d/xxxx/edit)');
  }

  if (spreadsheetId) {
    // Check existing spreadsheet metadata & add missing tabs
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!metaRes.ok) {
      const errText = await metaRes.text();
      throw new Error(`ไม่สามารถเข้าถึงสเปรดชีตที่ระบุได้ (กรุณาตรวจสอบสิทธิ์แก้ไขหรือลิงก์): ${errText}`);
    }
    const metaJson = await metaRes.json();
    sheetTitle = metaJson.properties?.title || sheetTitle;
    const existingTabNames = new Set<string>(
      (metaJson.sheets || []).map((s: any) => s.properties?.title).filter(Boolean)
    );
    const missingTabs = dataset.sheets.filter((s) => !existingTabNames.has(s.name));
    if (missingTabs.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: missingTabs.map((t) => ({
            addSheet: { properties: { title: t.name } },
          })),
        }),
      });
    }
  } else {
    // Create brand-new Google Spreadsheet with all 5 tabs
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title: sheetTitle },
        sheets: dataset.sheets.map((s) => ({ properties: { title: s.name } })),
      }),
    });
    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Google Sheets Create Failed: ${errText}`);
    }
    const created = await createRes.json();
    spreadsheetId = created.spreadsheetId;
  }

  // Clear old ranges first then write fresh rows via batchUpdate
  const batchClearRanges = dataset.sheets.map((s) => `'${s.name}'!A1:Z1000`);
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ranges: batchClearRanges }),
  });

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataset.sheets.map((s) => ({
          range: `'${s.name}'!A1`,
          values: [s.headers, ...s.rows],
        })),
      }),
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`ไม่สามารถเขียนข้อมูลลง Google Sheets ได้: ${errText}`);
  }

  return {
    spreadsheetId: spreadsheetId!,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    title: sheetTitle,
    summary: dataset.summary,
  };
}

/**
 * 4. GMAIL: Send official email with UTF-8 Thai subject and optional attachment
 */
export async function sendGmailMessage(payload: {
  to: string;
  subject: string;
  bodyText: string;
  senderName?: string;
  attachment?: {
    filename: string;
    blob: Blob;
  };
}): Promise<{ id: string; threadId: string }> {
  const token = await getValidToken();

  // Helper to convert base64 to base64url format
  const toBase64Url = (base64: string) =>
    base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  let rawMessage = '';

  if (payload.attachment) {
    const boundary = '----=_Part_' + Date.now();
    const reader = new FileReader();
    const base64Content = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const res = reader.result as string;
        resolve(res.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(payload.attachment!.blob);
    });

    const utf8Subject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(payload.subject)))}?=`;

    rawMessage = [
      `To: ${payload.to}`,
      `Subject: ${utf8Subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      btoa(unescape(encodeURIComponent(payload.bodyText))),
      ``,
      `--${boundary}`,
      `Content-Type: application/octet-stream; name="${payload.attachment.filename}"`,
      `Content-Description: ${payload.attachment.filename}`,
      `Content-Disposition: attachment; filename="${payload.attachment.filename}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64Content,
      ``,
      `--${boundary}--`,
    ].join('\r\n');
  } else {
    const utf8Subject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(payload.subject)))}?=`;
    rawMessage = [
      `To: ${payload.to}`,
      `Subject: ${utf8Subject}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      btoa(unescape(encodeURIComponent(payload.bodyText))),
    ].join('\r\n');
  }

  // Base64URL encode the entire RFC 2822 raw message
  const encodedRaw = toBase64Url(btoa(unescape(encodeURIComponent(rawMessage))));

  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encodedRaw,
    }),
  });

  if (!sendRes.ok) {
    const err = await sendRes.text();
    throw new Error(`Gmail Send Error: ${err}`);
  }

  const result = await sendRes.json();
  return {
    id: result.id,
    threadId: result.threadId,
  };
}
