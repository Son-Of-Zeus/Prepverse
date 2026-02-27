import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useDebounce - Debounces a value by the specified delay
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedSearch - Debounced search with AbortController for race-condition safety
 *
 * Combines debouncing with request cancellation: when the user types a new
 * character, any in-flight request is aborted before the next one fires.
 * This guarantees results always match the latest query.
 *
 * @param fetchFn - Async function that accepts (query, signal) and returns results
 * @param delay - Debounce delay in ms (default: 300)
 * @param minLength - Minimum query length to trigger search (default: 2)
 */
export function useDebouncedSearch<T>(
  fetchFn: (query: string, signal: AbortSignal) => Promise<T>,
  delay: number = 300,
  minLength: number = 2
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncedQuery = useDebounce(query, delay);

  useEffect(() => {
    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (debouncedQuery.length < minLength) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    fetchFn(debouncedQuery, controller.signal)
      .then((data) => {
        // Only update if this request wasn't aborted
        if (!controller.signal.aborted) {
          setResults(data);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
          console.error('Search failed:', err);
          if (!controller.signal.aborted) {
            setResults(null);
          }
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, fetchFn, minLength]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setQuery('');
    setResults(null);
    setIsLoading(false);
  }, []);

  return { query, setQuery, results, setResults, isLoading, reset };
}

export default useDebounce;
