/**
 * Prepares a flag SVG for use in a quiz question without leaking the answer.
 * flag-icons embeds the country code in element ids (e.g. id="flag-icons-jp", id="jp-a"), so every id is
 * renamed to an opaque sequential id and all references are rewritten. Scripts, event handlers, comments,
 * metadata and external references are rejected or stripped.
 */
export function sanitizeFlagSvg(svg: string): string {
  let out = svg
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(title|desc|metadata)[\s\S]*?<\/\1>/gi, "")
    .replace(/\sxml:space="[^"]*"/g, "");

  // Root id is not referenced anywhere; drop it before numbering the rest.
  out = out.replace(/(<svg\b[^>]*?)\sid="[^"]*"/, "$1");
  const ids = [...out.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1] ?? "");
  const mapping = new Map<string, string>();
  ids.forEach((id) => {
    if (!mapping.has(id)) mapping.set(id, `f${mapping.size.toString(36)}`);
  });
  out = out.replace(/\sid="([^"]+)"/g, (_m, id: string) => ` id="${mapping.get(id)}"`);
  out = out.replace(/url\(#([^)]+)\)/g, (m, id: string) => (mapping.has(id) ? `url(#${mapping.get(id)})` : m));
  out = out.replace(/(xlink:href|href)="#([^"]+)"/g, (m, attr: string, id: string) =>
    mapping.has(id) ? `${attr}="#${mapping.get(id)}"` : m,
  );

  // Class names can also carry the code (e.g. class="mr-st1"); rename them and their <style> selectors.
  const classes = new Map<string, string>();
  for (const m of out.matchAll(/\sclass="([^"]+)"/g)) {
    for (const name of (m[1] ?? "").split(/\s+/).filter(Boolean)) {
      if (!classes.has(name)) classes.set(name, `c${classes.size.toString(36)}`);
    }
  }
  out = out.replace(/\sclass="([^"]+)"/g, (_m, list: string) =>
    ` class="${list.split(/\s+/).filter(Boolean).map((n) => classes.get(n) ?? n).join(" ")}"`,
  );
  out = out.replace(/<style([^>]*)>([\s\S]*?)<\/style>/g, (_m, attrs: string, css: string) => {
    const rewritten = css.replace(/\.([A-Za-z_][\w-]*)/g, (sel, name: string) => (classes.has(name) ? `.${classes.get(name)}` : sel));
    return `<style${attrs}>${rewritten}</style>`;
  });

  out = out.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();
  return out;
}

export interface SvgCheck {
  ok: boolean;
  problems: string[];
}

/** Verifies that a sanitized flag reveals nothing about its country and contains nothing executable. */
export function checkSanitizedSvg(svg: string, iso2: string): SvgCheck {
  const problems: string[] = [];
  const code = iso2.toLowerCase();
  if (!/^<svg\b/.test(svg)) problems.push("does not start with <svg");
  if (!/viewBox="/.test(svg)) problems.push("missing viewBox");
  if (/<script/i.test(svg)) problems.push("contains <script>");
  if (/\son[a-z]+=/i.test(svg)) problems.push("contains an event handler attribute");
  if (/(href|src)="(?!#)/i.test(svg)) problems.push("contains an external reference");
  if (/flag-icons/i.test(svg)) problems.push("contains 'flag-icons'");
  const classValues = [...svg.matchAll(/\sclass="([^"]+)"/g)].map((m) => m[1] ?? "");
  if (classValues.some((c) => c.toLowerCase().includes(code))) problems.push(`a class contains '${code}'`);
  if (new RegExp(`\\.${code}-`, "i").test(svg)) problems.push(`a style selector contains '${code}-'`);
  const idValues = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1] ?? "");
  if (idValues.some((id) => id.toLowerCase().includes(code))) problems.push(`an id contains '${code}'`);
  if (new RegExp(`["#(]${code}-`, "i").test(svg)) problems.push(`a reference contains '${code}-'`);
  return { ok: problems.length === 0, problems };
}
