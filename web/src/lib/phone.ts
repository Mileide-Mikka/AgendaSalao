/** Remove non-digits from a phone string. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidBrPhone(value: string): boolean {
  const digits = phoneDigits(value);
  if (digits.length === 10) return /^[1-9]\d[2-9]\d{7}$/.test(digits);
  if (digits.length === 11) return /^[1-9]\d9\d{8}$/.test(digits);
  return false;
}

export function isValidBrMobile(value: string): boolean {
  const digits = phoneDigits(value);
  return digits.length === 11 && /^[1-9]\d9\d{8}$/.test(digits);
}

export function isValidEmail(value: string): boolean {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function formatBrPhone(value: string): string {
  const digits = phoneDigits(value).slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
