import React, { useState } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  Download,
  Upload,
  PlusCircle,
  FileText,
  Trash2,
  Paperclip,
  X,
  AlertCircle,
  Sparkles,
  FileCode,
  FileSpreadsheet,
} from 'lucide-react';
import { DocumentType, OfficialTemplate } from '../lib/types';

interface TemplatesViewProps {
  templates: OfficialTemplate[];
  onSelectTemplate: (templateId: string) => void;
  onUploadTemplate?: (templateData: Partial<OfficialTemplate>) => Promise<void>;
  onDeleteTemplate?: (templateId: string) => Promise<void>;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  onSelectTemplate,
  onUploadTemplate,
  onDeleteTemplate,
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<DocumentType>('INTERNAL_MEMO');
  const [provenance, setProvenance] = useState('');
  const [garudaHeight, setGarudaHeight] = useState(15);
  const [garudaPos, setGarudaPos] = useState<'CENTER' | 'LEFT'>('LEFT');

  // Attached file state
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFileSize, setAttachedFileSize] = useState<number | undefined>(undefined);
  const [attachedFileType, setAttachedFileType] = useState('');
  const [attachedFileData, setAttachedFileData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Handle file selection from local device
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('ขนาดไฟล์ต้องไม่เกิน 15 MB');
      return;
    }

    setErrorMsg(null);
    setAttachedFileName(file.name);
    setAttachedFileSize(file.size);
    setAttachedFileType(file.type || 'application/octet-stream');

    // Auto-fill template title if empty
    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setTitle(`แม่แบบ ${cleanName}`);
      if (cleanName.includes('ภายนอก')) {
        setType('EXTERNAL_LETTER');
        setGarudaPos('CENTER');
        setGarudaHeight(30);
      }
    }

    // Auto-generate code if empty
    if (!code.trim()) {
      setCode(`T-USR-${Math.floor(100 + Math.random() * 900)}`);
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const result = loadEvt.target?.result as string;
      setAttachedFileData(result);
    };
    reader.readAsDataURL(file);
  };

  // Quick preset: load sample PDF attached by user
  const handleLoadSamplePdf = () => {
    setTitle('แบบบันทึกข้อความขอยืมพัสดุและอุปกรณ์ (ตัวอย่างเอกสารต้นแบบ)');
    setCode('T-MEMO-BORROW-02');
    setType('INTERNAL_MEMO');
    setGarudaHeight(15);
    setGarudaPos('LEFT');
    setProvenance('อ้างอิงจากตัวอย่างเอกสารบันทึกข้อความยืมของ สำหรับใช้เป็นแม่แบบมาตรฐาน');
    setAttachedFileName('บันทึกข้อความยืมของ 2.pdf');
    setAttachedFileSize(285000);
    setAttachedFileType('application/pdf');
    setAttachedFileData('/assets/aistudio/_____________________2_a8cf8892.pdf');
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('กรุณากรอกชื่อแม่แบบเอกสาร');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: Partial<OfficialTemplate> = {
        title: title.trim(),
        code: code.trim() || `T-CUSTOM-${Date.now().toString().slice(-4)}`,
        type,
        provenance: provenance.trim() || 'แม่แบบต้นแบบที่ผู้ใช้งานแนบและกำหนดขึ้นเองในระบบ',
        formatProfile: {
          paperSize: 'A4',
          marginsMm: { top: 15, right: 20, bottom: 20, left: 30 },
          bodyFont: 'TH Sarabun New',
          bodyFontSizePt: 16,
          garudaHeightMm: garudaHeight,
          garudaPosition: garudaPos,
        },
        attachedFileName: attachedFileName || undefined,
        attachedFileSize: attachedFileSize || undefined,
        attachedFileType: attachedFileType || undefined,
        attachedFileData: attachedFileData || undefined,
        isCustom: true,
      };

      if (onUploadTemplate) {
        await onUploadTemplate(payload);
      } else {
        const res = await fetch('/api/v1/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error?.messageTh || 'ไม่สามารถบันทึกแม่แบบได้');
        }
      }

      // Reset form & close modal
      setShowUploadModal(false);
      setTitle('');
      setCode('');
      setProvenance('');
      setAttachedFileName('');
      setAttachedFileSize(undefined);
      setAttachedFileType('');
      setAttachedFileData('');
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกแม่แบบ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Filtered templates
  const filteredTemplates = templates.filter((tmpl) => {
    const matchSearch =
      tmpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tmpl.provenance && tmpl.provenance.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchType = filterType === 'ALL' || tmpl.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-[#6D28D9]" />
            <span>คลังแม่แบบและไฟล์ต้นแบบ (Document Templates & Files)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            รองรับการแนบไฟล์ต้นแบบ (.docx, .pdf, รูปภาพ) และแม่แบบมาตรฐานตามระเบียบงานสารบรรณ
          </p>
        </div>

        <button
          onClick={() => {
            setShowUploadModal(true);
            setErrorMsg(null);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#6D28D9] hover:bg-purple-800 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>แนบไฟล์แม่แบบใหม่ (Upload Template)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="ค้นหาแม่แบบ หรือรหัสแม่แบบ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 pl-9 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'ทั้งหมด' },
            { id: 'INTERNAL_MEMO', label: 'หนังสือภายใน' },
            { id: 'EXTERNAL_LETTER', label: 'หนังสือภายนอก' },
            { id: 'COMPLETION_REPORT', label: 'รายงานสรุปผล' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterType(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filterType === cat.id
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((tmpl) => (
          <div
            key={tmpl.id}
            className={`bg-white p-6 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md ${
              tmpl.isCustom ? 'border-purple-300 ring-1 ring-purple-100' : 'border-slate-200 hover:border-purple-300'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {tmpl.code}
                </span>

                {tmpl.isCustom ? (
                  <span className="flex items-center gap-1 text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded text-[11px] border border-purple-200">
                    <Sparkles className="w-3.5 h-3.5" />
                    แม่แบบกำหนดเอง
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ระเบียบสารบรรณ
                  </span>
                )}
              </div>

              <div>
                <h2 className="font-bold text-base text-slate-900 leading-snug">{tmpl.title}</h2>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">{tmpl.provenance}</p>
              </div>

              {/* Attached Template File Box */}
              {tmpl.attachedFileName && (
                <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Paperclip className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="text-xs font-semibold text-purple-900 truncate">
                        {tmpl.attachedFileName}
                      </span>
                    </div>
                    {tmpl.attachedFileSize && (
                      <span className="text-[10px] text-purple-600 font-mono shrink-0 ml-1">
                        {formatFileSize(tmpl.attachedFileSize)}
                      </span>
                    )}
                  </div>

                  <a
                    href={tmpl.attachedFileData || '#'}
                    download={tmpl.attachedFileName}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-2 bg-white hover:bg-purple-100/50 text-purple-800 border border-purple-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-600" />
                    <span>ดาวน์โหลดไฟล์ต้นแบบ</span>
                  </a>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg space-y-1 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>ขนาดกระดาษ:</span>
                  <span className="font-semibold text-slate-800">A4 (210 x 297 mm)</span>
                </div>
                <div className="flex justify-between">
                  <span>ตราครุฑ:</span>
                  <span className="font-semibold text-slate-800">
                    สูง {((tmpl.formatProfile?.garudaHeightMm || 30) / 10).toFixed(1)} ซม. (
                    {tmpl.formatProfile?.garudaPosition === 'LEFT' ? 'ชิดซ้ายด้านบน' : 'กึ่งกลางด้านบน'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ระยะขอบ:</span>
                  <span className="font-semibold text-slate-800">
                    บน {(tmpl.formatProfile?.marginsMm?.top ?? 15) / 10} ซม. · ซ้าย {(tmpl.formatProfile?.marginsMm?.left ?? 30) / 10} · ขวา{' '}
                    {(tmpl.formatProfile?.marginsMm?.right ?? 20) / 10} · ล่าง {(tmpl.formatProfile?.marginsMm?.bottom ?? 20) / 10} ซม.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectTemplate(tmpl.id)}
                  className="flex-1 py-2 bg-[#6D28D9] hover:bg-purple-800 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>นำแม่แบบไปร่างเอกสาร</span>
                </button>

                {tmpl.isCustom && onDeleteTemplate && (
                  <button
                    onClick={() => {
                      if (confirm(`คุณต้องการลบแม่แบบ "${tmpl.title}" ใช่หรือไม่?`)) {
                        onDeleteTemplate(tmpl.id);
                      }
                    }}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                    title="ลบแม่แบบนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold">ไม่พบแม่แบบเอกสารที่ตรงกับเงื่อนไข</p>
            <p className="text-xs text-slate-400 mt-1">สามารถคลิกปุ่ม "แนบไฟล์แม่แบบใหม่" เพื่อเพิ่มแม่แบบได้ทันที</p>
          </div>
        )}
      </div>

      {/* Upload Template Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#6D28D9]" />
                <h3 className="font-bold text-base text-slate-900">แนบไฟล์แม่แบบและสร้างแม่แบบใหม่</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <div className="leading-relaxed">{errorMsg}</div>
              </div>
            )}

            <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs sm:text-sm">
              {/* File Attachment Dropzone */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  ไฟล์ต้นแบบเอกสาร (.docx, .pdf, .png, .jpg)
                </label>
                <div className="relative border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/40 rounded-xl p-4 text-center transition-colors">
                  <input
                    type="file"
                    accept=".docx,.pdf,.png,.jpg,.jpeg,.odt"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {attachedFileName ? (
                    <div className="flex items-center justify-center gap-2 text-purple-900">
                      <Paperclip className="w-4 h-4 text-purple-600" />
                      <span className="font-semibold truncate max-w-xs">{attachedFileName}</span>
                      <span className="text-xs text-purple-600 font-mono">({formatFileSize(attachedFileSize)})</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 mx-auto text-purple-500" />
                      <div className="font-medium text-slate-700 text-xs">คลิกหรือลากไฟล์ต้นแบบมาวางที่นี่</div>
                      <div className="text-[11px] text-slate-400">รองรับไฟล์ Word (.docx), PDF หรือรูปภาพ (สูงสุด 15 MB)</div>
                    </div>
                  )}
                </div>

                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleLoadSamplePdf}
                    className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold underline cursor-pointer"
                  >
                    + ใช้ไฟล์ตัวอย่างบันทึกข้อความยืมของ (จากไฟล์แนบระบบ)
                  </button>
                </div>
              </div>

              {/* Template Title */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อแม่แบบเอกสาร*:
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น บันทึกข้อความขอยืมพัสดุอุปกรณ์ หรือ หนังสือขอความอนุเคราะห์"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6D28D9] text-xs sm:text-sm"
                />
              </div>

              {/* Code & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">รหัสแม่แบบ:</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="เช่น T-CUSTOM-01"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs sm:text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ประเภทเอกสาร:</label>
                  <select
                    value={type}
                    onChange={(e) => {
                      const nextType = e.target.value as DocumentType;
                      setType(nextType);
                      if (nextType === 'EXTERNAL_LETTER') {
                        setGarudaPos('CENTER');
                        setGarudaHeight(30);
                      } else if (nextType === 'INTERNAL_MEMO') {
                        setGarudaPos('LEFT');
                        setGarudaHeight(15);
                      } else {
                        setGarudaPos('CENTER');
                        setGarudaHeight(20);
                      }
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs sm:text-sm bg-white"
                  >
                    <option value="INTERNAL_MEMO">หนังสือภายใน (บันทึกข้อความ)</option>
                    <option value="EXTERNAL_LETTER">หนังสือภายนอก</option>
                    <option value="COMPLETION_REPORT">รายงานสรุปผลการปฏิบัติงาน</option>
                  </select>
                </div>
              </div>

              {/* Provenance / Usage Note */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  คำอธิบายหรือระเบียบการใช้งาน:
                </label>
                <textarea
                  value={provenance}
                  onChange={(e) => setProvenance(e.target.value)}
                  rows={2}
                  placeholder="เช่น แบบฟอร์มสำหรับใช้ยืมพัสดุ อุปกรณ์ หรือยานพาหนะของหน่วยงาน"
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs sm:text-sm"
                />
              </div>

              {/* Format Details */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-medium text-slate-600 mb-1 text-xs">ขนาดตราครุฑ:</label>
                  <select
                    value={garudaHeight}
                    onChange={(e) => setGarudaHeight(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white"
                  >
                    <option value={30}>สูง 3.0 × กว้าง 2.7 ซม. (หนังสือภายนอก)</option>
                    <option value={15}>สูง 1.5 ซม. (บันทึกข้อความ)</option>
                    <option value={20}>สูง 2.0 ซม. (รายงาน)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1 text-xs">ตำแหน่งตราครุฑ:</label>
                  <select
                    value={garudaPos}
                    onChange={(e) => setGarudaPos(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white"
                  >
                    <option value="CENTER">กึ่งกลางด้านบน</option>
                    <option value="LEFT">ชิดซ้ายด้านบน</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#6D28D9] hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกแม่แบบ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
