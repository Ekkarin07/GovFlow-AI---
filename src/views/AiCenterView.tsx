import React, { useState } from 'react';
import { Sparkles, PlusCircle, AlertTriangle, CheckCircle2, Quote, ArrowRight, ShieldCheck } from 'lucide-react';
import { CaseRecord } from '../lib/types';

interface AiCenterViewProps {
  cases: CaseRecord[];
  onCreateTaskFromAi: (caseId: string, title: string, description: string) => Promise<void>;
}

export const AiCenterView: React.FC<AiCenterViewProps> = ({ cases, onCreateTaskFromAi }) => {
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || '');
  const [sourceText, setSourceText] = useState(
    'ด้วย กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม ได้มีหนังสือ ดศ 0204/ว 1148 ขอความร่วมมือให้หน่วยงานจัดกิจกรรมฝึกอบรมถ่ายทอดความรู้ด้านปัญญาประดิษฐ์ (AI) ในงานราชการ และจัดส่งรายงานสรุปผลการดำเนินงานพร้อมหลักฐานภาพถ่ายและแบบประเมินความพึงพอใจกลับมายังกระทรวงฯ ภายใน 30 วัน'
  );

  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [addedTasks, setAddedTasks] = useState<Record<number, boolean>>({});

  const handleAnalyze = async () => {
    setIsLoading(true);
    setAiResult(null);
    setAddedTasks({});

    try {
      const res = await fetch('/api/v1/ai/task-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText,
          caseTitle: cases.find((c) => c.id === selectedCaseId)?.title,
        }),
      });
      const data = await res.json();
      setAiResult(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async (idx: number, suggestion: any) => {
    await onCreateTaskFromAi(selectedCaseId, suggestion.title, suggestion.description);
    setAddedTasks((prev) => ({ ...prev, [idx]: true }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-[#6D28D9] text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          ศูนย์ปัญญาประดิษฐ์สารบรรณ (AI Intelligence Center)
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          วิเคราะห์ข้อกำหนดจากหนังสือราชการสู่ภารกิจดำเนินงาน
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          ระบบช่วยสกัดและเสนอแนะภารกิจที่ต้องปฏิบัติ พร้อมอ้างอิงข้อความจริง (Human-in-the-loop: เจ้าหน้าที่ตรวจยืนยันก่อนบันทึก)
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            เลือกเรื่องงานเป้าหมาย (Target Case):
          </label>
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="w-full text-xs sm:text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6D28D9]"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.code}] {c.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ข้อความจากหนังสือราชการต้นเรื่อง (Source Text for AI Extraction):
          </label>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={4}
            className="w-full text-xs sm:text-sm p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6D28D9] leading-relaxed"
            placeholder="วางข้อความจากหนังสือรับ หรือข้อสั่งการที่นี่..."
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>AI ทำงานภายใต้การควบคุม ไม่บันทึกข้อมูลจนกว่าจะได้รับการยืนยัน</span>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading || !sourceText.trim()}
            className="flex items-center gap-2 bg-[#6D28D9] hover:bg-purple-800 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-all"
          >
            <Sparkles className="w-4 h-4 text-[#FACC15]" />
            <span>{isLoading ? 'กำลังวิเคราะห์ข้อความ...' : 'วิเคราะห์และเสนอแนะภารกิจ'}</span>
          </button>
        </div>
      </div>

      {/* AI Extraction Results */}
      {aiResult && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 text-xs text-purple-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#6D28D9]" />
              <span>สรุปสาระสำคัญเชิงกลไก:</span>
            </div>
            <p className="leading-relaxed">{aiResult.summary}</p>
          </div>

          <h2 className="font-bold text-sm text-slate-900">
            ข้อเสนอแนะภารกิจ ({aiResult.suggestions?.length || 0} รายการ)
          </h2>

          <div className="space-y-3">
            {aiResult.suggestions?.map((sug: any, idx: number) => {
              const isAdded = addedTasks[idx];
              return (
                <div
                  key={idx}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-[#6D28D9] flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span>{sug.title}</span>
                    </h3>

                    <button
                      onClick={() => handleCreateTask(idx, sug)}
                      disabled={isAdded}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-[#6D28D9] hover:bg-purple-800 text-white shadow-xs'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>สร้างภารกิจแล้ว</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>ยืนยันสร้างภารกิจนี้</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{sug.description}</p>

                  {sug.sourceQuote && (
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-500 flex items-start gap-1.5">
                      <Quote className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-700">อ้างอิงจากต้นฉบับ:</span> "{sug.sourceQuote}"
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
