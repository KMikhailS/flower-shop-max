import React, { useEffect, useMemo, useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string; // YYYY-MM-DD
  initialTime?: string; // HH:MM
  onApply: (date: string, time: string) => void;
};

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

function toYMD(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function parseYMD(ymd: string): Date | null {
  // Expect YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const yyyy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateRu(ymd: string): string {
  const d = parseYMD(ymd);
  if (!d) return ymd;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

const DeliveryDateTimeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialDate,
  initialTime,
  onApply
}) => {
  const today = useMemo(() => startOfDay(new Date()), []);
  const maxDate = useMemo(() => addDays(today, 30), [today]); // next 30 days

  const [draftDate, setDraftDate] = useState<string>(initialDate || '');
  const [draftTime, setDraftTime] = useState<string>(initialTime || '');
  const [visibleMonth, setVisibleMonth] = useState<Date>(today);

  useEffect(() => {
    if (!isOpen) return;
    setDraftDate(initialDate || '');
    setDraftTime(initialTime || '');

    const initial = initialDate ? parseYMD(initialDate) : null;
    setVisibleMonth(initial || today);
  }, [isOpen, initialDate, initialTime, today]);

  const timeSlots = useMemo(() => {
    const startHour = 9;
    const endHour = 21;
    const stepMinutes = 30;
    const slots: string[] = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += stepMinutes) {
        if (hour === endHour && minute > 0) continue;
        const hh = String(hour).padStart(2, '0');
        const mm = String(minute).padStart(2, '0');
        slots.push(`${hh}:${mm}`);
      }
    }
    return slots;
  }, []);

  const calendarCells = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);

    // Convert JS day (0=Sun) to Monday-based index (0=Mon)
    const jsDay = firstOfMonth.getDay(); // 0..6
    const offset = (jsDay + 6) % 7; // Monday=0, Sunday=6

    const gridStart = addDays(startOfDay(firstOfMonth), -offset);
    const cells: Array<{
      ymd: string;
      day: number;
      inMonth: boolean;
      isDisabled: boolean;
      isToday: boolean;
    }> = [];

    for (let i = 0; i < 42; i++) {
      const d = addDays(gridStart, i);
      const ymd = toYMD(d);
      const inMonth = d.getMonth() === month;
      const isDisabled = d < today || d > maxDate;
      const isToday = toYMD(d) === toYMD(today);
      cells.push({ ymd, day: d.getDate(), inMonth, isDisabled, isToday });
    }

    return cells;
  }, [visibleMonth, today, maxDate]);

  const monthTitle = useMemo(() => {
    return visibleMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }, [visibleMonth]);

  const canGoPrev = useMemo(() => {
    // allow prev month only if it contains selectable days >= today
    const first = startOfDay(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1));
    return first > startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
  }, [visibleMonth, today]);

  const canGoNext = useMemo(() => {
    // allow next month only if maxDate is in a later month
    const firstNext = startOfDay(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1));
    const maxMonthFirst = startOfDay(new Date(maxDate.getFullYear(), maxDate.getMonth(), 1));
    return firstNext <= maxMonthFirst;
  }, [visibleMonth, maxDate]);

  const handleApply = () => {
    if (!draftDate || !draftTime) return;
    onApply(draftDate, draftTime);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] max-w-[402px] mx-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-40"
        onClick={onClose}
        role="button"
        aria-label="Close delivery date and time picker"
      />

      {/* Bottom sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] shadow-[0px_-6px_16px_rgba(0,0,0,0.15)]">
        <div className="px-6 pt-3 pb-4">
          <div className="flex justify-center">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-base font-bold text-black">Дата и время доставки</div>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-semibold text-black opacity-70 hover:opacity-100 transition-opacity"
            >
              Закрыть
            </button>
          </div>

          {/* Quick picks */}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => setDraftDate(toYMD(today))}
              className="px-3 py-2 rounded-[14px] bg-gray-light text-sm font-semibold text-black hover:opacity-80 transition-opacity"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={() => {
                const d = addDays(today, 1);
                if (d <= maxDate) setDraftDate(toYMD(d));
              }}
              className="px-3 py-2 rounded-[14px] bg-gray-light text-sm font-semibold text-black hover:opacity-80 transition-opacity"
            >
              Завтра
            </button>
          </div>

          {/* Month header */}
          <div className="flex items-center justify-between mt-5">
            <button
              type="button"
              disabled={!canGoPrev}
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
              className="w-10 h-10 rounded-full bg-gray-light text-black flex items-center justify-center disabled:opacity-40"
              aria-label="Previous month"
            >
              ‹
            </button>
            <div className="text-sm font-semibold text-black capitalize">{monthTitle}</div>
            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
              className="w-10 h-10 rounded-full bg-gray-light text-black flex items-center justify-center disabled:opacity-40"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 mt-3">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-xs font-semibold text-gray-500">
                {w}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 mt-2">
            {calendarCells.map((c) => {
              const isSelected = draftDate === c.ymd;
              const base =
                'h-9 rounded-[12px] text-sm font-semibold flex items-center justify-center transition-colors';

              if (c.isDisabled) {
                return (
                  <div
                    key={c.ymd}
                    className={`${base} text-gray-300 ${c.inMonth ? 'bg-white' : 'bg-white opacity-40'}`}
                  >
                    {c.day}
                  </div>
                );
              }

              return (
                <button
                  key={c.ymd}
                  type="button"
                  onClick={() => setDraftDate(c.ymd)}
                  className={[
                    base,
                    isSelected ? 'bg-teal text-white' : 'bg-white text-black hover:bg-gray-100',
                    !c.inMonth ? 'opacity-40' : '',
                    c.isToday && !isSelected ? 'ring-1 ring-teal ring-opacity-40' : ''
                  ].join(' ')}
                >
                  {c.day}
                </button>
              );
            })}
          </div>

          {/* Time */}
          <div className="mt-5">
            <div className="text-sm font-semibold text-black mb-2">Время доставки</div>
            <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1">
              {timeSlots.map((t) => {
                const isSelected = draftTime === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDraftTime(t)}
                    className={[
                      'py-2 rounded-[14px] text-xs font-semibold transition-colors',
                      isSelected ? 'bg-teal text-white' : 'bg-gray-light text-black hover:opacity-80'
                    ].join(' ')}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {draftDate ? formatDateRu(draftDate) : 'Дата не выбрана'}
              {draftTime ? `, ${draftTime}` : ''}
            </div>
            <button
              type="button"
              disabled={!draftDate || !draftTime}
              onClick={handleApply}
              className="px-5 py-3 rounded-[18px] bg-teal text-white text-sm font-semibold disabled:opacity-50"
            >
              Выбрать
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDateTimeModal;

