import { format, parseISO } from 'date-fns';

/**
 * Format currency in Indian Rupees
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date to readable format
 */
export function formatDate(date: string | Date, formatStr: string = 'dd MMM yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(date?: Date): string {
  const d = date || new Date();
  return format(d, 'yyyy-MM-dd');
}

/**
 * Format phone number (add spaces for readability)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as XXX-XXX-XXXX
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
}

/**
 * Calculate days since a date
 */
export function daysSince(date: string | Date): number {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get color class based on days pending
 */
export function getDaysPendingColor(days: number): string {
  if (days <= 3) return 'text-green-600';
  if (days <= 7) return 'text-yellow-600';
  if (days <= 14) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
