import { useEffect } from 'react';

/**
 * Locks body scroll while `active` is true and restores previous value on cleanup.
 */
export const useLockBodyScroll = (active: boolean = true) => {
  useEffect(() => {
    if (!active) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);
};

export default useLockBodyScroll;







