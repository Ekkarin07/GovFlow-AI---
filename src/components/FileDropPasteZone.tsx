import React, { useEffect, useRef, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, Trash2, ClipboardPaste, AlertTriangle } from 'lucide-react';
import { CaseAttachment } from '../lib/types';

interface FileDropPasteZoneProps {
  files: CaseAttachment[];
  onChange: (nextFiles: CaseAttachment[]) => void;
  multiple?: boolean;
  accept?: string;
  maxFileSizeBytes?: number;
  title?: string;
  subtitle?: string;
  enableGlobalPaste?: boolean;
  uploadedByName?: string;
}

const DEFAULT_MAX_BYTES = 15 * 1024 * 1024; // 15MB

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const FileDropPasteZone: React.FC<FileDropPasteZoneProps> = ({
  files,
  onChange,
  multiple = true,
  accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif,.xlsx,.xls,image/*,application/pdf',
  maxFileSizeBytes = DEFAULT_MAX_BYTES,
  title = 'ลากไฟล์มาวางที่นี่ เลือกไฟล์ หรือกด Ctrl+V เพื่อวางรูปภาพ',
  subtitle = 'รองรับรูปภาพ (PNG, JPG, WebP จากคลิปบอร์ด), PDF, Word (.doc/.docx), Excel ขนาดไม่เกิน 15MB/ไฟล์',
  enableGlobalPaste = true,
  uploadedByName,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const readFiles = async (incomingList: File[], sourceLabel?: string) => {
    setErrorMessage(null);
    if (!incomingList || incomingList.length === 0) return;

    const accepted: CaseAttachment[] = [];
    for (const file of incomingList) {
      if (file.size > maxFileSizeBytes) {
        setErrorMessage(`ไฟล์ "${file.name}" มีขนาดเกิน ${formatFileSize(maxFileSizeBytes)}`);
        continue;
      }

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const ext = file.type?.startsWith('image/') ? file.type.split('/')[1] || 'png' : 'bin';
      const fallbackName =
        file.name && file.name !== 'image.png'
          ? file.name
          : sourceLabel === 'paste'
          ? `pasted-image-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`
          : file.name || `attachment-${Date.now()}.${ext}`;

      accepted.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fileName: fallbackName,
        fileSizeBytes: file.size,
        mimeType: file.type || 'application/octet-stream',
        dataUrl,
        uploadedAt: new Date().toISOString(),
        uploadedByName,
      });
    }

    if (accepted.length > 0) {
      if (multiple) {
        onChange([...files, ...accepted]);
      } else {
        onChange([accepted[0]]);
      }
    }
  };

  const extractClipboardFiles = (clipboardData: DataTransfer | null): File[] => {
    if (!clipboardData) return [];
    const collected: File[] = [];
    if (clipboardData.items) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) collected.push(f);
        }
      }
    }
    if (collected.length === 0 && clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        collected.push(clipboardData.files[i]);
      }
    }
    return collected;
  };

  useEffect(() => {
    if (!enableGlobalPaste) return;
    const handleWindowPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      const pasted = extractClipboardFiles(e.clipboardData);
      if (pasted.length > 0) {
        if (isTextInput && pasted.every((f) => !f.type.startsWith('image/'))) return;
        e.preventDefault();
        readFiles(pasted, 'paste');
      }
    };
    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  });

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer?.files || []);
    if (dropped.length > 0) {
      readFiles(dropped, 'drop');
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const pasted = extractClipboardFiles(e.clipboardData);
    if (pasted.length > 0) {
      e.preventDefault();
      readFiles(pasted, 'paste');
    }
  };

  const handleRemove = (id: string) => {
    onChange(files.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-3" onPaste={handlePaste}>
      <div
        role="button"
        tabIndex={0}
        aria-label="พื้นที่วางไฟล์หรือเลือกรูปภาพและเอกสาร"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center space-y-3 transition-all cursor-pointer outline-none focus:ring-2 focus:ring-[#6D28D9] ${
          isDragging
            ? 'border-[#6D28D9] bg-purple-50 shadow-inner scale-[1.01]'
            : 'border-slate-300 bg-slate-50/60 hover:border-[#6D28D9] hover:bg-purple-50/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const picked = Array.from(e.target.files || []);
            if (picked.length > 0) {
              readFiles(picked, 'picker');
            }
            e.target.value = '';
          }}
        />

        <div className="p-3 bg-purple-100 text-[#6D28D9] w-fit mx-auto rounded-full">
          <Upload className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <div className="font-bold text-sm text-slate-800">{title}</div>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 bg-[#6D28D9] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs">
            <Upload className="w-3.5 h-3.5" />
            <span>เลือกไฟล์ / รูปภาพจากเครื่อง</span>
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium">
            <ClipboardPaste className="w-3.5 h-3.5 text-[#6D28D9]" />
            <span>กด Ctrl+V เพื่อวางภาพจากคลิปบอร์ดได้ทันที</span>
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700">
            ไฟล์ที่แนบแล้ว ({files.length} รายการ)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {files.map((f) => {
              const isImage = f.mimeType?.startsWith('image/') || f.dataUrl?.startsWith('data:image/');
              return (
                <div
                  key={f.id}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center gap-3 shadow-xs"
                >
                  {isImage ? (
                    <img
                      src={f.dataUrl}
                      alt={f.fileName}
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-purple-50 border border-purple-100 text-[#6D28D9] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-slate-900 truncate" title={f.fileName}>
                      {f.fileName}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{formatFileSize(f.fileSizeBytes)}</span>
                      <span className="inline-flex items-center gap-0.5 text-emerald-700 font-medium">
                        {isImage ? <ImageIcon className="w-3 h-3" /> : null}
                        พร้อมบันทึก
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(f.id)}
                    aria-label={`ลบไฟล์ ${f.fileName}`}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer shrink-0"
                    title="ลบไฟล์นี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
