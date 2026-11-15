import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const dim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';

  return (
    <div className="flex items-center gap-3">
      {/* High-definition Vector Emblem */}
      <div
        className={`${dim} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#6D28D9] via-[#4C1D95] to-[#1E3A8A] p-2 shadow-md border border-purple-400/30 overflow-hidden shrink-0`}
      >
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-radial from-yellow-400/20 to-transparent pointer-events-none" />

        {/* Vector Garuda/Emblem Monogram */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full text-yellow-300 drop-shadow-sm fill-current"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Stylized crown / wings / flow */}
          <path d="M50 8 L58 28 L80 18 L68 38 L92 38 L72 54 L88 74 L62 68 L50 94 L38 68 L12 74 L28 54 L8 38 L32 38 L20 18 L42 28 Z" />
          <circle cx="50" cy="50" r="10" fill="#FACC15" />
          <path d="M46 47 L50 42 L54 47 L50 58 Z" fill="#6D28D9" />
        </svg>
      </div>

      {showText && (
        <div>
          <div className="font-bold text-base tracking-wide flex items-center gap-1.5 text-white">
            <span>GovFlow</span>
            <span className="text-[#FACC15] text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-400/20 border border-yellow-400/40">
              AI v1.1
            </span>
          </div>
          <p className="text-[11px] text-purple-200 font-medium">From Documents to Done.</p>
        </div>
      )}
    </div>
  );
};
