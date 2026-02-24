"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type StateCode = "IL" | "IN";

const STORAGE_KEY = "nxtstps_selected_state";

function readStoredState(): StateCode {
  if (typeof window === "undefined") return "IL";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "IN" || v === "IL") return v;
  } catch {}
  return "IL";
}

type StateContextValue = {
  stateCode: StateCode;
  setStateCode: (s: StateCode) => void;
};

const StateContext = createContext<StateContextValue | null>(null);

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [stateCode, setStateCodeState] = useState<StateCode>("IL");

  useEffect(() => {
    setStateCodeState(readStoredState());
  }, []);

  const setStateCode = useCallback((s: StateCode) => {
    setStateCodeState(s);
    try {
      localStorage.setItem(STORAGE_KEY, s);
    } catch {}
  }, []);

  const value: StateContextValue = { stateCode, setStateCode };

  return (
    <StateContext.Provider value={value}>{children}</StateContext.Provider>
  );
}

export function useStateSelection() {
  const ctx = useContext(StateContext);
  if (!ctx)
    return {
      stateCode: "IL" as StateCode,
      setStateCode: () => {},
    };
  return ctx;
}
