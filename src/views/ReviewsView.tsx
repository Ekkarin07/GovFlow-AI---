import React, { useState } from 'react';
import { ClipboardCheck, CheckCircle2, RotateCcw, AlertCircle, FileText, CheckSquare, MessageSquare } from 'lucide-react';
import { formatShortThaiDate } from '../lib/dateUtils';
import { DocumentRecord, TaskRecord, UserProfile } from '../lib/types';

interface ReviewsViewProps {
  documents: DocumentRecord[];
  tasks: TaskRecord[];
  currentUser: UserProfile;
  onReviewDocDecision: (docId: string, decision: 'APPROVED' | 'REVISION_REQUESTED', comments: string) => Promise<{ success: boolean; error?: string }>;
  onReviewEvidenceDecision: (taskId: string, decision: 'APPROVED' | 'REJECTED', feedback: string) => Promise<{ success: boolean; error?: string }>;
  onSelectDoc: (docId: string) => void;
  onSelectTask: (taskId: string) => void;
}

export const ReviewsView: React.FC<ReviewsViewProps> = ({
  documents,
  tasks,
  currentUser,
  onReviewDocDecision,
  onReviewEvidenceDecision,
  onSelectDoc,
  onSelectTask,
}) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'evidence'>('documents');

  // Selected item for review
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docDecisionComments, setDocDecisionComments] = useState('');
  const [docReviewError, setDocReviewError] = useState('');

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskFeedback, setTaskFeedback] = useState('');
  const [taskReviewError, setTaskReviewError] = useState('');

  const pendingDocs = documents.filter((d) => d.status === 'SUBMITTED_FOR_REVIEW');
  const pendingTasks = tasks.filter((t) => t.status === 'SUBMITTED_FOR_REVIEW');

  const selectedDoc = documents.find((d) => d.id === selectedDocId);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const handleDocDecision = async (decision: 'APPROVED' | 'REVISION_REQUESTED') => {
    if (!selectedDocId) return;
    setDocReviewError('');
    const res = await onReviewDocDecision(selectedDocId, decision, docDecisionComments);
    if (!res.success && res.error) {
      setDocReviewError(res.error);
    } else {
      setSelectedDocId(null);
      setDocDecisionComments('');
    }
  };

  const handleEvidenceDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedTaskId) return;
    setTaskReviewError('');
    const res = await onReviewEvidenceDecision(selectedTaskId, decision, taskFeedback);
    if (!res.success && res.error) {
      setTaskReviewError(res.error);
    } else {
      setSelectedTaskId(null);
      setTaskFeedback('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-[#6D28D9]" />
          <span>กล่องงานรอตรวจ (Review & Approval Center)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          ระบบตรวจรับรองเอกสารราชการและหลักฐานภารกิจ พร้อมกลไกป้องกันการตรวจรับรองตนเอง (Anti-Self-Approval)
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'documents'
              ? 'border-[#6D28D9] text-[#6D28D9] bg-purple-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          เอกสารราชการรอตรวจ ({pendingDocs.length})
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'evidence'
              ? 'border-[#2563EB] text-[#2563EB] bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          ภารกิจรอตรวจหลักฐาน ({pendingTasks.length})
        </button>
      </div>

      {/* Tab 1: Documents Review */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {pendingDocs.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              ไม่มีเอกสารรอการตรวจรับรองในขณะนี้
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 hover:border-purple-300 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[11px] text-[#6D28D9] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {doc.caseCode}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      รอตรวจรับรอง
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 leading-snug">{doc.title}</h3>
                  <div className="text-xs text-slate-500">
                    ผู้จัดทำ: <span className="font-semibold text-slate-700">{doc.createdByName}</span> | ปรับปรุงเมื่อ: {formatShortThaiDate(doc.updatedAt)}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <button
                      onClick={() => onSelectDoc(doc.id)}
                      className="text-xs font-semibold text-slate-600 hover:text-[#6D28D9] cursor-pointer"
                    >
                      ดูเนื้อหาร่างเอกสาร
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDocId(doc.id);
                        setDocReviewError('');
                      }}
                      className="px-3 py-1.5 bg-[#6D28D9] hover:bg-purple-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                    >
                      ลงมติตรวจรับรอง
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Evidence Review */}
      {activeTab === 'evidence' && (
        <div className="space-y-4">
          {pendingTasks.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              ไม่มีภารกิจรอการตรวจหลักฐานในขณะนี้
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingTasks.map((t) => (
                <div
                  key={t.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[11px] text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {t.caseCode}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                      รอตรวจหลักฐาน
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 leading-snug">{t.title}</h3>
                  <div className="text-xs text-slate-500">
                    ผู้ปฏิบัติงาน: <span className="font-semibold text-slate-700">{t.assigneeName}</span>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <button
                      onClick={() => onSelectTask(t.id)}
                      className="text-xs font-semibold text-slate-600 hover:text-[#2563EB] cursor-pointer"
                    >
                      ดูรายการหลักฐาน
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTaskId(t.id);
                        setTaskReviewError('');
                      }}
                      className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                    >
                      ตรวจหลักฐานงาน
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Document Review Decision */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900">
              ผลการตรวจรับรองเอกสารราชการ
            </h3>
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900">
              <span className="font-bold">เอกสาร:</span> {selectedDoc.title} ({selectedDoc.caseCode})<br />
              <span className="font-bold">ผู้จัดทำ:</span> {selectedDoc.createdByName}
            </div>

            {docReviewError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                {docReviewError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ข้อคิดเห็น / คำแนะนำจากผู้ตรวจ:
              </label>
              <textarea
                value={docDecisionComments}
                onChange={(e) => setDocDecisionComments(e.target.value)}
                placeholder="ระบุข้อคิดเห็น เช่น ถูกต้องตามแบบระเบียบสารบรรณ หรือ ข้อความส่วนที่ต้องปรับปรุง..."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6D28D9]"
                rows={3}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                onClick={() => setSelectedDocId(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDocDecision('REVISION_REQUESTED')}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ส่งกลับแก้ไข</span>
                </button>
                <button
                  onClick={() => handleDocDecision('APPROVED')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ผ่านการตรวจ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Evidence Review Decision */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900">
              ผลการตรวจรับรองหลักฐานภารกิจ
            </h3>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900">
              <span className="font-bold">ภารกิจ:</span> {selectedTask.title} ({selectedTask.caseCode})<br />
              <span className="font-bold">ผู้ปฏิบัติงาน:</span> {selectedTask.assigneeName}
            </div>

            {taskReviewError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                {taskReviewError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ข้อเสนอแนะในการตรวจหลักฐาน:
              </label>
              <textarea
                value={taskFeedback}
                onChange={(e) => setTaskFeedback(e.target.value)}
                placeholder="ระบุความเห็น เช่น หลักฐานถูกต้องครบถ้วน..."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2563EB]"
                rows={3}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                onClick={() => setSelectedTaskId(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEvidenceDecision('REJECTED')}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  ไม่ผ่าน / ส่งกลับแก้ไข
                </button>
                <button
                  onClick={() => handleEvidenceDecision('APPROVED')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ตรวจผ่านและปิดงาน</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
