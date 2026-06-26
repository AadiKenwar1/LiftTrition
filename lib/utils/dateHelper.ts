// lib/utils/dateHelper.ts

/**
 * Returns true if the given date is after today (in the future).
 * Compares calendar dates only (ignores time).
 *
 * @param date - Date to check
 * @returns true if the date is after today
 */
export function isDateAfterToday(date: Date): boolean {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d.getTime() > today.getTime()
}

/**
 * Get a date key in YYYY-MM-DD format using local timezone
 * Uses en-CA locale which returns dates in ISO 8601 format
 * 
 * @param date - Date object to convert
 * @returns Date string in YYYY-MM-DD format (e.g., "2024-02-03")
 */
export function getDateKey(date: Date): string {
    return date.toLocaleDateString("en-CA");
}

/**
 * Format date and time for display (e.g., "Mar 5, 2:30 PM")
 *
 * @param date - Date object to format
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
}

/**
 * Returns "Today" if the date is today, otherwise formats the date (e.g., "Feb 3, 2024").
 *
 * @param date - Date object to format
 * @param showYear - Whether to include year for non-today dates
 * @returns Formatted date string or "Today"
 */
export function formatDateOrToday(date: Date, showYear: boolean = true): string {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (d.getTime() === today.getTime()) return 'Today'
    return formatDate(date, showYear)
}

/**
 * Format date for display (e.g., "Feb 3, 2024")
 * 
 * @param date - Date object to format
 * @returns Formatted date string
 */
export function formatDate(date: Date, showYear: boolean = true): string {
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        ...(showYear && { year: 'numeric' })
    });
}

/**
 * Format date string to minimal M/D format
 *
 * @param dateKey - Date string in YYYY-MM-DD format (e.g., "2024-01-15")
 * @returns Formatted date string in M/D format (e.g., "1/15")
 */
export function formatDateMinimal(dateKey: string): string {
    const [year, month, day] = dateKey.split('-');
    return `${parseInt(month)}/${parseInt(day)}`;
}

/**
 * Format a Date as M/D/YY (no leading zeros, 2-digit year), e.g. "6/22/26".
 *
 * @param date - Date object to format
 * @returns Formatted date string in M/D/YY format
 */
export function formatDateShort(date: Date): string {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear() % 100}`;
}

/**
 * Sort comparator for dates (most recent first)
 * 
 * @param a - First date
 * @param b - Second date
 * @returns Comparison result for sort
 */
export function sortByDateDesc(a: Date, b: Date): number {
    return b.getTime() - a.getTime();
}

/**
 * Returns a new Date offset by `n` days (positive or negative). Does not mutate the input.
 */
export function addDays(date: Date, n: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

/**
 * Returns the start (00:00 local) of the calendar week containing `date`.
 * weekStartsOn: 0 = Sunday (default), 1 = Monday.
 */
export function getWeekStart(date: Date, weekStartsOn: 0 | 1 = 0): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const diff = (d.getDay() - weekStartsOn + 7) % 7;
    d.setDate(d.getDate() - diff);
    return d;
}

/**
 * Single-letter weekday labels, Sunday-indexed (`Th` disambiguates Thursday from Tuesday).
 * Index with `date.getDay()`.
 */
export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'Th', 'F', 'S'] as const;

/** One day in a calendar-week graph series. */
export interface WeekDayPoint {
    day: string;
    value: number;
    dateKey: string;
    isFuture: boolean;
}

/**
 * Sort comparator for createdAt (most recently created first)
 */
export function sortByCreatedAtDesc<T extends { createdAt: Date }>(a: T, b: T): number {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

/**
 * Sort comparator for dates (oldest first)
 * 
 * @param a - First date
 * @param b - Second date
 * @returns Comparison result for sort
 */
export function sortByDateAsc(a: Date, b: Date): number {
    return a.getTime() - b.getTime();
}

/**
 * Calculates the start date for graph data based on onboarding date, earliest data date, and max days
 * 
 * @param today - Today's date (normalized to start of day)
 * @param maxDays - Maximum number of days to show
 * @param onboardingCompletedAt - Optional onboarding completion date
 * @param earliestDate - Optional earliest date with data
 * @param hasData - Whether any data exists
 * @returns Start date for the graph
 */
export function calculateStartDate(
  today: Date, 
  maxDays: number, 
  onboardingCompletedAt: Date | undefined, 
  earliestDate: Date | null, 
  hasData: boolean
): Date {
  if (onboardingCompletedAt) {
    const onboardingDate = new Date(onboardingCompletedAt);
    onboardingDate.setHours(0, 0, 0, 0);
    
    // If onboarding date is in the future, use today instead
    if (onboardingDate > today) {
      return new Date(today);
    }
    
    const daysSinceOnboarding = Math.floor((today.getTime() - onboardingDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceOnboarding <= maxDays) {
      return onboardingDate;
    }
  }
  if (earliestDate) {
    // If earliest date is in the future, use today instead
    if (earliestDate > today) {
      return new Date(today);
    }
    
    const daysSinceFirstEntry = Math.floor((today.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceFirstEntry < maxDays) {
      return earliestDate;
    }
  }
  
  // If no data exists, return today (show just today)
  if (!hasData) {
    return new Date(today);
  }
  
  // Default to last maxDays
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - maxDays);
  return startDate;
}