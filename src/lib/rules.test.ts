import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toBuddhistYear,
  toCommonEraYear,
  toThaiNumerals,
  toArabicNumerals,
  applyNumeralStyle,
  formatOfficialThaiDate,
  isOverdue,
} from './dateUtils';
import {
  canTransitionCase,
  canTransitionTask,
  canTransitionDocument,
  evaluateCaseCloseGuard,
  runDocumentPreflight,
  checkUserPermission,
  canUserReviewOwnSubmission,
} from './rules';
import { CaseRecord, DocumentRecord, TaskRecord } from './types';

test('Thai Buddhist Era date conversion and numeral formatting (Thai & Arabic)', () => {
  assert.equal(toBuddhistYear(2026), 2569);
  assert.equal(toCommonEraYear(2569), 2026);
  assert.equal(formatOfficialThaiDate('2026-11-10'), '10 พฤศจิกายน 2569');
  assert.equal(formatOfficialThaiDate('2026-01-01'), '1 มกราคม 2569');
  assert.equal(formatOfficialThaiDate('2026-11-10', 'THAI'), '๑๐ พฤศจิกายน ๒๕๖๙');
  assert.equal(formatOfficialThaiDate('2026-01-01', 'ARABIC'), '1 มกราคม 2569');

  assert.equal(toThaiNumerals('พส 0101/1234 วันที่ 15'), 'พส ๐๑๐๑/๑๒๓๔ วันที่ ๑๕');
  assert.equal(toArabicNumerals('พส ๐๑๐๑/๑๒๓๔ วันที่ ๑๕'), 'พส 0101/1234 วันที่ 15');
  assert.equal(
    toThaiNumerals('ติดต่อ saraban123@agency.go.th โทร 02-123-4567'),
    'ติดต่อ saraban123@agency.go.th โทร ๐๒-๑๒๓-๔๕๖๗'
  );
  assert.equal(applyNumeralStyle('จำนวน 25 ชุด', 'THAI'), 'จำนวน ๒๕ ชุด');
  assert.equal(applyNumeralStyle('จำนวน ๒๕ ชุด', 'ARABIC'), 'จำนวน 25 ชุด');
});

test('Overdue logic computation', () => {
  assert.equal(isOverdue('2026-11-05', '2026-11-10'), true);
  assert.equal(isOverdue('2026-11-15', '2026-11-10'), false);
});

test('Case state transitions enforce correct workflow', () => {
  assert.equal(canTransitionCase('DRAFT', 'OPEN'), true);
  assert.equal(canTransitionCase('OPEN', 'ACTIVE'), true);
  assert.equal(canTransitionCase('ACTIVE', 'READY_TO_CLOSE'), true);
  assert.equal(canTransitionCase('READY_TO_CLOSE', 'CLOSED'), true);
  assert.equal(canTransitionCase('CLOSED', 'REOPENED'), true);
  // Illegal direct jumps
  assert.equal(canTransitionCase('DRAFT', 'CLOSED'), false);
  assert.equal(canTransitionCase('OPEN', 'CLOSED'), false);
});

test('Task state transitions validate progression and block invalid steps', () => {
  assert.equal(canTransitionTask('TODO', 'IN_PROGRESS'), true);
  assert.equal(canTransitionTask('IN_PROGRESS', 'SUBMITTED_FOR_REVIEW'), true);
  assert.equal(canTransitionTask('SUBMITTED_FOR_REVIEW', 'COMPLETED'), true);
  assert.equal(canTransitionTask('SUBMITTED_FOR_REVIEW', 'REVISION_REQUESTED'), true);
  assert.equal(canTransitionTask('TODO', 'COMPLETED'), false); // Cannot jump directly without review
});

test('Document state machine enforces review before finalization', () => {
  assert.equal(canTransitionDocument('DRAFT', 'SUBMITTED_FOR_REVIEW'), true);
  assert.equal(canTransitionDocument('SUBMITTED_FOR_REVIEW', 'REVIEWED'), true);
  assert.equal(canTransitionDocument('REVIEWED', 'FINALIZED'), true);
  assert.equal(canTransitionDocument('DRAFT', 'FINALIZED'), false); // Cannot finalize without review
});

test('Case close guard blocks closing when pending tasks exist', () => {
  const dummyCase: CaseRecord = {
    id: 'c1',
    code: 'GF-2569-001',
    type: 'ACTIVITY_REPORT',
    title: 'โครงการอบรมบุคลากร',
    description: '',
    originType: 'NEW_INITIATIVE',
    departmentId: 'd1',
    departmentName: 'กองบริหาร',
    ownerId: 'u1',
    ownerName: 'สมชาย',
    priority: 'NORMAL',
    status: 'ACTIVE',
    startedAt: '2026-11-01',
    createdAt: '2026-11-01',
    updatedAt: '2026-11-01',
    version: 1,
  };

  const tasksWithPending: TaskRecord[] = [
    {
      id: 't1',
      caseId: 'c1',
      caseCode: 'GF-2569-001',
      title: 'เตรียมสถานที่',
      description: '',
      assigneeId: 'u2',
      assigneeName: 'สมศรี',
      reviewerId: 'u3',
      reviewerName: 'หัวหน้าสมศักดิ์',
      departmentId: 'd1',
      startDate: '2026-11-01',
      dueDate: '2026-11-10',
      priority: 'NORMAL',
      evidenceRequired: true,
      requiredEvidenceList: ['ภาพถ่าย'],
      status: 'IN_PROGRESS',
      version: 1,
      createdAt: '2026-11-01',
      updatedAt: '2026-11-01',
    },
  ];

  const docsClean: DocumentRecord[] = [];

  const blockedResult = evaluateCaseCloseGuard(dummyCase, tasksWithPending, docsClean);
  assert.equal(blockedResult.canClose, false);
  assert.equal(blockedResult.pendingTasksCount, 1);

  // When task is completed, case can be closed
  tasksWithPending[0].status = 'COMPLETED';
  const allowedResult = evaluateCaseCloseGuard(dummyCase, tasksWithPending, docsClean);
  assert.equal(allowedResult.canClose, true);
  assert.equal(allowedResult.unmetConditions.length, 0);
});

test('Anti self-approval rule prevents submitter from reviewing own work', () => {
  assert.equal(canUserReviewOwnSubmission('user-123', 'user-123'), false);
  assert.equal(canUserReviewOwnSubmission('user-123', 'user-456'), true);
});

test('Document preflight enforces mandatory fields and body content', () => {
  const invalidData = {
    agency: '',
    documentDate: '',
    subject: '',
    recipient: '',
    references: [],
    enclosures: [],
    customParagraphs: [],
    signerName: '',
    signerPosition: '',
  };

  const checkFail = runDocumentPreflight(invalidData, 'INTERNAL_MEMO');
  assert.equal(checkFail.passed, false);
  assert.ok(checkFail.errors.length >= 4);

  const validData = {
    agency: 'สำนักบริหารกลาง กรมพัฒนาสังคม',
    documentDate: '2026-11-10',
    subject: 'ขออนุมัติจัดโครงการอบรม',
    recipient: 'อธิบดีกรมพัฒนาสังคม',
    references: [],
    enclosures: [],
    backgroundParagraph: 'ด้วยกลุ่มงานมีภารกิจพัฒนาศักยภาพบุคลากร',
    customParagraphs: [],
    signerName: 'นายประสิทธิ์ สารบรรณ',
    signerPosition: 'ผู้อำนวยการกลุ่มงานบริหาร',
  };

  const checkPass = runDocumentPreflight(validData, 'INTERNAL_MEMO');
  assert.equal(checkPass.passed, true);
  assert.equal(checkPass.errors.length, 0);
});

test('RBAC checks role authorizations', () => {
  assert.equal(checkUserPermission(['STAFF'], 'CREATE_DOC'), true);
  assert.equal(checkUserPermission(['STAFF'], 'REVIEW_DOC'), false);
  assert.equal(checkUserPermission(['REVIEWER'], 'REVIEW_DOC'), true);
  assert.equal(checkUserPermission(['ADMIN'], 'MANAGE_SETTINGS'), true);
  assert.equal(checkUserPermission(['STAFF'], 'MANAGE_SETTINGS'), false);
});
