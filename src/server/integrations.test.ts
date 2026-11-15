import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildBackendCsvExport,
  buildBackendSheetsDataset,
  generateGoogleAppsScriptCode,
  isValidAppsScriptUrl,
  parseSpreadsheetId,
} from '../lib/sheetsHelper';
import { StoreManager } from './mockStore';

test('parseSpreadsheetId extracts IDs from full Google Sheets URLs and raw IDs', () => {
  assert.equal(
    parseSpreadsheetId('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0'),
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  );
  assert.equal(
    parseSpreadsheetId('https://docs.google.com/spreadsheets/d/abcDEF_1234567890-xyz/edit?usp=sharing'),
    'abcDEF_1234567890-xyz'
  );
  assert.equal(
    parseSpreadsheetId('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'),
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  );
  assert.equal(parseSpreadsheetId(''), null);
  assert.equal(parseSpreadsheetId('https://example.com/not-a-sheet'), null);
  assert.equal(parseSpreadsheetId('short'), null);
});

test('isValidAppsScriptUrl validates HTTPS script.google.com Web App URLs only', () => {
  assert.equal(
    isValidAppsScriptUrl('https://script.google.com/macros/s/AKfycbx123456789/exec'),
    true
  );
  assert.equal(
    isValidAppsScriptUrl('https://script.googleusercontent.com/macros/echo?user_content_key=abc'),
    true
  );
  assert.equal(
    isValidAppsScriptUrl('http://script.google.com/macros/s/AKfycbx123/exec'),
    false
  );
  assert.equal(isValidAppsScriptUrl('https://evil.example.com/webhook'), false);
  assert.equal(isValidAppsScriptUrl(''), false);
});

test('buildBackendSheetsDataset & buildBackendCsvExport build 5 structured tabs with UTF-8 BOM and proper CSV escaping', () => {
  const dataset = buildBackendSheetsDataset({
    cases: [
      {
        id: 'case-1',
        code: 'GF-2569-0001',
        title: 'โครงการ "ทดสอบระบบ", ปี ๒๕๖๙',
        description: 'รายละเอียดเรื่องทดสอบ',
        type: 'GENERAL_CORRESPONDENCE',
        originType: 'RECEIVED_LETTER',
        departmentId: 'dept-01',
        departmentName: 'สำนักงานเลขานุการ',
        ownerId: 'usr-admin',
        ownerName: 'ผู้ดูแลระบบ',
        status: 'ACTIVE',
        priority: 'HIGH',
        startedAt: '2026-11-15',
        externalBookNo: 'ศธ 01/100',
        attachments: [
          {
            id: 'att-1',
            fileName: 'scan-letter.png',
            mimeType: 'image/png',
            fileSizeBytes: 2048,
            dataUrl: 'data:image/png;base64,AAA=',
            uploadedAt: '2026-11-15T10:00:00Z',
          },
        ],
        createdAt: '2026-11-15T10:00:00Z',
        updatedAt: '2026-11-15T10:00:00Z',
        version: 1,
      },
    ],
    documents: [],
    tasks: [],
    incoming: [
      {
        id: 'inc-1',
        intakeNo: 'RCV-2569-0001',
        externalRef: 'ศธ 01/100',
        originatingAgency: 'กระทรวงศึกษาธิการ',
        subject: 'เรื่อง\nหลายบรรทัด',
        documentDate: '2026-11-14',
        receivedDate: '2026-11-15',
        fileName: 'scan-letter.png',
      },
    ],
    users: [],
  });

  assert.equal(dataset.sheets.length, 5);
  assert.deepEqual(
    dataset.sheets.map((s) => s.name),
    ['Cases', 'Documents', 'Tasks', 'Incoming', 'Members']
  );
  assert.equal(dataset.summary.cases, 1);
  assert.equal(dataset.summary.incoming, 1);
  assert.equal(dataset.sheets[0].rows[0][10], 'scan-letter.png');

  const csv = buildBackendCsvExport(dataset);
  assert.ok(csv.startsWith('\uFEFF'), 'CSV export must start with UTF-8 BOM for Thai compatibility');
  assert.ok(csv.includes('### Cases ###'));
  assert.ok(csv.includes('"โครงการ ""ทดสอบระบบ"", ปี ๒๕๖๙"'), 'Quotes and commas must be CSV-escaped');
  assert.ok(csv.includes('"เรื่อง\nหลายบรรทัด"'), 'Newlines must be quoted in CSV');

  const appsScript = generateGoogleAppsScriptCode();
  assert.ok(appsScript.includes('function doPost(e)'));
  assert.ok(appsScript.includes('SpreadsheetApp.getActiveSpreadsheet()'));
});

test('StoreManager atomically persists cases with attachments and Google Sheet config across instances', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'govflow-store-test-'));
  const storePath = path.join(tmpDir, 'govflow-store.json');

  try {
    const manager1 = new StoreManager(storePath);
    const store1 = manager1.get();
    store1.cases.push({
      id: 'case-persist-1',
      code: 'GF-2569-0099',
      title: 'เรื่องทดสอบการบันทึกถาวร',
      description: 'ทดสอบระบบบันทึกไฟล์',
      type: 'INTERNAL_OPERATION',
      originType: 'NEW_INITIATIVE',
      departmentId: 'dept-01',
      departmentName: 'สำนักงานเลขานุการ',
      ownerId: 'usr-admin',
      ownerName: 'ผู้ดูแลระบบ',
      status: 'ACTIVE',
      priority: 'NORMAL',
      startedAt: '2026-11-15',
      attachments: [
        {
          id: 'att-persist-1',
          fileName: 'pasted-image.png',
          mimeType: 'image/png',
          fileSizeBytes: 1234,
          dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
          uploadedAt: '2026-11-15T11:00:00Z',
        },
      ],
      createdAt: '2026-11-15T11:00:00Z',
      updatedAt: '2026-11-15T11:00:00Z',
      version: 1,
    });
    store1.googleSheetConfig = {
      linkedSpreadsheetId: 'sheet-xyz-123456789',
      linkedSpreadsheetUrl: 'https://docs.google.com/spreadsheets/d/sheet-xyz-123456789/edit',
      linkedSpreadsheetTitle: 'GovFlow Test Sheet',
      appsScriptWebhookUrl: 'https://script.google.com/macros/s/AKfycbxtest/exec',
      autoSyncEnabled: true,
      lastSyncedAt: '2026-11-15T11:05:00Z',
      lastSyncStatus: 'SUCCESS',
      lastSyncMessage: 'Synced OK',
    };
    manager1.persist();

    assert.equal(fs.existsSync(storePath), true);
    assert.equal(fs.existsSync(`${storePath}.tmp`), false);

    // Reload from disk with a fresh StoreManager instance
    const manager2 = new StoreManager(storePath);
    const store2 = manager2.get();
    assert.equal(store2.cases.length, 1);
    assert.equal(store2.cases[0].code, 'GF-2569-0099');
    assert.equal(store2.cases[0].attachments?.[0]?.fileName, 'pasted-image.png');
    assert.equal(store2.googleSheetConfig.linkedSpreadsheetId, 'sheet-xyz-123456789');
    assert.equal(store2.googleSheetConfig.autoSyncEnabled, true);
    assert.equal(store2.googleSheetConfig.lastSyncStatus, 'SUCCESS');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
