import React, { useState } from 'react';
import { Inbox, PlusCircle, CheckCircle2, Download } from 'lucide-react';
import { formatShortThaiDate } from '../lib/dateUtils';
import { CaseAttachment } from '../lib/types';
import { FileDropPasteZone } from '../components/FileDropPasteZone';

interface IncomingViewProps {
  incomingList: any[];
  onOpenNewCase: () => void;
  onLogIncoming?: (payload: {
    externalRef: string;
    originatingAgency: string;
    subject: string;
    documentDate: string;
    receivedDate: string;
    fileName?: string;
    fileDataUrl?: string;
    mimeType?: string;
    fileSizeBytes?: number;
  }) => Promise<void>;
}

export const IncomingView: React.FC<IncomingViewProps> = ({
  incomingList,
  onOpenNewCase,
  onLogIncoming,
}) => {
  const [showLogModal, setShowLogModal] = useState(false);
  const [externalRef, setExternalRef] = useState('');
  const [originatingAgency, setOriginatingAgency] = useState('');
  const [subject, setSubject] = useState('');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [files, setFiles] = useState<CaseAttachment[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!subject.trim()) return;
    setIsSaving(true);
    try {
      if (onLogIncoming) {
        const first = files[0];
        await onLogIncoming({
          externalRef,
          originatingAgency,
          subject,
          documentDate,
          receivedDate,
          fileName: first?.fileName,
          fileDataUrl: first?.dataUrl,
          mimeType: first?.mimeType,
          fileSizeBytes: first?.fileSizeBytes,
        });
      }
      setShowLogModal(false);
      setExternalRef('');
      setOriginatingAgency('');
      setSubject('');
      setFiles([]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Inbox className="w-6 h-6 text-[#2563EB]" />
            <span>ทะเบียนหนังสือรับ (Incoming Correspondence)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            บันทึกการรับหนังสือราชการจากภายนอก พร้อมแนบไฟล์สแกนหรือวางรูปภาพหนังสือรับได้โดยตรง
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onLogIncoming && (
            <button
              onClick={() => setShowLogModal(true)}
              className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>ลงรับหนังสือเข้าด่วน</span>
            </button>
          )}
          <button
            onClick={onOpenNewCase}
            className="flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ลงรับและสร้างเรื่องงานใหม่</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-3 px-4">เลขทะเบียนรับ</th>
              <th className="py-3 px-4">เลขที่หนังสือต้นทาง</th>
              <th className="py-3 px-4">หน่วยงานต้นทาง</th>
              <th className="py-3 px-4 min-w-[240px]">ชื่อเรื่อง</th>
              <th className="py-3 px-4">วันที่ลงรับ</th>
              <th className="py-3 px-4">ไฟล์แนบ</th>
              <th className="py-3 px-4 text-center">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {incomingList.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                  ยังไม่มีรายการหนังสือรับในระบบ
                </td>
              </tr>
            ) : (
              incomingList.map((inc) => (
                <tr key={inc.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{inc.intakeNo}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{inc.externalRef}</td>
                  <td className="py-3 px-4 text-slate-600">{inc.originatingAgency}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{inc.subject}</td>
                  <td className="py-3 px-4 text-slate-600">{formatShortThaiDate(inc.receivedDate)}</td>
                  <td className="py-3 px-4 text-xs">
                    {inc.fileDataUrl ? (
                      <a
                        href={inc.fileDataUrl}
                        download={inc.fileName || 'incoming-file'}
                        className="inline-flex items-center gap-1 text-[#6D28D9] font-semibold hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[140px]">{inc.fileName || 'ไฟล์แนบ'}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400">{inc.fileName || '-'}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      ลงรับแล้ว
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900">ลงรับหนังสือเข้าใหม่</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">เลขที่หนังสือต้นทาง:</label>
                <input
                  type="text"
                  value={externalRef}
                  onChange={(e) => setExternalRef(e.target.value)}
                  placeholder="เช่น ศธ 0400/ว 123"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">หน่วยงานต้นทาง:</label>
                <input
                  type="text"
                  value={originatingAgency}
                  onChange={(e) => setOriginatingAgency(e.target.value)}
                  placeholder="ระบุชื่อส่วนราชการต้นทาง"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">ชื่อเรื่อง*:</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="ระบุชื่อเรื่องหนังสือรับ"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">วันที่หนังสือ:</label>
                <input
                  type="date"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">วันที่ลงรับ:</label>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <FileDropPasteZone
              files={files}
              onChange={setFiles}
              multiple={false}
              enableGlobalPaste={true}
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowLogModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !subject.trim()}
                className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกลงรับหนังสือ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
