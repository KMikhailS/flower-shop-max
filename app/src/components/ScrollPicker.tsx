import React, { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  items: string[];
  value: string;
  onChange: (val: string) => void;
};

const ITEM_HEIGHT = 40;
const VISIBLE_COUNT = 5;
const CENTER_OFFSET = Math.floor(VISIBLE_COUNT / 2) * ITEM_HEIGHT; // 80px

const ScrollPicker: React.FC<Props> = ({ items, value, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);
  const startYRef = useRef(0);
  const startOffsetRef = useRef(0);
  const velocityRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animFrameRef = useRef(0);

  // offset = how far the list is shifted up (in px). 0 means first item is centered.
  const indexFromValue = items.indexOf(value);
  const initialOffset = (indexFromValue >= 0 ? indexFromValue : 0) * ITEM_HEIGHT;
  const [offset, setOffset] = useState(initialOffset);

  // Sync offset when value changes externally
  useEffect(() => {
    const idx = items.indexOf(value);
    if (idx >= 0) {
      setOffset(idx * ITEM_HEIGHT);
    }
  }, [items, value]);

  const clampOffset = useCallback(
    (o: number) => Math.max(0, Math.min(o, (items.length - 1) * ITEM_HEIGHT)),
    [items.length]
  );

  const snapTo = useCallback(
    (currentOffset: number) => {
      const idx = Math.round(currentOffset / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      const targetOffset = clamped * ITEM_HEIGHT;
      // Animate to snap position
      const startOffset = currentOffset;
      const diff = targetOffset - startOffset;
      const duration = 150; // ms
      const startTime = performance.now();

      const animateSnap = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out
        const eased = 1 - (1 - progress) * (1 - progress);
        const newOffset = startOffset + diff * eased;
        setOffset(newOffset);
        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animateSnap);
        } else {
          setOffset(targetOffset);
          if (items[clamped] !== value) {
            onChange(items[clamped]);
          }
        }
      };

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(animateSnap);
    },
    [items, value, onChange]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    scrollingRef.current = true;
    startYRef.current = e.clientY;
    startOffsetRef.current = offset;
    velocityRef.current = 0;
    lastYRef.current = e.clientY;
    lastTimeRef.current = Date.now();

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!scrollingRef.current) return;
    e.stopPropagation();

    const now = Date.now();
    const dt = now - lastTimeRef.current;
    const dy = e.clientY - lastYRef.current;
    if (dt > 0) {
      velocityRef.current = dy / dt; // px/ms, positive = finger moves down
    }
    lastYRef.current = e.clientY;
    lastTimeRef.current = now;

    const delta = startYRef.current - e.clientY; // positive = dragged up = offset increases
    const newOffset = clampOffset(startOffsetRef.current + delta);
    setOffset(newOffset);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!scrollingRef.current) return;
    e.stopPropagation();
    scrollingRef.current = false;

    // Inertia
    let v = -velocityRef.current * ITEM_HEIGHT * 0.4; // scale velocity
    let currentOffset = offset;
    const friction = 0.92;

    if (Math.abs(velocityRef.current) > 0.3) {
      const animateInertia = () => {
        if (Math.abs(v) < 0.5) {
          snapTo(currentOffset);
          return;
        }
        currentOffset = clampOffset(currentOffset + v * 0.016 * 60);
        v *= friction;
        setOffset(currentOffset);
        animFrameRef.current = requestAnimationFrame(animateInertia);
      };
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(animateInertia);
    } else {
      snapTo(offset);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const getItemStyle = (dist: number): React.CSSProperties => {
    const abs = Math.abs(dist);
    if (abs < 0.5) {
      return { fontSize: '22px', fontWeight: 700, color: '#3b6cb5', opacity: 1 };
    }
    if (abs < 1.5) {
      return { fontSize: '18px', fontWeight: 600, color: '#4a4a4a', opacity: 0.7 };
    }
    return { fontSize: '14px', fontWeight: 500, color: '#aaa', opacity: 0.4 };
  };

  // The translateY positions items so that selected one sits at center
  const translateY = CENTER_OFFSET - offset;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden relative"
      style={{
        height: VISIBLE_COUNT * ITEM_HEIGHT,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        style={{
          transform: `translateY(${translateY}px)`,
          willChange: 'transform',
        }}
      >
        {items.map((item, i) => {
          const itemCenter = i * ITEM_HEIGHT;
          const dist = (offset - itemCenter) / ITEM_HEIGHT;
          return (
            <div
              key={item}
              style={{
                height: ITEM_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...getItemStyle(dist),
              }}
            >
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScrollPicker;
