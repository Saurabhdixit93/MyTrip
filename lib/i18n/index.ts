import { en, type Messages } from "./messages/en";

export const locales = ["en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
type Vars = Record<string, string | number>;

const dictionaries: Record<Locale, Messages> = { en };

function lookup(messages: Messages, key: string): string {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null || !(part in node)) return key;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : key;
}

/** Translator bound to a locale. `{name}` placeholders are interpolated from `vars`. */
export function createTranslator(locale: Locale = defaultLocale) {
  const messages = dictionaries[locale];
  return (key: MessageKey, vars?: Vars) => {
    const template = lookup(messages, key);
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
  };
}

/** Default-locale translator. Locale switching (Hindi) is wired in the i18n phase. */
export const t = createTranslator(defaultLocale);

/** "1 member" / "5 members". */
export function membersLabel(count: number) {
  return count === 1 ? t("trips.member") : t("trips.members", { count });
}
