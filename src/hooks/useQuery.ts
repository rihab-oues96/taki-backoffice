"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/api";

export interface QueryState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  /** True while re-fetching with data already on screen. */
  refreshing: boolean;
  reload: () => Promise<void>;
  /** Update the cached value locally (optimistic updates, results of mutations). */
  setData: (updater: T | ((current: T | undefined) => T | undefined)) => void;
}

/**
 * Small data-fetching hook: loading / error / data, re-runs when `deps` change,
 * ignores responses that arrive after a newer request or after unmount.
 */
export function useQuery<T>(fetcher: (signal: AbortSignal) => Promise<T>, deps: unknown[]): QueryState<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const run = useCallback(async (initial: boolean) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const result = await fetcherRef.current(current.signal);
      if (current.signal.aborted) return;
      setDataState(result);
      setError(null);
    } catch (err) {
      if (current.signal.aborted) return;
      setError(errorMessage(err));
    } finally {
      if (!current.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    // Fetching is the external system this effect synchronises with; the loading flag is part of it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void run(true);
    return () => controller.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(() => run(false), [run]);
  const setData = useCallback<QueryState<T>["setData"]>((updater) => {
    setDataState((current) => (typeof updater === "function" ? (updater as (c: T | undefined) => T | undefined)(current) : updater));
  }, []);

  return { data, error, loading, refreshing, reload, setData };
}
