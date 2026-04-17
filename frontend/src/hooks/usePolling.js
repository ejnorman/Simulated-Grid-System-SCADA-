/**
 * usePolling — runs a callback immediately and then on a fixed interval.
 * Uses a ref so the interval is not recreated when the callback identity changes.
 *
 * Usage:
 *   usePolling(fetchData);                    // uses REACT_APP_UPDATE_INTERVAL
 *   usePolling(fetchData, 5000);              // custom interval in ms
 */

import { useEffect, useRef } from 'react';

const DEFAULT_INTERVAL = parseInt(process.env.REACT_APP_UPDATE_INTERVAL || '2000', 10);

export default function usePolling(callback, interval = DEFAULT_INTERVAL) {
  const callbackRef = useRef(callback);

  // Keep ref current without restarting the interval
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    callbackRef.current();
    const id = setInterval(() => callbackRef.current(), interval);
    return () => clearInterval(id);
  }, [interval]);
}
