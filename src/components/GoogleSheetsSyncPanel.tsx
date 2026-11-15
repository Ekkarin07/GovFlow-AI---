import React, { useEffect, useState } from 'react';
import {
  Table,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Download,
  Link2,
  Database,
  ShieldAlert,
} from 'lucide-react';
import {
  CaseRecord,
  DocumentRecord,
  GoogleSheetIntegrationConfig,
  TaskRecord,
  UserProfile,
} from '../lib/types';
import { syncAllBackendToGoogleSheet } from '../lib/googleWorkspace';
import { generateGoogleAppsScriptCode, isValidAppsScriptUrl, parseSpreadsheetId } from '../lib/sheetsHelper';

interface GoogleSheetsSyncPanelProps {
  cases: CaseRecord[];
  documents: DocumentRecord[];
  tasks: TaskRecord[];
  incoming: any[];
  members: UserProfile[];
  onSynced?: () => Promise<void>;
  compact?: boolean;
}

export const GoogleSheetsSyncPanel: React.FC<GoogleSheetsSyncPanelProps> = ({
  cases,
  documents,
  tasks,
  incoming,
  members,
  onSynced,
  compact = false,
}) => {
  const [config, setConfig] = useState<GoogleSheetIntegrationConfig>({
    autoSyncEnabled: false,
    lastSyncStatus: 'NEVER',
  });
  const [sheetUrlOrIdInput, setSheetUrlOrIdInput] = useState('');
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [showScriptCode, setShowScriptCode] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const [isSyncingOAuth, setIsSyncingOAuth] = useState(false);
  const [isSyncingWebhook, setIsSyncingWebhook] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const [confirmAction, setConfirmAction] = useState<'OAUTH' | 'WEBHOOK' | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    sheetUrl?: string;
  } | null>(null);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/v1/integrations/sheets');
      const json = await res.json();
      if (json.data?.config) {
        setConfig(json.data.config);
        setSheetUrlOrIdInput(
          json.data.config.linkedSpreadsheetUrl || json.data.config.linkedSpreadsheetId || ''
        );
        setWebhookUrlInput(json.data.config.appsScriptWebhookUrl || '');
      }
    } catch (err) {
      console.error('Failed to load Google Sheets config:', err);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSaveConfig = async (overrides?: Partial<GoogleSheetIntegrationConfig>) => {
    setIsSavingConfig(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/v1/integrations/sheets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedSpreadsheetIdOrUrl: sheetUrlOrIdInput,
          appsScriptWebhookUrl: webhookUrlInput,
          autoSyncEnabled: config.autoSyncEnabled,
          ...(overrides || {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatusMessage({
          type: 'error',
          text: json.error?.messageTh || 'ไม่สามารถบันทึกการตั้งค่าได้',
        });
        return false;
      }
      setConfig(json.data);
      setStatusMessage({
        type: 'success',
        text: 'บันทึกการตั้งค่าเชื่อมโยง Google Sheets ลงฐานข้อมูลหลังบ้านเรียบร้อยแล้ว',
        sheetUrl: json.data.linkedSpreadsheetUrl,
      });
      return true;
    } catch {
      setStatusMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์หลังบ้าน' });
      return false;
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleExecuteOAuthSync = async () => {
    setConfirmAction(null);
    setIsSyncingOAuth(true);
    setStatusMessage(null);
    try {
      const result = await syncAllBackendToGoogleSheet({
        spreadsheetIdOrUrl: sheetUrlOrIdInput.trim() || undefined,
        cases,
        documents,
        tasks,
        incoming,
        users: members,
      });

      // Persist linked spreadsheet metadata to backend store
      await fetch('/api/v1/integrations/sheets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedSpreadsheetId: result.spreadsheetId,
          linkedSpreadsheetUrl: result.sheetUrl,
          linkedSpreadsheetTitle: result.title,
          lastSyncedAt: new Date().toISOString(),
          lastSyncStatus: 'SUCCESS',
          lastSyncMessage: `ซิงค์ผ่าน OAuth สำเร็จ (${result.summary.cases} เรื่องงาน, ${result.summary.documents} เอกสาร, ${result.summary.tasks} ภารกิจ)`,
        }),
      });
      setSheetUrlOrIdInput(result.sheetUrl);
      await loadConfig();
      if (onSynced) await onSynced();
      setStatusMessage({
        type: 'success',
        text: `ซิงค์ข้อมูลหลังบ้านทั้ง 5 ตารางไปยัง "${result.title}" เรียบร้อยแล้ว`,
        sheetUrl: result.sheetUrl,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'ไม่สามารถเชื่อมต่อบัญชี Google Sheets ได้',
      });
    } finally {
      setIsSyncingOAuth(false);
    }
  };

  const handleExecuteWebhookSync = async () => {
    setConfirmAction(null);
    setIsSyncingWebhook(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/v1/integrations/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appsScriptWebhookUrl: webhookUrlInput.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatusMessage({
          type: 'error',
          text: json.error?.messageTh || 'ซิงค์ข้อมูลผ่าน Apps Script Webhook ไม่สำเร็จ',
        });
        return;
      }
      if (json.data?.config) {
        setConfig(json.data.config);
        if (json.data.config.linkedSpreadsheetUrl) {
          setSheetUrlOrIdInput(json.data.config.linkedSpreadsheetUrl);
        }
      }
      if (onSynced) await onSynced();
      setStatusMessage({
        type: 'success',
        text: json.data?.config?.lastSyncMessage || 'ซิงค์ข้อมูลหลังบ้านเข้า Google Sheets เรียบร้อยแล้ว!',
        sheetUrl: json.data?.config?.linkedSpreadsheetUrl,
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อส่งข้อมูลไปยัง Google Apps Script ได้',
      });
    } finally {
      setIsSyncingWebhook(false);
    }
  };

  const appsScriptCode = generateGoogleAppsScriptCode();

  return (
    <div className="space-y-4">
      {/* Backend Storage & Summary Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900">
            <Database className="w-4 h-4 text-[#6D28D9]" />
            <span>สถานะฐานข้อมูลหลังบ้าน (Persistent Backend Store)</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full self-start">
            <CheckCircle2 className="w-3.5 h-3.5" />
            บันทึกลงไฟล์ถาวรบนเซิร์ฟเวอร์แล้ว
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          {[
            { label: 'เรื่องงาน (Cases)', count: cases.length },
            { label: 'เอกสาร (Docs)', count: documents.length },
            { label: 'ภารกิจ (Tasks)', count: tasks.length },
            { label: 'หนังสือเข้า (Incoming)', count: incoming.length },
            { label: 'สมาชิก (Members)', count: members.length },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-lg p-2.5 text-center">
              <div className="text-[11px] text-slate-500">{stat.label}</div>
              <div className="font-bold text-base text-slate-900 mt-0.5">{stat.count}</div>
            </div>
          ))}
        </div>

        {config.linkedSpreadsheetUrl && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs">
            <div className="text-slate-600 truncate">
              <span className="font-semibold text-slate-800">ชีตที่เชื่อมโยงไว้: </span>
              <span>{config.linkedSpreadsheetTitle || config.linkedSpreadsheetId || config.linkedSpreadsheetUrl}</span>
              {config.lastSyncedAt && (
                <span className="text-slate-400 ml-2">
                  (อัปเดตล่าสุด {new Date(config.lastSyncedAt).toLocaleString('th-TH')})
                </span>
              )}
            </div>
            <a
              href={config.linkedSpreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:underline shrink-0"
            >
              <span>เปิด Google Sheet</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{statusMessage.text}</span>
          </div>
          {statusMessage.sheetUrl && (
            <div>
              <a
                href={statusMessage.sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
              >
                <span>เปิดดูข้อมูลใน Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Prompt (Required before mutating Google Sheets) */}
      {confirmAction && (
        <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50 space-y-3 text-xs">
          <div className="font-bold text-amber-950 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>ยืนยันการเขียน/อัปเดตข้อมูลไปยัง Google Sheets</span>
          </div>
          <p className="text-amber-900 leading-relaxed">
            ระบบจะส่งข้อมูลหลังบ้านทั้งหมด 5 แท็บ (Cases, Documents, Tasks, Incoming, Members) ไปบันทึกใน Google Sheet{' '}
            {confirmAction === 'OAUTH'
              ? sheetUrlOrIdInput.trim()
                ? `(${parseSpreadsheetId(sheetUrlOrIdInput) || sheetUrlOrIdInput})`
                : '(สร้างสเปรดชีตใหม่ใน Google Drive ของคุณ)'
              : 'ผ่าน Apps Script Webhook URL ที่ระบุ'}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() =>
                confirmAction === 'OAUTH' ? handleExecuteOAuthSync() : handleExecuteWebhookSync()
              }
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
            >
              ยืนยันซิงค์ข้อมูล
            </button>
          </div>
        </div>
      )}

      {/* Method 1: Apps Script Webhook (Recommended — bypasses 403 & unverified OAuth warning) */}
      <div className="bg-white border border-purple-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#6D28D9]" />
              <span>วิธีที่ 1 (แนะนำ): เชื่อมโยงหลังบ้านกับ Google Sheet ด้วย Apps Script Webhook</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ใช้งานได้ 100% กับทุกบัญชี Google และบัญชีหน่วยงาน ไม่ติดหน้าเตือน &quot;Google ยังไม่ได้ยืนยันแอปนี้&quot; หรือ Error 403
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowScriptCode((v) => !v)}
            className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#6D28D9] text-xs font-semibold border border-purple-200 cursor-pointer shrink-0 self-start"
          >
            {showScriptCode ? 'ซ่อนวิธีติดตั้ง & โค้ด' : 'ดูวิธีติดตั้งสคริปต์ (4 ขั้นตอน)'}
          </button>
        </div>

        {showScriptCode && (
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 space-y-3 text-xs">
            <div className="text-amber-300 font-semibold leading-relaxed space-y-1">
              <div>1. เปิด Google Sheet ของคุณ แล้วคลิกเมนู <strong>ส่วนขยาย (Extensions) &gt; Apps Script</strong></div>
              <div>2. ลบโค้ดเดิมออก แล้ววางโค้ดด้านล่างนี้ลงไป กดบันทึก</div>
              <div>3. กดปุ่ม <strong>ทำให้ใช้งานได้ (Deploy) &gt; การทำให้ใช้งานได้ใหม่ (New deployment) &gt; ประเภท: เว็บแอป (Web app)</strong></div>
              <div>4. เลือก Execute as: <strong>Me</strong> และ Who has access: <strong>Anyone (ทุกคน)</strong> แล้วคัดลอก Web app URL มาวางด้านล่าง</div>
            </div>
            <div className="relative">
              <pre className="bg-slate-950 p-3 rounded-lg overflow-x-auto text-[11px] font-mono text-emerald-300 max-h-48">
                {appsScriptCode}
              </pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(appsScriptCode);
                  setCopiedScript(true);
                  setTimeout(() => setCopiedScript(false), 2000);
                }}
                className="absolute top-2 right-2 flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? 'คัดลอกแล้ว' : 'คัดลอก Code.gs'}</span>
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2 text-xs">
          <label className="block font-semibold text-slate-700">
            Google Apps Script Web App URL:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={webhookUrlInput}
              onChange={(e) => setWebhookUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="flex-1 p-2.5 border border-slate-200 rounded-lg font-mono text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#6D28D9]"
            />
            <button
              type="button"
              onClick={() => handleSaveConfig()}
              disabled={isSavingConfig}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold cursor-pointer shrink-0"
            >
              {isSavingConfig ? 'กำลังบันทึก...' : 'บันทึกลิงก์'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction('WEBHOOK')}
              disabled={isSyncingWebhook || !isValidAppsScriptUrl(webhookUrlInput)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-purple-800 text-white font-bold cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingWebhook ? 'animate-spin' : ''}`} />
              <span>{isSyncingWebhook ? 'กำลังซิงค์...' : 'ซิงค์หลังบ้านเข้า Sheet'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Method 2: Direct Google Account OAuth */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div>
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Table className="w-4 h-4 text-emerald-600" />
            <span>วิธีที่ 2: เชื่อมต่อบัญชี Google โดยตรง (OAuth 2.0)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            สร้างสเปรดชีตใหม่อัตโนมัติใน Google Drive หรือวางลิงก์ Google Sheet เดิมของคุณเพื่ออัปเดตทั้ง 5 แท็บ
          </p>
        </div>

        {/* Unverified OAuth guidance matching the exact screen in user's screenshot */}
        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <div className="font-bold">คำแนะนำหากพบหน้าต่าง &quot;Google ยังไม่ได้ยืนยันแอปนี้&quot;:</div>
            <div>
              • ให้กดคำว่า <strong>&quot;ดำเนินการต่อ&quot;</strong> ด้านล่างซ้ายของหน้าต่าง Google เพื่ออนุญาตให้เขียนข้อมูลลง Sheet ของคุณ
            </div>
            <div>
              • หากใช้บัญชีองค์กร/สถานศึกษาแล้วขึ้น <strong>403 access_denied</strong> แนะนำให้ใช้วิธีที่ 1 (Apps Script Webhook) ด้านบนแทนได้เลย
            </div>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <label className="block font-semibold text-slate-700">
            ลิงก์หรือรหัส Google Sheet เดิม (เว้นว่างไว้เพื่อสร้างสเปรดชีตใหม่):
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={sheetUrlOrIdInput}
              onChange={(e) => setSheetUrlOrIdInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit (ไม่ใส่ = สร้างใหม่)"
              className="flex-1 p-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
            <button
              type="button"
              onClick={() => setConfirmAction('OAUTH')}
              disabled={isSyncingOAuth}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Table className="w-3.5 h-3.5" />
              <span>
                {isSyncingOAuth
                  ? 'กำลังส่งออก...'
                  : sheetUrlOrIdInput.trim()
                  ? 'อัปเดตลง Sheet ที่ระบุ'
                  : 'สร้าง Google Sheet ใหม่ + ซิงค์'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Method 3: Instant CSV download */}
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs">
          <div>
            <div className="font-bold text-slate-900">ส่งออกไฟล์ CSV (รองรับภาษาไทย UTF-8 BOM)</div>
            <div className="text-slate-500">
              ดาวน์โหลดฐานข้อมูลหลังบ้านทั้งหมดเป็นไฟล์ CSV เพื่อนำเข้า Google Sheets (File &gt; Import) หรือ Excel ได้ทันที
            </div>
          </div>
          <a
            href="/api/v1/integrations/sheets/csv"
            download
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold shrink-0"
          >
            <Download className="w-4 h-4 text-[#2563EB]" />
            <span>ดาวน์โหลด CSV หลังบ้าน</span>
          </a>
        </div>
      )}
    </div>
  );
};
