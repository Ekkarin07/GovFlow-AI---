import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckSquare,
  Clock,
  User,
  Paperclip,
  Upload,
  Play,
  AlertCircle,
  Send,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { formatOfficialThaiDate, formatShortThaiDate } from '../lib/dateUtils';
import { CaseAttachment, EvidenceRecord, TaskRecord, UserProfile } from '../lib/types';
import { FileDropPasteZone } from '../components/FileDropPasteZone';

interface TaskDetailViewProps {
  task: TaskRecord;
  evidence: EvidenceRecord[];
  currentUser: UserProfile;
  onBack: () => void;
  onUpdateStatus: (taskId: string, targetStatus: string, blockedReason?: string) => Promise<void>;
  onAttachEvidence: (
    taskId: string,
    payload: {
      fileName: string;
      fileSizeBytes?: number;
      mimeType?: string;
      fileDataUrl?: string;
      description: string;
    }
  ) => Promise<void>;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({
  task,
  evidence,
  currentUser,
  onBack,
  onUpdateStatus,
  onAttachEvidence,
}) => {
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<CaseAttachment[]>([]);
  const [eviFileName, setEviFileName] = useState('');
  const [eviDescription, setEviDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  const handleStartTask = async () => {
    await onUpdateStatus(task.id, 'IN_PROGRESS');
  };

  const handleReportBlocked = async () => {
    if (!blockReason.trim()) return;
    await onUpdateStatus(task.id, 'BLOCKED', blockReason);
    setShowBlockModal(false);
  };

  const handleSubmitReview = async () => {
    setErrorMsg('');
    if (task.evidenceRequired && evidence.length === 0) {
      setErrorMsg('ภารกิจนี้กำหนดให้ต้องมีหลักฐานประกอบก่อนส่งตรวจอย่างน้อย 1 รายการ');
      return;
    }
    await onUpdateStatus(task.id, 'SUBMITTED_FOR_REVIEW');
  };

  const handleConfirmAttach = async () => {
    const primary = attachedFiles[0];
    const resolvedName = primary?.fileName || eviFileName.trim();
    if (!resolvedName) return;
    setIsUploading(true);
    await onAttachEvidence(task.id, {
      fileName: resolvedName,
      fileSizeBytes: primary?.fileSizeBytes,
      mimeType: primary?.mimeType,
      fileDataUrl: primary?.dataUrl,
      description: eviDescription,
    });
    setIsUploading(false);
    setShowAttachModal(false);
    setAttachedFiles([]);
    setEviFileName('');
    setEviDescription('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#6D28D9] cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>กลับไปรายการภารกิจ</span>
      </button>

      {/* Main Task Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#6D28D9] bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
              {task.caseCode}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                task.status === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : task.status === 'SUBMITTED_FOR_REVIEW'
                  ? 'bg-purple-100 text-purple-800'
                  : task.status === 'IN_PROGRESS'
                  ? 'bg-blue-100 text-blue-800'
                  : task.status === 'BLOCKED'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {task.status === 'COMPLETED'
                ? 'ภารกิจเสร็จสมบูรณ์'
                : task.status === 'SUBMITTED_FOR_REVIEW'
                ? 'ส่งตรวจหลักฐานแล้ว'
                : task.status === 'IN_PROGRESS'
                ? 'กำลังปฏิบัติงาน'
                : task.status === 'BLOCKED'
                ? 'ติดปัญหา'
                : 'ยังไม่เริ่ม'}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {task.status === 'TODO' && (
              <button
                onClick={handleStartTask}
                className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5" />
                <span>เริ่มงาน (Start)</span>
              </button>
            )}

            {(task.status === 'TODO' || task.status === 'IN_PROGRESS') && (
              <button
                onClick={() => setShowBlockModal(true)}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>รายงานติดปัญหา</span>
              </button>
            )}

            {task.status !== 'COMPLETED' && (
              <button
                onClick={() => setShowAttachModal(true)}
                className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-[#6D28D9] px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-purple-200"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>แนบหลักฐาน</span>
              </button>
            )}

            {task.status !== 'COMPLETED' && task.status !== 'SUBMITTED_FOR_REVIEW' && (
              <button
                onClick={handleSubmitReview}
                className="flex items-center gap-1.5 bg-[#6D28D9] hover:bg-purple-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ส่งตรวจหลักฐาน</span>
              </button>
            )}
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
          {task.title}
        </h1>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {task.blockedReason && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
            <span className="font-bold">รายงานปัญหาอุปสรรค:</span> {task.blockedReason}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-500">ผู้รับผิดชอบงาน:</span>
            <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{task.assigneeName}</span>
            </div>
          </div>
          <div>
            <span className="text-slate-500">ผู้ตรวจรับรอง:</span>
            <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
              <User className="w-3.5 h-3.5 text-purple-600" />
              <span>{task.reviewerName}</span>
            </div>
          </div>
          <div>
            <span className="text-slate-500">กำหนดส่งงาน:</span>
            <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatOfficialThaiDate(task.dueDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Evidence Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="font-bold text-sm text-slate-900">คำอธิบายงาน</h2>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {task.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="font-bold text-sm text-slate-900">รายการหลักฐานที่ต้องส่ง (Evidence Checklist)</h2>
          <ul className="space-y-2 text-xs">
            {task.requiredEvidenceList?.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2 p-2 rounded bg-slate-50 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-[#6D28D9]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Attached Evidence Artifacts */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900">หลักฐานที่แนบไว้ ({evidence.length})</h2>
          {task.status !== 'COMPLETED' && (
            <button
              onClick={() => setShowAttachModal(true)}
              className="text-xs font-semibold text-[#6D28D9] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>แนบไฟล์หลักฐาน</span>
            </button>
          )}
        </div>

        {evidence.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            ยังไม่มีหลักฐานแนบสำหรับภารกิจนี้
          </div>
        ) : (
          <div className="space-y-2">
            {evidence.map((evi) => (
              <div
                key={evi.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {evi.fileDataUrl && evi.mimeType?.startsWith('image/') && (
                    <img
                      src={evi.fileDataUrl}
                      alt={evi.fileName}
                      className="w-10 h-10 rounded object-cover border border-slate-200 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{evi.fileName}</div>
                    <div className="text-slate-500">{evi.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {evi.fileDataUrl && (
                    <a
                      href={evi.fileDataUrl}
                      download={evi.fileName}
                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold"
                    >
                      ดาวน์โหลด
                    </a>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      evi.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {evi.status === 'APPROVED' ? 'ผ่านการตรวจ' : 'รอตรวจ'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Attach Evidence */}
      {showAttachModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900">แนบหลักฐานประกอบภารกิจ</h3>
            <FileDropPasteZone
              files={attachedFiles}
              onChange={(next) => {
                setAttachedFiles(next);
                if (next[0]) setEviFileName(next[0].fileName);
              }}
              multiple={false}
              uploadedByName={currentUser.displayName}
              enableGlobalPaste={true}
            />
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อไฟล์หลักฐาน:</label>
                <input
                  type="text"
                  value={eviFileName}
                  onChange={(e) => setEviFileName(e.target.value)}
                  placeholder="ชื่อไฟล์จะกรอกให้อัตโนมัติเมื่อเลือกหรือวางภาพ"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">คำอธิบายหลักฐาน:</label>
                <textarea
                  value={eviDescription}
                  onChange={(e) => setEviDescription(e.target.value)}
                  placeholder="ระบุรายละเอียด เช่น ภาพถ่ายการจัดกิจกรรม หนังสือตอบรับ..."
                  className="w-full p-2 border border-slate-200 rounded-lg"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAttachModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmAttach}
                disabled={isUploading || (!attachedFiles[0] && !eviFileName.trim())}
                className="px-4 py-2 bg-[#6D28D9] hover:bg-purple-800 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isUploading ? 'กำลังแนบ...' : 'ยืนยันแนบหลักฐาน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Block Reason */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900">รายงานปัญหาอุปสรรคการปฏิบัติงาน</h3>
            <div className="text-xs">
              <label className="block font-semibold text-slate-700 mb-1">ระบุปัญหาอุปสรรค:</label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="เช่น รอเอกสารจากหน่วยงานภายนอก หรือระบบเครือข่ายขัดข้อง..."
                className="w-full p-2 border border-slate-200 rounded-lg"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleReportBlocked}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                บันทึกสถานะติดปัญหา
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
