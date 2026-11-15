/**
 * GovFlow AI - Date and Thai Buddhist Era (พ.ศ.) Utilities
 * Ensures standard ISO storage while rendering accurate official Thai date formats.
 */

const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

/**
 * Converts CE year to Buddhist Era (BE) year (+543)
 */
export function toBuddhistYear(ceYear: number): number {
  return ceYear + 543;
}

/**
 * Converts BE year to CE year (-543)
 */
export function toCommonEraYear(beYear: number): number {
  return beYear - 543;
}

import { NumeralStyle } from './types';

const THAI_DIGITS = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
const ARABIC_DIGIT_BY_THAI: Record<string, string> = {
  '๐': '0',
  '๑': '1',
  '๒': '2',
  '๓': '3',
  '๔': '4',
  '๕': '5',
  '๖': '6',
  '๗': '7',
  '๘': '8',
  '๙': '9',
};

/**
 * Converts Arabic digits (0-9) to Thai numerals (๐-๙) while keeping email addresses and URLs intact.
 */
export function toThaiNumerals(input: string | number): string {
  const str = String(input ?? '');
  if (!str) return '';
  const protectedPattern = /(https?:\/\/[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  return str
    .split(protectedPattern)
    .map((part, idx) =>
      idx % 2 === 1 ? part : part.replace(/[0-9]/g, (d) => THAI_DIGITS[Number(d)])
    )
    .join('');
}

/**
 * Converts Thai numerals (๐-๙) to Arabic digits (0-9).
 */
export function toArabicNumerals(input: string | number): string {
  const str = String(input ?? '');
  if (!str) return '';
  return str.replace(/[๐-๙]/g, (ch) => ARABIC_DIGIT_BY_THAI[ch] ?? ch);
}

/**
 * Applies the selected numeral style ('THAI' | 'ARABIC') to text/numbers.
 * When style is undefined, returns the string unmodified for backward compatibility.
 */
export function applyNumeralStyle(
  input: string | number | undefined | null,
  numeralStyle?: NumeralStyle
): string {
  if (input === undefined || input === null) return '';
  const str = String(input);
  if (numeralStyle === 'THAI') return toThaiNumerals(str);
  if (numeralStyle === 'ARABIC') return toArabicNumerals(str);
  return str;
}

/**
 * Formats ISO date string (YYYY-MM-DD) into Official Thai Government format:
 * Example: "10 พฤศจิกายน 2569" or "๑๐ พฤศจิกายน ๒๕๖๙" when numeralStyle === 'THAI'
 */
export function formatOfficialThaiDate(isoDateStr?: string, numeralStyle?: NumeralStyle): string {
  if (!isoDateStr) return '-';
  const parts = isoDateStr.split('T')[0].split('-');
  if (parts.length !== 3) return applyNumeralStyle(isoDateStr, numeralStyle);
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 0 || month > 11) {
    return applyNumeralStyle(isoDateStr, numeralStyle);
  }
  
  const beYear = toBuddhistYear(year);
  return applyNumeralStyle(`${day} ${THAI_MONTHS_FULL[month]} ${beYear}`, numeralStyle);
}

/**
 * Formats ISO date with full "วันที่ ... เดือน ... พ.ศ. ..."
 */
export function formatFullThaiDateWithPrefix(isoDateStr?: string, numeralStyle?: NumeralStyle): string {
  if (!isoDateStr) return '-';
  const official = formatOfficialThaiDate(isoDateStr, numeralStyle);
  if (official === '-') return '-';
  return `วันที่ ${official}`;
}

/**
 * Formats ISO date or datetime to short Thai format: "10 พ.ย. 2569"
 */
export function formatShortThaiDate(isoDateStr?: string): string {
  if (!isoDateStr) return '-';
  const parts = isoDateStr.split('T')[0].split('-');
  if (parts.length !== 3) return isoDateStr;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 0 || month > 11) {
    return isoDateStr;
  }
  
  const beYear = toBuddhistYear(year);
  return `${day} ${THAI_MONTHS_SHORT[month]} ${beYear}`;
}

/**
 * Calculates if a given due date is overdue compared to reference date (default: today)
 */
export function isOverdue(dueDateStr?: string, referenceIsoDate?: string): boolean {
  if (!dueDateStr) return false;
  const due = dueDateStr.split('T')[0];
  const ref = referenceIsoDate ? referenceIsoDate.split('T')[0] : new Date().toISOString().split('T')[0];
  return due < ref;
}

/**
 * Calculates remaining days until due date
 */
export function daysRemaining(dueDateStr?: string, referenceIsoDate?: string): number {
  if (!dueDateStr) return 0;
  const due = new Date(dueDateStr.split('T')[0]);
  const ref = referenceIsoDate ? new Date(referenceIsoDate.split('T')[0]) : new Date(new Date().toISOString().split('T')[0]);
  const diffTime = due.getTime() - ref.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
