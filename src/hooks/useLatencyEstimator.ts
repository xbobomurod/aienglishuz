import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "latency-samples-v1:";
const MAX_SAMPLES = 8;

type SampleMap = Record<string, number[]>;

const loadAll = (): SampleMap => {
  if (typeof window === "undefined") return {};
  const map: SampleMap = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(STORAGE_PREFIX)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) map[k.slice(STORAGE_PREFIX.length)] = arr.filter((n) => typeof n === "number");
    }
  } catch {
    /* ignore */
  }
  return map;
};

export interface LatencyEstimate {
  low: number;
  high: number;
  mean: number;
  samples: number;
  baseline: number;
}

/**
 * Lightweight latency learner. Persists the last N samples per key in localStorage and
 * returns a tightening estimated range that blends a baseline guess with observed history.
 *
 * - With 0 samples: returns ±35% range around baseline.
 * - With 1 sample: blends 60% sample / 40% baseline, ±25% range.
 * - With 2+ samples: uses sample mean and stddev, range = mean ± max(stddev, 8% of mean).
 */
export function useLatencyEstimator(namespace: string) {
  const [samples, setSamples] = useState<SampleMap>(() => loadAll());

  useEffect(() => {
    setSamples(loadAll());
  }, []);

  const fullKey = useCallback((key: string) => `${namespace}:${key}`, [namespace]);

  const record = useCallback(
    (key: string, ms: number) => {
      if (!Number.isFinite(ms) || ms <= 0) return;
      const k = fullKey(key);
      setSamples((prev) => {
        const next = [...(prev[k] || []), Math.round(ms)].slice(-MAX_SAMPLES);
        try {
          localStorage.setItem(STORAGE_PREFIX + k, JSON.stringify(next));
        } catch {
          /* ignore quota */
        }
        return { ...prev, [k]: next };
      });
    },
    [fullKey]
  );

  const estimate = useCallback(
    (key: string, baseline: number): LatencyEstimate => {
      const arr = samples[fullKey(key)] || [];
      const n = arr.length;
      if (n === 0) {
        return {
          low: Math.round(baseline * 0.65),
          high: Math.round(baseline * 1.35),
          mean: baseline,
          samples: 0,
          baseline,
        };
      }
      const mean = arr.reduce((s, v) => s + v, 0) / n;
      if (n === 1) {
        const blended = mean * 0.6 + baseline * 0.4;
        return {
          low: Math.round(blended * 0.75),
          high: Math.round(blended * 1.25),
          mean: Math.round(blended),
          samples: 1,
          baseline,
        };
      }
      const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
      const std = Math.sqrt(variance);
      const halfWidth = Math.max(std, mean * 0.08);
      return {
        low: Math.max(0, Math.round(mean - halfWidth)),
        high: Math.round(mean + halfWidth),
        mean: Math.round(mean),
        samples: n,
        baseline,
      };
    },
    [samples, fullKey]
  );

  const formatRange = useCallback((est: LatencyEstimate) => {
    const fmt = (ms: number) => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`);
    if (est.low === est.high) return fmt(est.mean);
    return `${fmt(est.low)}–${fmt(est.high)}`;
  }, []);

  return { record, estimate, formatRange };
}
