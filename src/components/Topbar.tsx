import React, { useState } from 'react';
import {
  Bell,
  Search,
  PlusCircle,
  UserCheck,
  ChevronDown,
  Building2,
  Menu,
} from 'lucide-react';
import { NotificationItem, OrganizationProfile, UserProfile } from '../lib/types';

interface TopbarProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onSwitchUser: (userId: string) => void;
  organization: OrganizationProfile;
  onOpenNewCase: () => void;
  notifications: NotificationItem[];
  onOpenNotifications: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onToggleMobileMenu?: () => void;
  onLogout?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  organization,
  onOpenNewCase,
  notifications,
  onOpenNotifications,
  searchQuery,
  setSearchQuery,
  onToggleMobileMenu,
  onLogout,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Decorative top banner from user specification */}
      <div className="h-10 w-full overflow-hidden relative bg-gradient-to-r from-[#4C1D95] via-[#3B1578] to-[#1E3A8A] flex items-center justify-between px-4 border-b border-purple-900/30">
        <img
          src={organization.bannerUrl || 'https://img2.pic.in.th/GovFlow_AI_Web_Background_1920x1080.png'}
          alt="GovFlow Header"
          className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-screen pointer-events-none"
        />
        <div className="relative z-10 flex items-center gap-2 text-xs text-purple-100 font-medium">
          <Building2 className="w-4 h-4 text-[#FACC15]" />
          <span>{organization.fullName}</span>
          <span className="text-yellow-300 font-semibold">({organization.code})</span>
        </div>
        <div className="relative z-10 text-[11px] text-purple-200 hidden md:block">
          ระบบสารบรรณและเรื่องงานดิจิทัล พ.ศ. 2569
        </div>
      </div>

      {/* Main Topbar Row */}
      <div className="h-14 px-3 sm:px-6 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left hamburger on mobile */}
        <div className="flex items-center gap-2">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
              title="เปิดเมนู"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Global Search */}
          <div className="relative flex-1 max-w-xs sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาเรื่องงาน, เลขหนังสือ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:bg-white transition-all text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Create Case CTA Button */}
          <button
            onClick={onOpenNewCase}
            className="flex items-center gap-1.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">สร้างเรื่องงาน</span>
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="การแจ้งเตือน"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FACC15] ring-2 ring-white rounded-full" />
            )}
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Role Switcher dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left cursor-pointer border border-slate-200"
            >
              <div className="w-7 h-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {currentUser.displayName.charAt(0)}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-semibold text-slate-900 leading-tight">
                  {currentUser.displayName}
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-purple-600" />
                  <span>{currentUser.roles[0]}</span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                {currentUser.roles.includes('ADMIN') ? (
                  <>
                    <div className="px-3 py-1.5 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      สลับบทบาทเพื่อตรวจสอบระบบ (Admin)
                    </div>
                    <div className="p-1 space-y-1">
                      {allUsers.map((u) => {
                        const isSelected = u.id === currentUser.id;
                        return (
                          <button
                            key={u.id}
                            onClick={() => {
                              onSwitchUser(u.id);
                              setShowRoleMenu(false);
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                              isSelected ? 'bg-purple-50 text-purple-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div>
                              <div className="font-medium">{u.displayName}</div>
                              <div className="text-[10px] text-slate-500">{u.departmentName}</div>
                            </div>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                u.roles.includes('ADMIN')
                                  ? 'bg-purple-100 text-purple-700 border-purple-200'
                                  : u.roles.includes('REVIEWER')
                                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                                  : u.roles.includes('REGISTRAR')
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-100 text-amber-700 border-amber-200'
                              }`}
                            >
                              {u.roles[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="px-3 py-2 border-b border-slate-100 space-y-0.5">
                    <div className="text-xs font-bold text-slate-900">{currentUser.displayName}</div>
                    <div className="text-[11px] text-slate-500">{currentUser.email}</div>
                    <div className="text-[11px] text-purple-700 font-medium">{currentUser.departmentName}</div>
                  </div>
                )}

                {onLogout && (
                  <div className="pt-1.5 mt-1 border-t border-slate-100 px-2">
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        onLogout();
                      }}
                      className="w-full text-center py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold cursor-pointer transition-colors"
                    >
                      ออกจากระบบ (Sign Out)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
