// components/i18n/i18nProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { en } from "@/lib/i18n/en";
import { es } from "@/lib/i18n/es";
import type { I18nDict } from "@/lib/i18n/types";

export type Lang = "en" | "es";

const STORAGE_KEY = "nxtstps_lang";

type InterpolationValues = Record<string, string | number>;

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  tf: (key: string, values: InterpolationValues) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: any, part) => {
    if (acc == null) return undefined;
    return acc[part];
  }, obj as any);
}

function interpolate(template: string, values: InterpolationValues) {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    values[key] !== undefined ? String(values[key]) : `{${key}}`
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved === "en" || saved === "es") setLangState(saved);
    } catch {
      // ignore
    }
  }, []);

  // ✅ Keep document language in sync (accessibility + semantics)
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const dict: I18nDict = lang === "es" ? es : en;

  const t = (key: string) => {
    const value = getByPath(dict, key);
    if (typeof value === "string") return value;
    return key;
  };

  const tf = (key: string, values: InterpolationValues) => {
    return interpolate(t(key), values);
  };

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, t, tf }), [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider />");
  return ctx;
}