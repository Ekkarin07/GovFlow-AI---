import React, { useState } from 'react';
import {
  FolderKanban,
  Search,
  PlusCircle,
  Filter,
  Building,
  Calendar,
  User,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Table,
  ExternalLink,
} from 'lucide-react';
import { formatShortThaiDate } from '../lib/dateUtils';
import { CaseRecord, DocumentRecord, TaskRecord, UserProfile } from '../lib/types';
import { GoogleSheetsSyncPanel } from '../components/GoogleSheetsSyncPanel';

interface CasesViewProps {
  cases: CaseRecord[];
  tasks?: TaskRecord[];
  documents?: DocumentRecord[];
  incoming?: any[];
  members?: UserProfile[];
  onRefreshData?: () => Promise<void>;
  onOpenNewCase: () => void;
  onSelectCase: (caseId: string) => void;
}

export const CasesView: React.FC<CasesViewProps> = ({
  cases,
  tasks = [],
  documents = [],
  incoming = [],
  members = [],
  onRefreshData,
  onOpenNewCase,
  onSelectCase,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Google Sheets Export/Link State
  const [showSheetsModal, setShowSheetsModal] = useState(false);

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.externalBookNo && c.externalBookNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || c.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-[#6D28D9]" />
            <span>ทะเบียนเรื่องงาน (Cases)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            รวมศูนย์เรื่องงานทั้งหมดในองค์กร พร้อมสถานะภารกิจและการกำกับติดตาม
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Google Sheets Link / Sync Button */}
          <button
            onClick={() => setShowSheetsModal(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            title="เชื่อมโยงและส่งออกข้อมูลหลังบ้านไปยัง Google Sheets"
          >
            <Table className="w-4 h-4" />
            <span>เชื่อมโยง / ส่งออก Google Sheets</span>
          </button>

          <button
            onClick={onOpenNewCase}
            className="flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>สร้างเรื่องงานใหม่</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหารหัสเรื่องงาน, ชื่อเรื่อง, หรือเลขหนังสือ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-slate-700"
          >
            <option value="ALL">ทุกสถานะเรื่องงาน</option>
            <option value="ACTIVE">กำลังดำเนินการ (Active)</option>
            <option value="WAITING_REVIEW">รอตรวจ (Waiting Review)</option>
            <option value="READY_TO_CLOSE">พร้อมปิดเรื่อง (Ready to Close)</option>
            <option value="CLOSED">ปิดเรื่องแล้ว (Closed)</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-slate-700"
          >
            <option value="ALL">ทุกความสำคัญ</option>
            <option value="NORMAL">ปกติ</option>
            <option value="HIGH">ด่วน</option>
            <option value="URGENT">ด่วนที่สุด</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">รหัสเรื่องงาน</th>
                <th className="py-3 px-4 min-w-[280px]">ชื่อเรื่อง / หนังสืออ้างอิง</th>
                <th className="py-3 px-4">หน่วยงานเจ้าของเรื่อง</th>
                <th className="py-3 px-4">ผู้รับผิดชอบ</th>
                <th className="py-3 px-4">กำหนดส่ง</th>
                <th className="py-3 px-4 text-center">ความสำคัญ</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    ไม่พบรายการเรื่องงานตามเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCase(c.id)}
                    className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[#6D28D9] bg-purple-50 px-2 py-1 rounded text-xs border border-purple-200 group-hover:bg-[#6D28D9] group-hover:text-white transition-colors">
                        {c.code}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 group-hover:text-[#6D28D9] transition-colors">
                        {c.title}
                      </div>
                      {c.externalBookNo && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          เลขหนังสือเข้า: <span className="font-medium text-slate-700">{c.externalBookNo}</span> (ลงวันที่ {formatShortThaiDate(c.externalBookDate)})
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.departmentName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.ownerName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatShortThaiDate(c.dueDate)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          c.priority === 'URGENT'
                            ? 'bg-red-100 text-red-700'
                            : c.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {c.priority === 'URGENT' ? 'ด่วนที่สุด' : c.priority === 'HIGH' ? 'ด่วน' : 'ปกติ'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          c.status === 'CLOSED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'WAITING_REVIEW'
                            ? 'bg-amber-100 text-amber-800'
                            : c.status === 'READY_TO_CLOSE'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {c.status === 'CLOSED'
                          ? 'ปิดเรื่องแล้ว'
                          : c.status === 'WAITING_REVIEW'
                          ? 'รอตรวจ'
                          : c.status === 'READY_TO_CLOSE'
                          ? 'พร้อมปิด'
                          : 'กำลังทำ'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Google Sheets Link & Sync Modal */}
      {showSheetsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
                <Table className="w-5 h-5 text-emerald-600" />
                <span>เชื่อมโยงฐานข้อมูลหลังบ้านกับ Google Sheets</span>
              </div>
              <button
                onClick={() => setShowSheetsModal(false)}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                ปิด
              </button>
            </div>

            <GoogleSheetsSyncPanel
              cases={cases}
              documents={documents}
              tasks={tasks}
              incoming={incoming}
              members={members}
              onSynced={onRefreshData}
            />
          </div>
        </div>
      )}
    </div>
  );
};
