import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Building,
  User,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PlusCircle,
  FileText,
  CheckSquare,
  Paperclip,
  GitBranch,
  History,
  Lock,
  Unlock,
  Download,
  ExternalLink,
} from 'lucide-react';
import { formatOfficialThaiDate, formatShortThaiDate } from '../lib/dateUtils';
import { CaseRecord, DocumentRecord, EvidenceRecord, TaskRecord, UserProfile } from '../lib/types';

interface CaseDetailViewProps {
  caseRecord: CaseRecord;
  tasks: TaskRecord[];
  documents: DocumentRecord[];
  evidence: EvidenceRecord[];
  currentUser: UserProfile;
  onBack: () => void;
  onNewDoc: (caseId: string) => void;
  onNewTask: (caseId: string) => void;
  onSelectTask: (taskId: string) => void;
  onSelectDoc: (docId: string) => void;
  onCloseCase: (caseId: string, note: string) => Promise<{ success: boolean; errors?: string[] }>;
  onReopenCase: (caseId: string, reason: string) => Promise<boolean>;
}

export const CaseDetailView: React.FC<CaseDetailViewProps> = ({
  caseRecord,
  tasks,
  documents,
  evidence,
  currentUser,
  onBack,
  onNewDoc,
  onNewTask,
  onSelectTask,
  onSelectDoc,
  onCloseCase,
  onReopenCase,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'tasks' | 'evidence' | 'relationships' | 'timeline'>('overview');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeNote, setCloseNote] = useState('');
  const [closeErrors, setCloseErrors] = useState<string[]>([]);
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);

  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const handleConfirmClose = async () => {
    setIsSubmittingClose(true);
    setCloseErrors([]);
    const res = await onCloseCase(caseRecord.id, closeNote);
    setIsSubmittingClose(false);
    if (!res.success && res.errors) {
      setCloseErrors(res.errors);
    } else {
      setShowCloseModal(false);
    }
  };

  const handleConfirmReopen = async () => {
    if (!reopenReason.trim()) return;
    const ok = await onReopenCase(caseRecord.id, reopenReason);
    if (ok) {
      setShowReopenModal(false);
      setReopenReason('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#6D28D9] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปทะเบียนเรื่องงาน</span>
        </button>

        {/* Status indicator */}
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            caseRecord.status === 'CLOSED'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-blue-100 text-blue-800 border border-blue-300'
          }`}
        >
          {caseRecord.status === 'CLOSED' ? 'เรื่องงานปิดเสร็จสมบูรณ์' : 'เรื่องงานกำลังดำเนินการ'}
        </span>
      </div>

      {/* Case Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold bg-[#6D28D9] text-white px-2.5 py-0.5 rounded shadow-xs">
                {caseRecord.code}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ประเภท: {caseRecord.type === 'ACTIVITY_REPORT' ? 'การจัดกิจกรรมและรายงานผล' : 'งานสารบรรณทั่วไป'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              {caseRecord.title}
            </h1>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onNewDoc(caseRecord.id)}
              className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>สร้างเอกสาร</span>
            </button>
            <button
              onClick={() => onNewTask(caseRecord.id)}
              className="flex items-center gap-1.5 bg-[#6D28D9] hover:bg-purple-800 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>มอบหมายภารกิจ</span>
            </button>

            {caseRecord.status !== 'CLOSED' ? (
              <button
                onClick={() => {
                  setCloseErrors([]);
                  setShowCloseModal(true);
                }}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>ปิดเรื่องงาน</span>
              </button>
            ) : (
              <button
                onClick={() => setShowReopenModal(true)}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>ขอเปิดเรื่องซ้ำ</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar & Key Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-500">หน่วยงานเจ้าของเรื่อง:</span>
            <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>{caseRecord.departmentName}</span>
            </div>
          </div>
          <div>
            <span className="text-slate-500">ผู้รับผิดชอบหลัก:</span>
            <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{caseRecord.ownerName}</span>
            </div>
          </div>
          <div>
            <span className="text-slate-500">กำหนดส่งรายงาน:</span>
            <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatOfficialThaiDate(caseRecord.dueDate)}</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-500">ความคืบหน้าภารกิจ:</span>
              <span className="font-bold text-purple-700">{progressPercent}% ({completedTasks.length}/{tasks.length})</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#6D28D9] h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto text-xs sm:text-sm font-medium">
        {[
          { id: 'overview', label: 'ภาพรวมเรื่องงาน' },
          { id: 'documents', label: `เอกสาร (${documents.length})` },
          { id: 'tasks', label: `ภารกิจ (${tasks.length})` },
          { id: 'evidence', label: `หลักฐาน (${evidence.length})` },
          { id: 'relationships', label: 'แผนภาพความสัมพันธ์' },
          { id: 'timeline', label: 'ประวัติการดำเนินงาน' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 border-b-2 font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#6D28D9] text-[#6D28D9] bg-purple-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900">สาระสำคัญ / รายละเอียดเรื่องงาน</h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {caseRecord.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
              </p>
            </div>

            {/* Inbound Letter Origin Card */}
            {caseRecord.externalBookNo && (
              <div className="bg-blue-50/60 p-5 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <FileText className="w-4 h-4 text-[#2563EB]" />
                  <span>ข้อมูลหนังสือรับต้นเรื่อง (Incoming Letter)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-blue-950 mt-2">
                  <div>
                    <span className="text-blue-700 font-medium">เลขที่หนังสือต้นทาง:</span>{' '}
                    <span className="font-semibold">{caseRecord.externalBookNo}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">ลงวันที่:</span>{' '}
                    <span>{formatOfficialThaiDate(caseRecord.externalBookDate)}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">หน่วยงานต้นทาง:</span>{' '}
                    <span>{caseRecord.originAgency || '-'}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">วันที่ลงรับ:</span>{' '}
                    <span>{formatOfficialThaiDate(caseRecord.receivedDate)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Case Origin Attachments Card */}
            {caseRecord.attachments && caseRecord.attachments.length > 0 && (
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Paperclip className="w-4 h-4 text-[#6D28D9]" />
                  <span>ไฟล์และรูปภาพเอกสารต้นเรื่อง ({caseRecord.attachments.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {caseRecord.attachments.map((att) => {
                    const isImg = att.mimeType?.startsWith('image/') || att.dataUrl?.startsWith('data:image/');
                    return (
                      <div
                        key={att.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-3"
                      >
                        {isImg ? (
                          <img
                            src={att.dataUrl}
                            alt={att.fileName}
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-purple-100 text-[#6D28D9] flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-xs text-slate-900 truncate">{att.fileName}</div>
                          <div className="text-[11px] text-slate-500">
                            {(att.fileSizeBytes / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <a
                          href={att.dataUrl}
                          download={att.fileName}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#6D28D9] text-xs font-semibold shrink-0 flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>เปิด</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Inspector */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900">การควบคุมความครบถ้วน (Close Guard)</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-slate-50">
                <span>ภารกิจเสร็จสมบูรณ์แล้ว</span>
                <span className="font-bold text-emerald-700">{completedTasks.length} / {tasks.length}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-50">
                <span>เอกสารผ่านการตรวจแล้ว</span>
                <span className="font-bold text-purple-700">
                  {documents.filter((d) => d.status === 'REVIEWED').length} / {documents.length}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-50">
                <span>หลักฐานที่ได้รับการอนุมัติ</span>
                <span className="font-bold text-blue-700">{evidence.filter((e) => e.status === 'APPROVED').length} รายการ</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Documents */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">เอกสารราชการที่ผูกกับเรื่องงานนี้</h3>
            <button
              onClick={() => onNewDoc(caseRecord.id)}
              className="flex items-center gap-1.5 bg-[#6D28D9] hover:bg-purple-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>สร้างเอกสารจากแม่แบบ</span>
            </button>
          </div>

          <div className="space-y-3">
            {documents.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                ยังไม่มีการร่างเอกสารในเรื่องงานนี้
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-[#2563EB]">
                        {doc.type === 'INTERNAL_MEMO' ? 'บันทึกข้อความ' : 'หนังสือภายนอก'}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">เวอร์ชัน {doc.currentVersionNo}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.status === 'REVIEWED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : doc.status === 'SUBMITTED_FOR_REVIEW'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {doc.status === 'REVIEWED'
                          ? 'ผ่านการตรวจแล้ว'
                          : doc.status === 'SUBMITTED_FOR_REVIEW'
                          ? 'รอตรวจ'
                          : 'ฉบับร่าง'}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm text-slate-900">{doc.title}</h4>
                    <p className="text-xs text-slate-500">ผู้จัดทำ: {doc.createdByName} | ผู้ตรวจ: {doc.reviewerName}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onSelectDoc(doc.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      แก้ไข / ดูร่าง
                    </button>
                    <a
                      href={`/api/v1/documents/${doc.id}/export/docx`}
                      download
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#2563EB] rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Word</span>
                    </a>
                    <a
                      href={`/api/v1/documents/${doc.id}/export/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#6D28D9] rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Tasks */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">รายการภารกิจการดำเนินงาน (Missions)</h3>
            <button
              onClick={() => onNewTask(caseRecord.id)}
              className="flex items-center gap-1.5 bg-[#6D28D9] hover:bg-purple-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>มอบหมายภารกิจใหม่</span>
            </button>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/20 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        task.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : task.status === 'SUBMITTED_FOR_REVIEW'
                          ? 'bg-purple-100 text-purple-800'
                          : task.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {task.status === 'COMPLETED'
                        ? 'เสร็จสิ้น'
                        : task.status === 'SUBMITTED_FOR_REVIEW'
                        ? 'รอตรวจหลักฐาน'
                        : task.status === 'IN_PROGRESS'
                        ? 'กำลังทำ'
                        : 'ยังไม่เริ่ม'}
                    </span>
                    {task.evidenceRequired && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        ต้องมีหลักฐาน
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm text-slate-900">{task.title}</h4>
                  <p className="text-xs text-slate-500">ผู้รับผิดชอบ: {task.assigneeName} | กำหนดส่ง: {formatShortThaiDate(task.dueDate)}</p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-[#6D28D9] font-medium flex items-center gap-1 hover:underline">
                    ดูรายละเอียดและแนบหลักฐาน
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Evidence */}
      {activeTab === 'evidence' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h3 className="font-bold text-sm text-slate-900">หลักฐานการดำเนินงานทั้งหมด (Evidence Artifacts)</h3>
          {evidence.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              ยังไม่มีการแนบหลักฐานในเรื่องงานนี้
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {evidence.map((evi) => (
                <div key={evi.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-semibold text-slate-800 truncate">{evi.fileName}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        evi.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {evi.status === 'APPROVED' ? 'ผ่านการตรวจแล้ว' : 'รอตรวจ'}
                    </span>
                  </div>
                  {evi.fileDataUrl && evi.mimeType?.startsWith('image/') && (
                    <img
                      src={evi.fileDataUrl}
                      alt={evi.fileName}
                      className="w-full max-h-40 object-contain rounded-lg border border-slate-200 bg-white"
                    />
                  )}
                  <p className="text-xs text-slate-600">{evi.description}</p>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200 flex items-center justify-between">
                    <span>
                      แนบโดย: {evi.uploadedByName} ({formatShortThaiDate(evi.createdAt)})
                    </span>
                    {evi.fileDataUrl && (
                      <a
                        href={evi.fileDataUrl}
                        download={evi.fileName}
                        className="text-[#6D28D9] font-semibold hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>ดาวน์โหลด</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Relationships Graph */}
      {activeTab === 'relationships' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <h3 className="font-bold text-sm text-slate-900">ผังความสัมพันธ์ (Traceability Graph)</h3>
          <div className="flex flex-col items-center justify-center space-y-4 py-6">
            {/* Origin Node */}
            <div className="p-3 bg-blue-50 border-2 border-blue-400 rounded-xl text-center w-72 shadow-xs">
              <span className="text-[10px] font-bold text-blue-700 uppercase">หนังสือรับต้นเรื่อง</span>
              <div className="font-bold text-xs text-blue-950 mt-1">{caseRecord.externalBookNo || 'เริ่มเรื่องใหม่ภายใน'}</div>
            </div>

            <div className="w-0.5 h-6 bg-slate-300" />

            {/* Case Node */}
            <div className="p-3.5 bg-purple-100 border-2 border-[#6D28D9] rounded-xl text-center w-80 shadow-md">
              <span className="text-[10px] font-bold text-purple-700 uppercase">เรื่องงานหลัก (Case of Truth)</span>
              <div className="font-bold text-sm text-purple-950 mt-1">{caseRecord.code}</div>
              <div className="text-xs text-purple-800 line-clamp-1">{caseRecord.title}</div>
            </div>

            <div className="w-0.5 h-6 bg-slate-300" />

            {/* Parallel Children: Docs & Tasks */}
            <div className="grid grid-cols-2 gap-8 w-full max-w-lg">
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-bold text-amber-800">เอกสารราชการ ({documents.length})</span>
                <div className="text-xs text-amber-900">ร่างบันทึกข้อความ & หนังสือตอบ</div>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-bold text-emerald-800">ภารกิจ & หลักฐาน ({tasks.length})</span>
                <div className="text-xs text-emerald-900">หลักฐานผ่านการตรวจ {evidence.filter((e) => e.status === 'APPROVED').length} ชิ้น</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Case Modal with Server Close Guard */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Lock className="w-5 h-5 text-emerald-600" />
              <span>ยืนยันการปิดเรื่องงาน ({caseRecord.code})</span>
            </div>

            {closeErrors.length > 0 && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>ไม่สามารถปิดเรื่องงานได้ตามเงื่อนไขความสมบูรณ์:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {closeErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-slate-600">
              การปิดเรื่องงานจะบันทึกว่าภารกิจและเอกสารได้รับการตรวจเสร็จสิ้นแล้วตามระเบียบสารบรรณ
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หมายเหตุการปิดเรื่องงาน (Close Note):
              </label>
              <textarea
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                placeholder="ระบุข้อคิดเห็นสรุปผล..."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-600"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmClose}
                disabled={isSubmittingClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                {isSubmittingClose ? 'กำลังตรวจสอบ...' : 'ยืนยันปิดเรื่องงาน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Unlock className="w-5 h-5 text-amber-600" />
              <span>ขอเปิดเรื่องงานซ้ำ ({caseRecord.code})</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เหตุผลความจำเป็นในการขอเปิดเรื่องซ้ำ*:
              </label>
              <textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="ระบุเหตุผล เช่น ได้รับเอกสารเพิ่มเติม..."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-600"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReopenModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmReopen}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                ยืนยันเปิดเรื่องซ้ำ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
