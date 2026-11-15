/**
 * GovFlow AI - Domain Model and Type Definitions
 * In accordance with GovFlow AI Master Specification v1.1 and Real University/Gov Case Data
 */

export type UserRole = 'ADMIN' | 'REGISTRAR' | 'STAFF' | 'REVIEWER';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  departmentId: string;
  departmentName: string;
  roles: UserRole[];
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  joinedAt: string;
  password?: string; // Stored password set by admin for easy testing and login
}

export interface OrganizationProfile {
  id: string;
  fullName: string;
  shortName: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  headerAgencyName: string;
  defaultSignerName: string;
  defaultSignerPosition: string;
  logoUrl: string;
  bannerUrl: string;
  templateApprovalStatus: 'APPROVED' | 'PENDING' | 'REVISED';
}

export interface Department {
  id: string;
  code: string;
  name: string;
  managerId?: string;
  managerName?: string;
  active: boolean;
}

export type CaseType = 
  | 'ACTIVITY_REPORT'        // การดำเนินการตามหนังสือแจ้งให้จัดกิจกรรมและรายงานผล
  | 'PROCUREMENT'            // การจัดซื้อจัดจ้างและตรวจรับพัสดุ
  | 'GENERAL_CORRESPONDENCE' // การติดต่อราชการทั่วไป
  | 'POLICY_DIRECTIVE'       // การปฏิบัติตามข้อสั่งการ/นโยบาย
  | 'INTERNAL_OPERATION';    // งานดำเนินงานภายในหน่วยงาน

export type CaseStatus = 
  | 'DRAFT' 
  | 'OPEN' 
  | 'ACTIVE' 
  | 'WAITING_REVIEW' 
  | 'READY_TO_CLOSE' 
  | 'CLOSED' 
  | 'REOPENED' 
  | 'CANCELLED';

export type PriorityLevel = 'NORMAL' | 'HIGH' | 'URGENT';

export interface CaseRecord {
  id: string;
  code: string; // e.g. GF-2568-0001 (Internal tenant code, NOT official book no.)
  type: CaseType;
  title: string;
  description: string;
  originType: 'RECEIVED_LETTER' | 'NEW_INITIATIVE';
  departmentId: string;
  departmentName: string;
  ownerId: string;
  ownerName: string;
  priority: PriorityLevel;
  status: CaseStatus;
  startedAt: string;
  dueDate?: string;
  closedAt?: string;
  closedBy?: string;
  closeNote?: string;
  externalBookNo?: string;
  externalBookDate?: string;
  receivedDate?: string;
  originAgency?: string;
  speedLevel?: 'NORMAL' | 'URGENT' | 'VERY_URGENT' | 'TOP_URGENT';
  confidentialityLevel?: 'GENERAL' | 'INTERNAL_ONLY' | 'CONFIDENTIAL';
  attachments?: CaseAttachment[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CaseAttachment {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  dataUrl: string;
  uploadedAt: string;
  uploadedByName?: string;
}

export interface GoogleSheetIntegrationConfig {
  linkedSpreadsheetId?: string;
  linkedSpreadsheetUrl?: string;
  linkedSpreadsheetTitle?: string;
  appsScriptWebhookUrl?: string;
  autoSyncEnabled: boolean;
  lastSyncedAt?: string;
  lastSyncStatus?: 'SUCCESS' | 'ERROR' | 'NEVER';
  lastSyncMessage?: string;
}

export type DocumentType = 'INTERNAL_MEMO' | 'EXTERNAL_LETTER' | 'COMPLETION_REPORT';

export type DocumentStatus = 
  | 'DRAFT' 
  | 'PRECHECKED' 
  | 'SUBMITTED_FOR_REVIEW' 
  | 'REVIEWED' 
  | 'REVISION_REQUESTED' 
  | 'FINALIZED' 
  | 'ARCHIVED';

export interface ReferenceItem {
  id: string;
  bookType: string;
  bookNo: string;
  bookDate: string;
  originAgency: string;
}

export interface EnclosureItem {
  id: string;
  title: string;
  quantity: number;
  unit: string;
  fileAttachmentId?: string;
}

export type NumeralStyle = 'THAI' | 'ARABIC';

export interface DocumentFormData {
  // Memo & Letter Header
  agency: string;
  senderAddress?: string;
  officialReferenceNo?: string;
  documentDate: string; // YYYY-MM-DD
  numeralStyle?: NumeralStyle;
  subject: string;
  recipient: string;
  urgency?: string;
  confidentiality?: string;
  
  // References & Enclosures
  references: ReferenceItem[];
  enclosures: EnclosureItem[];
  
  // Body Paragraphs (Matches the official format)
  backgroundParagraph?: string; // เนื่องจาก...
  factsParagraph?: string;      // ในการนี้...
  proposalParagraph?: string;   // จึงเรียนมาเพื่อโปรดพิจารณา
  objectiveParagraph?: string;
  customParagraphs: string[];
  
  // Signatory & Closing
  salutation?: string;
  valediction?: string;
  signerName: string;
  signerPosition: string;

  // Coordinator / Owner Contact info (bottom-left)
  coordinatorName?: string;
  coordinatorPhone?: string;
  contactDepartment?: string;
  contactPhone?: string;
  contactFax?: string;
  contactEmail?: string;
}

export interface DocumentVersion {
  versionId: string;
  versionNo: number;
  dataSnapshot: DocumentFormData;
  preflightErrors: string[];
  preflightWarnings: string[];
  createdAt: string;
  createdBy: string;
  createdByName: string;
  docxDownloadUrl?: string;
  pdfDownloadUrl?: string;
  status: DocumentStatus;
}

export interface DocumentRecord {
  id: string;
  caseId: string;
  caseCode: string;
  caseTitle: string;
  type: DocumentType;
  title: string;
  templateId: string;
  templateVersion: number;
  formatProfile?: OfficialTemplate['formatProfile'];
  status: DocumentStatus;
  currentFormData: DocumentFormData;
  currentVersionNo: number;
  versions: DocumentVersion[];
  reviewerId?: string;
  reviewerName?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 
  | 'TODO' 
  | 'IN_PROGRESS' 
  | 'SUBMITTED_FOR_REVIEW' 
  | 'COMPLETED' 
  | 'REVISION_REQUESTED' 
  | 'BLOCKED' 
  | 'CANCELLED';

export interface TaskRecord {
  id: string;
  caseId: string;
  caseCode: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  reviewerId: string;
  reviewerName: string;
  departmentId: string;
  startDate: string;
  dueDate: string;
  priority: PriorityLevel;
  evidenceRequired: boolean;
  requiredEvidenceList: string[];
  status: TaskStatus;
  blockedReason?: string;
  revisionNote?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceRecord {
  id: string;
  caseId: string;
  taskId: string;
  taskTitle: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storageUrl: string;
  fileDataUrl?: string;
  description: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewerFeedback?: string;
  uploadedBy: string;
  uploadedByName: string;
  reviewedBy?: string;
  reviewedByName?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface ReviewRecord {
  id: string;
  entityType: 'DOCUMENT' | 'TASK_EVIDENCE';
  entityId: string;
  versionId?: string;
  reviewerId: string;
  reviewerName: string;
  submitterId: string;
  submitterName: string;
  caseId: string;
  status: 'PENDING' | 'APPROVED' | 'REVISION_REQUESTED';
  comments: string;
  submittedAt: string;
  decidedAt?: string;
}

export interface AuditActivity {
  id: string;
  caseId?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  description: string;
  entityType: 'CASE' | 'DOCUMENT' | 'TASK' | 'EVIDENCE' | 'TEMPLATE' | 'SETTINGS' | 'AUTH' | 'WORKSPACE';
  entityId: string;
  occurredAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'TASK_ASSIGNED' | 'REVIEW_REQUESTED' | 'REVISION_REQUIRED' | 'APPROVED' | 'DUE_SOON';
  targetRoute: string;
  read: boolean;
  createdAt: string;
}

export interface OfficialTemplate {
  id: string;
  type: DocumentType;
  title: string;
  code: string;
  currentVersion: number;
  status: 'APPROVED' | 'UNDER_REVIEW' | 'DRAFT' | 'RETIRED';
  verifiedBy: string;
  verifiedAt: string;
  provenance: string;
  formatProfile: {
    paperSize: 'A4';
    marginsMm: { top: number; right: number; bottom: number; left: number };
    bodyFont: string;
    bodyFontSizePt: number;
    garudaHeightMm: number;
    garudaPosition: 'CENTER' | 'LEFT';
  };
  attachedFileName?: string;
  attachedFileSize?: number;
  attachedFileType?: string;
  attachedFileData?: string;
  isCustom?: boolean;
}
