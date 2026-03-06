// src/i18n/i18nContext.tsx

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { translations, type Lang } from "./translations";

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LANG_KEY = "pos_lang";
const DEFAULT_LANG: Lang = "uz";

const I18nContext = createContext<I18nContextType | null>(null);

function getNestedValue(
  obj: Record<string, unknown>,
  path: string,
): string | undefined {
  let current: unknown = obj;
  for (const key of path.split(".")) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : undefined;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return (saved as Lang) || DEFAULT_LANG;
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem(LANG_KEY, newLang);
  };

  const t = useMemo(() => {
    return (key: string, params?: Record<string, string | number>): string => {
      const value = getNestedValue(
        translations[lang] as Record<string, unknown>,
        key,
      );
      if (!value) return key;

      if (!params) return value;

      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(`{{${k}}}`, String(v)),
        value,
      );
    };
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
