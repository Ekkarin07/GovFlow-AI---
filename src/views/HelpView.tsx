import React from 'react';
import { HelpCircle, ShieldAlert, BookOpen, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

export const HelpView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-[#6D28D9]" />
          <span>คู่มือระเบียบงานสารบรรณและมาตรฐานเอกสาร (Help & Compliance)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          หลักเกณฑ์และแนวปฏิบัติตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 และฉบับแก้ไขเพิ่มเติม
        </p>
      </div>

      {/* Disclaimers Banner */}
      <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-xs sm:text-sm text-amber-950">
        <div className="flex items-center gap-2 font-bold text-amber-900">
          <ShieldAlert className="w-5 h-5 text-amber-700" />
          <span>ข้อกำหนดและคำชี้แจงความโปร่งใส (Transparency & Compliance Notice)</span>
        </div>
        <ul className="list-disc pl-5 space-y-1 leading-relaxed text-xs">
          <li>
            <strong>เลขที่เรื่องงานภายใน (GovFlow Code):</strong> เช่น รหัส <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">GF-2569-XXXX</code> เป็นรหัสติดตามภารกิจภายในระบบ ไม่ใช่เลขที่หนังสือราชการจริง ซึ่งต้องออกผ่านงานสารบรรณของหน่วยงาน
          </li>
          <li>
            <strong>การตรวจรับรองภายในระบบ:</strong> สถานะ "ผ่านการตรวจแล้ว" เป็นการตรวจรับรองความครบถ้วนเชิงกลไกและตรวจทานเนื้อหาภายใน ไม่ใช่การลงนามหรือการอนุมัติทางกฎหมาย 100%
          </li>
          <li>
            <strong>ตราครุฑและแบบฟอร์ม:</strong> ใช้ตราครุฑตามขนาดมาตรฐาน (หนังสือภายนอก 3 ซม. หนังสือภายใน 1.5 ซม.) และห้ามใช้ตราครุฑสังเคราะห์หรือที่วาดขึ้นใหม่ด้วย AI
          </li>
        </ul>
      </div>

      {/* Standards Summary */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs sm:text-sm">
        <h2 className="font-bold text-base text-slate-900">สรุปขนาดฟอนต์ น้ำหนักตัวอักษร และระยะขอบกระดาษตามระเบียบ</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#6D28D9]" />
              <span>บันทึกข้อความ (หนังสือภายใน)</span>
            </h3>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>ขนาดกระดาษและฟอนต์: <strong>A4 · TH Sarabun New</strong></li>
              <li>ตราครุฑ: <strong>สูง 1.5 ซม. ด้านซ้ายบน</strong></li>
              <li>คำว่า "บันทึกข้อความ": <strong>29 พอยต์ ตัวหนา</strong></li>
              <li>หัวข้อ (ส่วนราชการ ที่ วันที่ เรื่อง): <strong>20 พอยต์ ตัวหนา (เฉพาะหัวข้อ)</strong></li>
              <li>ข้อความ คำขึ้นต้น (เรียน) เนื้อหา ลงชื่อ ผู้ประสานงาน: <strong>16 พอยต์ ตัวบาง (Regular)</strong></li>
              <li>ระยะขอบ: <strong>ซ้าย 3.0 ซม. ขวา 2.0 ซม. บน 1.5 ซม. (ถึงครุฑ) ล่าง 2.0 ซม.</strong></li>
              <li>การย่อหน้า: <strong>เยื้อง 2.5 ซม.</strong></li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2563EB]" />
              <span>หนังสือภายนอก</span>
            </h3>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>ขนาดกระดาษและฟอนต์: <strong>A4 · TH Sarabun New</strong></li>
              <li>ตราครุฑ: <strong>สูง 3.0 × กว้าง 2.7 ซม. กึ่งกลางหน้ากระดาษ</strong></li>
              <li>ข้อความทุกส่วน (ที่ ส่วนราชการ วันเดือนปี เรื่อง เรียน เนื้อหา ลงชื่อ ท้ายหนังสือ): <strong>16 พอยต์ ตัวบาง (ไม่มีตัวหนา)</strong></li>
              <li>ชั้นความเร็ว (ด่วน/ด่วนมาก/ด่วนที่สุด): <strong>20 พอยต์ ตัวหนา</strong></li>
              <li>ระยะขอบ: <strong>ซ้าย 3.0 ซม. ขวา 2.0 ซม. บน 1.5 ซม. (ถึงครุฑ) ล่าง 2.0 ซม.</strong></li>
              <li>คำลงท้าย: <strong>"ขอแสดงความนับถือ" (ตัวบาง 16 พอยต์ เยื้อง 2.5 ซม. ในเนื้อหา)</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
