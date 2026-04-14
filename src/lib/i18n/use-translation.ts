"use client";

import { useLanguage, type Locale } from "./context";
import { en } from "./en";
import { zh } from "./zh";
import { ja } from "./ja";

type Translations = typeof en;
type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<Translations>;

const dictionaries: Record<Locale, Record<string, unknown>> = { en, zh, ja };

function get(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : path;
}

export function useTranslation() {
  const { locale } = useLanguage();
  const dict = dictionaries[locale];
  return (key: string) => get(dict as unknown as Record<string, unknown>, key);
}
