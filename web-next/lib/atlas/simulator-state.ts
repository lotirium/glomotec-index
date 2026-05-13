// Shared simulator lever store. Used by /atlas/simulator to drive its
// re-score pipeline, and by /atlas/rubric to drive the per-dimension
// cascade. Persisted to localStorage so a user editing levers on the
// simulator carries their state across to the rubric view.

import * as React from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import {
  DEFAULTS,
  type EnglishLevel,
  type LeverState,
  type ScopeRoute,
} from "@/lib/atlas/simulator-fixtures";

export const SIMULATOR_DEFAULTS: LeverState = DEFAULTS;
export const SIMULATOR_DEFAULT_SCOPE: ScopeRoute = "all";

interface SimulatorStore extends LeverState {
  /** Current simulator route scope. Drives the route-aware cascade : a
   *  cascade rule only fires when its applicableRoutes includes this
   *  scope. Defaults to "all". */
  scope: ScopeRoute;
  /** Replace a single lever value. Same callable shape as the existing
   *  setLever helper on the simulator view, kept stable so the migration
   *  is a one-line swap. */
  setLever: <K extends keyof LeverState>(key: K, value: LeverState[K]) => void;
  /** Replace the active route scope. The simulator's route picker
   *  writes through this. Backtest mode bypasses the store entirely. */
  setScope: (scope: ScopeRoute) => void;
  /** Replace all lever values at once. Used by Reset and any other
   *  bulk-update path (e.g. backtest mode if we later choose to commit a
   *  scenario into the live store). */
  setAll: (next: LeverState) => void;
  /** Restore all eight levers + scope to defaults. */
  reset: () => void;
  /** Returns true when every lever sits at its April 2026 default. */
  isAtDefaults: () => boolean;
}

export const useSimulatorState = create<SimulatorStore>()(
  persist(
    (set, get) => ({
      ...SIMULATOR_DEFAULTS,
      scope: SIMULATOR_DEFAULT_SCOPE,
      setLever: (key, value) => set({ [key]: value } as Partial<LeverState>),
      setScope: (scope) => set({ scope }),
      setAll: (next) => set(next),
      reset: () => set({ ...SIMULATOR_DEFAULTS, scope: SIMULATOR_DEFAULT_SCOPE }),
      isAtDefaults: () => {
        const current = get();
        return (
          current.isc === SIMULATOR_DEFAULTS.isc &&
          current.ihs === SIMULATOR_DEFAULTS.ihs &&
          current.cos === SIMULATOR_DEFAULTS.cos &&
          current.minSalary === SIMULATOR_DEFAULTS.minSalary &&
          current.englishLevel === SIMULATOR_DEFAULTS.englishLevel &&
          current.settlementYears === SIMULATOR_DEFAULTS.settlementYears &&
          current.ilrFee === SIMULATOR_DEFAULTS.ilrFee &&
          current.investorThreshold === SIMULATOR_DEFAULTS.investorThreshold &&
          current.scope === SIMULATOR_DEFAULT_SCOPE
        );
      },
    }),
    {
      name: "atlas-simulator-state",
      // Only persist the lever fields + scope, not the action functions.
      partialize: (state) => ({
        isc: state.isc,
        ihs: state.ihs,
        cos: state.cos,
        minSalary: state.minSalary,
        englishLevel: state.englishLevel,
        settlementYears: state.settlementYears,
        ilrFee: state.ilrFee,
        investorThreshold: state.investorThreshold,
        scope: state.scope,
      }),
    },
  ),
);

// Hook : returns true once the persisted state has rehydrated from
// localStorage in the browser. Use it to avoid SSR/CSR hydration
// mismatches when reading store values inside server-rendered client
// components. Always false on the server (no localStorage).
export function useSimulatorHasHydrated(): boolean {
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    const persistApi = useSimulatorState.persist;
    if (!persistApi) return;
    if (persistApi.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsubFinish = persistApi.onFinishHydration(() => setHydrated(true));
    return () => {
      unsubFinish();
    };
  }, []);
  return hydrated;
}

// Convenience : read the current LeverState as a plain object. Uses
// useShallow so callers that depend on the whole shape don't re-render
// on every unrelated store mutation.
export function useLeverState(): LeverState {
  return useSimulatorState(
    useShallow((s) => ({
      isc: s.isc,
      ihs: s.ihs,
      cos: s.cos,
      minSalary: s.minSalary,
      englishLevel: s.englishLevel,
      settlementYears: s.settlementYears,
      ilrFee: s.ilrFee,
      investorThreshold: s.investorThreshold,
    })),
  );
}

// Hook : selects the active scope from the store with primitive equality.
export function useSimulatorScope(): ScopeRoute {
  return useSimulatorState((s) => s.scope);
}

export type {
  EnglishLevel,
  LeverState,
  ScopeRoute,
} from "@/lib/atlas/simulator-fixtures";
