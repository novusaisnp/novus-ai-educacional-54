import { format } from 'date-fns';

export type CalendarExceptionType = 'feriado' | 'recesso' | 'reposicao';

export interface SchoolPeriodRange {
  date_start: string;
  date_end: string;
  active: boolean;
}

export interface CalendarExceptionDay {
  date: string;
  type: CalendarExceptionType;
}

function toDateOnly(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function isWithinAnyActivePeriod(date: Date, periods: SchoolPeriodRange[]): boolean {
  const iso = toDateOnly(date);
  return periods.some((period) => period.active && iso >= period.date_start && iso <= period.date_end);
}

export function findExceptionForDate(date: Date, exceptions: CalendarExceptionDay[]): CalendarExceptionDay | undefined {
  const iso = toDateOnly(date);
  return exceptions.find((exception) => exception.date === iso);
}

export function isSchoolDay(
  date: Date,
  periods: SchoolPeriodRange[],
  exceptions: CalendarExceptionDay[]
): boolean {
  if (!isWithinAnyActivePeriod(date, periods)) return false;

  const exception = findExceptionForDate(date, exceptions);
  if (exception) return exception.type === 'reposicao';

  const weekday = date.getDay();
  return weekday !== 0 && weekday !== 6;
}
