import React, { useState } from 'react';
import { CheckSquare, PlusCircle, Search, Clock, User, CheckCircle2, AlertTriangle, Paperclip } from 'lucide-react';
import { formatShortThaiDate } from '../lib/dateUtils';
import { TaskRecord, UserProfile } from '../lib/types';

interface TasksViewProps {
  tasks: TaskRecord[];
  currentUser: UserProfile;
  onSelectTask: (taskId: string) => void;
  onOpenNewTask: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  currentUser,
  onSelectTask,
  onOpenNewTask,
}) => {
  const [tabFilter, setTabFilter] = useState<'my' | 'all'>('my');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredTasks = tasks.filter((t) => {
    const matchesUser = tabFilter === 'all' || t.assigneeId === currentUser.id;
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesUser && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-[#2563EB]" />
            <span>ภารกิจและการดำเนินงาน (Tasks & Missions)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ติดตามงานที่ได้รับมอบหมาย การแนบหลักฐานประกอบ และการส่งตรวจรับรองผล
          </p>
        </div>
        <button
          onClick={onOpenNewTask}
          className="flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>มอบหมายภารกิจใหม่</span>
        </button>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTabFilter('my')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              tabFilter === 'my'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            งานที่มอบหมายให้ฉัน ({tasks.filter((t) => t.assigneeId === currentUser.id).length})
          </button>
          <button
            onClick={() => setTabFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              tabFilter === 'all'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ภารกิจทั้งหมดในหน่วยงาน ({tasks.length})
          </button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#6D28D9]"
        >
          <option value="ALL">ทุกสถานะภารกิจ</option>
          <option value="TODO">ยังไม่เริ่ม (To Do)</option>
          <option value="IN_PROGRESS">กำลังดำเนินการ (In Progress)</option>
          <option value="SUBMITTED_FOR_REVIEW">รอตรวจหลักฐาน (Waiting Review)</option>
          <option value="COMPLETED">เสร็จสิ้น (Completed)</option>
        </select>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs">
            ไม่พบรายการภารกิจตามเงื่อนไขที่เลือก
          </div>
        ) : (
          filteredTasks.map((t) => (
            <div
              key={t.id}
              onClick={() => onSelectTask(t.id)}
              className="bg-white p-5 rounded-xl border border-slate-200 hover:border-purple-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-[11px] text-[#6D28D9] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {t.caseCode}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : t.status === 'SUBMITTED_FOR_REVIEW'
                        ? 'bg-purple-100 text-purple-800'
                        : t.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {t.status === 'COMPLETED'
                      ? 'เสร็จสิ้น'
                      : t.status === 'SUBMITTED_FOR_REVIEW'
                      ? 'รอตรวจ'
                      : t.status === 'IN_PROGRESS'
                      ? 'กำลังทำ'
                      : 'ยังไม่เริ่ม'}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                  {t.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2">{t.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>{t.assigneeName}</span>
                  </span>
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatShortThaiDate(t.dueDate)}</span>
                  </span>
                </div>

                {t.evidenceRequired && (
                  <div className="flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                    <Paperclip className="w-3 h-3" />
                    <span>กำหนดให้แนบหลักฐาน ({t.requiredEvidenceList?.length || 1} รายการ)</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
