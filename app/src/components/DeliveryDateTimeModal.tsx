import React, { useEffect, useMemo, useRef, useState } from 'react';
import ScrollPicker from './ScrollPicker';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string; // YYYY-MM-DD
  initialTime?: string; // HH:MM
  workTimeFrom?: string; // hour boundary (0..23), empty -> 24/7
  workTimeTo?: string; // hour boundary (1..24), empty -> 24/7
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

function addMonths(d: Date, months: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
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
  workTimeFrom,
  workTimeTo,
  onApply
}) => {
  const today = useMemo(() => startOfDay(new Date()), []);
  const maxDate = useMemo(() => startOfDay(addMonths(today, 3)), [today]); // next 3 months

  const [draftDate, setDraftDate] = useState<string>(initialDate || '');
  const [draftHour, setDraftHour] = useState<string>('');
  const [draftMinute, setDraftMinute] = useState<string>('');
  const [visibleMonth, setVisibleMonth] = useState<Date>(today);
  const [dragY, setDragY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const hourOptions = useMemo(() => {
    const wtFrom = (workTimeFrom || '').trim();
    const wtTo = (workTimeTo || '').trim();

    const options: string[] = [];

    // If at least one of settings is empty -> 24/7
    if (!wtFrom || !wtTo) {
      for (let h = 0; h <= 23; h++) {
        options.push(String(h).padStart(2, '0'));
      }
      return options;
    }

    const fromNum = Number(wtFrom);
    const toNum = Number(wtTo);
    const isValid =
      Number.isInteger(fromNum) &&
      Number.isInteger(toNum) &&
      fromNum >= 0 &&
      fromNum <= 23 &&
      toNum >= 1 &&
      toNum <= 24 &&
      fromNum < toNum;

    if (!isValid) {
      for (let h = 0; h <= 23; h++) {
        options.push(String(h).padStart(2, '0'));
      }
      return options;
    }

    for (let h = fromNum; h <= toNum - 1; h++) {
      options.push(String(h).padStart(2, '0'));
    }
    return options;
  }, [workTimeFrom, workTimeTo]);

  const minuteOptions = useMemo(() => {
    const options: string[] = [];
    for (let m = 0; m <= 55; m += 5) {
      options.push(String(m).padStart(2, '0'));
    }
    return options;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setDraftDate(initialDate || '');
    const m = initialTime ? /^(\d{2}):(\d{2})$/.exec(initialTime) : null;
    setDraftHour(m ? m[1] : hourOptions[0] || '');
    setDraftMinute(m ? m[2] : minuteOptions[0] || '');

    const initial = initialDate ? parseYMD(initialDate) : null;
    setVisibleMonth(initial || today);

    // Reset drag state on each open (component isn't unmounted when isOpen=false)
    setDragY(0);
    setIsDragging(false);
    pointerIdRef.current = null;
    dragStartYRef.current = null;
  }, [isOpen, initialDate, initialTime, today, hourOptions, minuteOptions]);

  // Prevent mini app from being closed by vertical swipe while bottom sheet is open
  useEffect(() => {
    if (!isOpen) return;
    const tg = window.WebApp;
    tg?.disableVerticalSwipes?.();
    return () => {
      tg?.enableVerticalSwipes?.();
    };
  }, [isOpen]);

  // Block touch events that would cause overscroll (and trigger host app close),
  // but allow normal content scrolling inside the sheet
  useEffect(() => {
    if (!isOpen) return;
    const el = sheetRef.current;
    if (!el) return;

    const contentEl = el.querySelector('[data-scroll-content]') as HTMLElement | null;

    const blockOverscroll = (e: TouchEvent) => {
      if (!contentEl) {
        e.preventDefault();
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = contentEl;
      const touch = e.touches[0];
      if (!touch) return;

      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight;

      // Determine scroll direction from the touch movement
      const startY = (blockOverscroll as any)._lastY ?? touch.clientY;
      const dy = touch.clientY - startY;
      (blockOverscroll as any)._lastY = touch.clientY;

      // Block if trying to scroll past boundaries (overscroll)
      if ((isAtTop && dy > 0) || (isAtBottom && dy < 0)) {
        e.preventDefault();
      }
    };

    const resetLastY = (e: TouchEvent) => {
      (blockOverscroll as any)._lastY = e.touches[0]?.clientY;
    };

    el.addEventListener('touchstart', resetLastY, { passive: true });
    el.addEventListener('touchmove', blockOverscroll, { passive: false });
    return () => {
      el.removeEventListener('touchstart', resetLastY);
      el.removeEventListener('touchmove', blockOverscroll);
    };
  }, [isOpen]);

  const isValidHour = !!draftHour && hourOptions.includes(draftHour);
  const isValidMinute = !!draftMinute && minuteOptions.includes(draftMinute);
  const draftTime = isValidHour && isValidMinute ? `${draftHour}:${draftMinute}` : '';

  // If initialTime or existing selection is outside available options, clear it
  useEffect(() => {
    if (!isOpen) return;
    if (draftHour && !hourOptions.includes(draftHour)) setDraftHour('');
    if (draftMinute && !minuteOptions.includes(draftMinute)) setDraftMinute('');
  }, [isOpen, draftHour, draftMinute, hourOptions, minuteOptions]);

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only start drag on primary button for mouse
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    pointerIdRef.current = e.pointerId;
    dragStartYRef.current = e.clientY;
    setIsDragging(true);
    setDragY(0);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (pointerIdRef.current !== e.pointerId) return;
    if (dragStartYRef.current === null) return;

    const delta = e.clientY - dragStartYRef.current;
    const clamped = Math.max(0, Math.min(delta, 700));
    setDragY(clamped);
  };

  const handleDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;

    const shouldClose = dragY >= 120;
    setIsDragging(false);
    pointerIdRef.current = null;
    dragStartYRef.current = null;

    if (shouldClose) {
      // Prevent "double tap to open" issues after swipe-close (e.g. focused input/keyboard)
      try {
        const active = document.activeElement;
        if (active && active instanceof HTMLElement) active.blur();
      } catch {
        // ignore
      }
      onClose();
      return;
    }
    setDragY(0);
  };

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

  const sheetStyle: React.CSSProperties = {
    transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
    transition: isDragging ? 'none' : 'transform 200ms ease-out'
  };

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
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] shadow-[0px_-6px_16px_rgba(0,0,0,0.15)] max-h-[92vh] overflow-hidden select-none"
        style={{ ...sheetStyle, touchAction: 'none' }}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
      >
        <div data-scroll-content className="px-6 pt-6 pb-4 overflow-y-auto max-h-[92vh]">
          <div className="flex justify-center py-2">
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

          {/* Time — scroll picker */}
          <div className="mt-5">
            <div className="text-sm font-semibold text-black mb-2">Время доставки</div>
            <div
              className="relative rounded-[16px] bg-gray-light overflow-hidden"
              style={{ height: 200 }}
            >
              {/* White highlight band in center */}
              <div
                className="absolute left-0 right-0 pointer-events-none rounded-[12px] bg-white"
                style={{ top: 80, height: 40, zIndex: 1 }}
              />
              <div className="flex h-full relative" style={{ zIndex: 2 }}>
                <ScrollPicker
                  items={hourOptions}
                  value={draftHour}
                  onChange={setDraftHour}
                />
                <ScrollPicker
                  items={minuteOptions}
                  value={draftMinute}
                  onChange={setDraftMinute}
                />
              </div>
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

