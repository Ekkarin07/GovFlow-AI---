import express from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  canTransitionCase,
  canTransitionDocument,
  canTransitionTask,
  canUserReviewOwnSubmission,
  evaluateCaseCloseGuard,
  runDocumentPreflight,
} from './src/lib/rules';
import { generateOfficialDocx, generateOfficialPdf } from './src/server/documentGenerator';
import {
  buildDetailedOfficialDraftFallback,
  buildOfficialDraftSystemInstruction,
  buildOfficialDraftUserPrompt,
  DocumentDraftInput,
  normalizeDraftOutput,
} from './src/server/aiDraftHelper';
import {
  buildBackendCsvExport,
  buildBackendSheetsDataset,
  isValidAppsScriptUrl,
  parseSpreadsheetId,
} from './src/lib/sheetsHelper';
import { storeManager } from './src/server/mockStore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

// Active user session simulation (default: null for clean login view)
let currentUserId: string | null = null;

// Middleware to extract current user from Authorization header or currentUserId
app.use((req, res, next) => {
  const store = storeManager.get();
  const authHeader = req.headers.authorization;
  let userId = currentUserId;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token.startsWith('token-')) {
      userId = token.replace('token-', '');
    } else if (store.users.some((u) => u.id === token)) {
      userId = token;
    }
  }

  const user = store.users.find((u) => u.id === userId) || null;
  (req as any).currentUser = user;

  // Automatically persist store to disk after mutating API calls
  if (req.path.startsWith('/api/v1/') && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        storeManager.persist();
      }
    });
  }

  next();
});

// ================= API ROUTES =================

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'GovFlow AI API', timestamp: new Date().toISOString() });
});

// Current user profile & system context
app.get('/api/v1/me', (req, res) => {
  const user = (req as any).currentUser;
  const store = storeManager.get();
  res.json({
    data: {
      user: user || null,
      allUsers: store.users.map(({ password, ...u }) => u), // Exclude password from general member list
      organization: store.organization,
    },
  });
});

// Email & Password Login
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: { messageTh: 'กรุณากรอกอีเมลและรหัสผ่าน' } });
  }

  const store = storeManager.get();
  const user = store.users.find(
    (u) => u.email.toLowerCase().trim() === email.toLowerCase().trim()
  );

  if (!user) {
    return res.status(401).json({
      error: {
        messageTh: 'ไม่พบบัญชีผู้ใช้งานนี้ในระบบ กรุณาแจ้งผู้ดูแลระบบ (Admin) เพื่อเพิ่มชื่อและกำหนดรหัสผ่านเข้าใช้งาน',
      },
    });
  }

  if (user.status === 'SUSPENDED') {
    return res.status(403).json({
      error: {
        messageTh: 'บัญชีผู้ใช้งานนี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ (Admin)',
      },
    });
  }

  const storedPassword = user.password || '123456';
  if (password.trim() !== storedPassword.trim()) {
    return res.status(401).json({
      error: {
        messageTh: 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบหรือติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่าน',
      },
    });
  }

  currentUserId = user.id;
  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'USER_LOGIN',
    `ผู้ใช้งาน ${user.displayName} เข้าสู่ระบบสำเร็จด้วยรหัสผ่าน`,
    'SETTINGS',
    user.id
  );

  const { password: _, ...userSafe } = user;
  res.json({
    data: {
      user: userSafe,
      token: `token-${user.id}`,
    },
  });
});

// Self-Registration for new users
app.post('/api/v1/auth/register', (req, res) => {
  const { displayName, email, password, departmentId, customDepartmentName } = req.body;
  if (!displayName || !displayName.trim() || !email || !email.trim() || !password || !password.trim()) {
    return res.status(400).json({
      error: { messageTh: 'กรุณากรอกชื่อ-นามสกุล อีเมล และรหัสผ่านให้ครบถ้วน' },
    });
  }

  if (password.trim().length < 4) {
    return res.status(400).json({
      error: { messageTh: 'รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร' },
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const store = storeManager.get();

  const existing = store.users.find((u) => u.email.toLowerCase().trim() === normalizedEmail);
  if (existing) {
    return res.status(409).json({
      error: { messageTh: 'อีเมลนี้ถูกลงทะเบียนในระบบแล้ว กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่านของคุณ' },
    });
  }

  let dept = store.departments.find((d) => d.id === departmentId);
  if (customDepartmentName && customDepartmentName.trim()) {
    const customName = customDepartmentName.trim();
    const matchedDept = store.departments.find(
      (d) => d.name.toLowerCase() === customName.toLowerCase()
    );
    if (matchedDept) {
      dept = matchedDept;
    } else {
      dept = {
        id: `dept-${Date.now()}`,
        code: `ORG-${store.departments.length + 1}`,
        name: customName,
        active: true,
      };
      store.departments.push(dept);
    }
  }
  if (!dept) {
    dept = store.departments[0] || {
      id: 'dept-01',
      code: 'GENERAL',
      name: 'ส่วนงานทั่วไป',
      active: true,
    };
  }

  const newUser = {
    id: `usr-${Date.now()}`,
    email: normalizedEmail,
    displayName: displayName.trim(),
    avatarUrl: '',
    departmentId: dept.id,
    departmentName: dept.name,
    roles: ['STAFF'] as ('ADMIN' | 'STAFF' | 'REVIEWER' | 'REGISTRAR')[],
    status: 'ACTIVE' as const,
    joinedAt: new Date().toISOString(),
    password: password.trim(),
  };

  store.users.push(newUser);
  currentUserId = newUser.id;

  storeManager.addAudit(
    newUser.id,
    newUser.displayName,
    newUser.roles[0],
    'USER_REGISTERED',
    `ลงทะเบียนผู้ใช้งานใหม่ด้วยตนเอง: ${newUser.displayName} (${newUser.email}) สังกัด ${dept.name}`,
    'SETTINGS',
    newUser.id
  );

  const { password: _, ...userSafe } = newUser;
  res.status(201).json({
    data: {
      user: userSafe,
      token: `token-${newUser.id}`,
    },
  });
});

// Google Workspace Login
app.post('/api/v1/auth/google-login', (req, res) => {
  const { email, displayName, photoUrl } = req.body;
  if (!email) {
    return res.status(400).json({ error: { messageTh: 'ข้อมูลอีเมลไม่ถูกต้อง' } });
  }

  const store = storeManager.get();
  let user = store.users.find(
    (u) => u.email.toLowerCase().trim() === email.toLowerCase().trim()
  );

  if (user && user.status === 'SUSPENDED') {
    return res.status(403).json({
      error: { messageTh: 'บัญชีผู้ใช้งานนี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ' },
    });
  }

  if (!user) {
    const dept = store.departments[0] || { id: 'dept-01', name: 'สำนักงานเลขานุการ' };
    user = {
      id: `usr-${Date.now()}`,
      email: email.toLowerCase().trim(),
      displayName: displayName || email,
      avatarUrl: photoUrl || '',
      departmentId: dept.id,
      departmentName: dept.name,
      roles: ['STAFF'],
      status: 'ACTIVE',
      joinedAt: new Date().toISOString(),
      password: 'google-oauth-login',
    };
    store.users.push(user);
  }

  currentUserId = user.id;
  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'USER_GOOGLE_LOGIN',
    `เข้าสู่ระบบด้วย Google Workspace (${user.email})`,
    'SETTINGS',
    user.id
  );

  const { password: _, ...userSafe } = user;
  res.json({
    data: {
      user: userSafe,
      token: `token-${user.id}`,
    },
  });
});

// Logout
app.post('/api/v1/auth/logout', (req, res) => {
  const user = (req as any).currentUser;
  if (user) {
    storeManager.addAudit(
      user.id,
      user.displayName,
      user.roles[0],
      'USER_LOGOUT',
      `ออกจากระบบ`,
      'SETTINGS',
      user.id
    );
  }
  currentUserId = null;
  res.json({ success: true, message: 'ออกจากระบบเรียบร้อยแล้ว' });
});

// Role Switcher (Admin only)
app.post('/api/v1/auth/switch', (req, res) => {
  const currentUser = (req as any).currentUser;
  if (!currentUser || !currentUser.roles.includes('ADMIN')) {
    return res.status(403).json({ error: { messageTh: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สลับบทบาทเพื่อตรวจสอบระบบได้' } });
  }
  const { userId } = req.body;
  const store = storeManager.get();
  const target = store.users.find((u) => u.id === userId);
  if (!target) {
    return res.status(404).json({ error: { messageTh: 'ไม่พบบัญชีผู้ใช้ที่ระบุ' } });
  }
  currentUserId = target.id;
  storeManager.addAudit(
    target.id,
    target.displayName,
    target.roles[0],
    'USER_SWITCHED',
    `สลับการใช้งานเป็น ${target.displayName}`,
    'SETTINGS',
    target.id
  );
  const { password: _, ...targetSafe } = target;
  res.json({ data: { currentUser: targetSafe } });
});

// Organization Profile
app.get('/api/v1/organizations/current', (req, res) => {
  res.json({ data: storeManager.get().organization });
});

app.patch('/api/v1/organizations/current', (req, res) => {
  const user = (req as any).currentUser;
  if (!user || !user.roles.includes('ADMIN')) {
    return res.status(403).json({ error: { messageTh: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่แก้ไขข้อมูลองค์กรได้' } });
  }
  const store = storeManager.get();
  Object.assign(store.organization, req.body);
  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'ORGANIZATION_UPDATED',
    'ปรับปรุงข้อมูลหน่วยงานและการตั้งค่าสารบรรณ',
    'SETTINGS',
    store.organization.id
  );
  res.json({ data: store.organization });
});

// Members & Roles
app.get('/api/v1/members', (req, res) => {
  const store = storeManager.get();
  const safeUsers = store.users.map(({ password, ...u }) => ({
    ...u,
    hasPassword: Boolean(password),
  }));
  res.json({ data: safeUsers });
});

// Admin updates member password
app.patch('/api/v1/members/:id/password', (req, res) => {
  const user = (req as any).currentUser;
  if (!user || !user.roles.includes('ADMIN')) {
    return res.status(403).json({ error: { messageTh: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่กำหนดหรือเปลี่ยนรหัสผ่านได้' } });
  }
  const { newPassword } = req.body;
  if (!newPassword || newPassword.trim().length === 0) {
    return res.status(400).json({ error: { messageTh: 'กรุณาระบุรหัสผ่านใหม่' } });
  }

  const store = storeManager.get();
  const member = store.users.find((u) => u.id === req.params.id);
  if (!member) {
    return res.status(404).json({ error: { messageTh: 'ไม่พบบัญชีผู้ใช้' } });
  }

  member.password = newPassword.trim();
  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'MEMBER_PASSWORD_CHANGED',
    `กำหนดรหัสผ่านใหม่ให้ ${member.displayName} (${member.email})`,
    'SETTINGS',
    member.id
  );

  res.json({ success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
});

// Admin updates member profile, roles, department, or status
app.patch('/api/v1/members/:id', (req, res) => {
  const user = (req as any).currentUser;
  if (!user || !user.roles.includes('ADMIN')) {
    return res.status(403).json({ error: { messageTh: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่แก้ไขสิทธิ์และสถานะสมาชิกได้' } });
  }
  const store = storeManager.get();
  const member = store.users.find((u) => u.id === req.params.id);
  if (!member) {
    return res.status(404).json({ error: { messageTh: 'ไม่พบบัญชีผู้ใช้' } });
  }

  const { displayName, departmentId, roles, status } = req.body;
  if (displayName) member.displayName = displayName.trim();
  if (departmentId) {
    const dept = store.departments.find((d) => d.id === departmentId);
    member.departmentId = departmentId;
    if (dept) member.departmentName = dept.name;
  }
  if (Array.isArray(roles) && roles.length > 0) {
    member.roles = roles;
  }
  if (status && ['ACTIVE', 'INVITED', 'SUSPENDED'].includes(status)) {
    member.status = status;
  }

  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'MEMBER_UPDATED',
    `ปรับปรุงสิทธิ์/สถานะสมาชิก ${member.displayName} (${member.roles.join(', ')}, ${member.status})`,
    'SETTINGS',
    member.id
  );

  const { password: _, ...memberSafe } = member;
  res.json({ data: memberSafe });
});

// Admin deletes member
app.delete('/api/v1/members/:id', (req, res) => {
  const user = (req as any).currentUser;
  if (!user || !user.roles.includes('ADMIN')) {
    return res.status(403).json({ error: { messageTh: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่ลบสมาชิกได้' } });
  }
  if (req.params.id === user.id) {
    return res.status(400).json({ error: { messageTh: 'ไม่สามารถลบบัญชีผู้ดูแลระบบที่กำลังใช้งานอยู่ได้' } });
  }

  const store = storeManager.get();
  const idx = store.users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: { messageTh: 'ไม่พบบัญชีผู้ใช้' } });
  }

  const removed = store.users.splice(idx, 1)[0];
  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'MEMBER_DELETED',
    `ลบบัญชีผู้ใช้งาน ${removed.displayName} (${removed.email})`,
    'SETTINGS',
    removed.id
  );

  res.json({ success: true, message: 'ลบสมาชิกเรียบร้อยแล้ว' });
});

// Admin invites new member with password
app.post('/api/v1/invitations', (req, res) => {
  const user = (req as any).currentUser;
  if (!user || !user.roles.includes('ADMIN')) {
    return res.status(403).json({ error: { messageTh: 'เฉพาะผู้ดูแลระบบเท่านั้นที่เชิญสมาชิกได้' } });
  }
  const { email, displayName, departmentId, roles, password } = req.body;
  if (!email || !displayName || !departmentId) {
    return res.status(400).json({ error: { messageTh: 'กรุณากรอกข้อมูลสมาชิกให้ครบถ้วน' } });
  }

  const store = storeManager.get();
  const dept = store.departments.find((d) => d.id === departmentId);
  const newMember = {
    id: `usr-${Date.now()}`,
    email: email.trim(),
    displayName: displayName.trim(),
    departmentId,
    departmentName: dept ? dept.name : 'ส่วนกลาง',
    roles: roles || ['STAFF'],
    status: 'ACTIVE' as const,
    joinedAt: new Date().toISOString(),
    password: (password || '123456').trim(), // Default simple password as requested by user
  };

  store.users.push(newMember);
  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'MEMBER_INVITED',
    `เพิ่มสมาชิกใหม่ ${displayName} (${email}) ในบทบาท ${roles?.join(', ')} โดยกำหนดรหัสผ่านตั้งต้น`,
    'SETTINGS',
    newMember.id
  );

  const { password: _, ...memberSafe } = newMember;
  res.json({ data: memberSafe });
});

// Departments
app.get('/api/v1/departments', (req, res) => {
  res.json({ data: storeManager.get().departments });
});

app.post('/api/v1/departments', (req, res) => {
  const user = (req as any).currentUser;
  if (!user.roles.includes('ADMIN')) {
    return res.status(403).json({ error: { messageTh: 'เฉพาะผู้ดูแลระบบเท่านั้นที่เพิ่มกลุ่มงานได้' } });
  }
  const { code, name, managerId } = req.body;
  const store = storeManager.get();
  const manager = store.users.find((u) => u.id === managerId);
  const newDept = {
    id: `dept-${Date.now()}`,
    code: code || 'NEW',
    name,
    managerId,
    managerName: manager ? manager.displayName : undefined,
    active: true,
  };
  store.departments.push(newDept);
  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'DEPARTMENT_CREATED',
    `เพิ่มกลุ่มงานใหม่ "${newDept.name}" (${newDept.code})`,
    'SETTINGS',
    newDept.id
  );
  res.json({ data: newDept });
});

app.delete('/api/v1/departments/:id', (req, res) => {
  const user = (req as any).currentUser;
  if (!user || !user.roles.includes('ADMIN')) {
    return res.status(403).json({ error: { messageTh: 'เฉพาะผู้ดูแลระบบเท่านั้นที่ลบกลุ่มงานได้' } });
  }
  const store = storeManager.get();
  const idx = store.departments.findIndex((d) => d.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: { messageTh: 'ไม่พบกลุ่มงานที่ระบุ' } });
  }
  const removed = store.departments.splice(idx, 1)[0];
  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'DEPARTMENT_DELETED',
    `ลบกลุ่มงาน "${removed.name}"`,
    'SETTINGS',
    removed.id
  );
  res.json({ success: true });
});

// Admin Reset Operational Data
app.post('/api/v1/admin/reset-data', (req, res) => {
  const user = (req as any).currentUser;
  if (!user || !user.roles.includes('ADMIN')) {
    return res.status(403).json({ error: { messageTh: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่ล้างข้อมูลระบบได้' } });
  }
  const store = storeManager.get();
  store.cases = [];
  store.incoming = [];
  store.documents = [];
  store.tasks = [];
  store.evidence = [];
  store.reviews = [];
  store.notifications = [];

  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'ADMIN_DATA_RESET',
    'ผู้ดูแลระบบสั่งล้างข้อมูลการดำเนินงานทั้งหมด (เรื่องงาน, ภารกิจ, เอกสาร, หนังสือเข้า) กลับสู่ค่าเริ่มต้นว่าง',
    'SETTINGS',
    'system'
  );
  res.json({ success: true, message: 'ล้างข้อมูลดำเนินงานทั้งหมดเรียบร้อยแล้ว' });
});

// Cases (เรื่องงาน)
app.get('/api/v1/cases', (req, res) => {
  const { search, status, priority, departmentId } = req.query;
  let items = storeManager.get().cases;

  if (status && status !== 'ALL') {
    items = items.filter((c) => c.status === status);
  }
  if (priority && priority !== 'ALL') {
    items = items.filter((c) => c.priority === priority);
  }
  if (departmentId && departmentId !== 'ALL') {
    items = items.filter((c) => c.departmentId === departmentId);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    items = items.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.externalBookNo && c.externalBookNo.toLowerCase().includes(q))
    );
  }

  res.json({ data: items });
});

app.get('/api/v1/cases/:id', (req, res) => {
  const store = storeManager.get();
  const found = store.cases.find((c) => c.id === req.params.id);
  if (!found) {
    return res.status(404).json({ error: { messageTh: 'ไม่พบเรื่องงานที่ระบุ' } });
  }

  // Correlated resources
  const caseTasks = store.tasks.filter((t) => t.caseId === found.id);
  const caseDocs = store.documents.filter((d) => d.caseId === found.id);
  const caseEvidence = store.evidence.filter((e) => e.caseId === found.id);
  const caseTimelines = store.auditLogs.filter((a) => a.caseId === found.id);
  const closeGuard = evaluateCaseCloseGuard(found, caseTasks, caseDocs);

  res.json({
    data: {
      caseRecord: found,
      tasks: caseTasks,
      documents: caseDocs,
      evidence: caseEvidence,
      timelines: caseTimelines,
      closeGuard,
    },
  });
});

app.post('/api/v1/cases', (req, res) => {
  const user = (req as any).currentUser;
  const store = storeManager.get();
  const {
    title,
    description,
    type,
    originType,
    departmentId,
    priority,
    dueDate,
    externalBookNo,
    externalBookDate,
    receivedDate,
    originAgency,
    speedLevel,
    confidentialityLevel,
    attachments,
  } = req.body;

  if (!title || !type || !departmentId) {
    return res.status(400).json({ error: { messageTh: 'กรุณากรอกชื่อเรื่อง ประเภท และหน่วยงาน' } });
  }

  const dept = store.departments.find((d) => d.id === departmentId);
  const seq = String(store.cases.length + 1).padStart(4, '0');
  const code = `GF-2569-${seq}`;

  const normalizedAttachments = Array.isArray(attachments)
    ? attachments
        .filter((a) => a && typeof a.fileName === 'string')
        .map((a) => ({
          id: a.id || `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          fileName: a.fileName,
          fileSizeBytes: Number(a.fileSizeBytes) || 0,
          mimeType: a.mimeType || 'application/octet-stream',
          dataUrl: a.dataUrl || '',
          uploadedAt: a.uploadedAt || new Date().toISOString(),
          uploadedByName: a.uploadedByName || user.displayName,
        }))
    : [];

  const newCase = {
    id: `case-${Date.now()}`,
    code,
    type,
    title,
    description: description || '',
    originType: originType || 'NEW_INITIATIVE',
    departmentId,
    departmentName: dept ? dept.name : 'ส่วนกลาง',
    ownerId: user.id,
    ownerName: user.displayName,
    priority: priority || 'NORMAL',
    status: 'ACTIVE' as const,
    startedAt: new Date().toISOString().split('T')[0],
    dueDate: dueDate || undefined,
    externalBookNo,
    externalBookDate,
    receivedDate,
    originAgency,
    speedLevel,
    confidentialityLevel: confidentialityLevel || 'GENERAL',
    attachments: normalizedAttachments,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };

  store.cases.unshift(newCase);

  // Also log to Incoming correspondence registry if originating from an external letter
  if ((originType === 'RECEIVED_LETTER' || externalBookNo) && (externalBookNo || normalizedAttachments.length > 0)) {
    const intakeNo = `IN-2569-${String(store.incoming.length + 1).padStart(4, '0')}`;
    const firstAtt = normalizedAttachments[0];
    store.incoming.unshift({
      id: `inc-${Date.now()}`,
      intakeNo,
      externalRef: externalBookNo || '-',
      originatingAgency: originAgency || '-',
      subject: title,
      documentDate: externalBookDate || new Date().toISOString().split('T')[0],
      receivedDate: receivedDate || new Date().toISOString().split('T')[0],
      fileName: firstAtt?.fileName || '-',
      fileSizeBytes: firstAtt?.fileSizeBytes || 0,
      mimeType: firstAtt?.mimeType,
      fileDataUrl: firstAtt?.dataUrl,
      linkedCaseId: newCase.id,
      linkedCaseCode: newCase.code,
      createdByName: user.displayName,
      createdAt: new Date().toISOString(),
    });
  }

  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'CASE_CREATED',
    `เปิดเรื่องงานใหม่ ${code}: ${title}${normalizedAttachments.length > 0 ? ` (แนบไฟล์ ${normalizedAttachments.length} รายการ)` : ''}`,
    'CASE',
    newCase.id,
    newCase.id
  );

  res.json({ data: newCase });
});

// Case Close Guard Endpoint
app.post('/api/v1/cases/:id/close', (req, res) => {
  const user = (req as any).currentUser;
  if (!user.roles.includes('REVIEWER') && !user.roles.includes('ADMIN')) {
    return res.status(403).json({ error: { messageTh: 'เฉพาะผู้ตรวจหรือผู้ดูแลระบบเท่านั้นที่มีสิทธิ์ปิดเรื่องงาน' } });
  }

  const store = storeManager.get();
  const targetCase = store.cases.find((c) => c.id === req.params.id);
  if (!targetCase) {
    return res.status(404).json({ error: { messageTh: 'ไม่พบเรื่องงาน' } });
  }

  const caseTasks = store.tasks.filter((t) => t.caseId === targetCase.id);
  const caseDocs = store.documents.filter((d) => d.caseId === targetCase.id);
  const check = evaluateCaseCloseGuard(targetCase, caseTasks, caseDocs);

  if (!check.canClose) {
    return res.status(422).json({
      error: {
        code: 'CASE_CLOSE_GUARD_FAILED',
        messageTh: 'ไม่สามารถปิดเรื่องงานได้เนื่องจากเงื่อนไขความสมบูรณ์ยังไม่ครบถ้วน',
        details: check.unmetConditions,
      },
    });
  }

  targetCase.status = 'CLOSED';
  targetCase.closedAt = new Date().toISOString();
  targetCase.closedBy = user.displayName;
  targetCase.closeNote = req.body.note || 'ตรวจทานภารกิจและเอกสารครบถ้วนเรียบร้อย';
  targetCase.updatedAt = new Date().toISOString();

  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'CASE_CLOSED',
    `ปิดเรื่องงาน ${targetCase.code}: ${targetCase.title} โดยมีภารกิจเสร็จสิ้น ${caseTasks.length} รายการ`,
    'CASE',
    targetCase.id,
    targetCase.id
  );

  res.json({ data: targetCase });
});

// Case Reopen Endpoint
app.post('/api/v1/cases/:id/reopen', (req, res) => {
  const user = (req as any).currentUser;
  if (!user.roles.includes('REVIEWER') && !user.roles.includes('ADMIN')) {
    return res.status(403).json({ error: { messageTh: 'เฉพาะผู้ตรวจหรือผู้ดูแลระบบเท่านั้นที่สามารถเปิดเรื่องซ้ำได้' } });
  }
  const { reason } = req.body;
  if (!reason || reason.trim() === '') {
    return res.status(400).json({ error: { messageTh: 'ต้องระบุเหตุผลในการขอเปิดเรื่องซ้ำ' } });
  }

  const store = storeManager.get();
  const targetCase = store.cases.find((c) => c.id === req.params.id);
  if (!targetCase) {
    return res.status(404).json({ error: { messageTh: 'ไม่พบเรื่องงาน' } });
  }

  targetCase.status = 'ACTIVE';
  targetCase.updatedAt = new Date().toISOString();

  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'CASE_REOPENED',
    `เปิดเรื่องซ้ำ ${targetCase.code} เหตุผล: ${reason}`,
    'CASE',
    targetCase.id,
    targetCase.id
  );

  res.json({ data: targetCase });
});

// Incoming Letters (ทะเบียนรับ)
app.get('/api/v1/incoming', (req, res) => {
  res.json({ data: storeManager.get().incoming });
});

app.post('/api/v1/incoming', (req, res) => {
  const user = (req as any).currentUser;
  const store = storeManager.get();
  const {
    externalRef,
    originatingAgency,
    subject,
    documentDate,
    receivedDate,
    fileName,
    fileDataUrl,
    mimeType,
    fileSizeBytes,
  } = req.body;

  const intakeNo = `IN-2569-${String(store.incoming.length + 1).padStart(4, '0')}`;
  const newIntake = {
    id: `inc-${Date.now()}`,
    intakeNo,
    externalRef: externalRef || '-',
    originatingAgency: originatingAgency || '-',
    subject: subject || 'หนังสือรับราชการ',
    documentDate: documentDate || new Date().toISOString().split('T')[0],
    receivedDate: receivedDate || new Date().toISOString().split('T')[0],
    fileName: fileName || '-',
    fileSizeBytes: Number(fileSizeBytes) || 0,
    mimeType: mimeType || undefined,
    fileDataUrl: fileDataUrl || undefined,
    createdByName: user.displayName,
    createdAt: new Date().toISOString(),
  };

  store.incoming.unshift(newIntake);
  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'INCOMING_LETTER_LOGGED',
    `ลงรับหนังสือเข้า ${intakeNo} เลขที่ ${externalRef || '-'} เรื่อง: ${subject}`,
    'CASE',
    newIntake.id
  );

  res.json({ data: newIntake });
});

// Documents
app.get('/api/v1/documents', (req, res) => {
  const { caseId } = req.query;
  let docs = storeManager.get().documents;
  if (caseId) {
    docs = docs.filter((d) => d.caseId === caseId);
  }
  res.json({ data: docs });
});

app.get('/api/v1/documents/:id', (req, res) => {
  const doc = storeManager.get().documents.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: { messageTh: 'ไม่พบเอกสาร' } });
  }
  res.json({ data: doc });
});

app.post('/api/v1/documents', (req, res) => {
  const user = (req as any).currentUser;
  const store = storeManager.get();
  const { caseId, type, title, templateId, formData, formatProfile } = req.body;

  let targetCase = store.cases.find((c) => c.id === caseId);
  if (!targetCase) {
    const seq = String(store.cases.length + 1).padStart(4, '0');
    const createdCase = {
      id: `case-${Date.now()}`,
      code: `GF-2569-${seq}`,
      type: 'GENERAL_CORRESPONDENCE' as const,
      title: title || 'งานจัดทำเอกสารราชการ',
      description: 'เรื่องงานจัดทำเอกสารราชการทั่วไป',
      originType: 'NEW_INITIATIVE' as const,
      departmentId: store.departments[0]?.id || 'dept-01',
      departmentName: store.departments[0]?.name || 'สำนักงานเลขานุการ',
      ownerId: user ? user.id : 'usr-staff',
      ownerName: user ? user.displayName : 'เจ้าหน้าที่',
      priority: 'NORMAL' as const,
      status: 'ACTIVE' as const,
      startedAt: new Date().toISOString().split('T')[0],
      confidentialityLevel: 'GENERAL' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    store.cases.unshift(createdCase);
    targetCase = createdCase;
  }

  const resolvedCase = targetCase;
  const matchedTemplate = templateId
    ? store.templates.find((t) => t.id === templateId)
    : undefined;
  const resolvedType = type || matchedTemplate?.type || 'INTERNAL_MEMO';
  const defaultProfile =
    resolvedType === 'EXTERNAL_LETTER'
      ? {
          paperSize: 'A4' as const,
          marginsMm: { top: 15, right: 20, bottom: 20, left: 30 },
          bodyFont: 'TH Sarabun New',
          bodyFontSizePt: 16,
          garudaHeightMm: 30,
          garudaPosition: 'CENTER' as const,
        }
      : resolvedType === 'COMPLETION_REPORT'
      ? {
          paperSize: 'A4' as const,
          marginsMm: { top: 15, right: 20, bottom: 20, left: 30 },
          bodyFont: 'TH Sarabun New',
          bodyFontSizePt: 16,
          garudaHeightMm: 20,
          garudaPosition: 'CENTER' as const,
        }
      : {
          paperSize: 'A4' as const,
          marginsMm: { top: 15, right: 20, bottom: 20, left: 30 },
          bodyFont: 'TH Sarabun New',
          bodyFontSizePt: 16,
          garudaHeightMm: 15,
          garudaPosition: 'LEFT' as const,
        };
  const resolvedFormatProfile = formatProfile || matchedTemplate?.formatProfile || defaultProfile;
  const reviewer = store.users.find((u) => u.roles.includes('REVIEWER')) || store.users[0];

  const newDoc = {
    id: `doc-${Date.now()}`,
    caseId: resolvedCase.id,
    caseCode: resolvedCase.code,
    caseTitle: resolvedCase.title,
    type: resolvedType,
    title: title || 'ร่างหนังสือราชการ',
    templateId: templateId || matchedTemplate?.id || (resolvedType === 'EXTERNAL_LETTER' ? 'tmpl-external-letter' : 'tmpl-internal-memo'),
    templateVersion: matchedTemplate?.currentVersion || 1,
    formatProfile: resolvedFormatProfile,
    status: 'DRAFT' as const,
    currentVersionNo: 1,
    createdBy: user ? user.id : 'usr-staff',
    createdByName: user ? user.displayName : 'เจ้าหน้าที่',
    reviewerId: reviewer.id,
    reviewerName: reviewer.displayName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentFormData: formData || {
      agency: store.organization.fullName || resolvedCase.departmentName,
      senderAddress: store.organization.address || '',
      officialReferenceNo: '',
      documentDate: new Date().toISOString().split('T')[0],
      subject: resolvedCase.title,
      recipient: '',
      references: [],
      enclosures: [],
      backgroundParagraph: '',
      factsParagraph: '',
      proposalParagraph: 'จึงเรียนมาเพื่อโปรดพิจารณา',
      customParagraphs: [],
      salutation: 'เรียน',
      valediction: resolvedType === 'EXTERNAL_LETTER' ? 'ขอแสดงความนับถือ' : '',
      signerName: store.organization.defaultSignerName,
      signerPosition: store.organization.defaultSignerPosition,
      contactDepartment: resolvedCase.departmentName || '',
      contactPhone: store.organization.phone || '',
      contactEmail: store.organization.email || '',
    },
    versions: [],
  };

  store.documents.unshift(newDoc);
  if (user) {
    storeManager.addAudit(
      user.id,
      user.displayName,
      user.roles[0],
      'DOCUMENT_CREATED',
      `สร้างเอกสารใหม่ "${newDoc.title}" ในเรื่อง ${resolvedCase.code}`,
      'DOCUMENT',
      newDoc.id,
      resolvedCase.id
    );
  }

  res.json({ data: newDoc });
});

app.patch('/api/v1/documents/:id/draft', (req, res) => {
  const store = storeManager.get();
  const doc = store.documents.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: { messageTh: 'ไม่พบเอกสาร' } });
  }

  const { title, type, formatProfile, currentFormData } = req.body;
  if (title) doc.title = title;
  if (type) doc.type = type;
  if (formatProfile) doc.formatProfile = formatProfile;
  if (currentFormData) doc.currentFormData = currentFormData;
  doc.updatedAt = new Date().toISOString();

  res.json({ data: doc });
});

app.post('/api/v1/documents/:id/preflight', (req, res) => {
  const store = storeManager.get();
  const doc = store.documents.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: { messageTh: 'ไม่พบเอกสาร' } });
  }

  const result = runDocumentPreflight(doc.currentFormData, doc.type);
  res.json({ data: result });
});

app.post('/api/v1/documents/:id/submit-review', (req, res) => {
  const user = (req as any).currentUser;
  const store = storeManager.get();
  const doc = store.documents.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: { messageTh: 'ไม่พบเอกสาร' } });
  }

  const preflight = runDocumentPreflight(doc.currentFormData, doc.type);
  if (!preflight.passed) {
    return res.status(422).json({
      error: {
        code: 'PREFLIGHT_BLOCKED',
        messageTh: 'ไม่สามารถส่งตรวจได้เนื่องจากยังมีข้อมูลจำเป็นไม่ครบถ้วน',
        details: preflight.errors,
      },
    });
  }

  const nextVer = doc.currentVersionNo + 1;
  const newVersion = {
    versionId: `ver-${Date.now()}`,
    versionNo: nextVer,
    dataSnapshot: JSON.parse(JSON.stringify(doc.currentFormData)),
    preflightErrors: preflight.errors,
    preflightWarnings: preflight.warnings,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    createdByName: user.displayName,
    status: 'SUBMITTED_FOR_REVIEW' as const,
  };

  doc.currentVersionNo = nextVer;
  doc.versions.push(newVersion);
  doc.status = 'SUBMITTED_FOR_REVIEW';
  doc.updatedAt = new Date().toISOString();

  // Review request record
  const reviewer = store.users.find((u) => u.id === doc.reviewerId) || store.users.find((u) => u.roles.includes('REVIEWER'));
  if (reviewer) {
    const revRecord = {
      id: `rev-${Date.now()}`,
      entityType: 'DOCUMENT' as const,
      entityId: doc.id,
      versionId: newVersion.versionId,
      reviewerId: reviewer.id,
      reviewerName: reviewer.displayName,
      submitterId: user.id,
      submitterName: user.displayName,
      caseId: doc.caseId,
      status: 'PENDING' as const,
      comments: req.body.submitNote || 'ขอความอนุเคราะห์ตรวจร่างเอกสาร',
      submittedAt: new Date().toISOString(),
    };
    store.reviews.push(revRecord);

    storeManager.addNotification(
      reviewer.id,
      'มีเอกสารราชการรอตรวจ',
      `${user.displayName} ได้ส่ง "${doc.title}" เพื่อรอการตรวจรับรอง`,
      'REVIEW_REQUESTED',
      `/reviews/documents/${doc.id}`
    );
  }

  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'DOCUMENT_SUBMITTED',
    `ส่งเอกสาร "${doc.title}" เวอร์ชัน ${nextVer} ให้ผู้ตรวจ`,
    'DOCUMENT',
    doc.id,
    doc.caseId
  );

  res.json({ data: doc });
});

// Document Exports (Genuine DOCX & PDF)
app.get('/api/v1/documents/:id/export/docx', async (req, res) => {
  const store = storeManager.get();
  const doc = store.documents.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).send('Document not found');
  }

  try {
    const matchedTmpl = store.templates.find((t) => t.id === doc.templateId);
    const buffer = await generateOfficialDocx(
      doc.type,
      doc.currentFormData,
      store.organization.fullName,
      doc.formatProfile || matchedTmpl?.formatProfile
    );
    const filename = encodeURIComponent(`${doc.title || 'document'}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`);
    res.send(buffer);
  } catch (err) {
    console.error('Error generating docx:', err);
    res.status(500).json({ error: { messageTh: 'เกิดข้อผิดพลาดในการสร้างไฟล์ Word' } });
  }
});

app.get('/api/v1/documents/:id/export/pdf', async (req, res) => {
  const store = storeManager.get();
  const doc = store.documents.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).send('Document not found');
  }

  try {
    const matchedTmpl = store.templates.find((t) => t.id === doc.templateId);
    const buffer = await generateOfficialPdf(
      doc.type,
      doc.currentFormData,
      store.organization.fullName,
      doc.formatProfile || matchedTmpl?.formatProfile
    );
    const filename = encodeURIComponent(`${doc.title || 'document'}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"; filename*=UTF-8''${filename}`);
    res.send(buffer);
  } catch (err) {
    console.error('Error generating pdf:', err);
    res.status(500).json({ error: { messageTh: 'เกิดข้อผิดพลาดในการสร้างไฟล์ PDF' } });
  }
});

// Tasks (ภารกิจ)
app.get('/api/v1/tasks', (req, res) => {
  const { caseId, assigneeId, status } = req.query;
  let items = storeManager.get().tasks;
  if (caseId) items = items.filter((t) => t.caseId === caseId);
  if (assigneeId) items = items.filter((t) => t.assigneeId === assigneeId);
  if (status && status !== 'ALL') items = items.filter((t) => t.status === status);
  res.json({ data: items });
});

app.post('/api/v1/tasks', (req, res) => {
  const user = (req as any).currentUser;
  const store = storeManager.get();
  const {
    caseId,
    title,
    description,
    assigneeId,
    reviewerId,
    departmentId,
    startDate,
    dueDate,
    priority,
    evidenceRequired,
    requiredEvidenceList,
  } = req.body;

  const targetCase = store.cases.find((c) => c.id === caseId);
  if (!targetCase) {
    return res.status(400).json({ error: { messageTh: 'ไม่พบเรื่องงานที่ระบุ' } });
  }

  const assignee = store.users.find((u) => u.id === assigneeId) || user;
  const reviewer = store.users.find((u) => u.id === reviewerId) || store.users.find((u) => u.roles.includes('REVIEWER')) || user;

  const newTask = {
    id: `tsk-${Date.now()}`,
    caseId,
    caseCode: targetCase.code,
    title,
    description: description || '',
    assigneeId: assignee.id,
    assigneeName: assignee.displayName,
    reviewerId: reviewer.id,
    reviewerName: reviewer.displayName,
    departmentId: departmentId || targetCase.departmentId,
    startDate: startDate || new Date().toISOString().split('T')[0],
    dueDate: dueDate || new Date().toISOString().split('T')[0],
    priority: priority || 'NORMAL',
    evidenceRequired: evidenceRequired ?? true,
    requiredEvidenceList: requiredEvidenceList || ['รายงานผลการปฏิบัติงาน'],
    status: 'TODO' as const,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.tasks.push(newTask);
  storeManager.addNotification(
    assignee.id,
    'คุณได้รับมอบหมายภารกิจใหม่',
    `ภารกิจ "${title}" ในเรื่อง ${targetCase.code} กำหนดส่ง ${dueDate}`,
    'TASK_ASSIGNED',
    `/tasks/${newTask.id}`
  );

  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'TASK_ASSIGNED',
    `มอบหมายภารกิจ "${title}" ให้ ${assignee.displayName}`,
    'TASK',
    newTask.id,
    targetCase.id
  );

  res.json({ data: newTask });
});

app.post('/api/v1/tasks/:id/transitions', (req, res) => {
  const user = (req as any).currentUser;
  const store = storeManager.get();
  const task = store.tasks.find((t) => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: { messageTh: 'ไม่พบภารกิจ' } });
  }

  const { targetStatus, blockedReason, revisionNote } = req.body;
  if (!canTransitionTask(task.status, targetStatus)) {
    return res.status(400).json({
      error: {
        messageTh: `ไม่สามารถเปลี่ยนสถานะจาก ${task.status} เป็น ${targetStatus} ได้`,
      },
    });
  }

  // If submitting for review, verify evidence if required
  if (targetStatus === 'SUBMITTED_FOR_REVIEW' && task.evidenceRequired) {
    const taskEvidence = store.evidence.filter((e) => e.taskId === task.id);
    if (taskEvidence.length === 0) {
      return res.status(422).json({
        error: {
          code: 'EVIDENCE_REQUIRED',
          messageTh: 'ภารกิจนี้กำหนดให้ต้องแนบหลักฐานก่อนส่งตรวจอย่างน้อย 1 รายการ',
        },
      });
    }
  }

  task.status = targetStatus;
  if (blockedReason) task.blockedReason = blockedReason;
  if (revisionNote) task.revisionNote = revisionNote;
  task.updatedAt = new Date().toISOString();

  // If submitted for review, notify reviewer
  if (targetStatus === 'SUBMITTED_FOR_REVIEW') {
    storeManager.addNotification(
      task.reviewerId,
      'ภารกิจรอการตรวจหลักฐาน',
      `${task.assigneeName} ได้ส่งหลักฐานภารกิจ "${task.title}"`,
      'REVIEW_REQUESTED',
      `/reviews/evidence`
    );
  }

  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'TASK_STATUS_CHANGED',
    `เปลี่ยนสถานะภารกิจ "${task.title}" เป็น ${targetStatus}`,
    'TASK',
    task.id,
    task.caseId
  );

  res.json({ data: task });
});

// Evidence
app.get('/api/v1/evidence', (req, res) => {
  const { taskId, caseId } = req.query;
  let items = storeManager.get().evidence;
  if (taskId) items = items.filter((e) => e.taskId === taskId);
  if (caseId) items = items.filter((e) => e.caseId === caseId);
  res.json({ data: items });
});

app.post('/api/v1/evidence', (req, res) => {
  const user = (req as any).currentUser;
  const store = storeManager.get();
  const { taskId, fileName, fileSizeBytes, mimeType, fileDataUrl, description } = req.body;

  const task = store.tasks.find((t) => t.id === taskId);
  if (!task) {
    return res.status(400).json({ error: { messageTh: 'ไม่พบภารกิจที่ระบุ' } });
  }

  const newEvi = {
    id: `evi-${Date.now()}`,
    caseId: task.caseId,
    taskId: task.id,
    taskTitle: task.title,
    fileName: fileName || 'evidence_file.pdf',
    fileSizeBytes: Number(fileSizeBytes) || 0,
    mimeType: mimeType || 'application/pdf',
    storageUrl: `/api/v1/files/download`,
    fileDataUrl: fileDataUrl || undefined,
    description: description || 'หลักฐานประกอบการปฏิบัติงาน',
    status: 'PENDING_REVIEW' as const,
    uploadedBy: user.id,
    uploadedByName: user.displayName,
    createdAt: new Date().toISOString(),
  };

  store.evidence.push(newEvi);
  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'EVIDENCE_UPLOADED',
    `แนบหลักฐาน "${newEvi.fileName}" สำหรับภารกิจ "${task.title}"`,
    'EVIDENCE',
    newEvi.id,
    task.caseId
  );

  res.json({ data: newEvi });
});

// Reviews Inbox & Decisions
app.get('/api/v1/reviews/documents', (req, res) => {
  const store = storeManager.get();
  const docsInReview = store.documents.filter(
    (d) => d.status === 'SUBMITTED_FOR_REVIEW' || d.status === 'REVISION_REQUESTED'
  );
  res.json({ data: docsInReview });
});

app.post('/api/v1/reviews/documents/:id/decision', (req, res) => {
  const user = (req as any).currentUser;
  if (!user.roles.includes('REVIEWER') && !user.roles.includes('ADMIN')) {
    return res.status(403).json({ error: { messageTh: 'เฉพาะผู้ตรวจเท่านั้นที่มีสิทธิ์ตรวจรับรองเอกสาร' } });
  }

  const store = storeManager.get();
  const doc = store.documents.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: { messageTh: 'ไม่พบเอกสาร' } });
  }

  // Anti-self-approval rule
  if (!canUserReviewOwnSubmission(doc.createdBy, user.id)) {
    return res.status(403).json({
      error: {
        code: 'SELF_APPROVAL_FORBIDDEN',
        messageTh: 'ตามนโยบายความโปร่งใส ผู้จัดทำเอกสารไม่สามารถตรวจรับรองเอกสารของตนเองได้',
      },
    });
  }

  const { decision, comments } = req.body; // 'APPROVED' | 'REVISION_REQUESTED'
  if (!decision) {
    return res.status(400).json({ error: { messageTh: 'กรุณาระบุผลการตรวจรับรอง' } });
  }

  if (decision === 'APPROVED') {
    doc.status = 'REVIEWED';
    storeManager.addNotification(
      doc.createdBy,
      'เอกสารได้รับการตรวจผ่านแล้ว',
      `เอกสาร "${doc.title}" ผ่านการตรวจรับรองโดย ${user.displayName}`,
      'APPROVED',
      `/documents`
    );
  } else {
    doc.status = 'REVISION_REQUESTED';
    storeManager.addNotification(
      doc.createdBy,
      'เอกสารถูกส่งกลับเพื่อแก้ไข',
      `ข้อคิดเห็นจากผู้ตรวจ: ${comments || 'กรุณาปรับปรุงตามระเบียบสารบรรณ'}`,
      'REVISION_REQUIRED',
      `/documents`
    );
  }

  doc.updatedAt = new Date().toISOString();
  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    decision === 'APPROVED' ? 'DOCUMENT_REVIEW_APPROVED' : 'DOCUMENT_REVISION_REQUESTED',
    `ผลการตรวจเอกสาร "${doc.title}": ${decision === 'APPROVED' ? 'ผ่านการตรวจ' : 'ส่งกลับแก้ไข'} (${comments || '-'})`,
    'DOCUMENT',
    doc.id,
    doc.caseId
  );

  res.json({ data: doc });
});

app.get('/api/v1/reviews/evidence', (req, res) => {
  const store = storeManager.get();
  const tasksInReview = store.tasks.filter((t) => t.status === 'SUBMITTED_FOR_REVIEW');
  res.json({ data: tasksInReview });
});

app.post('/api/v1/reviews/evidence/:taskId/decision', (req, res) => {
  const user = (req as any).currentUser;
  if (!user.roles.includes('REVIEWER') && !user.roles.includes('ADMIN')) {
    return res.status(403).json({ error: { messageTh: 'เฉพาะผู้ตรวจเท่านั้นที่มีสิทธิ์ตรวจรับรองหลักฐาน' } });
  }

  const store = storeManager.get();
  const task = store.tasks.find((t) => t.id === req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: { messageTh: 'ไม่พบภารกิจ' } });
  }

  // Anti-self-approval rule
  if (!canUserReviewOwnSubmission(task.assigneeId, user.id)) {
    return res.status(403).json({
      error: {
        code: 'SELF_APPROVAL_FORBIDDEN',
        messageTh: 'ตามนโยบายความโปร่งใส ผู้ปฏิบัติงานไม่สามารถตรวจรับรองหลักฐานงานของตนเองได้',
      },
    });
  }

  const { decision, feedback } = req.body; // 'APPROVED' | 'REJECTED'
  const taskEvidence = store.evidence.filter((e) => e.taskId === task.id);

  if (decision === 'APPROVED') {
    task.status = 'COMPLETED';
    taskEvidence.forEach((e) => {
      e.status = 'APPROVED';
      e.reviewedBy = user.id;
      e.reviewedByName = user.displayName;
      e.reviewedAt = new Date().toISOString();
      e.reviewerFeedback = feedback || 'หลักฐานถูกต้องครบถ้วน';
    });

    storeManager.addNotification(
      task.assigneeId,
      'หลักฐานภารกิจผ่านการตรวจแล้ว',
      `ภารกิจ "${task.title}" ได้รับการตรวจผ่านและปิดงานเรียบร้อย`,
      'APPROVED',
      `/tasks/${task.id}`
    );
  } else {
    task.status = 'REVISION_REQUESTED';
    task.revisionNote = feedback || 'หลักฐานยังไม่ครบถ้วน กรุณาแนบเพิ่มเติม';
    taskEvidence.forEach((e) => {
      e.status = 'REJECTED';
      e.reviewerFeedback = feedback;
    });

    storeManager.addNotification(
      task.assigneeId,
      'หลักฐานภารกิจถูกส่งกลับให้แก้ไข',
      `ข้อคิดเห็นจากผู้ตรวจ: ${feedback}`,
      'REVISION_REQUIRED',
      `/tasks/${task.id}`
    );
  }

  task.updatedAt = new Date().toISOString();
  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    decision === 'APPROVED' ? 'EVIDENCE_APPROVED' : 'EVIDENCE_REJECTED',
    `ผลการตรวจหลักฐานภารกิจ "${task.title}": ${decision === 'APPROVED' ? 'ผ่านการตรวจ' : 'ส่งกลับแก้ไข'}`,
    'TASK',
    task.id,
    task.caseId
  );

  res.json({ data: task });
});

// Templates
app.get('/api/v1/templates', (req, res) => {
  res.json({ data: storeManager.get().templates });
});

app.post('/api/v1/templates', (req, res) => {
  const user = (req as any).currentUser;
  const store = storeManager.get();
  const {
    title,
    code,
    type,
    provenance,
    attachedFileName,
    attachedFileSize,
    attachedFileType,
    attachedFileData,
    formatProfile,
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: { messageTh: 'กรุณาระบุชื่อแม่แบบเอกสาร' } });
  }

  const resolvedType = type || 'INTERNAL_MEMO';
  const defaultProfile =
    resolvedType === 'EXTERNAL_LETTER'
      ? {
          paperSize: 'A4' as const,
          marginsMm: { top: 15, right: 20, bottom: 20, left: 30 },
          bodyFont: 'TH Sarabun New',
          bodyFontSizePt: 16,
          garudaHeightMm: 30,
          garudaPosition: 'CENTER' as const,
        }
      : {
          paperSize: 'A4' as const,
          marginsMm: { top: 15, right: 20, bottom: 20, left: 30 },
          bodyFont: 'TH Sarabun New',
          bodyFontSizePt: 16,
          garudaHeightMm: 15,
          garudaPosition: 'LEFT' as const,
        };

  const newTemplate = {
    id: `tmpl-${Date.now()}`,
    type: resolvedType,
    title: title.trim(),
    code: code && code.trim() ? code.trim() : `T-CUSTOM-${String(store.templates.length + 1).padStart(2, '0')}`,
    currentVersion: 1,
    status: 'APPROVED' as const,
    verifiedBy: user ? user.displayName : 'ผู้ใช้งานระบุด้วยตนเอง',
    verifiedAt: new Date().toISOString(),
    provenance: provenance || 'แม่แบบต้นแบบที่ผู้ใช้งานแนบและกำหนดขึ้นเองในระบบ',
    formatProfile: formatProfile || defaultProfile,
    attachedFileName,
    attachedFileSize,
    attachedFileType,
    attachedFileData,
    isCustom: true,
  };

  store.templates.unshift(newTemplate);

  if (user) {
    storeManager.addAudit(
      user.id,
      user.displayName,
      user.roles[0],
      'TEMPLATE_CREATED',
      `เพิ่มแม่แบบเอกสารใหม่ "${newTemplate.title}" ${attachedFileName ? `พร้อมไฟล์แนบ ${attachedFileName}` : ''}`,
      'SETTINGS',
      newTemplate.id
    );
  }

  res.json({ data: newTemplate });
});

app.delete('/api/v1/templates/:id', (req, res) => {
  const user = (req as any).currentUser;
  const store = storeManager.get();
  const index = store.templates.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: { messageTh: 'ไม่พบแม่แบบที่ต้องการลบ' } });
  }

  const deleted = store.templates.splice(index, 1)[0];
  if (user) {
    storeManager.addAudit(
      user.id,
      user.displayName,
      user.roles[0],
      'TEMPLATE_DELETED',
      `ลบแม่แบบเอกสาร "${deleted.title}"`,
      'SETTINGS',
      deleted.id
    );
  }

  res.json({ success: true, message: 'ลบแม่แบบเรียบร้อยแล้ว' });
});

// Notifications
app.get('/api/v1/notifications', (req, res) => {
  const user = (req as any).currentUser;
  if (!user) {
    return res.json({ data: [] });
  }
  const notifs = storeManager.get().notifications.filter((n) => n.userId === user.id);
  res.json({ data: notifs });
});

app.post('/api/v1/notifications/:id/read', (req, res) => {
  const target = storeManager.get().notifications.find((n) => n.id === req.params.id);
  if (target) {
    target.read = true;
  }
  res.json({ success: true });
});

// Audit Activity Logs
app.get('/api/v1/audit', (req, res) => {
  res.json({ data: storeManager.get().auditLogs });
});

// Reports Overview
app.get('/api/v1/reports/overview', (req, res) => {
  const store = storeManager.get();
  const totalCases = store.cases.length;
  const activeCases = store.cases.filter((c) => c.status === 'ACTIVE' || c.status === 'WAITING_REVIEW').length;
  const closedCases = store.cases.filter((c) => c.status === 'CLOSED').length;

  const totalTasks = store.tasks.length;
  const completedTasks = store.tasks.filter((t) => t.status === 'COMPLETED').length;
  const pendingReviewTasks = store.tasks.filter((t) => t.status === 'SUBMITTED_FOR_REVIEW').length;
  const overdueTasks = store.tasks.filter((t) => t.status !== 'COMPLETED' && t.dueDate < '2026-11-10').length;

  const docsInReview = store.documents.filter((d) => d.status === 'SUBMITTED_FOR_REVIEW').length;

  res.json({
    data: {
      cases: { total: totalCases, active: activeCases, closed: closedCases },
      tasks: { total: totalTasks, completed: completedTasks, pendingReview: pendingReviewTasks, overdue: overdueTasks },
      documents: { total: store.documents.length, pendingReview: docsInReview },
    },
  });
});

// ================= BACKEND <-> GOOGLE SHEETS INTEGRATION ROUTES =================
app.get('/api/v1/integrations/sheets', (req, res) => {
  const store = storeManager.get();
  const safeUsers = store.users.map(({ password, ...u }) => u);
  const dataset = buildBackendSheetsDataset({
    cases: store.cases,
    documents: store.documents,
    tasks: store.tasks,
    incoming: store.incoming,
    users: safeUsers,
  });

  res.json({
    data: {
      config: store.googleSheetConfig,
      summary: dataset.summary,
      persistenceMode: 'DISK_JSON',
    },
  });
});

app.patch('/api/v1/integrations/sheets', (req, res) => {
  const user = (req as any).currentUser;
  if (!user) {
    return res.status(401).json({ error: { messageTh: 'กรุณาเข้าสู่ระบบก่อนตั้งค่าการเชื่อมโยง' } });
  }
  const store = storeManager.get();
  const {
    linkedSpreadsheetIdOrUrl,
    linkedSpreadsheetId,
    linkedSpreadsheetUrl,
    linkedSpreadsheetTitle,
    appsScriptWebhookUrl,
    autoSyncEnabled,
    lastSyncedAt,
    lastSyncStatus,
    lastSyncMessage,
  } = req.body || {};

  if (typeof linkedSpreadsheetIdOrUrl === 'string') {
    const trimmed = linkedSpreadsheetIdOrUrl.trim();
    if (!trimmed) {
      store.googleSheetConfig.linkedSpreadsheetId = '';
      store.googleSheetConfig.linkedSpreadsheetUrl = '';
    } else {
      const parsedId = parseSpreadsheetId(trimmed);
      if (!parsedId) {
        return res.status(400).json({
          error: { messageTh: 'รูปแบบลิงก์หรือ Spreadsheet ID ไม่ถูกต้อง' },
        });
      }
      store.googleSheetConfig.linkedSpreadsheetId = parsedId;
      store.googleSheetConfig.linkedSpreadsheetUrl = `https://docs.google.com/spreadsheets/d/${parsedId}/edit`;
    }
  }
  if (typeof linkedSpreadsheetId === 'string') {
    store.googleSheetConfig.linkedSpreadsheetId = linkedSpreadsheetId;
  }
  if (typeof linkedSpreadsheetUrl === 'string') {
    store.googleSheetConfig.linkedSpreadsheetUrl = linkedSpreadsheetUrl;
  }
  if (typeof linkedSpreadsheetTitle === 'string') {
    store.googleSheetConfig.linkedSpreadsheetTitle = linkedSpreadsheetTitle;
  }
  if (typeof appsScriptWebhookUrl === 'string') {
    const trimmedWebhook = appsScriptWebhookUrl.trim();
    if (trimmedWebhook && !isValidAppsScriptUrl(trimmedWebhook)) {
      return res.status(400).json({
        error: {
          messageTh:
            'URL ของ Google Apps Script ต้องขึ้นต้นด้วย https://script.google.com/...',
        },
      });
    }
    store.googleSheetConfig.appsScriptWebhookUrl = trimmedWebhook;
  }
  if (typeof autoSyncEnabled === 'boolean') {
    store.googleSheetConfig.autoSyncEnabled = autoSyncEnabled;
  }
  if (typeof lastSyncedAt === 'string') {
    store.googleSheetConfig.lastSyncedAt = lastSyncedAt;
  }
  if (lastSyncStatus) {
    store.googleSheetConfig.lastSyncStatus = lastSyncStatus;
  }
  if (typeof lastSyncMessage === 'string') {
    store.googleSheetConfig.lastSyncMessage = lastSyncMessage;
  }

  storeManager.addAudit(
    user.id,
    user.displayName,
    user.roles[0],
    'GOOGLE_SHEET_CONFIG_UPDATED',
    'ปรับปรุงการตั้งค่าเชื่อมโยงข้อมูลหลังบ้านกับ Google Sheets',
    'SETTINGS',
    'google-sheets'
  );

  res.json({ data: store.googleSheetConfig });
});

app.post('/api/v1/integrations/sheets/sync', async (req, res) => {
  const user = (req as any).currentUser;
  if (!user) {
    return res.status(401).json({ error: { messageTh: 'กรุณาเข้าสู่ระบบก่อนซิงค์ข้อมูล' } });
  }
  const store = storeManager.get();
  const targetWebhook = (req.body?.appsScriptWebhookUrl || store.googleSheetConfig.appsScriptWebhookUrl || '').trim();
  if (!targetWebhook || !isValidAppsScriptUrl(targetWebhook)) {
    return res.status(400).json({
      error: {
        messageTh:
          'กรุณาระบุ Google Apps Script Web App URL ที่ถูกต้อง (https://script.google.com/macros/s/.../exec)',
      },
    });
  }

  const safeUsers = store.users.map(({ password, ...u }) => u);
  const dataset = buildBackendSheetsDataset({
    cases: store.cases,
    documents: store.documents,
    tasks: store.tasks,
    incoming: store.incoming,
    users: safeUsers,
  });

  try {
    const response = await fetch(targetWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataset),
      redirect: 'follow',
    });

    const rawText = await response.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Apps Script might return non-JSON HTML if permissions aren't set to Anyone
    }

    if (!response.ok || (parsed && parsed.ok === false)) {
      const errDetail = parsed?.error || `HTTP ${response.status} — ตรวจสอบว่าตั้งค่าสิทธิ์ Web App เป็น "Anyone (ทุกคน)" แล้ว`;
      store.googleSheetConfig.lastSyncStatus = 'ERROR';
      store.googleSheetConfig.lastSyncMessage = errDetail;
      storeManager.persist();
      return res.status(502).json({
        error: { messageTh: `ซิงค์ไปยัง Google Sheets ไม่สำเร็จ: ${errDetail}` },
      });
    }

    const syncedAt = new Date().toISOString();
    store.googleSheetConfig.appsScriptWebhookUrl = targetWebhook;
    if (parsed?.sheetUrl) store.googleSheetConfig.linkedSpreadsheetUrl = parsed.sheetUrl;
    if (parsed?.sheetTitle) store.googleSheetConfig.linkedSpreadsheetTitle = parsed.sheetTitle;
    store.googleSheetConfig.lastSyncedAt = syncedAt;
    store.googleSheetConfig.lastSyncStatus = 'SUCCESS';
    store.googleSheetConfig.lastSyncMessage = `ซิงค์สำเร็จ 5 ตาราง (เรื่องงาน ${dataset.summary.cases}, เอกสาร ${dataset.summary.documents}, ภารกิจ ${dataset.summary.tasks})`;

    storeManager.addAudit(
      user.id,
      user.displayName,
      user.roles[0],
      'GOOGLE_SHEET_SYNCED',
      store.googleSheetConfig.lastSyncMessage,
      'SETTINGS',
      'google-sheets'
    );

    res.json({
      data: {
        config: store.googleSheetConfig,
        summary: dataset.summary,
        remote: parsed,
      },
    });
  } catch (err: any) {
    store.googleSheetConfig.lastSyncStatus = 'ERROR';
    store.googleSheetConfig.lastSyncMessage = err?.message || 'Network error';
    storeManager.persist();
    res.status(502).json({
      error: { messageTh: `ไม่สามารถเชื่อมต่อ Apps Script Webhook ได้: ${err?.message || 'Unknown error'}` },
    });
  }
});

app.get('/api/v1/integrations/sheets/csv', (req, res) => {
  const store = storeManager.get();
  const safeUsers = store.users.map(({ password, ...u }) => u);
  const dataset = buildBackendSheetsDataset({
    cases: store.cases,
    documents: store.documents,
    tasks: store.tasks,
    incoming: store.incoming,
    users: safeUsers,
  });
  const csv = buildBackendCsvExport(dataset);
  const filename = encodeURIComponent(`govflow-backend-${new Date().toISOString().split('T')[0]}.csv`);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`);
  res.send(csv);
});

// Shared Gemini Client Utility (Server-side only)
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// AI Intelligence Endpoints (Gemini API with Fallback)
app.post('/api/v1/ai/task-suggestions', async (req, res) => {
  const { sourceText } = req.body;
  if (!sourceText || sourceText.trim().length === 0) {
    return res.status(400).json({ error: { messageTh: 'กรุณาระบุข้อความต้นเรื่องสำหรับวิเคราะห์' } });
  }

  const ai = getGeminiClient();

  if (ai) {
    try {
      const prompt = `คุณคือผู้ช่วยงานสารบรรณราชการไทย จงวิเคราะห์ข้อความหนังสือราชการต่อไปนี้ และเสนอรายการภารกิจ (Task Suggestions) ที่จำเป็นต้องดำเนินการ 2-4 ข้อ โดยต้องอ้างอิงจากข้อความจริง ห้ามแต่งเติมวันครบกำหนดหรือผู้รับผิดชอบที่ไม่มีในข้อความ ให้ตอบเป็น JSON เท่านั้น

ข้อความต้นเรื่อง:
${sourceText}`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              'คุณคือผู้ช่วยงานสารบรรณราชการไทย ตอบกลับเป็น JSON ตาม schema ที่กำหนดอย่างเคร่งครัดและอ้างอิงเฉพาะข้อเท็จจริงจากข้อความต้นเรื่อง',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                suggestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      dueDate: { type: Type.STRING, nullable: true },
                      sourceQuote: { type: Type.STRING },
                      uncertainty: { type: Type.STRING },
                      requiresHumanConfirmation: { type: Type.BOOLEAN },
                    },
                  },
                },
                warnings: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
            },
          },
        }),
        10000,
        'Gemini task-suggestions'
      );

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return res.json({ data: parsed });
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to deterministic extractor:', err);
    }
  }

  // Fallback: Deterministic extractor from text
  const fallbackSuggestions = [
    {
      title: 'จัดทำบันทึกข้อความขออนุมัติและแต่งตั้งคณะทำงาน',
      description: 'ยกร่างบันทึกข้อความตามระเบียบงานสารบรรณเพื่อเสนอผู้บริหารพิจารณาอนุมัติโครงการ',
      dueDate: null,
      sourceQuote: sourceText.slice(0, 60),
      uncertainty: 'LOW',
      requiresHumanConfirmation: true,
    },
    {
      title: 'ประสานงานและจัดเตรียมความพร้อมของสถานที่และอุปกรณ์',
      description: 'ประสานงานหน่วยงานที่เกี่ยวข้องและจัดเตรียมเอกสารสำหรับการดำเนินงาน',
      dueDate: null,
      sourceQuote: sourceText.slice(0, 50),
      uncertainty: 'MEDIUM',
      requiresHumanConfirmation: true,
    },
    {
      title: 'รวบรวมหลักฐานและจัดทำรายงานสรุปผลการดำเนินงาน',
      description: 'รวบรวมภาพถ่าย แบบประเมิน และจัดทำหนังสือรายงานผลส่งหน่วยงานต้นทาง',
      dueDate: null,
      sourceQuote: 'รายงานผลการดำเนินงาน',
      uncertainty: 'LOW',
      requiresHumanConfirmation: true,
    },
  ];

  res.json({
    data: {
      summary: 'วิเคราะห์ข้อกำหนดจากหนังสือราชการต้นเรื่อง (ระบบจำลอง/โหมดออฟไลน์)',
      suggestions: fallbackSuggestions,
      warnings: ['ระบบ AI ทำงานในโหมดเตรียมข้อเสนอแนะ — เจ้าหน้าที่ต้องตรวจยืนยันก่อนบันทึกจริง'],
    },
  });
});

app.post('/api/v1/ai/document-draft', async (req, res) => {
  const draftInput: DocumentDraftInput = {
    docType: req.body?.docType || 'INTERNAL_MEMO',
    subject: req.body?.subject,
    agency: req.body?.agency,
    recipient: req.body?.recipient,
    officialReferenceNo: req.body?.officialReferenceNo,
    documentDate: req.body?.documentDate,
    numeralStyle:
      req.body?.numeralStyle === 'THAI'
        ? 'THAI'
        : req.body?.numeralStyle === 'ARABIC'
        ? 'ARABIC'
        : undefined,
    urgency: req.body?.urgency,
    salutation: req.body?.salutation,
    valediction: req.body?.valediction,
    references: Array.isArray(req.body?.references) ? req.body.references : [],
    enclosures: Array.isArray(req.body?.enclosures) ? req.body.enclosures : [],
    backgroundParagraph: req.body?.backgroundParagraph,
    factsParagraph: req.body?.factsParagraph || req.body?.facts,
    proposalParagraph: req.body?.proposalParagraph,
    extraInstructions: req.body?.extraInstructions,
    formalityLevel:
      req.body?.formalityLevel === 'EXECUTIVE_STRICT' ? 'EXECUTIVE_STRICT' : 'FORMAL_DETAILED',
  };

  const ai = getGeminiClient();

  if (ai) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: buildOfficialDraftUserPrompt(draftInput),
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction: buildOfficialDraftSystemInstruction(draftInput.formalityLevel),
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                backgroundParagraph: {
                  type: Type.STRING,
                  description:
                    'ย่อหน้าภาคเหตุ/ความเป็นมาความยาว 4-6 ประโยคเต็ม ใช้ภาษาราชการระดับสูงตามระเบียบงานสารบรรณ',
                },
                factsParagraph: {
                  type: Type.STRING,
                  description:
                    'ย่อหน้าภาคความประสงค์/ข้อเท็จจริงและรายละเอียดการดำเนินงานความยาว 5-7 ประโยคเต็ม ใช้ภาษาราชการระดับสูง',
                },
                proposalParagraph: {
                  type: Type.STRING,
                  description:
                    'ย่อหน้าภาคสรุป/ข้อเสนอเพื่อโปรดพิจารณาความยาว 2-3 ประโยคเต็ม เหมาะสมกับประเภทหนังสือ',
                },
              },
              required: ['backgroundParagraph', 'factsParagraph', 'proposalParagraph'],
            },
          },
        }),
        10000,
        'Gemini document-draft'
      );

      if (response.text) {
        const parsed = JSON.parse(response.text);
        const normalized = normalizeDraftOutput(parsed, draftInput);
        return res.json({
          data: normalized,
          meta: { source: 'GEMINI', model: 'gemini-4-hydrogen' },
        });
      }
    } catch (err) {
      console.warn('Gemini drafting failed, using detailed official fallback:', err);
    }
  }

  const fallbackDraft = buildDetailedOfficialDraftFallback(draftInput);
  res.json({
    data: fallbackDraft,
    meta: { source: 'FALLBACK', model: 'official-sarabun-rule-engine' },
  });
});

// Vite Middleware mounting (in dev) or static serving (in prod)
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GovFlow AI Full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
