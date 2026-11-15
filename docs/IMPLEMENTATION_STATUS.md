# GovFlow AI — Implementation Status & Architecture Report
**Version:** 1.1 (Purple–Yellow–Blue UI) | **Platform:** React 19 + TypeScript + Node.js/Express + Real Document & State Engine

---

## 1. Executive Summary & Business Logic
GovFlow AI is an end-to-end Thai Government Document & Workflow Orchestration System built upon the foundational directive:
**"Document is the starting point, Case is the source of truth" (From Documents to Done)**

### Verified Core Workflow:
1. **Intake / New Case (`/cases/new` & `/incoming`):**
   - Registered incoming correspondence with official reference numbers, dates, originating agencies, and PDF attachments.
   - Generates tenant-scoped tracking code (`GF-2569-0001`). Official letter numbers remain separate manual fields.
2. **AI-Assisted Mission Decomposition (`/ai` & Gemini API Proxy):**
   - Deterministically extracts candidate tasks with source citation quotes, uncertainty ratings, and required human confirmation.
   - Never auto-mutates the database without explicit user action.
3. **Official Document Engine (`/documents/new` & A4 Preview):**
   - Internal Memo (บันทึกข้อความ) with 15mm Garuda emblem, 29pt heading, 25mm indents, and standard metadata headers.
   - External Letter (หนังสือภายนอก) with 30mm Garuda emblem and standard valediction.
   - Built-in live A4 proportioned preview (210 x 297 mm) with zoom controls (50%–130%).
   - Generates genuine OOXML `.docx` files via `docx` library and real `%PDF-` binary files via `jspdf` with official margins (Left 30mm, Right 20mm, Top 25mm, Bottom 20mm).
4. **Task, Evidence & Review Engine (`/tasks`, `/reviews`):**
   - Assignees start tasks, report blockers with mandatory reasons, attach evidence files, and submit for review.
   - Reviewers inspect document drafts and evidence checklists.
   - Anti-self-approval rule strictly enforced: a user cannot approve their own documents or task evidence.
5. **Guarded Case Closure (`/cases/:id/close`):**
   - Server-side evaluator re-queries all tasks and documents. Blocks closure if any required tasks are not completed or if any documents are pending review.

---

## 2. Screen Inventory & Implementation Status (E01–E39)

| Screen ID | Route / Feature | Target Role | Status | Notes & Verification |
|---|---|---|---|---|
| **E01** | `/login` (เข้าสู่ระบบ) | All | DONE | Multi-role switcher (Admin, Registrar, Staff, Reviewer) in topbar |
| **E02** | `/access-pending` (รอรับสิทธิ์) | Member | DONE | Handled via role & membership status checks |
| **E03** | `/forgot-password` & `/accept-invite` | All | DONE | Invitation endpoint with token audit |
| **E04** | `/dashboard` (ภาพรวมองค์กรและงาน) | All (Role-scoped) | DONE | Live KPI counts, active cases, my tasks, quick actions |
| **E05** | `/cases` (ทะเบียนเรื่องงาน) | All | DONE | Search, filter by status and priority, pagination ready |
| **E06** | `/cases/new` (สร้างเรื่องงาน 4 ขั้นตอน) | Registrar/Admin | DONE | 4-step wizard: Type -> Details -> Attachments -> Review |
| **E07** | `/cases/:id` (ภาพรวมเรื่องงาน) | All | DONE | Case summary, progress bar, close guard inspector |
| **E08** | `/cases/:id?tab=documents` (เอกสารในเรื่อง) | All | DONE | Documents listing, Word (.docx) & PDF export links |
| **E09** | `/cases/:id?tab=tasks` (ภารกิจในเรื่อง) | All | DONE | Missions list, required evidence badges, progress bar |
| **E10** | `/cases/:id?tab=evidence` (หลักฐานรวม) | All | DONE | Evidence artifacts with reviewer status |
| **E11** | `/cases/:id?tab=relationships` (ความสัมพันธ์) | All | DONE | Visual hierarchical trace graph (Origin -> Case -> Docs/Tasks) |
| **E12** | `/cases/:id?tab=timeline` (ประวัติการดำเนินงาน) | All | DONE | Chronological audit trail within case |
| **E13** | `/cases/:id/close` (ตรวจเงื่อนไขและปิดเรื่อง) | Reviewer/Admin | DONE | Guarded server close check + close note |
| **E14** | `/incoming` (ทะเบียนหนังสือรับเบื้องต้น) | Registrar | DONE | Intake book, link to case |
| **E15** | `/incoming/new` (ลงรับหนังสือเข้า) | Registrar | DONE | Inbound intake wizard with attachment |
| **E16** | `/documents` (เอกสารทั้งหมด) | All | DONE | Filter by status, Word (.docx) and PDF downloads |
| **E17** | `/templates` (คลังแม่แบบราชการ) | All | DONE | Standard internal memo, external letter, report |
| **E18** | `/documents/new` (Document Builder 5 Steps) | All | DONE | Live A4 preview, AI drafting assist, preflight validator, export |
| **E19** | `/tasks/new` (สร้างภารกิจ) | Registrar/Admin | DONE | Assignee, reviewer, required evidence checklist |
| **E20** | `/tasks` (งานของฉัน) | Staff/Reviewer | DONE | Assigned to me vs All missions, status filters |
| **E21** | `/tasks/:id` (รายละเอียดภารกิจ) | Staff/Reviewer | DONE | Start, report blocked, attach evidence, submit review |
| **E22** | `/reviews/documents` (กล่องเอกสารรอตรวจ) | Reviewer | DONE | Document review queue |
| **E23** | `/reviews/documents/:id` (ตรวจเอกสารและข้อคิดเห็น) | Reviewer | DONE | Approve / Revision requested with feedback comments |
| **E24** | `/reviews/evidence` (กล่องตรวจหลักฐานงาน) | Reviewer | DONE | Task evidence review queue |
| **E25** | `/reviews/evidence/:taskId` (ตรวจภารกิจและหลักฐาน) | Reviewer | DONE | Check evidence and approve/reject task |
| **E26** | `/ai` (AI Intelligence Center) | All | DONE | Task proposal from raw text with source quotes |
| **E27** | `/notifications` (ศูนย์การแจ้งเตือน) | All | DONE | Unread counter, slide-in drawer, mark as read |
| **E28** | `/reports` (สถิติและรายงานผลภาพรวม) | Admin/Reviewer | DONE | Completion rate, active vs closed cases, units breakdown |
| **E29** | `/reports/:caseId/completion` (รายงานผลและหนังสือตอบ) | Reviewer/Staff | DONE | Summary report template integration |
| **E30** | `/search` (ค้นหาครอบคลุมทั้งระบบ) | All | DONE | Real-time global search bar in topbar |
| **E31** | `/settings/organization` (ข้อมูลหน่วยงาน) | Admin | DONE | Agency full name, code, address, default signers |
| **E32** | `/settings/members` (จัดการสมาชิกและสิทธิ์) | Admin | DONE | Member table, role tags, invite member modal |
| **E33** | `/settings/departments` (โครงสร้างหน่วยงาน) | Admin | DONE | Department hierarchy, codes, managers |
| **E34** | `/settings/templates` (จัดการแม่แบบเอกสาร) | Admin | DONE | Template status and format specifications |
| **E35** | `/settings/workflow` (นโยบายกระบวนการงาน) | Admin | DONE | Enforced state machines in `src/lib/rules.ts` |
| **E36** | `/settings/security` & Audit (ความปลอดภัย) | Admin | DONE | Immutable audit activity log |
| **E37** | `/settings/integrations` (การเชื่อมต่อภายนอก) | Admin | DONE | Storage & e-Saraban integration status |
| **E38** | `/help` & Document Standards (คู่มือสารบรรณ) | All | DONE | Official regulations summary, margin rules, disclaimers |
| **E39** | Global Modals (Alerts, Disclaimers, Confirmations) | All | DONE | Preflight drawer, close guard dialog, reopen dialog |

---

## 3. Automated Test Evidence (11 Passed Unit Tests)
- `src/lib/rules.test.ts`:
  - Thai Buddhist Era date conversion (พ.ศ. 2569) and formatting
  - Overdue logic computation
  - Case state transitions workflow
  - Task state transitions and review gates
  - Document review before finalization
  - Case close guard blocking pending tasks/docs
  - Anti-self-approval rule
  - Document preflight field validations
  - RBAC authorizations
- `src/server/documentGenerator.test.ts`:
  - Genuine OOXML `.docx` buffer creation with valid ZIP headers
  - Genuine `%PDF-` buffer creation with A4 geometry
