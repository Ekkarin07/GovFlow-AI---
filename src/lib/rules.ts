/**
 * GovFlow AI - Business Rules and State Machine Validation
 * Enforces server-side integrity, RBAC policies, and official document checks.
 */

import { CaseRecord, CaseStatus, DocumentFormData, DocumentRecord, DocumentStatus, TaskRecord, TaskStatus, UserRole } from './types';

// Valid transitions for Case status
export const VALID_CASE_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  DRAFT: ['OPEN', 'CANCELLED'],
  OPEN: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['WAITING_REVIEW', 'READY_TO_CLOSE', 'CANCELLED'],
  WAITING_REVIEW: ['ACTIVE', 'READY_TO_CLOSE', 'CANCELLED'],
  READY_TO_CLOSE: ['CLOSED', 'ACTIVE', 'CANCELLED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['ACTIVE', 'CANCELLED'],
  CANCELLED: [],
};

// Valid transitions for Task status
export const VALID_TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ['IN_PROGRESS', 'BLOCKED', 'CANCELLED'],
  IN_PROGRESS: ['SUBMITTED_FOR_REVIEW', 'BLOCKED', 'CANCELLED'],
  SUBMITTED_FOR_REVIEW: ['COMPLETED', 'REVISION_REQUESTED'],
  REVISION_REQUESTED: ['IN_PROGRESS', 'CANCELLED'],
  BLOCKED: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// Valid transitions for Document status
export const VALID_DOCUMENT_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  DRAFT: ['PRECHECKED', 'SUBMITTED_FOR_REVIEW'],
  PRECHECKED: ['DRAFT', 'SUBMITTED_FOR_REVIEW'],
  SUBMITTED_FOR_REVIEW: ['REVIEWED', 'REVISION_REQUESTED'],
  REVISION_REQUESTED: ['DRAFT', 'SUBMITTED_FOR_REVIEW'],
  REVIEWED: ['FINALIZED', 'ARCHIVED'],
  FINALIZED: ['ARCHIVED'],
  ARCHIVED: [],
};

/**
 * Check if a Case status transition is valid
 */
export function canTransitionCase(from: CaseStatus, to: CaseStatus): boolean {
  return VALID_CASE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Check if a Task status transition is valid
 */
export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TASK_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Check if a Document status transition is valid
 */
export function canTransitionDocument(from: DocumentStatus, to: DocumentStatus): boolean {
  return VALID_DOCUMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface CaseCloseCheckResult {
  canClose: boolean;
  unmetConditions: string[];
  pendingTasksCount: number;
  unreviewedDocsCount: number;
}

/**
 * Guard for closing a Case:
 * A case can ONLY be closed when:
 * 1. All tasks are COMPLETED or CANCELLED (no TODO, IN_PROGRESS, SUBMITTED_FOR_REVIEW, BLOCKED, REVISION_REQUESTED)
 * 2. If task requires evidence, it must be verified/approved
 * 3. All non-draft documents in the case must be in REVIEWED or FINALIZED status (no pending review)
 */
export function evaluateCaseCloseGuard(
  caseRecord: CaseRecord,
  tasks: TaskRecord[],
  documents: DocumentRecord[]
): CaseCloseCheckResult {
  const unmetConditions: string[] = [];

  if (caseRecord.status === 'CLOSED') {
    return {
      canClose: false,
      unmetConditions: ['เรื่องงานนี้ถูกปิดเรียบร้อยแล้ว'],
      pendingTasksCount: 0,
      unreviewedDocsCount: 0,
    };
  }

  // Check tasks
  const pendingTasks = tasks.filter(
    (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
  );

  if (pendingTasks.length > 0) {
    unmetConditions.push(
      `ยังมีภารกิจที่ยังไม่เสร็จสิ้น หรือยังรอตรวจหลักฐานจำนวน ${pendingTasks.length} รายการ`
    );
  }

  // Check documents
  const pendingDocs = documents.filter(
    (d) => d.status === 'SUBMITTED_FOR_REVIEW' || d.status === 'REVISION_REQUESTED'
  );

  if (pendingDocs.length > 0) {
    unmetConditions.push(
      `ยังมีเอกสารที่อยู่ระหว่างรอการตรวจรับรอง หรืออยู่ระหว่างส่งกลับแก้ไขจำนวน ${pendingDocs.length} ฉบับ`
    );
  }

  return {
    canClose: unmetConditions.length === 0,
    unmetConditions,
    pendingTasksCount: pendingTasks.length,
    unreviewedDocsCount: pendingDocs.length,
  };
}

export interface PreflightResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Performs mechanical rule checks on document formData
 */
export function runDocumentPreflight(data: DocumentFormData, type: string): PreflightResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required header fields
  if (!data.agency || data.agency.trim() === '') {
    errors.push('กรุณาระบุชื่อส่วนราชการเจ้าของเรื่อง');
  }

  if (!data.subject || data.subject.trim() === '') {
    errors.push('กรุณาระบุชื่อเรื่องหนังสือ');
  }

  if (!data.recipient || data.recipient.trim() === '') {
    errors.push('กรุณาระบุผู้รับหนังสือ (เรียน...)');
  }

  if (!data.documentDate || data.documentDate.trim() === '') {
    errors.push('กรุณาระบุวันที่ของหนังสือ');
  }

  // Body content requirements
  const hasBackground = Boolean(data.backgroundParagraph && data.backgroundParagraph.trim().length > 0);
  const hasFacts = Boolean(data.factsParagraph && data.factsParagraph.trim().length > 0);
  const hasProposal = Boolean(data.proposalParagraph && data.proposalParagraph.trim().length > 0);
  const hasObjective = Boolean(data.objectiveParagraph && data.objectiveParagraph.trim().length > 0);
  const hasCustom = data.customParagraphs.some((p) => p && p.trim().length > 0);

  if (!hasBackground && !hasFacts && !hasProposal && !hasObjective && !hasCustom) {
    errors.push('ต้องมีเนื้อหาข้อความในตัวหนังสืออย่างน้อย 1 ย่อหน้า');
  }

  // Signatory requirements
  if (!data.signerName || data.signerName.trim() === '') {
    errors.push('กรุณาระบุชื่อ-นามสกุลของผู้ลงนาม');
  }

  if (!data.signerPosition || data.signerPosition.trim() === '') {
    errors.push('กรุณาระบุตำแหน่งของผู้ลงนาม');
  }

  // Non-fatal warnings
  if (type === 'EXTERNAL_LETTER' && !data.valediction) {
    warnings.push('หนังสือภายนอกควรมีคำลงท้ายตามระเบียบ (เช่น ขอแสดงความนับถือ)');
  }

  if (data.enclosures && data.enclosures.length > 0) {
    const missingQuantity = data.enclosures.some((e) => !e.quantity || e.quantity <= 0);
    if (missingQuantity) {
      warnings.push('รายการสิ่งที่ส่งมาด้วยควรระบุจำนวนและหน่วยให้ครบถ้วน');
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * RBAC authorization matrix
 */
export function checkUserPermission(
  roles: UserRole[],
  action: 
    | 'CREATE_CASE' 
    | 'CLOSE_CASE' 
    | 'MANAGE_SETTINGS' 
    | 'ASSIGN_TASK' 
    | 'REVIEW_DOC' 
    | 'REVIEW_EVIDENCE' 
    | 'CREATE_DOC'
): boolean {
  if (roles.includes('ADMIN')) return true;

  switch (action) {
    case 'CREATE_CASE':
      return roles.includes('REGISTRAR') || roles.includes('REVIEWER');
    case 'CLOSE_CASE':
      return roles.includes('REVIEWER');
    case 'MANAGE_SETTINGS':
      return false; // Only admin
    case 'ASSIGN_TASK':
      return roles.includes('REGISTRAR') || roles.includes('REVIEWER');
    case 'REVIEW_DOC':
    case 'REVIEW_EVIDENCE':
      return roles.includes('REVIEWER');
    case 'CREATE_DOC':
      return roles.includes('STAFF') || roles.includes('REGISTRAR') || roles.includes('REVIEWER');
    default:
      return false;
  }
}

/**
 * Anti self-approval check:
 * A user CANNOT approve their own document or task evidence.
 */
export function canUserReviewOwnSubmission(submitterId: string, reviewerId: string): boolean {
  if (submitterId === reviewerId) {
    return false; // Strictly forbidden
  }
  return true;
}
