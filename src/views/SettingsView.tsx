import React, { useEffect, useState } from 'react';
import {
  Settings,
  Shield,
  History,
  PlusCircle,
  CheckCircle2,
  Trash2,
  UserCog,
  Ban,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { formatShortThaiDate } from '../lib/dateUtils';
import {
  AuditActivity,
  CaseRecord,
  Department,
  DocumentRecord,
  OrganizationProfile,
  TaskRecord,
  UserProfile,
  UserRole,
} from '../lib/types';
import { GoogleSheetsSyncPanel } from '../components/GoogleSheetsSyncPanel';

interface SettingsViewProps {
  organization: OrganizationProfile;
  members: UserProfile[];
  departments: Department[];
  auditLogs: AuditActivity[];
  cases?: CaseRecord[];
  documents?: DocumentRecord[];
  tasks?: TaskRecord[];
  incoming?: any[];
  currentUser: UserProfile;
  activeSubTab?: 'org' | 'members' | 'departments' | 'integrations' | 'audit';
  onChangeSubTab?: (subTab: 'org' | 'members' | 'departments' | 'integrations' | 'audit') => void;
  onUpdateOrg: (updated: Partial<OrganizationProfile>) => Promise<void>;
  onInviteMember: (payload: any) => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  organization,
  members,
  departments,
  auditLogs,
  cases = [],
  documents = [],
  tasks = [],
  incoming = [],
  currentUser,
  activeSubTab: controlledSubTab,
  onChangeSubTab,
  onUpdateOrg,
  onInviteMember,
  onRefreshData,
}) => {
  const isAdmin = currentUser.roles.includes('ADMIN');
  const [localSubTab, setLocalSubTab] = useState<'org' | 'members' | 'departments' | 'integrations' | 'audit'>(
    controlledSubTab || 'members'
  );

  useEffect(() => {
    if (controlledSubTab) {
      setLocalSubTab(controlledSubTab);
    }
  }, [controlledSubTab]);

  const activeSubTab = controlledSubTab || localSubTab;
  const setActiveSubTab = (tab: 'org' | 'members' | 'departments' | 'integrations' | 'audit') => {
    setLocalSubTab(tab);
    if (onChangeSubTab) onChangeSubTab(tab);
  };

  // Org form
  const [fullName, setFullName] = useState(organization.fullName);
  const [shortName, setShortName] = useState(organization.shortName);
  const [code, setCode] = useState(organization.code);
  const [address, setAddress] = useState(organization.address);
  const [defaultSignerName, setDefaultSignerName] = useState(organization.defaultSignerName);
  const [defaultSignerPosition, setDefaultSignerPosition] = useState(organization.defaultSignerPosition);

  // Invite member modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteDeptId, setInviteDeptId] = useState(departments[0]?.id || '');
  const [inviteRole, setInviteRole] = useState<UserRole>('STAFF');
  const [invitePassword, setInvitePassword] = useState('123456');

  // Edit member role/dept modal
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('STAFF');
  const [editDeptId, setEditDeptId] = useState('');

  // Change password modal
  const [passwordModalMember, setPasswordModalMember] = useState<UserProfile | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('123456');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string | null>(null);

  // New department modal
  const [showNewDeptModal, setShowNewDeptModal] = useState(false);
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptName, setNewDeptName] = useState('');

  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Guard: Non-admin users cannot access Admin Control Panel
  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-lg mx-auto my-8 space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="font-bold text-lg text-slate-900">จำกัดสิทธิ์เฉพาะผู้ดูแลระบบ (Admin Only)</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          บัญชีผู้ใช้งานทั่วไป ({currentUser.displayName}) ไม่สามารถเข้าถึงการตั้งค่าองค์กร จัดการสมาชิก กำหนดรหัสผ่าน หรือดูประวัติระบบได้
        </p>
      </div>
    );
  }

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOrg(true);
    setSaveSuccess(false);
    await onUpdateOrg({
      fullName,
      shortName,
      code,
      address,
      defaultSignerName,
      defaultSignerPosition,
    });
    setIsSavingOrg(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleConfirmInvite = async () => {
    if (!inviteEmail || !inviteName) return;
    await onInviteMember({
      email: inviteEmail,
      displayName: inviteName,
      departmentId: inviteDeptId || departments[0]?.id,
      roles: [inviteRole],
      password: invitePassword.trim() || '123456',
    });
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteName('');
    setInvitePassword('123456');
  };

  const handleUpdatePassword = async () => {
    if (!passwordModalMember || !newPasswordValue.trim()) return;
    try {
      const res = await fetch(`/api/v1/members/${passwordModalMember.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPasswordValue.trim() }),
      });
      if (res.ok) {
        setPasswordChangeSuccess(`เปลี่ยนรหัสผ่านสำหรับ ${passwordModalMember.displayName} เรียบร้อยแล้ว`);
        if (onRefreshData) await onRefreshData();
        setTimeout(() => {
          setPasswordChangeSuccess(null);
          setPasswordModalMember(null);
        }, 1200);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveMemberEdit = async () => {
    if (!editingMember) return;
    const res = await fetch(`/api/v1/members/${editingMember.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roles: [editRole],
        departmentId: editDeptId,
      }),
    });
    if (res.ok) {
      setEditingMember(null);
      if (onRefreshData) await onRefreshData();
    }
  };

  const handleToggleSuspend = async (m: UserProfile) => {
    const nextStatus = m.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    const res = await fetch(`/api/v1/members/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok && onRefreshData) {
      await onRefreshData();
    }
  };

  const handleDeleteMember = async (m: UserProfile) => {
    if (!confirm(`ต้องการลบบัญชีผู้ใช้ "${m.displayName}" ใช่หรือไม่?`)) return;
    const res = await fetch(`/api/v1/members/${m.id}`, { method: 'DELETE' });
    if (res.ok && onRefreshData) {
      await onRefreshData();
    }
  };

  const handleAddDepartment = async () => {
    if (!newDeptName.trim()) return;
    const res = await fetch('/api/v1/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: newDeptCode.trim() || 'DEPT',
        name: newDeptName.trim(),
      }),
    });
    if (res.ok) {
      setShowNewDeptModal(false);
      setNewDeptCode('');
      setNewDeptName('');
      if (onRefreshData) await onRefreshData();
    }
  };

  const handleDeleteDepartment = async (d: Department) => {
    if (!confirm(`ต้องการลบกลุ่มงาน "${d.name}" ใช่หรือไม่?`)) return;
    const res = await fetch(`/api/v1/departments/${d.id}`, { method: 'DELETE' });
    if (res.ok && onRefreshData) {
      await onRefreshData();
    }
  };

  const handleResetOperationalData = async () => {
    if (!confirm('ยืนยันล้างข้อมูลเรื่องงาน ภารกิจ เอกสาร และหนังสือเข้าทั้งหมดกลับสู่ค่าเริ่มต้นว่าง (0 รายการ)?\n\n* รายชื่อสมาชิกและแม่แบบเอกสารจะยังคงอยู่')) {
      return;
    }
    const res = await fetch('/api/v1/admin/reset-data', { method: 'POST' });
    if (res.ok && onRefreshData) {
      await onRefreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#6D28D9]" />
            <span>ศูนย์บริหารจัดการระบบ (Admin Control Panel)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            จัดการบัญชีผู้ใช้งาน กำหนดรหัสผ่าน มอบหมายสิทธิ์ โครงสร้างกลุ่มงาน และตรวจสอบบันทึกกิจกรรมทั้งระบบ
          </p>
        </div>

        <button
          onClick={handleResetOperationalData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>ล้างข้อมูลงานทั้งหมด (Reset 0)</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs sm:text-sm">
        {[
          { id: 'members', label: `ผู้ใช้งานและรหัสผ่าน (${members.length})` },
          { id: 'org', label: 'ข้อมูลส่วนราชการ (Organization)' },
          { id: 'departments', label: `โครงสร้างกลุ่มงาน (${departments.length})` },
          { id: 'integrations', label: 'เชื่อมโยง Google Sheets & หลังบ้าน' },
          { id: 'audit', label: `ประวัติระบบ (${auditLogs.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'border-[#6D28D9] text-[#6D28D9] bg-purple-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Org Profile */}
      {activeSubTab === 'org' && (
        <form onSubmit={handleSaveOrg} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-3xl space-y-4 text-xs sm:text-sm">
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>บันทึกข้อมูลหน่วยงานเรียบร้อยแล้ว</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">ชื่อเต็มหน่วยงาน (ส่วนราชการ)*:</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ชื่อย่อหน่วยงาน:</label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">รหัสหน่วยงาน (Code):</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">ที่อยู่หน่วยงาน (สำหรับหนังสือภายนอก):</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full p-2.5 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ชื่อผู้ลงนามเริ่มต้น:</label>
              <input
                type="text"
                value={defaultSignerName}
                onChange={(e) => setDefaultSignerName(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ตำแหน่งผู้ลงนามเริ่มต้น:</label>
              <input
                type="text"
                value={defaultSignerPosition}
                onChange={(e) => setDefaultSignerPosition(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSavingOrg}
              className="bg-[#6D28D9] hover:bg-purple-800 text-white px-6 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
            >
              {isSavingOrg ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Members & Roles */}
      {activeSubTab === 'members' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-base text-slate-900">รายชื่อผู้ใช้งาน รหัสผ่าน และสิทธิ์การใช้งาน (RBAC)</h2>
              <p className="text-xs text-slate-500">แอดมินเพิ่มบัญชีผู้ใช้ กำหนดรหัสผ่าน เปลี่ยนบทบาท หรือระงับการใช้งานได้จากที่นี่</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1.5 bg-[#6D28D9] hover:bg-purple-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>เพิ่มสมาชิกใหม่ + กำหนดรหัสผ่าน</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                  <th className="py-2.5 px-3">อีเมล</th>
                  <th className="py-2.5 px-3">กลุ่มงาน</th>
                  <th className="py-2.5 px-3 text-center">บทบาทสิทธิ์</th>
                  <th className="py-2.5 px-3 text-center">สถานะ</th>
                  <th className="py-2.5 px-3 text-right">การจัดการ (Admin Only)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{m.displayName}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-xs">{m.email}</td>
                    <td className="py-2.5 px-3 text-slate-600 text-xs">{m.departmentName}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          m.roles.includes('ADMIN')
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : m.roles.includes('REVIEWER')
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : m.roles.includes('REGISTRAR')
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-purple-100 text-purple-800 border-purple-200'
                        }`}
                      >
                        {m.roles.join(', ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.status === 'SUSPENDED'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {m.status === 'SUSPENDED' ? 'SUSPENDED' : m.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setEditingMember(m);
                            setEditRole(m.roles[0] || 'STAFF');
                            setEditDeptId(m.departmentId);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 text-[11px] font-medium border border-slate-200 cursor-pointer whitespace-nowrap"
                          title="แก้ไขบทบาทและกลุ่มงาน"
                        >
                          <UserCog className="w-3 h-3" />
                          <span>สิทธิ์</span>
                        </button>

                        <button
                          onClick={() => {
                            setPasswordModalMember(m);
                            setNewPasswordValue('123456');
                            setPasswordChangeSuccess(null);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 text-[11px] font-medium border border-slate-200 cursor-pointer whitespace-nowrap"
                          title="กำหนดรหัสผ่านใหม่"
                        >
                          <Shield className="w-3 h-3 text-purple-600" />
                          <span>รหัสผ่าน</span>
                        </button>

                        {m.id !== currentUser.id && (
                          <>
                            <button
                              onClick={() => handleToggleSuspend(m)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border cursor-pointer whitespace-nowrap ${
                                m.status === 'SUSPENDED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              }`}
                              title={m.status === 'SUSPENDED' ? 'เปิดใช้งานบัญชี' : 'ระงับบัญชีชั่วคราว'}
                            >
                              <Ban className="w-3 h-3" />
                              <span>{m.status === 'SUSPENDED' ? 'เปิดใช้' : 'ระงับ'}</span>
                            </button>

                            <button
                              onClick={() => handleDeleteMember(m)}
                              className="p-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                              title="ลบบัญชีผู้ใช้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Departments */}
      {activeSubTab === 'departments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-slate-900">โครงสร้างกลุ่มงาน / สำนัก / ฝ่าย</h2>
            <button
              onClick={() => setShowNewDeptModal(true)}
              className="flex items-center gap-1.5 bg-[#6D28D9] hover:bg-purple-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>เพิ่มกลุ่มงานใหม่</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {departments.map((d) => (
              <div key={d.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 text-xs flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {d.code}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">ใช้งานอยู่</span>
                  </div>
                  <div className="font-bold text-sm text-slate-900">{d.name}</div>
                  <div className="text-slate-500">หัวหน้ากลุ่มงาน: {d.managerName || '-'}</div>
                </div>
                <button
                  onClick={() => handleDeleteDepartment(d)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 cursor-pointer"
                  title="ลบกลุ่มงาน"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3.5: Google Sheets & Backend Integrations */}
      {activeSubTab === 'integrations' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div>
            <h2 className="font-bold text-base text-slate-900">
              เชื่อมโยงฐานข้อมูลหลังบ้านกับ Google Sheets
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ข้อมูลเรื่องงาน เอกสาร ภารกิจ หนังสือเข้า และสมาชิก ถูกบันทึกถาวรลงบนเซิร์ฟเวอร์และสามารถเชื่อมโยงซิงค์กับ Google Sheets ได้ทั้งแบบ Webhook และ OAuth
            </p>
          </div>
          <GoogleSheetsSyncPanel
            cases={cases}
            documents={documents}
            tasks={tasks}
            incoming={incoming}
            members={members}
            onSynced={onRefreshData}
          />
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#6D28D9]" />
            <h2 className="font-bold text-base text-slate-900">ประวัติการทำธุรกรรมทั้งระบบ (Audit Activities)</h2>
          </div>
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 flex items-start justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-900">
                    [{log.action}] {log.description}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    ผู้ดำเนินการ: <span className="font-medium text-slate-700">{log.actorName}</span> ({log.actorRole})
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-mono shrink-0">
                  {formatShortThaiDate(log.occurredAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Invite Member */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900">เพิ่มสมาชิกใหม่และกำหนดรหัสผ่าน</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">อีเมลผู้ใช้งาน*:</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@agency.go.th"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล*:</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="นายสมชาย ใจดี"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">กลุ่มงาน/ฝ่าย:</label>
                <select
                  value={inviteDeptId}
                  onChange={(e) => setInviteDeptId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">บทบาทสิทธิ์ (Role)*:</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  <option value="STAFF">ผู้ปฏิบัติงานทั่วไป (Staff)</option>
                  <option value="REGISTRAR">เจ้าหน้าที่สารบรรณ (Registrar)</option>
                  <option value="REVIEWER">ผู้ตรวจ/หัวหน้ากลุ่มงาน (Reviewer)</option>
                  <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  รหัสผ่านเข้าใช้งานตั้งต้น (Default Password)*:
                </label>
                <input
                  type="text"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="เช่น 123456"
                  className="w-full p-2 border border-amber-300 bg-amber-50/50 rounded-lg font-mono text-amber-900"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmInvite}
                className="px-4 py-2 bg-[#6D28D9] hover:bg-purple-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                บันทึกและสร้างบัญชี
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Member Role & Dept */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900">แก้ไขสิทธิ์การใช้งาน</h3>
            <p className="text-xs text-slate-600">{editingMember.displayName}</p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">บทบาทสิทธิ์:</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  <option value="STAFF">ผู้ปฏิบัติงานทั่วไป (Staff)</option>
                  <option value="REGISTRAR">เจ้าหน้าที่สารบรรณ (Registrar)</option>
                  <option value="REVIEWER">ผู้ตรวจ/หัวหน้ากลุ่มงาน (Reviewer)</option>
                  <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">กลุ่มงาน:</label>
                <select
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveMemberEdit}
                className="px-4 py-2 bg-[#6D28D9] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                บันทึกสิทธิ์
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Set / Reset Member Password */}
      {passwordModalMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-base text-slate-900">กำหนดรหัสผ่านผู้ใช้งาน</h3>
            </div>
            <p className="text-xs text-slate-600">
              สำหรับผู้ใช้: <span className="font-bold text-slate-900">{passwordModalMember.displayName}</span> ({passwordModalMember.email})
            </p>

            {passwordChangeSuccess ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{passwordChangeSuccess}</span>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    รหัสผ่านใหม่ (New Password):
                  </label>
                  <input
                    type="text"
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    placeholder="เช่น 123456"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setPasswordModalMember(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleUpdatePassword}
                    className="px-4 py-2 bg-[#6D28D9] hover:bg-purple-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    บันทึกรหัสผ่าน
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: New Department */}
      {showNewDeptModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900">เพิ่มกลุ่มงาน / ฝ่ายใหม่</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">รหัสกลุ่มงาน:</label>
                <input
                  type="text"
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value)}
                  placeholder="เช่น FIN หรือ HR"
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อกลุ่มงาน*:</label>
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="เช่น กลุ่มงานการเงินและพัสดุ"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewDeptModal(false)}
                className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddDepartment}
                className="px-4 py-2 bg-[#6D28D9] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                บันทึกกลุ่มงาน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
