import { useRef, useCallback } from 'react';

/**
 * Custom React hook for continuous hold-to-repeat increment/decrement actions.
 * Triggers callback immediately on click/press, then repeats at specified intervals while held.
 */
export function useHoldToRepeat(callback, delay = 350, interval = 75) {
  const timerRef = useRef(null);
  const repeatRef = useRef(null);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  }, []);

  const start = useCallback((e) => {
    if (e && e.preventDefault && e.type !== 'touchstart') {
      // allow normal touch behavior if needed
    }
    // Perform initial click immediately
    callback();

    stop(); // clear any stale timers

    timerRef.current = setTimeout(() => {
      repeatRef.current = setInterval(() => {
        callback();
      }, interval);
    }, delay);
  }, [callback, delay, interval, stop]);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}

export default useHoldToRepeat;
