/** Remove non-digits from a phone string. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Brazilian landline (10) or mobile (11 digits, 9 after DDD). */
export function isValidBrPhone(value: string): boolean {
  const digits = phoneDigits(value);
  if (digits.length === 10) {
    return /^[1-9]\d[2-9]\d{7}$/.test(digits);
  }
  if (digits.length === 11) {
    return /^[1-9]\d9\d{8}$/.test(digits);
  }
  return false;
}

/** WhatsApp in Brazil expects a mobile number (11 digits). */
export function isValidBrMobile(value: string): boolean {
  const digits = phoneDigits(value);
  return digits.length === 11 && /^[1-9]\d9\d{8}$/.test(digits);
}

export function formatBrPhone(value: string): string {
  const digits = phoneDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
