// lib/utils/dateHelper.ts

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