import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertTriangle,
  Download,
  Send,
  Sparkles,
  Plus,
  Trash2,
  FileText,
  Cloud,
  Mail,
  ExternalLink,
  User,
} from 'lucide-react';
import { A4DocumentPreview } from '../components/A4DocumentPreview';
import { runDocumentPreflight } from '../lib/rules';
import {
  DocumentFormData,
  DocumentRecord,
  DocumentType,
  OfficialTemplate,
  UserProfile,
} from '../lib/types';
import {
  uploadDocumentToDrive,
  createGoogleDocFromMemo,
  sendGmailMessage,
} from '../lib/googleWorkspace';

interface DocumentBuilderViewProps {
  documentRecord?: DocumentRecord;
  template?: OfficialTemplate;
  caseId: string;
  caseCode: string;
  caseTitle: string;
  orgName: string;
  orgAddress?: string;
  currentUser: UserProfile;
  onBack: () => void;
  onSaveDraft: (
    formData: DocumentFormData,
    docType: DocumentType,
    formatProfile: OfficialTemplate['formatProfile']
  ) => Promise<void>;
  onSubmitReview: (
    formData: DocumentFormData,
    note: string,
    docType: DocumentType,
    formatProfile: OfficialTemplate['formatProfile']
  ) => Promise<{ success: boolean; errors?: string[] }>;
}

function defaultFormatProfile(docType: DocumentType): OfficialTemplate['formatProfile'] {
  if (docType === 'EXTERNAL_LETTER') {
    return {
      paperSize: 'A4',
      marginsMm: { top: 15, right: 20, bottom: 20, left: 30 },
      bodyFont: 'TH Sarabun New',
      bodyFontSizePt: 16,
      garudaHeightMm: 30,
      garudaPosition: 'CENTER',
    };
  }
  if (docType === 'COMPLETION_REPORT') {
    return {
      paperSize: 'A4',
      marginsMm: { top: 15, right: 20, bottom: 20, left: 30 },
      bodyFont: 'TH Sarabun New',
      bodyFontSizePt: 16,
      garudaHeightMm: 20,
      garudaPosition: 'CENTER',
    };
  }
  return {
    paperSize: 'A4',
    marginsMm: { top: 15, right: 20, bottom: 20, left: 30 },
    bodyFont: 'TH Sarabun New',
    bodyFontSizePt: 16,
    garudaHeightMm: 15,
    garudaPosition: 'LEFT',
  };
}

export const DocumentBuilderView: React.FC<DocumentBuilderViewProps> = ({
  documentRecord,
  template,
  caseId,
  caseCode,
  caseTitle,
  orgName,
  orgAddress,
  currentUser,
  onBack,
  onSaveDraft,
  onSubmitReview,
}) => {
  const initialType: DocumentType = documentRecord?.type || template?.type || 'INTERNAL_MEMO';
  const [docType, setDocType] = useState<DocumentType>(initialType);
  const [formatProfile, setFormatProfile] = useState<OfficialTemplate['formatProfile']>(
    documentRecord?.formatProfile || template?.formatProfile || defaultFormatProfile(initialType)
  );

  const buildDefaultForm = (t: DocumentType): DocumentFormData => ({
    agency: orgName || currentUser?.departmentName || '',
    senderAddress: orgAddress || '',
    officialReferenceNo: '',
    documentDate: new Date().toISOString().split('T')[0],
    numeralStyle: 'ARABIC',
    subject: caseTitle || '',
    recipient: '',
    urgency: 'ปกติ',
    confidentiality: '',
    references: [],
    enclosures: [],
    backgroundParagraph: '',
    factsParagraph: '',
    proposalParagraph: 'จึงเรียนมาเพื่อโปรดพิจารณา',
    customParagraphs: [],
    salutation: 'เรียน',
    valediction: t === 'EXTERNAL_LETTER' ? 'ขอแสดงความนับถือ' : '',
    signerName: '',
    signerPosition: '',
    coordinatorName: currentUser?.displayName || '',
    coordinatorPhone: '',
    contactDepartment: currentUser?.departmentName || '',
    contactPhone: '',
    contactFax: '',
    contactEmail: '',
  });

  const [formData, setFormData] = useState<DocumentFormData>(
    documentRecord?.currentFormData || buildDefaultForm(initialType)
  );

  // Sync whenever switching to a different DocumentRecord
  useEffect(() => {
    if (documentRecord) {
      setDocType(documentRecord.type);
      setFormatProfile(
        documentRecord.formatProfile ||
          template?.formatProfile ||
          defaultFormatProfile(documentRecord.type)
      );
      setFormData(documentRecord.currentFormData);
    }
  }, [documentRecord?.id]);

  const [preflightErrors, setPreflightErrors] = useState<string[]>([]);
  const [preflightWarnings, setPreflightWarnings] = useState<string[]>([]);
  const [preflightPassed, setPreflightPassed] = useState<boolean | null>(null);

  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [aiFormalityLevel, setAiFormalityLevel] = useState<'FORMAL_DETAILED' | 'EXECUTIVE_STRICT'>('FORMAL_DETAILED');
  const [aiExtraInstructions, setAiExtraInstructions] = useState('');
  const [aiDraftError, setAiDraftError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitNote, setSubmitNote] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Google Workspace Action States
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveFileType, setDriveFileType] = useState<'pdf' | 'docx'>('pdf');
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [driveSuccessUrl, setDriveSuccessUrl] = useState<string | null>(null);

  const [showDocsModal, setShowDocsModal] = useState(false);
  const [isCreatingDocs, setIsCreatingDocs] = useState(false);
  const [docsSuccessUrl, setDocsSuccessUrl] = useState<string | null>(null);

  const [showGmailModal, setShowGmailModal] = useState(false);
  const [gmailTo, setGmailTo] = useState('');
  const [gmailSubject, setGmailSubject] = useState('');
  const [gmailBody, setGmailBody] = useState('');
  const [gmailAttachPdf, setGmailAttachPdf] = useState(true);
  const [isSendingGmail, setIsSendingGmail] = useState(false);
  const [gmailSuccessMsg, setGmailSuccessMsg] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // Preflight check handler
  const handlePreflight = () => {
    const result = runDocumentPreflight(formData, docType);
    setPreflightErrors(result.errors);
    setPreflightWarnings(result.warnings);
    setPreflightPassed(result.passed);
  };

  // AI draft assistant
  const handleAiDraft = async () => {
    setIsAiDrafting(true);
    setAiDraftError(null);
    try {
      const res = await fetch('/api/v1/ai/document-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType,
          subject: formData.subject,
          agency: formData.agency,
          recipient: formData.recipient,
          officialReferenceNo: formData.officialReferenceNo,
          documentDate: formData.documentDate,
          numeralStyle: formData.numeralStyle || 'ARABIC',
          urgency: formData.urgency,
          salutation: formData.salutation,
          valediction: formData.valediction,
          references: formData.references,
          enclosures: formData.enclosures,
          backgroundParagraph: formData.backgroundParagraph,
          factsParagraph: formData.factsParagraph,
          proposalParagraph: formData.proposalParagraph,
          extraInstructions: aiExtraInstructions,
          formalityLevel: aiFormalityLevel,
        }),
      });
      if (!res.ok) {
        throw new Error('ไม่สามารถเรียกใช้งานบริการร่างข้อความอัจฉริยะได้');
      }
      const data = await res.json();
      if (data.data) {
        setFormData((prev) => ({
          ...prev,
          backgroundParagraph: data.data.backgroundParagraph || prev.backgroundParagraph,
          factsParagraph: data.data.factsParagraph || prev.factsParagraph,
          proposalParagraph: data.data.proposalParagraph || prev.proposalParagraph,
        }));
      }
    } catch (err: any) {
      console.error(err);
      setAiDraftError(err?.message || 'เกิดข้อผิดพลาดในการร่างข้อความ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsAiDrafting(false);
    }
  };

  // Save draft
  const handleSave = async () => {
    setIsSaving(true);
    await onSaveDraft(formData, docType, formatProfile);
    setIsSaving(false);
  };

  // Auto-save latest edits before downloading Word/PDF
  const handleExportDocument = async (format: 'docx' | 'pdf') => {
    setIsSaving(true);
    await onSaveDraft(formData, docType, formatProfile);
    setIsSaving(false);
    const targetId = documentRecord?.id;
    if (targetId) {
      if (format === 'docx') {
        window.location.href = `/api/v1/documents/${targetId}/export/docx`;
      } else {
        window.open(`/api/v1/documents/${targetId}/export/pdf`, '_blank');
      }
    }
  };

  // Add reference item
  const handleAddReference = () => {
    setFormData((prev) => ({
      ...prev,
      references: [
        ...prev.references,
        {
          id: `ref-${Date.now()}`,
          bookType: 'หนังสือ',
          bookNo: '',
          bookDate: new Date().toISOString().split('T')[0],
          originAgency: '',
        },
      ],
    }));
  };

  // Add enclosure item
  const handleAddEnclosure = () => {
    setFormData((prev) => ({
      ...prev,
      enclosures: [
        ...prev.enclosures,
        {
          id: `enc-${Date.now()}`,
          title: '',
          quantity: 1,
          unit: 'ฉบับ',
        },
      ],
    }));
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    const res = await onSubmitReview(formData, submitNote, docType, formatProfile);
    setIsSubmitting(false);
    if (res.success) {
      setShowSubmitModal(false);
    } else if (res.errors) {
      setPreflightErrors(res.errors);
      setPreflightPassed(false);
      setShowSubmitModal(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#6D28D9] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                {caseCode}
              </span>
              <span className="text-xs text-slate-500">
                {docType === 'INTERNAL_MEMO'
                  ? 'แบบบันทึกข้อความ (หนังสือภายใน)'
                  : docType === 'EXTERNAL_LETTER'
                  ? 'แบบหนังสือภายนอก'
                  : 'แบบรายงานสรุปผลการปฏิบัติงาน'}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              ระบบจัดทำเอกสารราชการ (Document Builder)
            </h1>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกร่าง'}</span>
          </button>

          <button
            onClick={handlePreflight}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#6D28D9] rounded-lg text-xs font-semibold cursor-pointer border border-purple-200"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ตรวจความพร้อม</span>
          </button>

          {documentRecord && (
            <>
              <button
                type="button"
                onClick={() => handleExportDocument('docx')}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#2563EB] rounded-lg text-xs font-semibold border border-blue-200 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Word (.docx)</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportDocument('pdf')}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#6D28D9] rounded-lg text-xs font-semibold border border-purple-200 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF (.pdf)</span>
              </button>
            </>
          )}

          {/* Google Workspace Action Buttons */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <button
              type="button"
              onClick={() => {
                setDriveSuccessUrl(null);
                setWorkspaceError(null);
                setShowDriveModal(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-200 cursor-pointer"
              title="บันทึกไฟล์ลง Google Drive ของคุณ"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              <span>Google Drive</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDocsSuccessUrl(null);
                setWorkspaceError(null);
                setShowDocsModal(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-semibold border border-blue-200 cursor-pointer"
              title="ส่งออกและแก้ไขใน Google Docs"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Google Docs</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setGmailSubject(`หนังสือราชการ: ${formData.subject}`);
                setGmailBody(`เรียน ${formData.recipient || 'ผู้รับหนังสือ'}\n\n${formData.agency || 'หน่วยงาน'} ขอส่งหนังสือราชการเรื่อง "${formData.subject}"\n\nผู้ประสานงาน: ${formData.coordinatorName || ''} (โทร. ${formData.coordinatorPhone || ''})\n\nลงชื่อ ${formData.signerName || ''}\nตำแหน่ง ${formData.signerPosition || ''}`);
                setGmailSuccessMsg(null);
                setWorkspaceError(null);
                setShowGmailModal(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold border border-amber-200 cursor-pointer"
              title="ส่งหนังสือทาง Gmail"
            >
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              <span>ส่งทาง Gmail</span>
            </button>
          </div>

          <button
            onClick={() => {
              handlePreflight();
              setShowSubmitModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#6D28D9] hover:bg-purple-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>ส่งให้ผู้ตรวจ</span>
          </button>
        </div>
      </div>

      {/* Preflight Results Banner */}
      {preflightPassed !== null && (
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
            preflightPassed
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="font-bold flex items-center gap-1.5">
            {preflightPassed ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>ผ่านการตรวจความพร้อมเบื้องต้น — ข้อมูลครบถ้วนตามแบบระเบียบสารบรรณ</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>พบข้อผิดพลาดที่ต้องแก้ไขก่อนส่งตรวจ ({preflightErrors.length} รายการ):</span>
              </>
            )}
          </div>
          {preflightErrors.length > 0 && (
            <ul className="list-disc pl-5 space-y-0.5">
              {preflightErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 2-Column Split: Form Editor (Left 50%) & A4 Realtime Preview (Right 50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-180px)]">
        {/* Left: Structured Form Editor */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Document Type Selector */}
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ประเภทหนังสือราชการ:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDocType('INTERNAL_MEMO');
                    setFormatProfile((prev) => ({
                      ...(prev || defaultFormatProfile('INTERNAL_MEMO')),
                      garudaPosition: 'LEFT',
                      garudaHeightMm: 15,
                      marginsMm: { top: 15, right: 20, bottom: 20, left: 30 },
                    }));
                  }}
                  className={`p-2.5 rounded-lg border text-xs font-semibold text-center cursor-pointer transition-colors ${
                    docType === 'INTERNAL_MEMO'
                      ? 'border-[#6D28D9] bg-purple-50 text-[#6D28D9]'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  บันทึกข้อความ (หนังสือภายใน)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocType('EXTERNAL_LETTER');
                    setFormatProfile((prev) => ({
                      ...(prev || defaultFormatProfile('EXTERNAL_LETTER')),
                      garudaPosition: 'CENTER',
                      garudaHeightMm: 30,
                      marginsMm: { top: 15, right: 20, bottom: 20, left: 30 },
                    }));
                    setFormData((prev) => ({
                      ...prev,
                      valediction: prev.valediction || 'ขอแสดงความนับถือ',
                    }));
                  }}
                  className={`p-2.5 rounded-lg border text-xs font-semibold text-center cursor-pointer transition-colors ${
                    docType === 'EXTERNAL_LETTER'
                      ? 'border-[#6D28D9] bg-purple-50 text-[#6D28D9]'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  หนังสือภายนอก
                </button>
              </div>
            </div>

            {/* Format & Garuda Alignment Controls */}
            <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">ตำแหน่งตราครุฑ:</label>
                <select
                  aria-label="ตำแหน่งตราครุฑ"
                  value={formatProfile?.garudaPosition || (docType === 'INTERNAL_MEMO' ? 'LEFT' : 'CENTER')}
                  onChange={(e) =>
                    setFormatProfile((prev) => ({
                      ...(prev || defaultFormatProfile(docType)),
                      garudaPosition: e.target.value as 'CENTER' | 'LEFT',
                    }))
                  }
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="CENTER">กึ่งกลางด้านบน</option>
                  <option value="LEFT">ชิดซ้ายด้านบน</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">ขนาดตราครุฑ:</label>
                <select
                  aria-label="ขนาดตราครุฑ"
                  value={formatProfile?.garudaHeightMm || (docType === 'EXTERNAL_LETTER' ? 30 : 15)}
                  onChange={(e) =>
                    setFormatProfile((prev) => ({
                      ...(prev || defaultFormatProfile(docType)),
                      garudaHeightMm: Number(e.target.value),
                    }))
                  }
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value={30}>3.0 × 2.7 ซม.</option>
                  <option value={15}>1.5 ซม.</option>
                  <option value={20}>2.0 ซม.</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">ชั้นความลับ:</label>
                <select
                  aria-label="ชั้นความลับ"
                  value={formData.confidentiality || ''}
                  onChange={(e) => setFormData({ ...formData, confidentiality: e.target.value })}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">ปกติ</option>
                  <option value="ลับ">ลับ</option>
                  <option value="ลับมาก">ลับมาก</option>
                  <option value="ลับที่สุด">ลับที่สุด</option>
                </select>
              </div>
            </div>

            {/* Numeral Style Toggle (Arabic vs Thai numerals) */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-purple-50/60 rounded-xl border border-purple-200/70 text-xs">
              <span className="font-semibold text-slate-700">รูปแบบตัวเลขในเอกสาร:</span>
              <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="รูปแบบตัวเลขในเอกสาร">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, numeralStyle: 'ARABIC' })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                    (formData.numeralStyle || 'ARABIC') === 'ARABIC'
                      ? 'bg-[#6D28D9] text-white border-[#6D28D9] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  เลขอารบิก (1 2 3)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, numeralStyle: 'THAI' })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                    formData.numeralStyle === 'THAI'
                      ? 'bg-[#6D28D9] text-white border-[#6D28D9] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  เลขไทย (๑ ๒ ๓)
                </button>
              </div>
            </div>
          </div>

          {/* Section 1: Header */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
              1. ส่วนหัวหนังสือราชการ
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  {docType === 'EXTERNAL_LETTER' ? 'ส่วนราชการเจ้าของหนังสือ*:' : 'ส่วนราชการเจ้าของเรื่อง*:'}
                </label>
                <input
                  type="text"
                  value={formData.agency}
                  onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  เลขที่หนังสือ (ถ้ามี/กรอกภายหลัง):
                </label>
                <input
                  type="text"
                  value={formData.officialReferenceNo || ''}
                  onChange={(e) => setFormData({ ...formData, officialReferenceNo: e.target.value })}
                  placeholder="เช่น กห ๐๔๒๑/๓๑๑๓ หรือ พส ๐๔๐๕/..."
                  className="w-full p-2 border border-slate-200 rounded-lg placeholder-slate-400"
                />
              </div>

              {docType === 'EXTERNAL_LETTER' && (
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-600 mb-1">
                    ที่ตั้งส่วนราชการเจ้าของหนังสือ (แสดงด้านขวาบนใต้ชื่อส่วนราชการ — กด Enter เพื่อขึ้นบรรทัดใหม่):
                  </label>
                  <textarea
                    rows={2}
                    value={formData.senderAddress || ''}
                    onChange={(e) => setFormData({ ...formData, senderAddress: e.target.value })}
                    placeholder={'เช่น ในกองบัญชาการ...\nกรุงเทพมหานคร ๑๐๒๐๐'}
                    className="w-full p-2 border border-slate-200 rounded-lg placeholder-slate-400 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-600 mb-1">วันที่ของหนังสือ*:</label>
                <input
                  type="date"
                  value={formData.documentDate}
                  onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  ชั้นความเร็ว <span className="text-[11px] text-red-600 font-semibold">(ตัวหนังสือสีแดง)</span>:
                </label>
                <select
                  aria-label="ชั้นความเร็ว"
                  value={formData.urgency || ''}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  className={`w-full p-2 border rounded-lg ${
                    formData.urgency && formData.urgency !== 'ปกติ'
                      ? 'border-red-300 bg-red-50/40 text-red-600 font-bold'
                      : 'border-slate-200'
                  }`}
                >
                  <option value="" className="text-slate-800 font-normal">ปกติ (ไม่ระบุ)</option>
                  <option value="ด่วน" className="text-red-600 font-bold">ด่วน</option>
                  <option value="ด่วนมาก" className="text-red-600 font-bold">ด่วนมาก</option>
                  <option value="ด่วนที่สุด" className="text-red-600 font-bold">ด่วนที่สุด</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-600 mb-1">เรื่อง*:</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              {docType === 'EXTERNAL_LETTER' && (
                <div>
                  <label className="block font-medium text-slate-600 mb-1">คำขึ้นต้น:</label>
                  <input
                    type="text"
                    value={formData.salutation || 'เรียน'}
                    onChange={(e) => setFormData({ ...formData, salutation: e.target.value })}
                    placeholder="เช่น เรียน / กราบเรียน"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              )}

              <div className={docType === 'EXTERNAL_LETTER' ? '' : 'sm:col-span-2'}>
                <label className="block font-medium text-slate-600 mb-1">
                  {docType === 'EXTERNAL_LETTER' ? 'ผู้รับหนังสือ*:' : 'เรียน* (ผู้รับหนังสือ):'}
                </label>
                <input
                  type="text"
                  value={formData.recipient}
                  onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                  placeholder="เช่น อธิบดีกรมพัฒนาสังคมและสวัสดิการ"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Section 2: References & Enclosures */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                2. อ้างถึง & สิ่งที่ส่งมาด้วย
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddReference}
                  className="text-xs text-[#6D28D9] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มอ้างถึง</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddEnclosure}
                  className="text-xs text-[#2563EB] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มสิ่งที่ส่งมาด้วย</span>
                </button>
              </div>
            </div>

            {/* References list */}
            {formData.references.map((ref, idx) => (
              <div key={ref.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold text-slate-700">
                  <span>อ้างถึงลำดับที่ {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((p) => ({
                        ...p,
                        references: p.references.filter((_, i) => i !== idx),
                      }));
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="ประเภทหนังสือ"
                    value={ref.bookType}
                    onChange={(e) => {
                      const updated = [...formData.references];
                      updated[idx].bookType = e.target.value;
                      setFormData({ ...formData, references: updated });
                    }}
                    className="p-1.5 border border-slate-200 rounded bg-white"
                  />
                  <input
                    type="text"
                    placeholder="เลขที่หนังสือ"
                    value={ref.bookNo}
                    onChange={(e) => {
                      const updated = [...formData.references];
                      updated[idx].bookNo = e.target.value;
                      setFormData({ ...formData, references: updated });
                    }}
                    className="p-1.5 border border-slate-200 rounded bg-white"
                  />
                </div>
              </div>
            ))}

            {/* Enclosures list */}
            {formData.enclosures.map((enc, idx) => (
              <div key={enc.id} className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold text-slate-700">
                  <span>สิ่งที่ส่งมาด้วยลำดับที่ {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((p) => ({
                        ...p,
                        enclosures: p.enclosures.filter((_, i) => i !== idx),
                      }));
                    }}
                    className="text-red-600 hover:text-red-800 cursor-pointer"
                    aria-label={`ลบสิ่งที่ส่งมาด้วยลำดับที่ ${idx + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="ชื่อเอกสาร/รายการ"
                    value={enc.title}
                    onChange={(e) => {
                      const updated = [...formData.enclosures];
                      updated[idx].title = e.target.value;
                      setFormData({ ...formData, enclosures: updated });
                    }}
                    className="col-span-2 p-1.5 border border-slate-200 rounded bg-white"
                  />
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min={1}
                      value={enc.quantity}
                      onChange={(e) => {
                        const updated = [...formData.enclosures];
                        updated[idx].quantity = Number(e.target.value) || 1;
                        setFormData({ ...formData, enclosures: updated });
                      }}
                      className="w-14 p-1.5 border border-slate-200 rounded bg-white"
                    />
                    <input
                      type="text"
                      placeholder="หน่วย"
                      value={enc.unit}
                      onChange={(e) => {
                        const updated = [...formData.enclosures];
                        updated[idx].unit = e.target.value;
                        setFormData({ ...formData, enclosures: updated });
                      }}
                      className="w-full p-1.5 border border-slate-200 rounded bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Section 3: Body Content with AI Draft Assistant */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                3. เนื้อความในตัวหนังสือ (Body Content)
              </h3>
              <button
                type="button"
                onClick={handleAiDraft}
                disabled={isAiDrafting}
                className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>{isAiDrafting ? 'กำลังยกร่างฉบับละเอียด...' : 'ให้ AI ช่วยร่างข้อความ'}</span>
              </button>
            </div>

            <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-lg space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-semibold text-purple-950">
                  ระดับภาษาราชการและรายละเอียดสำหรับ AI:
                </span>
                <select
                  aria-label="ระดับภาษาราชการสำหรับ AI"
                  value={aiFormalityLevel}
                  onChange={(e) =>
                    setAiFormalityLevel(e.target.value as 'FORMAL_DETAILED' | 'EXECUTIVE_STRICT')
                  }
                  className="p-1.5 border border-purple-200 rounded-md bg-white text-slate-800 text-xs focus:ring-2 focus:ring-[#6D28D9]"
                >
                  <option value="FORMAL_DETAILED">ทางการละเอียดสมบูรณ์ (มาตรฐานงานสารบรรณ)</option>
                  <option value="EXECUTIVE_STRICT">ทางการระดับสูงพิเศษ (เสนอผู้บริหาร / หน่วยงานภายนอก)</option>
                </select>
              </div>
              <div>
                <label htmlFor="ai-extra-instructions" className="block text-[11px] font-medium text-purple-900 mb-1">
                  ประเด็น / วัน เวลา สถานที่ / รายละเอียดเพิ่มเติมให้ AI ขยายความ (ถ้ามี):
                </label>
                <input
                  id="ai-extra-instructions"
                  type="text"
                  value={aiExtraInstructions}
                  onChange={(e) => setAiExtraInstructions(e.target.value)}
                  placeholder="เช่น วันที่ 17 กรกฎาคม 2568 เวลา 16.30 น. ณ ห้องประชุมกลาง เพื่อเสริมสร้างความร่วมมือ..."
                  className="w-full p-2 border border-purple-200 rounded-md bg-white text-xs focus:ring-2 focus:ring-[#6D28D9]"
                />
              </div>
              {aiDraftError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-[11px]">
                  {aiDraftError}
                </div>
              )}
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                ย่อหน้าความเป็นมา / เหตุที่ต้องมีหนังสือ:
              </label>
              <textarea
                value={formData.backgroundParagraph || ''}
                onChange={(e) => setFormData({ ...formData, backgroundParagraph: e.target.value })}
                rows={5}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6D28D9] leading-relaxed"
                placeholder="ตามที่... / เนื่องด้วย..."
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                ย่อหน้าข้อเท็จจริง / รายละเอียดการดำเนินงาน:
              </label>
              <textarea
                value={formData.factsParagraph || ''}
                onChange={(e) => setFormData({ ...formData, factsParagraph: e.target.value })}
                rows={6}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6D28D9] leading-relaxed"
                placeholder="ในการนี้ หน่วยงานได้พิจารณารายละเอียด..."
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                ย่อหน้าข้อพิจารณา / ข้อเสนอขออนุมัติ:
              </label>
              <textarea
                value={formData.proposalParagraph || ''}
                onChange={(e) => setFormData({ ...formData, proposalParagraph: e.target.value })}
                rows={3}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6D28D9] leading-relaxed"
                placeholder="จึงเรียนมาเพื่อโปรดพิจารณา..."
              />
            </div>
          </div>

          {/* Section 4: Signatory & Coordinator / Owner Contact */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
              {docType === 'EXTERNAL_LETTER'
                ? '4. คำลงท้าย ผู้ลงนาม และส่วนราชการเจ้าของเรื่อง'
                : '4. ผู้ลงนามและผู้ประสานงาน (ตามแบบตัวอย่างเอกสารจริง)'}
            </h3>

            {docType === 'EXTERNAL_LETTER' && (
              <div>
                <label className="block font-medium text-slate-600 mb-1">คำลงท้าย*:</label>
                <input
                  type="text"
                  value={formData.valediction || 'ขอแสดงความนับถือ'}
                  onChange={(e) => setFormData({ ...formData, valediction: e.target.value })}
                  placeholder="เช่น ขอแสดงความนับถือ / ขอแสดงความนับถืออย่างยิ่ง"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">ชื่อ-นามสกุล ผู้ลงนาม*:</label>
                <input
                  type="text"
                  value={formData.signerName}
                  onChange={(e) => setFormData({ ...formData, signerName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">ตำแหน่งของผู้ลงนาม*:</label>
                <input
                  type="text"
                  value={formData.signerPosition}
                  onChange={(e) => setFormData({ ...formData, signerPosition: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {docType === 'EXTERNAL_LETTER' ? (
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 space-y-2">
                <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-700" />
                  <span>ส่วนราชการเจ้าของเรื่อง (แสดงมุมล่างซ้ายตามแบบหนังสือภายนอก)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      ส่วนราชการเจ้าของเรื่อง:
                    </label>
                    <input
                      type="text"
                      value={formData.contactDepartment || ''}
                      onChange={(e) => setFormData({ ...formData, contactDepartment: e.target.value })}
                      placeholder="เช่น กองการสารบรรณ"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">โทร.:</label>
                    <input
                      type="text"
                      value={formData.contactPhone || ''}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      placeholder="เช่น ๐ ๒๒๙๗ ๗๕๐๕ - ๗"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">โทรสาร (ถ้ามี):</label>
                    <input
                      type="text"
                      value={formData.contactFax || ''}
                      onChange={(e) => setFormData({ ...formData, contactFax: e.target.value })}
                      placeholder="เช่น ๐ ๒๒๙๗ ๗๕๐๗"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      ไปรษณีย์อิเล็กทรอนิกส์ (ถ้ามี):
                    </label>
                    <input
                      type="text"
                      value={formData.contactEmail || ''}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      placeholder="เช่น saraban@agency.go.th"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 space-y-2">
                <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-700" />
                  <span>ข้อมูลผู้ประสานงานท้ายบันทึกข้อความ (มุมล่างซ้าย)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">ชื่อผู้ประสานงาน:</label>
                    <input
                      type="text"
                      value={formData.coordinatorName || ''}
                      onChange={(e) => setFormData({ ...formData, coordinatorName: e.target.value })}
                      placeholder="เช่น นายเอกรินทร์ อักษรพันธ์"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ:</label>
                    <input
                      type="text"
                      value={formData.coordinatorPhone || ''}
                      onChange={(e) => setFormData({ ...formData, coordinatorPhone: e.target.value })}
                      placeholder="เช่น ๐๘๓-๒๓๒๐๒๐๔"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live A4 Document Preview */}
        <div className="h-full">
          <A4DocumentPreview
            type={docType}
            data={formData}
            orgName={orgName}
            formatProfile={formatProfile}
            onDownloadDocx={
              documentRecord ? () => handleExportDocument('docx') : undefined
            }
            onDownloadPdf={
              documentRecord ? () => handleExportDocument('pdf') : undefined
            }
          />
        </div>
      </div>

      {/* Submit for Review Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Send className="w-5 h-5 text-[#6D28D9]" />
              <span>ส่งเอกสารให้ผู้ตรวจพิจารณา</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              เอกสารจะถูกบันทึกเป็นเวอร์ชันที่ไม่สามารถแก้ไขทับได้ (Immutable Version)
              และส่งไปยังคิวงานของผู้ตรวจกลุ่มงาน
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หมายเหตุหรือข้อความถึงผู้ตรวจ:
              </label>
              <textarea
                value={submitNote}
                onChange={(e) => setSubmitNote(e.target.value)}
                placeholder="เช่น ขอความอนุเคราะห์ตรวจร่างบันทึกข้อความ..."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6D28D9]"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-[#6D28D9] hover:bg-purple-800 text-white cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'กำลังส่งตรวจ...' : 'ยืนยันส่งตรวจ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Upload Confirmation Modal */}
      {showDriveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <Cloud className="w-5 h-5 text-emerald-600" />
              <span>บันทึกเอกสารไปยัง Google Drive</span>
            </div>

            {workspaceError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                {workspaceError}
              </div>
            )}

            {driveSuccessUrl ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold">อัปโหลดไฟล์ไปยัง Google Drive สำเร็จ!</div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">
                      ไฟล์ได้ถูกจัดเก็บบน Google Drive ของคุณเรียบร้อยแล้ว
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <a
                    href={driveSuccessUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <span>เปิดดูใน Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => setShowDriveModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  ระบบจะทำการส่งออกไฟล์เอกสารราชการเรื่อง{' '}
                  <span className="font-semibold text-slate-900">"{formData.subject}"</span>{' '}
                  และอัปโหลดเข้าสู่ Google Drive ของคุณโดยตรง
                </p>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    เลือกรูปแบบไฟล์ที่ต้องการบันทึก:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDriveFileType('pdf')}
                      className={`p-2.5 rounded-xl border text-center font-medium cursor-pointer transition-colors ${
                        driveFileType === 'pdf'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      ไฟล์ PDF (.pdf)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDriveFileType('docx')}
                      className={`p-2.5 rounded-xl border text-center font-medium cursor-pointer transition-colors ${
                        driveFileType === 'docx'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      ไฟล์ Word (.docx)
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowDriveModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={async () => {
                      setIsUploadingDrive(true);
                      setWorkspaceError(null);
                      try {
                        const targetId = documentRecord?.id || 'doc-memo-flowers-01';
                        const res = await uploadDocumentToDrive(targetId, formData.subject, driveFileType);
                        setDriveSuccessUrl(res.webViewLink || `https://drive.google.com/file/d/${res.id}/view`);
                      } catch (err: any) {
                        setWorkspaceError(err.message || 'ไม่สามารถบันทึกลง Google Drive ได้');
                      } finally {
                        setIsUploadingDrive(false);
                      }
                    }}
                    disabled={isUploadingDrive}
                    className="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isUploadingDrive ? 'กำลังอัปโหลด...' : 'ยืนยันบันทึกลง Drive'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google Docs Export Confirmation Modal */}
      {showDocsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>สร้างและเปิดใน Google Docs</span>
            </div>

            {workspaceError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                {workspaceError}
              </div>
            )}

            {docsSuccessUrl ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xl flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-bold">สร้างเอกสาร Google Docs เรียบร้อยแล้ว!</div>
                    <div className="text-[11px] text-blue-700 mt-0.5">
                      คุณสามารถคลิกเพื่อเปิดดูและร่วมพิมพ์แก้ไขแบบสดได้ทันที
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <a
                    href={docsSuccessUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                  >
                    <span>เปิดเอกสาร Google Docs</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => setShowDocsModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  ระบบจะจัดทำเอกสารบันทึกข้อความเรื่อง{' '}
                  <span className="font-semibold text-slate-900">"{formData.subject}"</span>{' '}
                  ตามระเบียบงานสารบรรณ พร้อมผู้ประสานงานและข้อความทั้งหมด แล้วสร้างเป็นไฟล์ใหม่ใน Google Docs ของคุณ
                </p>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div>• ส่วนราชการ: {formData.agency}</div>
                  <div>• ผู้ลงนาม: {formData.signerName} ({formData.signerPosition})</div>
                  <div>• ผู้ประสานงาน: {formData.coordinatorName} ({formData.coordinatorPhone})</div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowDocsModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={async () => {
                      setIsCreatingDocs(true);
                      setWorkspaceError(null);
                      try {
                        const paragraphs = [
                          formData.backgroundParagraph,
                          formData.factsParagraph,
                          formData.proposalParagraph,
                        ].filter(Boolean) as string[];

                        const res = await createGoogleDocFromMemo({
                          title: formData.subject,
                          agency: formData.agency,
                          referenceNo: formData.officialReferenceNo || '',
                          documentDate: formData.documentDate,
                          subject: formData.subject,
                          recipient: formData.recipient,
                          paragraphs,
                          signerName: formData.signerName,
                          signerPosition: formData.signerPosition,
                          coordinatorName: formData.coordinatorName,
                          coordinatorPhone: formData.coordinatorPhone,
                        });
                        setDocsSuccessUrl(res.docUrl);
                      } catch (err: any) {
                        setWorkspaceError(err.message || 'ไม่สามารถสร้าง Google Docs ได้');
                      } finally {
                        setIsCreatingDocs(false);
                      }
                    }}
                    disabled={isCreatingDocs}
                    className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isCreatingDocs ? 'กำลังสร้างเอกสาร...' : 'ยืนยันสร้าง Google Docs'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gmail Send Confirmation Modal */}
      {showGmailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <Mail className="w-5 h-5 text-amber-600" />
              <span>ยืนยันการส่งหนังสือราชการผ่าน Gmail</span>
            </div>

            {workspaceError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                {workspaceError}
              </div>
            )}

            {gmailSuccessMsg ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold">ส่งอีเมลผ่าน Gmail สำเร็จเรียบร้อย!</div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">{gmailSuccessMsg}</div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowGmailModal(false)}
                    className="px-5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ส่งถึง (To Email)*:
                  </label>
                  <input
                    type="email"
                    value={gmailTo}
                    onChange={(e) => setGmailTo(e.target.value)}
                    placeholder="เช่น saraban@agency.go.th หรือ contact@organization.go.th"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    หัวข้อเรื่อง (Subject)*:
                  </label>
                  <input
                    type="text"
                    value={gmailSubject}
                    onChange={(e) => setGmailSubject(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ข้อความเนื้อหาอีเมล:
                  </label>
                  <textarea
                    value={gmailBody}
                    onChange={(e) => setGmailBody(e.target.value)}
                    rows={4}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs leading-relaxed"
                  />
                </div>

                <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="attachPdf"
                    checked={gmailAttachPdf}
                    onChange={(e) => setGmailAttachPdf(e.target.checked)}
                    className="rounded text-amber-600"
                  />
                  <label htmlFor="attachPdf" className="text-amber-900 font-medium cursor-pointer">
                    แนบไฟล์เอกสารราชการฉบับเต็ม (.pdf) ไปกับอีเมลด้วย
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowGmailModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={async () => {
                      if (!gmailTo.trim() || !gmailSubject.trim()) {
                        setWorkspaceError('กรุณากรอกผู้รับและหัวข้ออีเมล');
                        return;
                      }
                      setIsSendingGmail(true);
                      setWorkspaceError(null);
                      try {
                        let attachment: { filename: string; blob: Blob } | undefined;
                        if (gmailAttachPdf) {
                          const targetId = documentRecord?.id || 'doc-memo-flowers-01';
                          const pdfRes = await fetch(`/api/v1/documents/${targetId}/export/pdf`);
                          if (pdfRes.ok) {
                            const pdfBlob = await pdfRes.blob();
                            attachment = {
                              filename: `${formData.subject || 'document'}.pdf`,
                              blob: pdfBlob,
                            };
                          }
                        }

                        await sendGmailMessage({
                          to: gmailTo.trim(),
                          subject: gmailSubject.trim(),
                          bodyText: gmailBody,
                          attachment,
                        });

                        setGmailSuccessMsg(`ได้ส่งหนังสือไปยัง ${gmailTo} เรียบร้อยแล้ว`);
                      } catch (err: any) {
                        setWorkspaceError(err.message || 'ไม่สามารถส่งอีเมลผ่าน Gmail ได้');
                      } finally {
                        setIsSendingGmail(false);
                      }
                    }}
                    disabled={isSendingGmail}
                    className="px-5 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSendingGmail ? 'กำลังส่งอีเมล...' : 'ยืนยันการส่งอีเมล'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
