import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, FileText, Inbox } from 'lucide-react';
import { CaseAttachment, Department, PriorityLevel, UserProfile } from '../lib/types';
import { FileDropPasteZone, formatFileSize } from '../components/FileDropPasteZone';

interface NewCaseViewProps {
  departments: Department[];
  users: UserProfile[];
  currentUser: UserProfile;
  onCancel: () => void;
  onSubmit: (payload: any) => Promise<void>;
}

export const NewCaseView: React.FC<NewCaseViewProps> = ({
  departments,
  users,
  currentUser,
  onCancel,
  onSubmit,
}) => {
  const [step, setStep] = useState(1);
  const [originType, setOriginType] = useState<'RECEIVED_LETTER' | 'NEW_INITIATIVE'>('RECEIVED_LETTER');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [ownerId, setOwnerId] = useState(currentUser.id);
  const [priority, setPriority] = useState<PriorityLevel>('HIGH');
  const [dueDate, setDueDate] = useState('2026-11-30');

  // External correspondence (if received letter)
  const [externalBookNo, setExternalBookNo] = useState('');
  const [externalBookDate, setExternalBookDate] = useState('2026-10-28');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [originAgency, setOriginAgency] = useState('');
  const [attachments, setAttachments] = useState<CaseAttachment[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinalSubmit = async () => {
    if (!title.trim() || !departmentId) {
      alert('กรุณากรอกชื่อเรื่องและเลือกหน่วยงาน');
      return;
    }

    setIsSubmitting(true);
    await onSubmit({
      title,
      description,
      type: 'ACTIVITY_REPORT',
      originType,
      departmentId,
      ownerId,
      priority,
      dueDate,
      externalBookNo: originType === 'RECEIVED_LETTER' ? externalBookNo : undefined,
      externalBookDate: originType === 'RECEIVED_LETTER' ? externalBookDate : undefined,
      receivedDate: originType === 'RECEIVED_LETTER' ? receivedDate : undefined,
      originAgency: originType === 'RECEIVED_LETTER' ? originAgency : undefined,
      attachments,
    });
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#6D28D9] cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>ยกเลิก / กลับไปรายการเรื่องงาน</span>
      </button>

      {/* Stepper Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">สร้างเรื่องงานใหม่ (Create Case)</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ลงทะเบียนเรื่องงานในระบบ GovFlow AI เพื่อผูกโยงเอกสาร ภารกิจ และการตรวจรับรอง
          </p>
        </div>

        {/* Stepper indicator */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold">
          {[
            { num: 1, label: 'ประเภทเรื่อง' },
            { num: 2, label: 'ข้อมูลเรื่องงาน' },
            { num: 3, label: 'เอกสารต้นเรื่อง' },
            { num: 4, label: 'ตรวจสอบและสร้าง' },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  step === s.num
                    ? 'bg-[#6D28D9] text-white shadow-xs'
                    : step > s.num
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
              </div>
              <span className={`hidden sm:inline ${step === s.num ? 'text-[#6D28D9]' : 'text-slate-500'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Type Selection */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="font-bold text-base text-slate-900">เลือกประเภทต้นกำเนิดเรื่องงาน</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div
              onClick={() => setOriginType('RECEIVED_LETTER')}
              className={`p-5 rounded-xl border-2 transition-all cursor-pointer space-y-3 ${
                originType === 'RECEIVED_LETTER'
                  ? 'border-[#6D28D9] bg-purple-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-3 bg-blue-100 text-[#2563EB] w-fit rounded-lg">
                <Inbox className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">รับหนังสือราชการภายนอก</h3>
                <p className="text-xs text-slate-500 mt-1">
                  สร้างเรื่องงานจากหนังสือแจ้ง มอบหมาย หรือประสานงานที่ได้รับจากหน่วยงานภายนอก
                </p>
              </div>
            </div>

            <div
              onClick={() => setOriginType('NEW_INITIATIVE')}
              className={`p-5 rounded-xl border-2 transition-all cursor-pointer space-y-3 ${
                originType === 'NEW_INITIATIVE'
                  ? 'border-[#6D28D9] bg-purple-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-3 bg-purple-100 text-[#6D28D9] w-fit rounded-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">เริ่มเรื่องใหม่ภายในหน่วยงาน</h3>
                <p className="text-xs text-slate-500 mt-1">
                  ริเริ่มโครงการ การจัดกิจกรรม หรือการดำเนินงานใหม่โดยไม่มีหนังสือรับต้นทาง
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              className="bg-[#6D28D9] hover:bg-purple-800 text-white px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
            >
              ถัดไป: กรอกข้อมูลเรื่องงาน
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Information */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="font-bold text-base text-slate-900">ข้อมูลรายละเอียดเรื่องงาน</h2>
          <div className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ชื่อเรื่องงาน (Case Subject)*:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น การจัดกิจกรรมฝึกอบรมเชิงปฏิบัติการพัฒนาทักษะดิจิทัล..."
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6D28D9]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                รายละเอียดและวัตถุประสงค์:
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ระบุสาระสำคัญและความเป็นมาของเรื่อง..."
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6D28D9]"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">หน่วยงานเจ้าของเรื่อง*:</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6D28D9]"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ผู้รับผิดชอบหลัก*:</label>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6D28D9]"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.displayName} ({u.roles[0]})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ระดับความสำคัญ:</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6D28D9]"
                >
                  <option value="NORMAL">ปกติ</option>
                  <option value="HIGH">ด่วน</option>
                  <option value="URGENT">ด่วนที่สุด</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">กำหนดส่งผลงาน / รายงานผล:</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6D28D9]"
                >
                </input>
              </div>
            </div>

            {/* External letter fields */}
            {originType === 'RECEIVED_LETTER' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 mt-4">
                <h3 className="font-bold text-xs text-slate-800">ข้อมูลหนังสือต้นเรื่องภายนอก</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">เลขที่หนังสือต้นทาง:</label>
                    <input
                      type="text"
                      value={externalBookNo}
                      onChange={(e) => setExternalBookNo(e.target.value)}
                      placeholder="เช่น ดศ 0204/ว 1148"
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">หนังสือลงวันที่:</label>
                    <input
                      type="date"
                      value={externalBookDate}
                      onChange={(e) => setExternalBookDate(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-slate-600 mb-1">หน่วยงานต้นทาง:</label>
                    <input
                      type="text"
                      value={originAgency}
                      onChange={(e) => setOriginAgency(e.target.value)}
                      placeholder="เช่น สำนักงานปลัดกระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม"
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              ย้อนกลับ
            </button>
            <button
              onClick={() => setStep(3)}
              className="bg-[#6D28D9] hover:bg-purple-800 text-white px-5 py-2 rounded-xl text-xs font-semibold"
            >
              ถัดไป: แนบเอกสารต้นเรื่อง
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Attachments */}
      {step === 3 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-base text-slate-900">แนบไฟล์เอกสารต้นเรื่อง (Attachments)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                รองรับการลากไฟล์มาวาง เลือกไฟล์จากเครื่อง หรือคัดลอกรูปภาพแล้วกด Ctrl+V เพื่อวางได้ทันที
              </p>
            </div>
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 self-start">
              แนบแล้ว {attachments.length} ไฟล์
            </span>
          </div>

          <FileDropPasteZone
            files={attachments}
            onChange={setAttachments}
            multiple={true}
            uploadedByName={currentUser.displayName}
            enableGlobalPaste={true}
          />

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              ย้อนกลับ
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="bg-[#6D28D9] hover:bg-purple-800 text-white px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            >
              ถัดไป: ตรวจสอบสรุปข้อมูล
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Summary & Confirm */}
      {step === 4 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="font-bold text-base text-slate-900">ตรวจสอบความถูกต้องก่อนเปิดเรื่องงาน</h2>
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200 text-xs sm:text-sm space-y-2 text-slate-800">
            <div>
              <span className="text-purple-700 font-bold">ชื่อเรื่องงาน:</span> {title}
            </div>
            <div>
              <span className="text-purple-700 font-bold">หน่วยงาน:</span>{' '}
              {departments.find((d) => d.id === departmentId)?.name}
            </div>
            <div>
              <span className="text-purple-700 font-bold">กำหนดส่ง:</span> {dueDate}
            </div>
            {originType === 'RECEIVED_LETTER' && (
              <div>
                <span className="text-purple-700 font-bold">หนังสือต้นทาง:</span> {externalBookNo || '-'} (จาก: {originAgency || '-'})
              </div>
            )}
            <div>
              <span className="text-purple-700 font-bold">ไฟล์แนบต้นเรื่อง:</span>{' '}
              {attachments.length > 0
                ? attachments.map((a) => `${a.fileName} (${formatFileSize(a.fileSizeBytes)})`).join(', ')
                : 'ไม่มีไฟล์แนบ'}
            </div>
            <div className="pt-2 text-[11px] text-slate-500">
              * เมื่อกดสร้าง ระบบจะออกรหัสเรื่องงานอัตโนมัติ (เช่น GF-2569-XXXX)
              ซึ่งเป็นรหัสติดตามภายใน ไม่ใช่เลขที่หนังสือราชการจริง
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              ย้อนกลับ
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="bg-[#6D28D9] hover:bg-purple-800 text-white px-6 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer"
            >
              {isSubmitting ? 'กำลังบันทึกเรื่องงาน...' : 'ยืนยันสร้างเรื่องงาน'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
