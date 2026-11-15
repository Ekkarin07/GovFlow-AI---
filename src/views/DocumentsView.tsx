import React, { useState } from 'react';
import { FileText, Download, PlusCircle, Search, Building, User, CheckCircle2, Clock } from 'lucide-react';
import { formatShortThaiDate } from '../lib/dateUtils';
import { DocumentRecord } from '../lib/types';

interface DocumentsViewProps {
  documents: DocumentRecord[];
  onOpenNewDoc: () => void;
  onSelectDoc: (docId: string) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  onOpenNewDoc,
  onSelectDoc,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.caseCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#6D28D9]" />
            <span>ศูนย์เอกสารสารบรรณ (Documents Center)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            จัดการร่างบันทึกข้อความ หนังสือภายนอก และรายงานผลตามแม่แบบมาตรฐาน
          </p>
        </div>
        <button
          onClick={onOpenNewDoc}
          className="flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>สร้างเอกสารใหม่</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อเอกสาร หรือรหัสเรื่องงาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#6D28D9]"
        >
          <option value="ALL">ทุกสถานะเอกสาร</option>
          <option value="DRAFT">ฉบับร่าง (Draft)</option>
          <option value="SUBMITTED_FOR_REVIEW">รอตรวจรับรอง (Waiting Review)</option>
          <option value="REVIEWED">ผ่านการตรวจแล้ว (Reviewed)</option>
        </select>
      </div>

      {/* Documents Grid / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">ชื่อเอกสาร</th>
                <th className="py-3 px-4">ประเภท</th>
                <th className="py-3 px-4">เรื่องงานที่สังกัด</th>
                <th className="py-3 px-4">ผู้จัดทำ</th>
                <th className="py-3 px-4">ปรับปรุงล่าสุด</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
                <th className="py-3 px-4 text-right">ส่งออกไฟล์จริง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-purple-50/40 transition-colors">
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onSelectDoc(doc.id)}
                      className="font-semibold text-slate-900 hover:text-[#6D28D9] text-left cursor-pointer"
                    >
                      {doc.title}
                    </button>
                    <div className="text-[11px] text-slate-400 font-mono">
                      เวอร์ชัน {doc.currentVersionNo} | แม่แบบมาตรฐาน
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#2563EB] border border-blue-200">
                      {doc.type === 'INTERNAL_MEMO' ? 'บันทึกข้อความ' : 'หนังสือภายนอก'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <span className="font-mono font-bold text-xs text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded mr-1">
                      {doc.caseCode}
                    </span>
                    <span className="truncate">{doc.caseTitle}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{doc.createdByName}</td>
                  <td className="py-3 px-4 text-slate-500">{formatShortThaiDate(doc.updatedAt)}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
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
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <a
                        href={`/api/v1/documents/${doc.id}/export/docx`}
                        download
                        title="ดาวน์โหลดไฟล์ Microsoft Word"
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#2563EB] rounded text-xs font-semibold flex items-center gap-1 border border-blue-200"
                      >
                        <Download className="w-3 h-3" />
                        <span>Word</span>
                      </a>
                      <a
                        href={`/api/v1/documents/${doc.id}/export/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        title="ดาวน์โหลดไฟล์ PDF"
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-[#6D28D9] rounded text-xs font-semibold flex items-center gap-1 border border-purple-200"
                      >
                        <Download className="w-3 h-3" />
                        <span>PDF</span>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
