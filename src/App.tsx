import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import {
  AuditActivity,
  CaseRecord,
  Department,
  DocumentFormData,
  DocumentRecord,
  DocumentType,
  EvidenceRecord,
  NotificationItem,
  OfficialTemplate,
  OrganizationProfile,
  TaskRecord,
  UserProfile,
} from './lib/types';
import { AiCenterView } from './views/AiCenterView';
import { CaseDetailView } from './views/CaseDetailView';
import { CasesView } from './views/CasesView';
import { DashboardView } from './views/DashboardView';
import { DocumentBuilderView } from './views/DocumentBuilderView';
import { DocumentsView } from './views/DocumentsView';
import { HelpView } from './views/HelpView';
import { IncomingView } from './views/IncomingView';
import { NewCaseView } from './views/NewCaseView';
import { ReportsView } from './views/ReportsView';
import { ReviewsView } from './views/ReviewsView';
import { SettingsView } from './views/SettingsView';
import { TaskDetailView } from './views/TaskDetailView';
import { TasksView } from './views/TasksView';
import { TemplatesView } from './views/TemplatesView';
import { LoginView } from './views/LoginView';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [settingsSubTab, setSettingsSubTab] = useState<
    'org' | 'members' | 'departments' | 'integrations' | 'audit'
  >('members');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Core Data Stores from Server
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [organization, setOrganization] = useState<OrganizationProfile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [templates, setTemplates] = useState<OfficialTemplate[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditActivity[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [meRes, casesRes, docsRes, tasksRes, eviRes, deptsRes, tmplRes, incRes, notifRes, audRes] =
        await Promise.all([
          fetch('/api/v1/me').then((r) => r.json()),
          fetch('/api/v1/cases').then((r) => r.json()),
          fetch('/api/v1/documents').then((r) => r.json()),
          fetch('/api/v1/tasks').then((r) => r.json()),
          fetch('/api/v1/evidence').then((r) => r.json()),
          fetch('/api/v1/departments').then((r) => r.json()),
          fetch('/api/v1/templates').then((r) => r.json()),
          fetch('/api/v1/incoming').then((r) => r.json()),
          fetch('/api/v1/notifications').then((r) => r.json()),
          fetch('/api/v1/audit').then((r) => r.json()),
        ]);

       // Read the authenticated user from Cloudflare session
      if (meRes.user) {
        setCurrentUser({
          ...meRes.user,
          displayName: meRes.user.display_name ?? meRes.user.displayName,
        } as UserProfile);
      }

      // Support organization data when its API is available
      if (meRes.data?.organization) {
        setOrganization(meRes.data.organization);
      }

      if (Array.isArray(meRes.data?.allUsers)) {
        setAllUsers(meRes.data.allUsers);
      }
      if (casesRes.data) setCases(casesRes.data);
      if (docsRes.data) setDocuments(docsRes.data);
      if (tasksRes.data) setTasks(tasksRes.data);
      if (eviRes.data) setEvidence(eviRes.data);
      if (deptsRes.data) setDepartments(deptsRes.data);
      if (tmplRes.data) setTemplates(tmplRes.data);
      if (incRes.data) setIncoming(incRes.data);
      if (notifRes.data) setNotifications(notifRes.data);
      if (audRes.data) setAuditLogs(audRes.data);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Switch Active User / Role
  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await fetch('/api/v1/auth/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.data) {
        setCurrentUser(data.data.currentUser);
        setCurrentTab('dashboard');
        showToast(`สลับบทบาทเป็น: ${data.data.currentUser.displayName}`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    setCurrentUser(null);
    showToast('ออกจากระบบเรียบร้อยแล้ว');
  };

  // Case Actions
  const handleCreateCase = async (payload: any) => {
    try {
      const res = await fetch('/api/v1/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.data) {
        showToast(`สร้างเรื่องงาน ${data.data.code} เรียบร้อยแล้ว`);
        await fetchData();
        setSelectedCaseId(data.data.id);
        setCurrentTab('case-detail');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseCase = async (caseId: string, note: string) => {
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('ปิดเรื่องงานเสร็จสมบูรณ์');
        await fetchData();
        return { success: true };
      } else {
        return { success: false, errors: data.error?.details || [data.error?.messageTh] };
      }
    } catch (err) {
      return { success: false, errors: ['เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'] };
    }
  };

  const handleReopenCase = async (caseId: string, reason: string) => {
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        showToast('เปิดเรื่องงานซ้ำเรียบร้อยแล้ว');
        await fetchData();
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  // Document Actions
  const handleCreateAndOpenDoc = async (tmpl?: OfficialTemplate) => {
    try {
      const targetCaseId = selectedCase?.id || cases[0]?.id;
      const res = await fetch('/api/v1/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: targetCaseId,
          type: tmpl?.type || 'INTERNAL_MEMO',
          title: tmpl ? `ร่าง${tmpl.title}` : 'ร่างหนังสือราชการใหม่',
          templateId: tmpl?.id || 'tmpl-internal-memo',
          formatProfile: tmpl?.formatProfile,
        }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setSelectedDocId(data.data.id);
        setSelectedCaseId(data.data.caseId);
        await fetchData();
        setCurrentTab('document-builder');
      } else {
        showToast(data.error?.messageTh || 'ไม่สามารถสร้างเอกสารได้');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการสร้างเอกสาร');
    }
  };

  const handleSaveDraftDoc = async (
    formData: DocumentFormData,
    docType: DocumentType = 'INTERNAL_MEMO',
    formatProfile?: OfficialTemplate['formatProfile']
  ) => {
    try {
      let targetDocId = selectedDocId;
      if (!targetDocId) {
        const createRes = await fetch('/api/v1/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId: selectedCase?.id || cases[0]?.id,
            type: docType,
            formatProfile,
            title: formData.subject || 'ร่างหนังสือราชการ',
            formData,
          }),
        });
        const createData = await createRes.json();
        if (createRes.ok && createData.data) {
          targetDocId = createData.data.id;
          setSelectedDocId(targetDocId);
        } else {
          showToast(createData.error?.messageTh || 'ไม่สามารถสร้างเอกสารได้');
          return;
        }
      } else {
        await fetch(`/api/v1/documents/${targetDocId}/draft`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.subject ? `${formData.subject}` : undefined,
            type: docType,
            formatProfile,
            currentFormData: formData,
          }),
        });
      }
      showToast('บันทึกร่างเอกสารสำเร็จ');
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReviewDoc = async (
    formData: DocumentFormData,
    note: string,
    docType: DocumentType = 'INTERNAL_MEMO',
    formatProfile?: OfficialTemplate['formatProfile']
  ) => {
    try {
      let targetDocId = selectedDocId;
      if (!targetDocId) {
        const createRes = await fetch('/api/v1/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId: selectedCase?.id || cases[0]?.id,
            type: docType,
            formatProfile,
            title: formData.subject || 'ร่างหนังสือราชการ',
            formData,
          }),
        });
        const createData = await createRes.json();
        if (createRes.ok && createData.data) {
          targetDocId = createData.data.id;
          setSelectedDocId(targetDocId);
        } else {
          return { success: false, errors: [createData.error?.messageTh || 'ไม่สามารถสร้างเอกสารได้'] };
        }
      } else {
        // Save draft first
        await fetch(`/api/v1/documents/${targetDocId}/draft`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.subject ? `${formData.subject}` : undefined,
            type: docType,
            formatProfile,
            currentFormData: formData,
          }),
        });
      }

      const res = await fetch(`/api/v1/documents/${targetDocId}/submit-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submitNote: note }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('ส่งเอกสารให้ผู้ตรวจเรียบร้อยแล้ว');
        await fetchData();
        setCurrentTab('documents');
        return { success: true };
      } else {
        return { success: false, errors: data.error?.details || [data.error?.messageTh] };
      }
    } catch (err) {
      return { success: false, errors: ['เกิดข้อผิดพลาดในการเชื่อมต่อ'] };
    }
  };

  // Template Actions
  const handleUploadTemplate = async (templateData: Partial<OfficialTemplate>) => {
    const res = await fetch('/api/v1/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(templateData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.messageTh || 'ไม่สามารถบันทึกแม่แบบได้');
    }
    showToast(`เพิ่มแม่แบบ "${data.data.title}" เรียบร้อยแล้ว`);
    await fetchData();
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const res = await fetch(`/api/v1/templates/${templateId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      showToast('ลบแม่แบบเอกสารเรียบร้อยแล้ว');
      await fetchData();
    } else {
      showToast('ไม่สามารถลบแม่แบบได้');
    }
  };

  // Review Decisions
  const handleReviewDocDecision = async (
    docId: string,
    decision: 'APPROVED' | 'REVISION_REQUESTED',
    comments: string
  ) => {
    try {
      const res = await fetch(`/api/v1/reviews/documents/${docId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comments }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(decision === 'APPROVED' ? 'ตรวจผ่านเอกสารแล้ว' : 'ส่งกลับเอกสารเพื่อแก้ไขแล้ว');
        await fetchData();
        return { success: true };
      } else {
        return { success: false, error: data.error?.messageTh };
      }
    } catch (err) {
      return { success: false, error: 'เกิดข้อผิดพลาดในการบันทึก' };
    }
  };

  const handleReviewEvidenceDecision = async (
    taskId: string,
    decision: 'APPROVED' | 'REVISION_REQUESTED' | 'REJECTED',
    feedback: string
  ) => {
    try {
      const res = await fetch(`/api/v1/reviews/evidence/${taskId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, feedback }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(decision === 'APPROVED' ? 'ตรวจผ่านหลักฐานและปิดภารกิจแล้ว' : 'ส่งกลับหลักฐานให้แก้ไขแล้ว');
        await fetchData();
        return { success: true };
      } else {
        return { success: false, error: data.error?.messageTh };
      }
    } catch (err) {
      return { success: false, error: 'เกิดข้อผิดพลาดในการบันทึก' };
    }
  };

  // Task Actions
  const handleUpdateTaskStatus = async (taskId: string, targetStatus: string, blockedReason?: string) => {
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}/transitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus, blockedReason }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`ปรับสถานะภารกิจเป็น ${targetStatus}`);
        await fetchData();
      } else {
        alert(data.error?.messageTh || 'ไม่สามารถเปลี่ยนสถานะได้');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAttachEvidence = async (
    taskId: string,
    payload: {
      fileName: string;
      fileSizeBytes?: number;
      mimeType?: string;
      fileDataUrl?: string;
      description: string;
    }
  ) => {
    try {
      await fetch('/api/v1/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, ...payload }),
      });
      showToast('แนบหลักฐานเรียบร้อยแล้ว');
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogIncoming = async (payload: {
    externalRef: string;
    originatingAgency: string;
    subject: string;
    documentDate: string;
    receivedDate: string;
    fileName?: string;
    fileDataUrl?: string;
    mimeType?: string;
    fileSizeBytes?: number;
  }) => {
    try {
      const res = await fetch('/api/v1/incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast('ลงรับหนังสือเข้าเรียบร้อยแล้ว');
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTaskFromAi = async (caseId: string, title: string, description: string) => {
    try {
      await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          title,
          description,
          assigneeId: currentUser?.id,
          priority: 'NORMAL',
          evidenceRequired: true,
          requiredEvidenceList: ['รายงานผลการปฏิบัติงาน'],
        }),
      });
      showToast(`สร้างภารกิจ "${title}" สำเร็จ`);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-sm font-semibold text-purple-200">กำลังโหลดระบบ GovFlow AI...</div>
        </div>
      </div>
    );
  }

  if (!currentUser || !organization) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          fetchData();
          showToast(`ยินดีต้อนรับ: ${user.displayName}`);
        }}
        organizationName={organization?.fullName}
      />
    );
  }

  const selectedCase = cases.find((c) => c.id === selectedCaseId);
  const selectedDoc = documents.find((d) => d.id === selectedDocId);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A] font-['Noto_Sans_Thai',sans-serif]">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0F172A] text-white px-4 py-2.5 rounded-xl shadow-xl text-xs sm:text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 border border-slate-700">
          <div className="w-2 h-2 rounded-full bg-[#FACC15]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setSelectedCaseId(null);
          setSelectedDocId(null);
          setSelectedTaskId(null);
          setMobileMenuOpen(false);
        }}
        activeSettingsSubTab={settingsSubTab}
        onOpenSettingsSubTab={(sub) => setSettingsSubTab(sub)}
        currentUser={currentUser}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          currentUser={currentUser}
          allUsers={allUsers}
          onSwitchUser={handleSwitchUser}
          organization={organization}
          onOpenNewCase={() => setCurrentTab('new-case')}
          notifications={notifications}
          onOpenNotifications={() => setShowNotifDrawer(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onLogout={() => {
            setCurrentTab('dashboard');
            handleLogout();
          }}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1560px] w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              cases={cases}
              tasks={tasks}
              documents={documents}
              allUsers={allUsers}
              departments={departments}
              templates={templates}
              auditLogs={auditLogs}
              organization={organization}
              onOpenSettingsSubTab={(sub) => setSettingsSubTab(sub)}
              onNavigateTab={(tab, contextId) => {
                if (tab === 'case-detail' && contextId) {
                  setSelectedCaseId(contextId);
                  setCurrentTab('case-detail');
                } else if (tab === 'task-detail' && contextId) {
                  setSelectedTaskId(contextId);
                  setCurrentTab('task-detail');
                } else {
                  setCurrentTab(tab);
                }
              }}
              onOpenNewCase={() => setCurrentTab('new-case')}
            />
          )}

          {currentTab === 'cases' && (
            <CasesView
              cases={cases}
              tasks={tasks}
              documents={documents}
              incoming={incoming}
              members={allUsers}
              onRefreshData={fetchData}
              onOpenNewCase={() => setCurrentTab('new-case')}
              onSelectCase={(id) => {
                setSelectedCaseId(id);
                setCurrentTab('case-detail');
              }}
            />
          )}

          {currentTab === 'case-detail' && selectedCase && (
            <CaseDetailView
              caseRecord={selectedCase}
              tasks={tasks.filter((t) => t.caseId === selectedCase.id)}
              documents={documents.filter((d) => d.caseId === selectedCase.id)}
              evidence={evidence.filter((e) => e.caseId === selectedCase.id)}
              currentUser={currentUser}
              onBack={() => setCurrentTab('cases')}
              onNewDoc={async (caseId) => {
                // Create new draft doc linked to this case
                const res = await fetch('/api/v1/documents', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    caseId,
                    type: 'INTERNAL_MEMO',
                    title: `บันทึกข้อความ เรื่อง ${selectedCase.title}`,
                  }),
                });
                const d = await res.json();
                if (d.data) {
                  await fetchData();
                  setSelectedDocId(d.data.id);
                  setCurrentTab('document-builder');
                }
              }}
              onNewTask={(caseId) => {
                setCurrentTab('tasks');
              }}
              onSelectTask={(taskId) => {
                setSelectedTaskId(taskId);
                setCurrentTab('task-detail');
              }}
              onSelectDoc={(docId) => {
                setSelectedDocId(docId);
                setCurrentTab('document-builder');
              }}
              onCloseCase={handleCloseCase}
              onReopenCase={handleReopenCase}
            />
          )}

          {currentTab === 'new-case' && (
            <NewCaseView
              departments={departments}
              users={allUsers}
              currentUser={currentUser}
              onCancel={() => setCurrentTab('cases')}
              onSubmit={handleCreateCase}
            />
          )}

          {currentTab === 'incoming' && (
            <IncomingView
              incomingList={incoming}
              onOpenNewCase={() => setCurrentTab('new-case')}
              onLogIncoming={handleLogIncoming}
            />
          )}

          {currentTab === 'documents' && (
            <DocumentsView
              documents={documents}
              onOpenNewDoc={() => handleCreateAndOpenDoc()}
              onSelectDoc={(id) => {
                setSelectedDocId(id);
                setCurrentTab('document-builder');
              }}
            />
          )}

          {currentTab === 'document-builder' && (
            <DocumentBuilderView
              key={selectedDoc?.id || 'new'}
              documentRecord={selectedDoc}
              template={templates.find((t) => t.id === selectedDoc?.templateId)}
              caseId={selectedCase?.id || cases[0]?.id}
              caseCode={selectedCase?.code || cases[0]?.code}
              caseTitle={selectedCase?.title || cases[0]?.title}
              orgName={organization.fullName}
              orgAddress={organization.address}
              currentUser={currentUser}
              onBack={() => setCurrentTab('documents')}
              onSaveDraft={handleSaveDraftDoc}
              onSubmitReview={handleSubmitReviewDoc}
            />
          )}

          {currentTab === 'tasks' && (
            <TasksView
              tasks={tasks}
              currentUser={currentUser}
              onSelectTask={(id) => {
                setSelectedTaskId(id);
                setCurrentTab('task-detail');
              }}
              onOpenNewTask={() => {
                // Quick create task modal or view
                if (cases.length > 0) {
                  handleCreateTaskFromAi(
                    cases[0].id,
                    'ภารกิจดำเนินงานเพิ่มเติม',
                    'จัดทำรายงานและประสานงานหน่วยงานที่เกี่ยวข้อง'
                  );
                }
              }}
            />
          )}

          {currentTab === 'task-detail' && selectedTask && (
            <TaskDetailView
              task={selectedTask}
              evidence={evidence.filter((e) => e.taskId === selectedTask.id)}
              currentUser={currentUser}
              onBack={() => setCurrentTab('tasks')}
              onUpdateStatus={handleUpdateTaskStatus}
              onAttachEvidence={handleAttachEvidence}
            />
          )}

          {currentTab === 'reviews' && (
            <ReviewsView
              documents={documents}
              tasks={tasks}
              currentUser={currentUser}
              onReviewDocDecision={handleReviewDocDecision}
              onReviewEvidenceDecision={handleReviewEvidenceDecision}
              onSelectDoc={(id) => {
                setSelectedDocId(id);
                setCurrentTab('document-builder');
              }}
              onSelectTask={(id) => {
                setSelectedTaskId(id);
                setCurrentTab('task-detail');
              }}
            />
          )}

          {currentTab === 'ai' && (
            <AiCenterView
              cases={cases}
              onCreateTaskFromAi={handleCreateTaskFromAi}
            />
          )}

          {currentTab === 'templates' && (
            <TemplatesView
              templates={templates}
              onSelectTemplate={(tmplId) => {
                const tmpl = templates.find((t) => t.id === tmplId);
                handleCreateAndOpenDoc(tmpl);
              }}
              onUploadTemplate={handleUploadTemplate}
              onDeleteTemplate={handleDeleteTemplate}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView cases={cases} tasks={tasks} />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              organization={organization}
              members={allUsers}
              departments={departments}
              auditLogs={auditLogs}
              cases={cases}
              documents={documents}
              tasks={tasks}
              incoming={incoming}
              currentUser={currentUser}
              activeSubTab={settingsSubTab}
              onChangeSubTab={(sub) => setSettingsSubTab(sub)}
              onRefreshData={fetchData}
              onUpdateOrg={async (updated) => {
                await fetch('/api/v1/organizations/current', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updated),
                });
                showToast('ปรับปรุงข้อมูลองค์กรสำเร็จ');
                fetchData();
              }}
              onInviteMember={async (payload) => {
                await fetch('/api/v1/invitations', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                showToast(`เชิญ ${payload.displayName} เรียบร้อยแล้ว`);
                fetchData();
              }}
            />
          )}

          {currentTab === 'help' && <HelpView />}
        </main>
      </div>

      {/* Notifications Drawer */}
      {showNotifDrawer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="w-80 sm:w-96 bg-white h-full shadow-2xl p-5 flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">การแจ้งเตือน (Notifications)</h3>
              <button
                onClick={() => setShowNotifDrawer(false)}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ปิด
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2 text-xs">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-slate-400">ไม่มีการแจ้งเตือนใหม่</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={async () => {
                      await fetch(`/api/v1/notifications/${n.id}/read`, { method: 'POST' });
                      fetchData();
                      setShowNotifDrawer(false);
                      if (n.targetRoute.includes('tasks')) setCurrentTab('tasks');
                      else if (n.targetRoute.includes('reviews')) setCurrentTab('reviews');
                      else if (n.targetRoute.includes('documents')) setCurrentTab('documents');
                    }}
                    className={`p-3 rounded-xl border transition-colors cursor-pointer space-y-1 ${
                      n.read ? 'bg-slate-50/70 border-slate-100 text-slate-600' : 'bg-purple-50/50 border-purple-200 text-slate-900 font-medium'
                    }`}
                  >
                    <div className="font-semibold">{n.title}</div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
