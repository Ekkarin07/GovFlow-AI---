import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Inbox,
  FileText,
  FileCheck2,
  CheckSquare,
  ClipboardCheck,
  Sparkles,
  BarChart3,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  Users,
  Building2,
  History,
  Table,
  X,
} from 'lucide-react';
import { UserProfile } from '../lib/types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenSettingsSubTab?: (subTab: 'org' | 'members' | 'departments' | 'integrations' | 'audit') => void;
  activeSettingsSubTab?: 'org' | 'members' | 'departments' | 'integrations' | 'audit';
  currentUser: UserProfile;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenSettingsSubTab,
  activeSettingsSubTab = 'org',
  currentUser,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const isAdmin = currentUser.roles.includes('ADMIN');
  const isReviewer = currentUser.roles.includes('REVIEWER') || isAdmin;
  const isRegistrar = currentUser.roles.includes('REGISTRAR') || isAdmin;

  const navigate = (
    tab: string,
    settingsSub?: 'org' | 'members' | 'departments' | 'integrations' | 'audit'
  ) => {
    if (tab === 'settings' && settingsSub && onOpenSettingsSubTab) {
      onOpenSettingsSubTab(settingsSub);
    }
    setCurrentTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 ${
          isAdmin ? 'bg-[#2E1065]' : 'bg-[#4C1D95]'
        } text-white flex flex-col shrink-0 min-h-screen border-r border-purple-950/40 select-none transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand & Logo */}
        <div
          className={`p-4 flex items-center justify-between border-b border-purple-800/60 ${
            isAdmin ? 'bg-[#1E0A45]' : 'bg-[#3B1578]'
          }`}
        >
          <div className="flex items-center gap-3">
            <img
              src="https://img1.pic.in.th/images/ChatGPT-Image-10-..-2569-06_11_11-1.png"
              alt="GovFlow AI Logo"
              className="w-10 h-10 object-contain rounded-lg bg-white/10 p-1 shadow-sm"
            />
            <div>
              <div className="font-bold text-base tracking-wide flex items-center gap-1.5 text-white">
                GovFlow{' '}
                <span className="text-[#FACC15] text-xs font-semibold px-1.5 py-0.5 rounded bg-yellow-400/20 border border-yellow-400/40">
                  AI v1.1
                </span>
              </div>
              <p className="text-[11px] text-purple-200">
                {isAdmin ? 'Admin Control System' : 'From Documents to Done.'}
              </p>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-purple-300 hover:text-white hover:bg-purple-800 lg:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Role Pill */}
        <div
          className={`px-4 py-2.5 border-b border-purple-800/40 flex items-center justify-between text-xs ${
            isAdmin ? 'bg-amber-500/10' : 'bg-[#421782]'
          }`}
        >
          <span className="text-purple-200">สิทธิ์การใช้งาน:</span>
          {isAdmin ? (
            <span className="font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded text-[11px] flex items-center gap-1 shadow-xs">
              <ShieldCheck className="w-3 h-3" />
              ผู้ดูแลระบบ (ADMIN)
            </span>
          ) : (
            <span className="font-medium bg-[#6D28D9] text-white px-2 py-0.5 rounded text-[11px] border border-purple-400/30">
              {currentUser.roles.includes('REVIEWER')
                ? 'ผู้ตรวจ (Reviewer)'
                : currentUser.roles.includes('REGISTRAR')
                ? 'สารบรรณ (Registrar)'
                : 'ผู้ปฏิบัติงาน (Staff)'}
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
          {/* ADMIN EXCLUSIVE SECTION */}
          {isAdmin && (
            <div className="space-y-1">
              <h3 className="px-3 text-[11px] font-bold tracking-wider text-amber-300 uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ศูนย์ควบคุมผู้ดูแลระบบ</span>
              </h3>

              <button
                onClick={() => navigate('dashboard')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left relative cursor-pointer ${
                  currentTab === 'dashboard'
                    ? 'bg-amber-400/20 text-amber-200 font-semibold border border-amber-400/30'
                    : 'text-purple-100 hover:bg-purple-800/50 hover:text-white'
                }`}
              >
                {currentTab === 'dashboard' && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#FACC15] rounded-r" />
                )}
                <LayoutDashboard
                  className={`w-4 h-4 shrink-0 ${
                    currentTab === 'dashboard' ? 'text-[#FACC15]' : 'text-amber-300'
                  }`}
                />
                <span className="truncate">แดชบอร์ดแอดมิน (Admin)</span>
              </button>

              <button
                onClick={() => navigate('settings', 'members')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left relative cursor-pointer ${
                  currentTab === 'settings' && activeSettingsSubTab === 'members'
                    ? 'bg-amber-400/20 text-amber-200 font-semibold border border-amber-400/30'
                    : 'text-purple-100 hover:bg-purple-800/50 hover:text-white'
                }`}
              >
                {currentTab === 'settings' && activeSettingsSubTab === 'members' && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#FACC15] rounded-r" />
                )}
                <Users
                  className={`w-4 h-4 shrink-0 ${
                    currentTab === 'settings' && activeSettingsSubTab === 'members'
                      ? 'text-[#FACC15]'
                      : 'text-amber-300'
                  }`}
                />
                <span className="truncate">จัดการสมาชิก & รหัสผ่าน</span>
              </button>

              <button
                onClick={() => navigate('settings', 'org')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left relative cursor-pointer ${
                  currentTab === 'settings' &&
                  (activeSettingsSubTab === 'org' || activeSettingsSubTab === 'departments')
                    ? 'bg-amber-400/20 text-amber-200 font-semibold border border-amber-400/30'
                    : 'text-purple-100 hover:bg-purple-800/50 hover:text-white'
                }`}
              >
                {currentTab === 'settings' &&
                  (activeSettingsSubTab === 'org' || activeSettingsSubTab === 'departments') && (
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#FACC15] rounded-r" />
                  )}
                <Building2
                  className={`w-4 h-4 shrink-0 ${
                    currentTab === 'settings' &&
                    (activeSettingsSubTab === 'org' || activeSettingsSubTab === 'departments')
                      ? 'text-[#FACC15]'
                      : 'text-amber-300'
                  }`}
                />
                <span className="truncate">ตั้งค่าหน่วยงาน & กลุ่มงาน</span>
              </button>

              <button
                onClick={() => navigate('settings', 'integrations')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left relative cursor-pointer ${
                  currentTab === 'settings' && activeSettingsSubTab === 'integrations'
                    ? 'bg-amber-400/20 text-amber-200 font-semibold border border-amber-400/30'
                    : 'text-purple-100 hover:bg-purple-800/50 hover:text-white'
                }`}
              >
                {currentTab === 'settings' && activeSettingsSubTab === 'integrations' && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#FACC15] rounded-r" />
                )}
                <Table
                  className={`w-4 h-4 shrink-0 ${
                    currentTab === 'settings' && activeSettingsSubTab === 'integrations'
                      ? 'text-[#FACC15]'
                      : 'text-amber-300'
                  }`}
                />
                <span className="truncate">เชื่อมโยง Google Sheets</span>
              </button>

              <button
                onClick={() => navigate('settings', 'audit')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left relative cursor-pointer ${
                  currentTab === 'settings' && activeSettingsSubTab === 'audit'
                    ? 'bg-amber-400/20 text-amber-200 font-semibold border border-amber-400/30'
                    : 'text-purple-100 hover:bg-purple-800/50 hover:text-white'
                }`}
              >
                {currentTab === 'settings' && activeSettingsSubTab === 'audit' && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#FACC15] rounded-r" />
                )}
                <History
                  className={`w-4 h-4 shrink-0 ${
                    currentTab === 'settings' && activeSettingsSubTab === 'audit'
                      ? 'text-[#FACC15]'
                      : 'text-amber-300'
                  }`}
                />
                <span className="truncate">ประวัติระบบ (Audit Logs)</span>
              </button>
            </div>
          )}

          {/* Core Operations Section */}
          <div className="space-y-1">
            <h3 className="px-3 text-[11px] font-semibold tracking-wider text-purple-300/80 uppercase">
              {isAdmin ? 'กำกับดูแลงานสารบรรณ' : 'ศูนย์ปฏิบัติงานของฉัน'}
            </h3>

            {!isAdmin && (
              <button
                onClick={() => navigate('dashboard')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left relative cursor-pointer ${
                  currentTab === 'dashboard'
                    ? 'bg-[#5B21B6] text-white font-semibold shadow-inner'
                    : 'text-purple-100 hover:bg-purple-800/50 hover:text-white'
                }`}
              >
                {currentTab === 'dashboard' && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#FACC15] rounded-r" />
                )}
                <LayoutDashboard
                  className={`w-4 h-4 shrink-0 ${
                    currentTab === 'dashboard' ? 'text-[#FACC15]' : 'text-purple-300'
                  }`}
                />
                <span className="truncate">ภาพรวมงานของฉัน</span>
              </button>
            )}

            {[
              { id: 'cases', label: 'เรื่องงาน (Cases)', icon: FolderKanban },
              { id: 'incoming', label: 'หนังสือเข้า (Incoming)', icon: Inbox },
              { id: 'documents', label: 'เอกสารราชการ (Docs)', icon: FileText },
              { id: 'templates', label: 'คลังแม่แบบ (Templates)', icon: FileCheck2 },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left relative cursor-pointer ${
                    isActive
                      ? 'bg-[#5B21B6] text-white font-semibold shadow-inner'
                      : 'text-purple-100 hover:bg-purple-800/50 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#FACC15] rounded-r" />
                  )}
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#FACC15]' : 'text-purple-300'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tasks & Reviews Section */}
          <div className="space-y-1">
            <h3 className="px-3 text-[11px] font-semibold tracking-wider text-purple-300/80 uppercase">
              {isReviewer ? 'ภารกิจและการตรวจรับรอง' : 'ภารกิจและผู้ช่วย AI'}
            </h3>

            <button
              onClick={() => navigate('tasks')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left relative cursor-pointer ${
                currentTab === 'tasks'
                  ? 'bg-[#5B21B6] text-white font-semibold shadow-inner'
                  : 'text-purple-100 hover:bg-purple-800/50 hover:text-white'
              }`}
            >
              {currentTab === 'tasks' && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#FACC15] rounded-r" />
              )}
              <CheckSquare
                className={`w-4 h-4 shrink-0 ${
                  currentTab === 'tasks' ? 'text-[#FACC15]' : 'text-purple-300'
                }`}
              />
              <span className="truncate">ภารกิจของฉัน (Tasks)</span>
            </button>

            {isReviewer && (
              <button
                onClick={() => navigate('reviews')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left relative cursor-pointer ${
                  currentTab === 'reviews'
                    ? 'bg-[#5B21B6] text-white font-semibold shadow-inner'
                    : 'text-purple-100 hover:bg-purple-800/50 hover:text-white'
                }`}
              >
                {currentTab === 'reviews' && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#FACC15] rounded-r" />
                )}
                <ClipboardCheck
                  className={`w-4 h-4 shrink-0 ${
                    currentTab === 'reviews' ? 'text-[#FACC15]' : 'text-purple-300'
                  }`}
                />
                <span className="truncate">งานรอตรวจ (Review Queue)</span>
              </button>
            )}

            <button
              onClick={() => navigate('ai')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left relative cursor-pointer ${
                currentTab === 'ai'
                  ? 'bg-[#5B21B6] text-white font-semibold shadow-inner'
                  : 'text-purple-100 hover:bg-purple-800/50 hover:text-white'
              }`}
            >
              {currentTab === 'ai' && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#FACC15] rounded-r" />
              )}
              <Sparkles
                className={`w-4 h-4 shrink-0 ${
                  currentTab === 'ai' ? 'text-[#FACC15]' : 'text-purple-300'
                }`}
              />
              <span className="truncate">AI สารบรรณ (AI Assistant)</span>
            </button>
          </div>

          {/* Reports & Help Section */}
          <div className="space-y-1">
            <h3 className="px-3 text-[11px] font-semibold tracking-wider text-purple-300/80 uppercase">
              {(isAdmin || isRegistrar) ? 'รายงานและคู่มือ' : 'ช่วยเหลือ'}
            </h3>

            {(isAdmin || isRegistrar || isReviewer) && (
              <button
                onClick={() => navigate('reports')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left relative cursor-pointer ${
                  currentTab === 'reports'
                    ? 'bg-[#5B21B6] text-white font-semibold shadow-inner'
                    : 'text-purple-100 hover:bg-purple-800/50 hover:text-white'
                }`}
              >
                {currentTab === 'reports' && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#FACC15] rounded-r" />
                )}
                <BarChart3
                  className={`w-4 h-4 shrink-0 ${
                    currentTab === 'reports' ? 'text-[#FACC15]' : 'text-purple-300'
                  }`}
                />
                <span className="truncate">รายงานสถิติ (Reports)</span>
              </button>
            )}

            <button
              onClick={() => navigate('help')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left relative cursor-pointer ${
                currentTab === 'help'
                  ? 'bg-[#5B21B6] text-white font-semibold shadow-inner'
                  : 'text-purple-100 hover:bg-purple-800/50 hover:text-white'
              }`}
            >
              {currentTab === 'help' && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#FACC15] rounded-r" />
              )}
              <HelpCircle
                className={`w-4 h-4 shrink-0 ${
                  currentTab === 'help' ? 'text-[#FACC15]' : 'text-purple-300'
                }`}
              />
              <span className="truncate">คู่มือสารบรรณ (Help)</span>
            </button>
          </div>
        </nav>

        {/* Official Standards Badge Footer */}
        <div
          className={`p-3 border-t border-purple-800/50 text-[11px] text-purple-200 ${
            isAdmin ? 'bg-[#1E0A45]' : 'bg-[#3B1578]'
          }`}
        >
          <div className="flex items-center gap-1.5 text-yellow-300 mb-1 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>{isAdmin ? 'โหมดควบคุมระบบเต็มรูปแบบ' : 'มาตรฐานระเบียบสารบรรณ'}</span>
          </div>
          <p className="text-[10px] text-purple-300 leading-relaxed">
            {isAdmin
              ? 'สามารถจัดการบัญชีผู้ใช้ กำหนดรหัสผ่าน และตั้งค่าส่วนราชการได้'
              : 'รองรับแบบบันทึกข้อความและหนังสือภายนอก พ.ศ. 2526'}
          </p>
        </div>
      </aside>
    </>
  );
};
