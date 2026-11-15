import React, { useEffect, useState } from 'react';
import { googleSignIn } from '../lib/firebaseClient';
import { Department, UserProfile } from '../lib/types';
import {
  Shield,
  KeyRound,
  Mail,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Building2,
  UserPlus,
  User,
  LogIn,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile, token: string) => void;
  organizationName?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  organizationName,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register states
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regDepartmentId, setRegDepartmentId] = useState('');
  const [regCustomDepartment, setRegCustomDepartment] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const logoUrl = 'https://img1.pic.in.th/images/ChatGPT-Image-10-..-2569-06_11_11-1.png';
  const backgroundUrl = 'https://img2.pic.in.th/GovFlow_AI_Web_Background_1920x1080.png';

  useEffect(() => {
    fetch('/api/v1/departments')
      
    .then((r) => r.json() as Promise<unknown>)
    .then((res) => {
      if (
        typeof res === "object" &&
        res !== null &&
        "data" in res &&
        Array.isArray(res.data)
      ) {
          setDepartments(res.data);
          if (res.data.length > 0) {
            setRegDepartmentId(res.data[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Email & Password login submit
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('กรุณากรอกทั้งอีเมลและรหัสผ่าน');
      return;
    }
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.messageTh || 'การเข้าสู่ระบบไม่สำเร็จ');
      }
      onLoginSuccess(data.data.user, data.data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  // Self-registration submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regDisplayName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage('กรุณากรอกชื่อ-นามสกุล อีเมล และรหัสผ่านให้ครบถ้วน');
      return;
    }
    if (regPassword.trim().length < 4) {
      setErrorMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }
    if (regPassword.trim() !== regConfirmPassword.trim()) {
      setErrorMessage('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: regDisplayName.trim(),
          email: regEmail.trim(),
          password: regPassword.trim(),
          departmentId: regCustomDepartment.trim() ? undefined : regDepartmentId,
          customDepartmentName: regCustomDepartment.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.messageTh || 'การลงทะเบียนไม่สำเร็จ');
      }
      onLoginSuccess(data.data.user, data.data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
    } finally {
      setLoading(false);
    }
  };

  // Google Workspace Sign-In
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (!result?.user) {
        throw new Error('ไม่สามารถเข้าสู่ระบบ Google ได้');
      }

      const res = await fetch('/api/v1/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: result.user.email,
          displayName: result.user.displayName,
          photoUrl: result.user.photoURL,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.messageTh || 'ไม่สามารถลงทะเบียนเข้าใช้งานได้');
      }
      onLoginSuccess(data.data.user, data.data.token);
    } catch (err: any) {
      const msg = String(err?.message || '');
      const code = String(err?.code || '');
      if (
        msg.includes('access_denied') ||
        code.includes('popup-closed') ||
        code.includes('cancelled') ||
        code.includes('unauthorized')
      ) {
        setErrorMessage(
          'Google OAuth ยังจำกัดเฉพาะผู้ทดสอบที่ได้รับอนุญาต (Error 403) กรุณากดแท็บ "ลงทะเบียนเข้าใช้งาน" ด้านบนเพื่อสมัครด้วยอีเมลและรหัสผ่านของคุณได้ทันที'
        );
      } else {
        setErrorMessage(
          err?.message ||
            'การเข้าสู่ระบบด้วย Google ไม่สำเร็จ คุณสามารถกดแท็บ "ลงทะเบียนเข้าใช้งาน" เพื่อสมัครเข้าใช้ระบบได้ทันที'
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Quick select preset test accounts
  const quickSelect = (presetEmail: string, presetPass: string) => {
    setAuthMode('login');
    setEmail(presetEmail);
    setPassword(presetPass);
    setErrorMessage(null);
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-purple-500 selection:text-white"
      style={{
        backgroundImage: `url('${backgroundUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark tint overlay for clarity and readability */}
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px]" />

      <div className="relative w-full max-w-md z-10 my-4">
        {/* Main Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 ring-1 ring-white/10">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="px-4 py-2 rounded-2xl bg-white/10 border border-purple-400/30 shadow-lg mb-3 flex items-center justify-center">
              <img
                src={logoUrl}
                alt="GovFlow AI Logo"
                className="h-16 sm:h-20 w-auto max-w-[240px] object-contain rounded-lg drop-shadow"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
              <span>GovFlow AI</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                v1.1
              </span>
            </h1>
            <p className="text-xs text-purple-300 font-medium mt-1">
              ระบบสารบรรณและบริหารภารกิจราชการอัจฉริยะ
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed flex items-center justify-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>{organizationName || 'ระบบกลางสำหรับทุกหน่วยงาน • กำหนดข้อมูลด้วยตนเอง'}</span>
            </p>
          </div>

          {/* Mode Tabs: Login vs Self-Registration */}
          <div
            role="tablist"
            aria-label="รูปแบบการเข้าใช้งานระบบ"
            className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl mb-5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'login'}
              onClick={() => {
                setAuthMode('login');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>เข้าสู่ระบบ</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'register'}
              onClick={() => {
                setAuthMode('register');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                authMode === 'register'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>ลงทะเบียนเข้าใช้งาน</span>
            </button>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {authMode === 'login' ? (
            <>
              {/* Login Form */}
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                    อีเมลผู้ใช้งาน (Username / Email)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="เช่น admin@govflow.local"
                      required
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="block text-xs font-medium text-slate-300">
                      รหัสผ่าน (Password)
                    </label>
                    <span className="text-[11px] text-slate-400">กำหนดโดยผู้ใช้หรือแอดมิน</span>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="รหัสผ่านเข้าใช้งาน"
                      required
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 active:scale-[0.99] transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span>กำลังตรวจสอบข้อมูล...</span>
                  ) : (
                    <>
                      <span>เข้าสู่ระบบ</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-700"></div>
                <span className="text-[11px] text-slate-400 font-medium">หรือ</span>
                <div className="flex-1 h-px bg-slate-700"></div>
              </div>

              {/* Official Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-medium text-xs border border-slate-300 shadow flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{googleLoading ? 'กำลังเชื่อมต่อ...' : 'ลงชื่อเข้าใช้ด้วย Google Workspace'}</span>
              </button>

              <p className="text-[11px] text-slate-400 text-center mt-3">
                ยังไม่มีบัญชีใช่ไหม?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMessage(null);
                  }}
                  className="text-yellow-300 hover:text-yellow-200 font-semibold underline underline-offset-2 cursor-pointer"
                >
                  ลงทะเบียนเข้าใช้งานฟรี
                </button>
              </p>

              {/* Quick Preset Selector for Testing & Evaluation */}
              <div className="mt-5 pt-4 border-t border-slate-700/60">
                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium mb-2.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>เลือกบัญชีทดสอบที่แอดมินกำหนดรหัสผ่านไว้:</span>
                </div>
                <div className="grid grid-cols-1 gap-2 text-left">
                  <button
                    type="button"
                    onClick={() => quickSelect('admin@govflow.local', 'admin')}
                    className="p-2.5 rounded-lg bg-slate-950/70 hover:bg-slate-800/80 border border-slate-700/70 transition-colors text-xs flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-white group-hover:text-purple-300 flex items-center gap-1.5">
                        <span>ผู้ดูแลระบบกลาง (System Admin)</span>
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-mono">
                          ADMIN
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        admin@govflow.local • รหัสผ่าน: <span className="font-mono text-amber-300 font-bold">admin</span>
                      </div>
                    </div>
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => quickSelect('user@govflow.local', '123456')}
                    className="p-2.5 rounded-lg bg-slate-950/70 hover:bg-slate-800/80 border border-slate-700/70 transition-colors text-xs flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-white group-hover:text-purple-300 flex items-center gap-1.5">
                        <span>เจ้าหน้าที่ผู้ปฏิบัติงาน (Staff)</span>
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-mono">
                          STAFF
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        user@govflow.local • รหัสผ่าน: <span className="font-mono text-amber-300 font-bold">123456</span>
                      </div>
                    </div>
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 shrink-0" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Self-Registration Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label htmlFor="reg-name" className="block text-xs font-medium text-slate-300 mb-1">
                  ชื่อ-นามสกุล (ผู้ใช้งาน)*
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="reg-name"
                    type="text"
                    value={regDisplayName}
                    onChange={(e) => setRegDisplayName(e.target.value)}
                    placeholder="เช่น นายสมชาย ใจดี"
                    required
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-xs font-medium text-slate-300 mb-1">
                  อีเมลเข้าใช้งาน*
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="reg-email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="เช่น somchai@agency.go.th"
                    required
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-custom-dept" className="block text-xs font-medium text-slate-300 mb-1">
                  ระบุหน่วยงาน / กลุ่มงานของคุณ (หรือเลือกจากรายการด้านล่าง)
                </label>
                <div className="relative mb-2">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="reg-custom-dept"
                    type="text"
                    value={regCustomDepartment}
                    onChange={(e) => setRegCustomDepartment(e.target.value)}
                    placeholder="พิมพ์ชื่อหน่วยงาน/กลุ่มงานของคุณเอง..."
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                {!regCustomDepartment.trim() && departments.length > 0 && (
                  <select
                    aria-label="เลือกกลุ่มงานในระบบ"
                    value={regDepartmentId}
                    onChange={(e) => setRegDepartmentId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-password" className="block text-xs font-medium text-slate-300 mb-1">
                    รหัสผ่าน* (ขั้นต่ำ 4 ตัว)
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="reg-password"
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="ตั้งรหัสผ่าน"
                      required
                      minLength={4}
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="reg-confirm" className="block text-xs font-medium text-slate-300 mb-1">
                    ยืนยันรหัสผ่าน*
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="reg-confirm"
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="พิมพ์ซ้ำอีกครั้ง"
                      required
                      minLength={4}
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 active:scale-[0.99] transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'กำลังสร้างบัญชี...' : 'ลงทะเบียนและเข้าสู่ระบบทันที'}</span>
              </button>

              <p className="text-[11px] text-slate-400 text-center pt-1">
                มีบัญชีอยู่แล้ว?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage(null);
                  }}
                  className="text-yellow-300 hover:text-yellow-200 font-semibold underline underline-offset-2 cursor-pointer"
                >
                  กลับไปเข้าสู่ระบบ
                </button>
              </p>
            </form>
          )}
        </div>

        {/* Footer info */}
        <p className="mt-4 text-center text-[11px] text-slate-400 drop-shadow">
          GovFlow AI • ระบบสารบรรณและบริหารภารกิจราชการอัจฉริยะ (Universal Government Workflow)
        </p>
      </div>
    </div>
  );
};
