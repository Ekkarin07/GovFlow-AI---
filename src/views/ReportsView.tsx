import React from 'react';
import { BarChart3, TrendingUp, CheckCircle2, Clock, AlertTriangle, FileText, Download } from 'lucide-react';
import { CaseRecord, TaskRecord } from '../lib/types';

interface ReportsViewProps {
  cases: CaseRecord[];
  tasks: TaskRecord[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ cases, tasks }) => {
  const activeCases = cases.filter((c) => c.status === 'ACTIVE' || c.status === 'WAITING_REVIEW');
  const closedCases = cases.filter((c) => c.status === 'CLOSED');

  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#2563EB]" />
            <span>รายงานและสถิติภาพรวม (Reports & Analytics)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            รายงานสถิติการปฏิบัติงานจริงและอัตราความสำเร็จของภารกิจภายในองค์กร
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-semibold text-slate-500">อัตราความสำเร็จภารกิจ (Completion Rate)</span>
          <div className="text-3xl font-bold text-slate-900">{completionRate}%</div>
          <div className="text-xs text-emerald-600 font-medium">
            เสร็จสิ้นแล้ว {completedTasks.length} จาก {tasks.length} ภารกิจ
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-semibold text-slate-500">เรื่องงานที่กำลังดำเนินการ (Active)</span>
          <div className="text-3xl font-bold text-[#6D28D9]">{activeCases.length}</div>
          <div className="text-xs text-slate-500">จากทั้งหมด {cases.length} เรื่องงาน</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-semibold text-slate-500">เรื่องงานที่ปิดเสร็จสิ้น (Closed)</span>
          <div className="text-3xl font-bold text-emerald-600">{closedCases.length}</div>
          <div className="text-xs text-slate-500">ผ่านการตรวจรับรองครบถ้วน</div>
        </div>
      </div>

      {/* Departments breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="font-bold text-base text-slate-900">สรุปการดำเนินงานตามกลุ่มงาน</h2>
        <div className="space-y-3">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs sm:text-sm">
            <div>
              <div className="font-bold text-slate-900">กลุ่มส่งเสริมและพัฒนาศักยภาพชุมชน</div>
              <div className="text-xs text-slate-500">เรื่องงานที่รับผิดชอบ: 1 เรื่อง | ภารกิจ: {tasks.length} ภารกิจ</div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-[#6D28D9]">
              ความคืบหน้า {completionRate}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
