import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Download, FileText, CheckCircle2 } from 'lucide-react';
import { applyNumeralStyle, formatOfficialThaiDate } from '../lib/dateUtils';
import { DocumentFormData, DocumentType, OfficialTemplate } from '../lib/types';

interface A4DocumentPreviewProps {
  type: DocumentType;
  data: DocumentFormData;
  orgName: string;
  formatProfile?: OfficialTemplate['formatProfile'];
  onDownloadDocx?: () => void;
  onDownloadPdf?: () => void;
  isOfficialApproved?: boolean;
}

export const A4DocumentPreview: React.FC<A4DocumentPreviewProps> = ({
  type,
  data,
  orgName,
  formatProfile,
  onDownloadDocx,
  onDownloadPdf,
  isOfficialApproved = true,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(65);

  const fmt = (val?: string | number | null) => applyNumeralStyle(val, data.numeralStyle);
  const dateTh = formatOfficialThaiDate(data.documentDate, data.numeralStyle);

  // Official Thai Sarabun Margins (default: top 15mm from paper edge to Garuda, right 20mm, bottom 20mm, left 30mm)
  const marginTop = formatProfile?.marginsMm?.top ?? 15;
  const marginRight = formatProfile?.marginsMm?.right ?? 20;
  const marginBottom = formatProfile?.marginsMm?.bottom ?? 20;
  const marginLeft = formatProfile?.marginsMm?.left ?? 30;

  // Garuda Dimensions & Position (External Letter: 3cm x 2.7cm centered; Internal Memo: 1.5cm top-left)
  const garudaPosition =
    formatProfile?.garudaPosition ?? (type === 'INTERNAL_MEMO' ? 'LEFT' : 'CENTER');
  const garudaHeightMm =
    formatProfile?.garudaHeightMm ??
    (type === 'EXTERNAL_LETTER' ? 30 : type === 'INTERNAL_MEMO' ? 15 : 20);
  const garudaWidthMm = Number((garudaHeightMm * 0.9).toFixed(1));

  const bodyParagraphs = [
    data.backgroundParagraph,
    data.factsParagraph,
    data.proposalParagraph,
    data.objectiveParagraph,
    ...(data.customParagraphs || []),
  ]
    .filter((p): p is string => Boolean(p && p.trim()))
    .map((p) => fmt(p));

  const addressLines = (data.senderAddress || '')
    .split('\n')
    .map((l) => fmt(l.trim()))
    .filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-slate-200 rounded-xl overflow-hidden border border-slate-300 shadow-inner">
      {/* Preview Action Toolbar */}
      <div className="bg-slate-800 text-white px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-[#FACC15] shrink-0" />
          <span className="font-semibold text-slate-100 whitespace-nowrap">
            ตัวอย่างหน้ากระดาษ A4
          </span>
          {isOfficialApproved && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800 whitespace-nowrap shrink-0">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              ตรงตามเกณฑ์สารบรรณ
            </span>
          )}
        </div>

        {/* Zoom & Download controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center bg-slate-700 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(45, z - 10))}
              className="p-1 hover:bg-slate-600 rounded text-slate-200 cursor-pointer"
              title="ย่อขนาด"
              aria-label="ย่อขนาด"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-mono">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
              className="p-1 hover:bg-slate-600 rounded text-slate-200 cursor-pointer"
              title="ขยายขนาด"
              aria-label="ขยายขนาด"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(65)}
              className="p-1 hover:bg-slate-600 rounded text-slate-200 cursor-pointer ml-0.5"
              title="พอดีหน้าจอ"
              aria-label="พอดีหน้าจอ"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {onDownloadDocx && (
            <button
              type="button"
              onClick={onDownloadDocx}
              className="flex items-center gap-1 bg-[#2563EB] hover:bg-blue-700 text-white px-2.5 py-1 rounded text-xs font-medium cursor-pointer shadow-xs transition-colors whitespace-nowrap"
            >
              <Download className="w-3 h-3 shrink-0" />
              <span>Word (.docx)</span>
            </button>
          )}

          {onDownloadPdf && (
            <button
              type="button"
              onClick={onDownloadPdf}
              className="flex items-center gap-1 bg-[#6D28D9] hover:bg-purple-700 text-white px-2.5 py-1 rounded text-xs font-medium cursor-pointer shadow-xs transition-colors whitespace-nowrap"
            >
              <Download className="w-3 h-3 shrink-0" />
              <span>PDF (.pdf)</span>
            </button>
          )}
        </div>
      </div>

      {/* A4 Paper Viewport Container */}
      <div className="flex-1 overflow-auto p-4 sm:p-5">
        <div
          style={{
            width: `calc(210mm * ${zoomLevel / 100})`,
            height: `calc(297mm * ${zoomLevel / 100})`,
          }}
          className="relative mx-auto shrink-0"
        >
          <div
            data-testid="a4-document-sheet"
            data-doc-type={type}
            data-garuda-position={garudaPosition}
            data-numeral-style={data.numeralStyle || 'DEFAULT'}
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top left',
              transition: 'transform 0.15s ease-out',
              width: '210mm',
              minWidth: '210mm',
              minHeight: '297mm',
              paddingTop: `${marginTop}mm`,
              paddingRight: `${marginRight}mm`,
              paddingBottom: `${marginBottom}mm`,
              paddingLeft: `${marginLeft}mm`,
            }}
            className="bg-white text-black shadow-2xl rounded-xs border border-slate-300 font-sarabun font-normal text-[16pt] leading-[1.2] select-text box-border flex flex-col shrink-0"
          >
            {/* Confidentiality Header (if any) */}
            {data.confidentiality && (
              <div className="text-center font-bold text-[16pt] leading-tight mb-1">
                {data.confidentiality}
              </div>
            )}

            {type === 'EXTERNAL_LETTER' ? (
              /* ==================== หนังสือภายนอก (EXTERNAL_LETTER - PDF Pages 5, 6, 10, 11) ==================== */
              <>
                {/* 1. Garuda Emblem Row + Optional Speed Urgency in Red on Left */}
                <div
                  className={`relative flex ${
                    garudaPosition === 'LEFT' ? 'justify-start' : 'justify-center'
                  }`}
                  style={{ minHeight: `${garudaHeightMm}mm` }}
                >
                  <img
                    src="/assets/garuda.png"
                    alt="ตราครุฑ"
                    style={{ width: `${garudaWidthMm}mm`, height: `${garudaHeightMm}mm` }}
                    className="object-contain select-none"
                  />
                  {garudaPosition === 'CENTER' && data.urgency && data.urgency !== 'ปกติ' && (
                    <div className="absolute left-0 bottom-0 font-bold text-[20pt] leading-[1.1] text-[#DC2626]">
                      {data.urgency}
                    </div>
                  )}
                </div>

                {garudaPosition === 'LEFT' && data.urgency && data.urgency !== 'ปกติ' && (
                  <div className="font-bold text-[20pt] leading-[1.1] mt-1 text-[#DC2626]">{data.urgency}</div>
                )}

                {/* 2. Top-Left "ที่ ..." and Top-Right "ส่วนราชการเจ้าของหนังสือ / ที่ตั้ง" (16pt regular) */}
                <div className="flex items-start mt-1.5 text-[16pt] font-normal">
                  <div className="w-[58%] pr-3">
                    <span>ที่  </span>
                    <span>{fmt(data.officialReferenceNo)}</span>
                  </div>
                  <div className="w-[42%] leading-[1.2]">
                    <div>{fmt(data.agency || orgName)}</div>
                    {addressLines.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                </div>

                {/* 3. Date Row (NO "วันที่" word — centered-right at ~43% from left) */}
                <div className="ml-[43%] mt-2 mb-2">
                  {dateTh !== '-' ? dateTh : '........................................'}
                </div>

                {/* 4. เรื่อง / คำขึ้นต้น / อ้างถึง / สิ่งที่ส่งมาด้วย */}
                <div className="mb-1.5 flex items-baseline">
                  <span className="shrink-0 mr-2">เรื่อง</span>
                  <span>{fmt(data.subject)}</span>
                </div>

                <div className="mb-1.5 flex items-baseline">
                  <span className="shrink-0 mr-2">{data.salutation || 'เรียน'}</span>
                  <span>{fmt(data.recipient)}</span>
                </div>

                {data.references && data.references.length > 0 && (
                  <div className="mb-1.5 space-y-0.5">
                    {data.references.map((ref, idx) => (
                      <div key={ref.id || idx} className="flex items-baseline">
                        <span className="shrink-0 mr-2">
                          {idx === 0 ? 'อ้างถึง' : '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
                        </span>
                        <span>
                          {fmt(ref.bookType)} ที่ {fmt(ref.bookNo)} ลงวันที่{' '}
                          {formatOfficialThaiDate(ref.bookDate, data.numeralStyle)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {data.enclosures && data.enclosures.length > 0 && (
                  <div className="mb-2 space-y-0.5">
                    {data.enclosures.map((enc, idx) => (
                      <div key={enc.id || idx} className="flex items-baseline justify-between gap-2">
                        <div className="flex items-baseline">
                          <span className="shrink-0 mr-2">
                            {idx === 0
                              ? 'สิ่งที่ส่งมาด้วย'
                              : '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
                          </span>
                          <span>{fmt(enc.title)}</span>
                        </div>
                        <span className="shrink-0">
                          จำนวน {fmt(enc.quantity)} {fmt(enc.unit)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 5. Body Paragraphs with Official 2.5 cm First-Line Indent (16pt regular) */}
                <div className="space-y-1.5 mt-1.5 text-left text-[16pt] font-normal leading-[1.2]">
                  {bodyParagraphs.map((p, i) => (
                    <p key={i} className="indent-[25mm]">
                      {p}
                    </p>
                  ))}
                </div>

                {/* 6. Closing & Signature Block (Right column, 16pt regular, no "ตำแหน่ง" prefix per Page 5-6) */}
                <div className="mt-7 ml-[42%] w-[58%] text-center text-[16pt] font-normal leading-[1.2]">
                  <div>{data.valediction || 'ขอแสดงความนับถือ'}</div>
                  <div className="h-[14mm]" />
                  <div>( {fmt(data.signerName) || '...................................................'} )</div>
                  <div>{fmt(data.signerPosition) || '...................................................'}</div>
                </div>

                {/* 7. Bottom-Left Owning Agency Contact Block (16pt regular per Pages 5, 6, 10, 11) */}
                {(data.contactDepartment ||
                  data.contactPhone ||
                  data.contactFax ||
                  data.contactEmail ||
                  data.coordinatorPhone ||
                  data.coordinatorName) && (
                  <div className="mt-auto pt-6 text-left text-[16pt] font-normal leading-[1.2]">
                    {(data.contactDepartment || data.agency) && (
                      <div>{fmt(data.contactDepartment || data.agency)}</div>
                    )}
                    {(data.contactPhone || data.coordinatorPhone) && (
                      <div>โทร. {fmt(data.contactPhone || data.coordinatorPhone)}</div>
                    )}
                    {data.contactFax && <div>โทรสาร {fmt(data.contactFax)}</div>}
                    {data.contactEmail && <div>ไปรษณีย์อิเล็กทรอนิกส์ {data.contactEmail}</div>}
                    {data.coordinatorName && !data.contactDepartment && (
                      <div>ผู้ประสานงาน: {fmt(data.coordinatorName)}</div>
                    )}
                  </div>
                )}
              </>
            ) : type === 'INTERNAL_MEMO' ? (
              /* ==================== บันทึกข้อความ / หนังสือภายใน (INTERNAL_MEMO - PDF Pages 14, 15) ==================== */
              <>
                {/* 1. Header: Garuda Top-Left (1.5cm) or Centered (if customized) + "บันทึกข้อความ" 29pt Bold */}
                {garudaPosition === 'LEFT' ? (
                  <div
                    className="relative flex items-end justify-center mb-2"
                    style={{ minHeight: `${Math.max(garudaHeightMm, 16)}mm` }}
                  >
                    <img
                      src="/assets/garuda.png"
                      alt="ตราครุฑ"
                      style={{ width: `${garudaWidthMm}mm`, height: `${garudaHeightMm}mm` }}
                      className="absolute left-0 top-0 object-contain select-none"
                    />
                    <div className="text-center font-bold text-[29pt] leading-none pb-0.5">
                      บันทึกข้อความ
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center mb-2">
                    <img
                      src="/assets/garuda.png"
                      alt="ตราครุฑ"
                      style={{ width: `${garudaWidthMm}mm`, height: `${garudaHeightMm}mm` }}
                      className="object-contain select-none mb-1"
                    />
                    <div className="text-center font-bold text-[29pt] leading-tight">
                      บันทึกข้อความ
                    </div>
                  </div>
                )}

                {data.urgency && data.urgency !== 'ปกติ' && (
                  <div className="font-bold text-[20pt] leading-tight mb-1 text-[#DC2626]">{data.urgency}</div>
                )}

                {/* 2. ส่วนราชการ (Label 20pt Bold ONLY, Value 16pt Regular) */}
                <div className="mb-1 flex items-baseline">
                  <span className="font-bold text-[20pt] leading-[1.15] mr-2 shrink-0">ส่วนราชการ</span>
                  <span className="text-[16pt] font-normal">{fmt(data.agency || orgName)}</span>
                </div>

                {/* 3. ที่ (Label 20pt Bold ONLY, Value 16pt Regular) and วันที่ (Label 20pt Bold ONLY, Value 16pt Regular) */}
                <div className="flex items-baseline mb-1">
                  <div className="w-[52%] pr-2 flex items-baseline">
                    <span className="font-bold text-[20pt] leading-[1.15] mr-2 shrink-0">ที่</span>
                    <span className="text-[16pt] font-normal">{fmt(data.officialReferenceNo)}</span>
                  </div>
                  <div className="w-[48%] flex items-baseline">
                    <span className="font-bold text-[20pt] leading-[1.15] mr-3 shrink-0">วันที่</span>
                    <span className="text-[16pt] font-normal">
                      {dateTh !== '-' ? dateTh : '...................................................'}
                    </span>
                  </div>
                </div>

                {/* 4. เรื่อง (Label 20pt Bold ONLY, Value 16pt Regular) */}
                <div className="mb-1.5 flex items-baseline">
                  <span className="font-bold text-[20pt] leading-[1.15] mr-2 shrink-0">เรื่อง</span>
                  <span className="text-[16pt] font-normal">{fmt(data.subject)}</span>
                </div>

                {/* 5. เรียน (16pt Regular per PDF Page 14) */}
                <div className="mb-2 flex items-baseline text-[16pt] font-normal">
                  <span className="mr-2 shrink-0">{data.salutation || 'เรียน'}</span>
                  <span>{fmt(data.recipient)}</span>
                </div>

                {/* References & Enclosures (16pt Regular) */}
                {data.references && data.references.length > 0 && (
                  <div className="mb-2 space-y-0.5 text-[16pt] font-normal">
                    {data.references.map((ref, idx) => (
                      <div key={ref.id || idx} className="flex items-baseline">
                        <span className="mr-2 shrink-0">
                          {idx === 0 ? 'อ้างถึง' : '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
                        </span>
                        <span>
                          {fmt(ref.bookType)} ที่ {fmt(ref.bookNo)} ลงวันที่{' '}
                          {formatOfficialThaiDate(ref.bookDate, data.numeralStyle)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {data.enclosures && data.enclosures.length > 0 && (
                  <div className="mb-2 space-y-0.5 text-[16pt] font-normal">
                    {data.enclosures.map((enc, idx) => (
                      <div key={enc.id || idx} className="flex items-baseline justify-between gap-2">
                        <div className="flex items-baseline">
                          <span className="mr-2 shrink-0">
                            {idx === 0
                              ? 'สิ่งที่ส่งมาด้วย'
                              : '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
                          </span>
                          <span>{fmt(enc.title)}</span>
                        </div>
                        <span className="shrink-0">
                          จำนวน {fmt(enc.quantity)} {fmt(enc.unit)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 6. Body Paragraphs with Exact 2.5cm Indents (16pt Regular) */}
                <div className="space-y-1.5 text-left text-[16pt] font-normal leading-[1.2]">
                  {bodyParagraphs.map((p, i) => (
                    <p key={i} className="indent-[25mm]">
                      {p}
                    </p>
                  ))}
                </div>

                {/* 7. Signature Block (16pt Regular) */}
                <div className="mt-14 ml-[42%] w-[58%] text-center text-[16pt] font-normal leading-[1.2]">
                  <div className="mb-1">(ลงชื่อ)...................................................</div>
                  <div>( {fmt(data.signerName) || '...................................................'} )</div>
                  <div>
                    ตำแหน่ง {fmt(data.signerPosition) || '...................................................'}
                  </div>
                </div>

                {/* 8. Coordinator Contact Block (Bottom-Left, 16pt Regular matching real memo sample) */}
                {(data.coordinatorName || data.coordinatorPhone) && (
                  <div className="mt-auto pt-8 text-left text-[16pt] font-normal text-black leading-[1.2]">
                    <div>เบอร์โทรติดต่อผู้ประสานงาน</div>
                    {data.coordinatorPhone && <div>เบอร์โทรศัพท์ {fmt(data.coordinatorPhone)}</div>}
                    {data.coordinatorName && <div>{fmt(data.coordinatorName)}</div>}
                  </div>
                )}
              </>
            ) : (
              /* ==================== รายงานสรุปผลการปฏิบัติงาน (COMPLETION_REPORT) ==================== */
              <>
                <div
                  className={`flex flex-col ${
                    garudaPosition === 'LEFT' ? 'items-start' : 'items-center'
                  } mb-3`}
                >
                  <img
                    src="/assets/garuda.png"
                    alt="ตราครุฑ"
                    style={{ width: `${garudaWidthMm}mm`, height: `${garudaHeightMm}mm` }}
                    className="object-contain select-none mb-1.5"
                  />
                  <div className="text-center font-bold text-[24pt] leading-tight w-full">
                    รายงานสรุปผลการปฏิบัติงาน
                  </div>
                </div>

                {data.urgency && data.urgency !== 'ปกติ' && (
                  <div className="font-bold text-[20pt] leading-tight mb-1 text-[#DC2626]">{data.urgency}</div>
                )}

                <div className="mb-1 flex items-baseline">
                  <span className="font-bold text-[20pt] leading-[1.15] mr-2 shrink-0">ส่วนราชการ</span>
                  <span className="text-[16pt] font-normal">{fmt(data.agency || orgName)}</span>
                </div>
                <div className="flex items-baseline mb-1">
                  <div className="w-[52%] pr-2 flex items-baseline">
                    <span className="font-bold text-[20pt] leading-[1.15] mr-2 shrink-0">ที่</span>
                    <span className="text-[16pt] font-normal">{fmt(data.officialReferenceNo)}</span>
                  </div>
                  <div className="w-[48%] flex items-baseline">
                    <span className="font-bold text-[20pt] leading-[1.15] mr-3 shrink-0">วันที่</span>
                    <span className="text-[16pt] font-normal">{dateTh !== '-' ? dateTh : ''}</span>
                  </div>
                </div>
                <div className="mb-1.5 flex items-baseline">
                  <span className="font-bold text-[20pt] leading-[1.15] mr-2 shrink-0">เรื่อง</span>
                  <span className="text-[16pt] font-normal">{fmt(data.subject)}</span>
                </div>
                <div className="mb-3 flex items-baseline text-[16pt] font-normal">
                  <span className="mr-2 shrink-0">{data.salutation || 'เรียน'}</span>
                  <span>{fmt(data.recipient)}</span>
                </div>

                <div className="space-y-1.5 text-left text-[16pt] font-normal leading-[1.2]">
                  {bodyParagraphs.map((p, i) => (
                    <p key={i} className="indent-[25mm]">
                      {p}
                    </p>
                  ))}
                </div>

                <div className="mt-14 ml-[46%] w-[54%] text-center text-[16pt] font-normal leading-[1.2]">
                  <div className="mb-1">(ลงชื่อ)...................................................</div>
                  <div>( {fmt(data.signerName) || '...................................................'} )</div>
                  <div>
                    ตำแหน่ง {fmt(data.signerPosition) || '...................................................'}
                  </div>
                </div>
              </>
            )}

            {/* Confidentiality Footer (if any) */}
            {data.confidentiality && (
              <div className="mt-auto pt-4 text-center font-bold text-[16pt] leading-tight">
                {data.confidentiality}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
