import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(dateObj);
}

export function formatShortDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const date = new Date(year, month, 1);
  const days: Date[] = [];

  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }

  return days;
}

export function getWeekDates(date: Date): Date[] {
  const week: Date[] = [];
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  startOfWeek.setDate(diff);

  for (let i = 0; i < 7; i++) {
    week.push(new Date(startOfWeek));
    startOfWeek.setDate(startOfWeek.getDate() + 1);
  }

  return week;
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

export function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate < today;
}

export function getStreakColor(streak: number): string {
  if (streak === 0) return 'text-gray-500';
  if (streak <= 3) return 'text-blue-500';
  if (streak <= 7) return 'text-green-500';
  if (streak <= 14) return 'text-yellow-500';
  if (streak <= 30) return 'text-orange-500';
  return 'text-red-500';
}

export function getCompletionPercentage(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function getGoalTypeLabel(goalType: string): string {
  switch (goalType) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    default:
      return goalType;
  }
}

export function getGoalTypeTarget(goalType: string, targetCount: number): string {
  switch (goalType) {
    case 'daily':
      return `${targetCount} time${targetCount !== 1 ? 's' : ''} per day`;
    case 'weekly':
      return `${targetCount} time${targetCount !== 1 ? 's' : ''} per week`;
    case 'monthly':
      return `${targetCount} time${targetCount !== 1 ? 's' : ''} per month`;
    default:
      return `${targetCount} times`;
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ─── Month / Week helpers (Monday-anchored, matches backend) ────────────────

/** Total number of Mon–Sun weeks that touch the given month. */
export function weeksInMonth(year: number, month: number): number {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  return Math.ceil((daysInMonth + ((firstDay + 6) % 7)) / 7)
}

/**
 * Returns the Monday–Sunday date range for a given weekOfMonth within a month.
 * Mirrors the backend `computeWeekDateRange` exactly.
 */
export function computeWeekDateRange(
  year: number,
  month: number,
  weekOfMonth: number,
): { start: Date; end: Date } {
  const firstOfMonth = new Date(year, month - 1, 1)
  const firstDayDow = firstOfMonth.getDay()
  const week1Monday =
    firstDayDow === 1
      ? firstOfMonth
      : new Date(year, month - 1, 1 + ((8 - firstDayDow) % 7))

  const weekStart = new Date(week1Monday)
  weekStart.setDate(week1Monday.getDate() + (weekOfMonth - 1) * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  return { start: weekStart, end: weekEnd }
}

/**
 * For a given year/month, returns how many weeks are still available and
 * what the first playable weekOfMonth number is.
 *
 * - Past months   → all weeks available (startWeek = 1)
 * - Future months → all weeks available (startWeek = 1)
 * - Current month → only weeks from the current week onward
 */
export function getRemainingWeeks(
  year: number,
  month: number,
): { count: number; startWeek: number } {
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1
  const total = weeksInMonth(year, month)

  // Not the current month → every week is available
  if (year !== curYear || month !== curMonth) {
    return { count: total, startWeek: 1 }
  }

  // Figure out which Monday-anchored week `now` falls in
  const firstOfMonth = new Date(year, month - 1, 1)
  const firstDayDow = firstOfMonth.getDay()
  const week1Monday =
    firstDayDow === 1
      ? firstOfMonth
      : new Date(year, month - 1, 1 + ((8 - firstDayDow) % 7))

  const msPerDay = 86_400_000
  const daysSinceWeek1 = Math.floor(
    (now.getTime() - week1Monday.getTime()) / msPerDay,
  )
  const currentWeek = Math.floor(daysSinceWeek1 / 7) + 1

  const startWeek = Math.max(1, Math.min(currentWeek, total))
  return { count: total - startWeek + 1, startWeek }
}