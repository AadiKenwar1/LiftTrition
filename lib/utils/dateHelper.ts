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

// Zero-pads a 1-2 digit number to 2 digits (e.g. 3 -> "03").
function pad(n: number): string {
    return String(n).padStart(2, '0')
}

/**
 * Get a date key in YYYY-MM-DD format using local timezone.
 * Builds the string arithmetically from LOCAL calendar components
 * (getFullYear/getMonth/getDate) rather than an Intl `toLocaleDateString`
 * call — this is a hot path (called per-row on date-bucketing/sort
 * comparisons) and arithmetic string building is 1-2 orders of magnitude
 * faster. Deliberately reads local components, not UTC (e.g. via
 * toISOString) — using UTC would shift the date onto the wrong calendar
 * day in negative-offset timezones. Output is byte-identical to the
 * previous `date.toLocaleDateString("en-CA")` for all real dates, which
 * matters because this key is persisted/synced (weight_progress.date,
 * nutrition_entries.date, settings.birth_date/onboarding_completed_at)
 * and compared against previously-stored keys.
 *
 * @param date - Date object to convert
 * @returns Date string in YYYY-MM-DD format (e.g., "2024-02-03")
 */
export function getDateKey(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Parse a YYYY-MM-DD date key back into a Date at local midnight.
 * This is the local-midnight inverse of getDateKey — use this instead of
 * `new Date(key)`, which parses as UTC and can land on the wrong calendar day.
 *
 * @param key - Date string in YYYY-MM-DD format (e.g., "2024-02-03")
 * @returns Date object at 00:00 local time on the given calendar date
 */
export function parseDateKey(key: string): Date {
    const [year, month, day] = key.split('-').map(Number)
    return new Date(year, month - 1, day)
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
 * Whole-year age on `today` (defaults to now); the month/day check handles
 * not-yet-reached birthdays.
 */
export function calculateAge(birthDate: Date, today: Date = new Date()): number {
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
    }
    return age
}

// Calendar-day difference (b − a). Both dates are taken at local midnight and
// the divide is rounded, so the ±1h a DST transition injects into a
// milliseconds difference can never drop or add a day.
export function daysBetween(a: Date, b: Date): number {
    const start = new Date(a.getFullYear(), a.getMonth(), a.getDate())
    const end = new Date(b.getFullYear(), b.getMonth(), b.getDate())
    return Math.round((end.getTime() - start.getTime()) / 86_400_000)
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
    
    const daysSinceOnboarding = daysBetween(onboardingDate, today);
    
    if (daysSinceOnboarding <= maxDays) {
      return onboardingDate;
    }
  }
  if (earliestDate) {
    // If earliest date is in the future, use today instead
    if (earliestDate > today) {
      return new Date(today);
    }
    
    const daysSinceFirstEntry = daysBetween(earliestDate, today);
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