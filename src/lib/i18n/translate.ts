import type { Messages } from "@/messages/en";

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type MessageVars = Record<string, string | number>;
export type Translator = (key: MessageKey, vars?: MessageVars) => string;

export function formatMessage(template: string, vars?: MessageVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

export function lookup(messages: Messages, key: MessageKey): string {
  let node: unknown = messages;
  for (const segment of key.split(".")) {
    if (node && typeof node === "object" && segment in node) {
      node = (node as Record<string, unknown>)[segment];
    } else {
      return key;
    }
  }
  return typeof node === "string" ? node : key;
}

export function createTranslator(messages: Messages): Translator {
  return (key, vars) => formatMessage(lookup(messages, key), vars);
}
