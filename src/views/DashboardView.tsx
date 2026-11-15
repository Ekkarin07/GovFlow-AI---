import React from 'react';
import {
  FolderKanban,
  CheckSquare,
  ClipboardCheck,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Sparkles,
  Building,
  ShieldCheck,
  Users,
  FileCheck2,
  History,
  Building2,
  KeyRound,
  Settings,
} from 'lucide-react';
import { formatShortThaiDate } from '../lib/dateUtils';
import {
  AuditActivity,
  CaseRecord,
  Department,
  DocumentRecord,
  OfficialTemplate,
  OrganizationProfile,
  TaskRecord,
  UserProfile,
} from '../lib/types';

interface DashboardViewProps {
  currentUser: UserProfile;
  cases: CaseRecord[];
  tasks: TaskRecord[];
  documents?: DocumentRecord[];
  allUsers?: UserProfile[];
  departments?: Department[];
  templates?: OfficialTemplate[];
  auditLogs?: AuditActivity[];
  organization?: OrganizationProfile;
  onNavigateTab: (tab: string, contextId?: string) => void;
  onOpenSettingsSubTab?: (subTab: 'org' | 'members' | 'departments' | 'integrations' | 'audit') => void;
  onOpenNewCase: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  cases,
  tasks,
  documents = [],
  allUsers = [],
  departments = [],
  templates = [],
  auditLogs = [],
  organization,
  onNavigateTab,
  onOpenSettingsSubTab,
  onOpenNewCase,
}) => {
  const isAdmin = currentUser.roles.includes('ADMIN');

  const activeCases = cases.filter((c) => c.status === 'ACTIVE' || c.status === 'WAITING_REVIEW');
  const myTasks = tasks.filter(
    (t) => (isAdmin || t.assigneeId === currentUser.id) && t.status !== 'COMPLETED'
  );
  const pendingReviewTasks = tasks.filter((t) => t.status === 'SUBMITTED_FOR_REVIEW');
  const overdueTasks = tasks.filter((t) => t.status !== 'COMPLETED' && t.dueDate < '2026-11-10');

  const openAdminSection = (subTab: 'org' | 'members' | 'departments' | 'integrations' | 'audit') => {
    if (onOpenSettingsSubTab) {
      onOpenSettingsSubTab(subTab);
    }
    onNavigateTab('settings');
  };

  // ================= ADMIN COMMAND CENTER DASHBOARD =================
  if (isAdmin) {
    return (
      <div className="space-y-6">
        {/* Admin Command Center Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-[#2E1065] to-[#1E3A8A] rounded-2xl p-6 text-white shadow-lg border border-amber-400/30 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-400/15 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-400 text-slate-950 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ADMIN CONTROL CENTER • ผู้ดูแลระบบกลาง</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                ศูนย์ควบคุมระบบ, {currentUser.displayName}
              </h1>
              <p className="text-sm text-purple-100 max-w-2xl">
                จัดการบัญชีผู้ใช้งาน กำหนดรหัสผ่าน มอบหมายสิทธิ์ (Admin/Reviewer/Registrar/Staff) ตั้งค่าข้อมูลส่วนราชการ และตรวจสอบบันทึกประวัติทั้งระบบ
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={() => openAdminSection('members')}
                className="flex items-center gap-2 bg-[#FACC15] hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>จัดการสมาชิก & รหัสผ่าน</span>
              </button>
              <button
                onClick={() => openAdminSection('org')}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm border border-white/20 transition-all cursor-pointer"
              >
                <Settings className="w-4 h-4 text-amber-300" />
                <span>ตั้งค่าหน่วยงาน</span>
              </button>
              <button
                onClick={() => openAdminSection('integrations')}
                className="flex items-center gap-2 bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-100 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm border border-emerald-300/30 transition-all cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4 text-emerald-300" />
                <span>เชื่อมโยง Google Sheets</span>
              </button>
            </div>
          </div>
        </div>

        {/* Admin System Governance KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => openAdminSection('members')}
            className="bg-white p-5 rounded-xl border border-purple-200 shadow-xs hover:border-purple-400 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">บัญชีผู้ใช้งานทั้งหมด</span>
              <div className="p-2 bg-purple-50 text-[#6D28D9] rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-slate-900">{allUsers.length}</div>
              <div className="text-xs text-[#6D28D9] mt-1 flex items-center gap-1 font-medium">
                <span>เพิ่มชื่อ & กำหนดรหัสผ่าน</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>

          <div
            onClick={() => openAdminSection('departments')}
            className="bg-white p-5 rounded-xl border border-blue-200 shadow-xs hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">กลุ่มงาน / โครงสร้างฝ่าย</span>
              <div className="p-2 bg-blue-50 text-[#2563EB] rounded-lg">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-slate-900">{departments.length}</div>
              <div className="text-xs text-[#2563EB] mt-1 flex items-center gap-1 font-medium">
                <span>จัดการกลุ่มงาน</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('templates')}
            className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">แม่แบบเอกสารในคลัง</span>
              <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                <FileCheck2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-slate-900">{templates.length}</div>
              <div className="text-xs text-amber-700 mt-1 flex items-center gap-1 font-medium">
                <span>แนบและจัดการแม่แบบ</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>

          <div
            onClick={() => openAdminSection('audit')}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-400 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">บันทึกกิจกรรมระบบ (Audit)</span>
              <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                <History className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-slate-900">{auditLogs.length}</div>
              <div className="text-xs text-slate-600 mt-1 flex items-center gap-1 font-medium">
                <span>ตรวจสอบการใช้งานทั้งหมด</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Admin Overview: Users Table & System Audit + Org Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: User & Access Directory */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#6D28D9]" />
                  <span>รายชื่อผู้ใช้งานและสิทธิ์การเข้าถึง (User Directory)</span>
                </h2>
                <p className="text-xs text-slate-500">
                  รายชื่อบุคลากรในหน่วยงาน ({organization?.fullName || 'กำหนดเอง'})
                </p>
              </div>
              <button
                onClick={() => openAdminSection('members')}
                className="text-xs font-semibold bg-[#6D28D9] text-white px-3 py-1.5 rounded-lg hover:bg-purple-800 cursor-pointer"
              >
                + จัดการสมาชิกทั้งหมด
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2 px-3">ชื่อ-นามสกุล</th>
                    <th className="py-2 px-3">อีเมล</th>
                    <th className="py-2 px-3">บทบาท</th>
                    <th className="py-2 px-3 text-right">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allUsers.slice(0, 6).map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{u.displayName}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.roles.includes('ADMIN')
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : u.roles.includes('REVIEWER')
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : u.roles.includes('REGISTRAR')
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {u.roles.join(', ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.status === 'SUSPENDED'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {u.status === 'SUSPENDED' ? 'ระงับสิทธิ์' : 'ใช้งานอยู่'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Organization Operations Summary & Latest Audit */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
              <h2 className="font-bold text-sm text-slate-900 flex items-center justify-between">
                <span>สถิติงานสารบรรณทั้งองค์กร</span>
                <button
                  onClick={() => onNavigateTab('reports')}
                  className="text-xs text-[#6D28D9] hover:underline cursor-pointer"
                >
                  รายงานเต็ม →
                </button>
              </h2>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-500">เรื่องงานทั้งหมด</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">{cases.length}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-500">เอกสารในระบบ</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">{documents.length}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-500">ภารกิจทั้งหมด</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">{tasks.length}</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="text-amber-800">รอตรวจรับรอง</div>
                  <div className="text-xl font-bold text-amber-700 mt-0.5">{pendingReviewTasks.length}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm text-slate-900">ประวัติระบบล่าสุด</h2>
                <button
                  onClick={() => openAdminSection('audit')}
                  className="text-xs text-[#6D28D9] hover:underline cursor-pointer"
                >
                  ทั้งหมด →
                </button>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] space-y-0.5">
                    <div className="font-semibold text-slate-800 line-clamp-1">{log.description}</div>
                    <div className="text-slate-500 flex justify-between">
                      <span>{log.actorName}</span>
                      <span className="font-mono">{formatShortThaiDate(log.occurredAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= STAFF / REGULAR USER WORKSPACE DASHBOARD =================
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#6D28D9] via-[#5B21B6] to-[#2563EB] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-yellow-400/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-yellow-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>พื้นที่ปฏิบัติงาน • {currentUser.departmentName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              สวัสดี, {currentUser.displayName}
            </h1>
            <p className="text-sm text-purple-100 max-w-2xl">
              สร้างเรื่องงาน ร่างหนังสือราชการจากแม่แบบมาตรฐาน และติดตามภารกิจที่ได้รับมอบหมายในหน่วยงานของคุณ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenNewCase}
              className="flex items-center gap-2 bg-[#FACC15] hover:bg-yellow-300 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>เปิดเรื่องงานใหม่</span>
            </button>
            <button
              onClick={() => onNavigateTab('ai')}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold px-4 py-2.5 rounded-xl text-sm border border-white/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>วิเคราะห์ภารกิจด้วย AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* Staff KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('cases')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-purple-300 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">เรื่องงานที่กำลังดำเนินการ</span>
            <div className="p-2 bg-purple-50 text-[#6D28D9] rounded-lg">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900">{activeCases.length}</div>
            <div className="text-xs text-[#6D28D9] mt-1 flex items-center gap-1 font-medium">
              <span>เรื่องงานทั้งหมด {cases.length} เรื่อง</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('tasks')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ภารกิจของฉัน</span>
            <div className="p-2 bg-blue-50 text-[#2563EB] rounded-lg">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900">{myTasks.length}</div>
            <div className="text-xs text-[#2563EB] mt-1 flex items-center gap-1 font-medium">
              <span>ภารกิจในความรับผิดชอบ</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('documents')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">เอกสารราชการ</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <ClipboardCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900">{documents.length}</div>
            <div className="text-xs text-amber-600 mt-1 flex items-center gap-1 font-medium">
              <span>ร่างและเอกสารที่จัดทำ</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('tasks')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-red-300 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">งานใกล้หรือเกินกำหนด</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-red-600">{overdueTasks.length}</div>
            <div className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
              <span>ต้องเร่งรัดการดำเนินงาน</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-base text-slate-900">เรื่องงานล่าสุด (Active Cases)</h2>
              <p className="text-xs text-slate-500">เรื่องงานที่กำลังดำเนินการในระบบ</p>
            </div>
            <button
              onClick={() => onNavigateTab('cases')}
              className="text-xs font-semibold text-[#6D28D9] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>ดูทั้งหมด</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {cases.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/60">
                <p className="font-medium text-slate-500">ยังไม่มีเรื่องงานในระบบ</p>
                <button
                  onClick={onOpenNewCase}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#6D28D9] text-white rounded-lg font-semibold hover:bg-purple-800 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>สร้างเรื่องงานแรก</span>
                </button>
              </div>
            ) : (
              cases.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  onClick={() => onNavigateTab('case-detail', c.id)}
                  className="p-3.5 rounded-lg border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-100 text-[#6D28D9]">
                        {c.code}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {c.departmentName}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm text-slate-900 line-clamp-1">{c.title}</h3>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    <div className="text-right">
                      <div className="text-slate-500 text-[11px]">กำหนดส่ง</div>
                      <div className="font-medium text-slate-800">{formatShortThaiDate(c.dueDate)}</div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                        c.status === 'CLOSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'WAITING_REVIEW'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {c.status === 'CLOSED' ? 'ปิดเรื่องแล้ว' : c.status === 'WAITING_REVIEW' ? 'รอตรวจ' : 'กำลังดำเนินการ'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-base text-slate-900">ภารกิจที่ต้องทำ (Tasks)</h2>
              <p className="text-xs text-slate-500">ภารกิจที่มอบหมายให้ท่าน</p>
            </div>
            <button
              onClick={() => onNavigateTab('tasks')}
              className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
            >
              ดูงานของฉัน
            </button>
          </div>

          <div className="space-y-3">
            {myTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">ไม่มีภารกิจค้างอยู่ในขณะนี้</div>
            ) : (
              myTasks.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  onClick={() => onNavigateTab('task-detail', t.id)}
                  className="p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-semibold text-blue-600">{t.caseCode}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-medium ${
                        t.status === 'REVISION_REQUESTED'
                          ? 'bg-red-100 text-red-700'
                          : t.status === 'SUBMITTED_FOR_REVIEW'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t.status === 'REVISION_REQUESTED'
                        ? 'ส่งกลับแก้ไข'
                        : t.status === 'SUBMITTED_FOR_REVIEW'
                        ? 'รอตรวจ'
                        : 'กำลังทำ'}
                    </span>
                  </div>
                  <h4 className="font-medium text-xs text-slate-900 line-clamp-2">{t.title}</h4>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>กำหนดส่ง: {formatShortThaiDate(t.dueDate)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
