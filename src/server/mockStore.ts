/**
 * GovFlow AI - Server Persistent File + In-Memory Store with Transactions and Audit Logging
 * Universal, agency-agnostic government workflow platform
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  AuditActivity,
  CaseRecord,
  Department,
  DocumentRecord,
  EvidenceRecord,
  GoogleSheetIntegrationConfig,
  NotificationItem,
  OfficialTemplate,
  OrganizationProfile,
  ReviewRecord,
  TaskRecord,
  UserProfile,
} from '../lib/types';

export interface DataStore {
  organization: OrganizationProfile;
  users: UserProfile[];
  departments: Department[];
  cases: CaseRecord[];
  incoming: any[];
  documents: DocumentRecord[];
  tasks: TaskRecord[];
  evidence: EvidenceRecord[];
  reviews: ReviewRecord[];
  auditLogs: AuditActivity[];
  notifications: NotificationItem[];
  templates: OfficialTemplate[];
  googleSheetConfig: GoogleSheetIntegrationConfig;
}

export const initialStore: DataStore = {
  organization: {
    id: 'org-default',
    fullName: 'ส่วนราชการ / หน่วยงานภาครัฐ (กำหนดด้วยตนเอง)',
    shortName: 'ส่วนราชการ',
    code: 'GOV',
    address: 'ระบุที่อยู่ของหน่วยงานหรือส่วนราชการสำหรับใช้ในหนังสือภายนอก',
    phone: '',
    email: '',
    timezone: 'Asia/Bangkok',
    headerAgencyName: '',
    defaultSignerName: '',
    defaultSignerPosition: '',
    logoUrl: 'https://img1.pic.in.th/images/ChatGPT-Image-10-..-2569-06_11_11-1.png',
    bannerUrl: 'https://img2.pic.in.th/GovFlow_AI_Web_Background_1920x1080.png',
    templateApprovalStatus: 'APPROVED',
  },
  users: [
    {
      id: 'usr-admin',
      email: 'admin@govflow.local',
      displayName: 'ผู้ดูแลระบบกลาง (System Admin)',
      avatarUrl: '',
      departmentId: 'dept-01',
      departmentName: 'สำนักงานเลขานุการ / งานบริหารทั่วไป',
      roles: ['ADMIN'],
      status: 'ACTIVE',
      joinedAt: '2026-01-01T08:00:00Z',
      password: 'admin',
    },
    {
      id: 'usr-staff',
      email: 'user@govflow.local',
      displayName: 'เจ้าหน้าที่ผู้ปฏิบัติงาน (Staff)',
      avatarUrl: '',
      departmentId: 'dept-02',
      departmentName: 'กลุ่มงานสารบรรณและการประชุม',
      roles: ['STAFF'],
      status: 'ACTIVE',
      joinedAt: '2026-01-10T08:00:00Z',
      password: '123456',
    },
    {
      id: 'usr-reviewer',
      email: 'reviewer@govflow.local',
      displayName: 'ผู้ตรวจรับรอง / หัวหน้าหน่วยงาน (Reviewer)',
      avatarUrl: '',
      departmentId: 'dept-01',
      departmentName: 'สำนักงานเลขานุการ / งานบริหารทั่วไป',
      roles: ['REVIEWER'],
      status: 'ACTIVE',
      joinedAt: '2026-01-10T08:00:00Z',
      password: '123456',
    },
    {
      id: 'usr-registrar',
      email: 'registrar@govflow.local',
      displayName: 'เจ้าหน้าที่งานสารบรรณกลาง (Registrar)',
      avatarUrl: 'https://img1.pic.in.th/images/ChatGPT-Image-10-..-2569-06_11_11-1.png',
      departmentId: 'dept-02',
      departmentName: 'กลุ่มงานสารบรรณและการประชุม',
      roles: ['REGISTRAR'],
      status: 'ACTIVE',
      joinedAt: '2026-01-15T08:00:00Z',
      password: '123456',
    },
  ],
  departments: [
    {
      id: 'dept-01',
      code: 'ADMIN',
      name: 'สำนักงานเลขานุการ / งานบริหารทั่วไป',
      managerId: 'usr-reviewer',
      managerName: 'ผู้ตรวจรับรอง / หัวหน้าหน่วยงาน',
      active: true,
    },
    {
      id: 'dept-02',
      code: 'SARABAN',
      name: 'กลุ่มงานสารบรรณและการประชุม',
      managerId: 'usr-registrar',
      managerName: 'เจ้าหน้าที่งานสารบรรณกลาง',
      active: true,
    },
    {
      id: 'dept-03',
      code: 'OPERATIONS',
      name: 'กลุ่มงานยุทธศาสตร์และโครงการ',
      managerId: 'usr-reviewer',
      managerName: 'ผู้ตรวจรับรอง / หัวหน้าหน่วยงาน',
      active: true,
    },
  ],
  templates: [
    {
      id: 'tmpl-internal-memo',
      type: 'INTERNAL_MEMO',
      title: 'บันทึกข้อความ (หนังสือภายใน)',
      code: 'T-INT-01',
      currentVersion: 1,
      status: 'APPROVED',
      verifiedBy: 'ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526',
      verifiedAt: '2026-01-01T00:00:00Z',
      provenance: 'ตราครุฑสูง 1.5 ซม. มุมซ้ายบน ห่างขอบบน 1.5 ซม. "บันทึกข้อความ" 29 พอยต์หนา หัวข้อ 20 พอยต์หนา เนื้อหา 16 พอยต์',
      formatProfile: {
        paperSize: 'A4',
        marginsMm: { top: 15, right: 20, bottom: 20, left: 30 },
        bodyFont: 'TH Sarabun New',
        bodyFontSizePt: 16,
        garudaHeightMm: 15,
        garudaPosition: 'LEFT',
      },
    },
    {
      id: 'tmpl-external-letter',
      type: 'EXTERNAL_LETTER',
      title: 'หนังสือภายนอก',
      code: 'T-EXT-01',
      currentVersion: 1,
      status: 'APPROVED',
      verifiedBy: 'ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526',
      verifiedAt: '2026-01-01T00:00:00Z',
      provenance: 'ตราครุฑสูง 3 ซม. กว้าง 2.7 ซม. กึ่งกลางด้านบน ห่างขอบบน 1.5 ซม. ขอบซ้าย 3 ซม. ขวา 2 ซม. ล่าง 2 ซม.',
      formatProfile: {
        paperSize: 'A4',
        marginsMm: { top: 15, right: 20, bottom: 20, left: 30 },
        bodyFont: 'TH Sarabun New',
        bodyFontSizePt: 16,
        garudaHeightMm: 30,
        garudaPosition: 'CENTER',
      },
    },
    {
      id: 'tmpl-completion-report',
      type: 'COMPLETION_REPORT',
      title: 'รายงานสรุปผลการปฏิบัติงาน / จัดกิจกรรม',
      code: 'T-REP-01',
      currentVersion: 1,
      status: 'APPROVED',
      verifiedBy: 'มาตรฐานสารบรรณกลาง',
      verifiedAt: '2026-01-01T00:00:00Z',
      provenance: 'แบบรายงานผลการปฏิบัติงาน สำหรับสรุปผลการจัดกิจกรรม/โครงการและแนบหลักฐาน',
      formatProfile: {
        paperSize: 'A4',
        marginsMm: { top: 15, right: 20, bottom: 20, left: 30 },
        bodyFont: 'TH Sarabun New',
        bodyFontSizePt: 16,
        garudaHeightMm: 20,
        garudaPosition: 'CENTER',
      },
    },
  ],
  cases: [],
  incoming: [],
  documents: [],
  tasks: [],
  evidence: [],
  reviews: [],
  notifications: [],
  auditLogs: [
    {
      id: 'aud-init-001',
      actorId: 'usr-admin',
      actorName: 'ผู้ดูแลระบบกลาง (System Admin)',
      actorRole: 'ADMIN',
      action: 'SYSTEM_INITIALIZED',
      description: 'ระบบ GovFlow AI เริ่มต้นพร้อมใช้งาน (หน่วยงานอิสระ ผู้ใช้กำหนดข้อมูลด้วยตนเอง)',
      entityType: 'SETTINGS',
      entityId: 'org-default',
      occurredAt: new Date().toISOString(),
    },
  ],
  googleSheetConfig: {
    linkedSpreadsheetId: '',
    linkedSpreadsheetUrl: '',
    linkedSpreadsheetTitle: '',
    appsScriptWebhookUrl: '',
    autoSyncEnabled: false,
    lastSyncStatus: 'NEVER',
  },
};

export const DEFAULT_STORE_FILE_PATH = path.join(process.cwd(), '.data', 'govflow-store.json');

export class StoreManager {
  private store: DataStore;
  private filePath: string;

  constructor(filePath: string = DEFAULT_STORE_FILE_PATH) {
    this.filePath = filePath;
    this.store = this.loadFromDisk();
  }

  private cloneInitial(): DataStore {
    return JSON.parse(JSON.stringify(initialStore));
  }

  private loadFromDisk(): DataStore {
    const base = this.cloneInitial();
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        if (raw && raw.trim()) {
          const parsed = JSON.parse(raw) as Partial<DataStore>;
          return {
            ...base,
            ...parsed,
            organization: {
              ...base.organization,
              ...(parsed.organization || {}),
            },
            googleSheetConfig: {
              ...base.googleSheetConfig,
              ...(parsed.googleSheetConfig || {}),
            },
            users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : base.users,
            departments:
              Array.isArray(parsed.departments) && parsed.departments.length > 0
                ? parsed.departments
                : base.departments,
            templates:
              Array.isArray(parsed.templates) && parsed.templates.length > 0
                ? parsed.templates
                : base.templates,
            cases: Array.isArray(parsed.cases) ? parsed.cases : [],
            incoming: Array.isArray(parsed.incoming) ? parsed.incoming : [],
            documents: Array.isArray(parsed.documents) ? parsed.documents : [],
            tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
            evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
            reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
            notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
            auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : base.auditLogs,
          };
        }
      }
    } catch (err) {
      console.warn('Failed to load persisted store file, initializing clean store:', err);
    }
    return base;
  }

  get(): DataStore {
    return this.store;
  }

  getFilePath(): string {
    return this.filePath;
  }

  persist(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.store, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('Failed to persist store to disk:', err);
    }
  }

  reset(): void {
    this.store = this.cloneInitial();
    this.persist();
  }

  addAudit(
    actorId: string,
    actorName: string,
    actorRole: string,
    action: string,
    description: string,
    entityType: AuditActivity['entityType'],
    entityId: string,
    caseId?: string
  ) {
    const audit: AuditActivity = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      caseId,
      actorId,
      actorName,
      actorRole,
      action,
      description,
      entityType,
      entityId,
      occurredAt: new Date().toISOString(),
    };
    this.store.auditLogs.unshift(audit);
    if (this.store.auditLogs.length > 500) {
      this.store.auditLogs.length = 500;
    }
    this.persist();
  }

  addNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationItem['type'],
    targetRoute: string
  ) {
    const notif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      title,
      message,
      type,
      targetRoute,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.store.notifications.unshift(notif);
    this.persist();
  }
}

export const storeManager = new StoreManager();
