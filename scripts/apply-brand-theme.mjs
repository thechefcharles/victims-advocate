/**
 * Bulk replace: dark slate surfaces → Brand Kit V2 light theme (CSS variables).
 * Run: node scripts/apply-brand-theme.mjs
 *
 * IMPORTANT: `text-slate-*` entries must be ordered longest/numeric first so
 * `text-slate-500` is not corrupted by replacing `text-slate-50` inside it.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const SUBS = [
  ["hover:text-slate-100", "hover:text-[var(--color-navy)]"],
  ["hover:text-slate-200", "hover:text-[var(--color-charcoal)]"],
  ["hover:text-slate-300", "hover:text-[var(--color-slate)]"],
  ["hover:text-slate-400", "hover:text-[var(--color-muted)]"],
  ["decoration-slate-600", "decoration-[var(--color-border)]"],
  ["decoration-slate-500", "decoration-[var(--color-muted)]"],
  ["border-slate-800/90", "border-[var(--color-border-light)]"],
  ["border-slate-800/80", "border-[var(--color-border-light)]"],
  ["border-slate-800/70", "border-[var(--color-border-light)]"],
  ["border-slate-800/60", "border-[var(--color-border-light)]"],
  ["border-slate-800/50", "border-[var(--color-border-light)]"],
  ["border-slate-800/40", "border-[var(--color-border-light)]"],
  ["border-slate-800", "border-[var(--color-border-light)]"],
  ["border-slate-700/80", "border-[var(--color-border)]"],
  ["border-slate-700/60", "border-[var(--color-border)]"],
  ["border-slate-700/40", "border-[var(--color-border)]"],
  ["border-slate-700", "border-[var(--color-border)]"],
  ["border-slate-600/90", "border-[var(--color-border)]"],
  ["border-slate-600/80", "border-[var(--color-border)]"],
  ["border-slate-600", "border-[var(--color-border)]"],
  ["divide-slate-800/90", "divide-[var(--color-border-light)]"],
  ["divide-slate-800/80", "divide-[var(--color-border-light)]"],
  ["divide-slate-800", "divide-[var(--color-border-light)]"],
  ["ring-slate-800", "ring-[var(--color-border-light)]"],
  ["ring-slate-700/60", "ring-[var(--color-border)]"],
  ["ring-slate-700", "ring-[var(--color-border)]"],
  ["ring-slate-600/70", "ring-[var(--color-border)]"],
  ["ring-slate-600", "ring-[var(--color-border)]"],
  ["bg-slate-950/90", "bg-[var(--color-warm-cream)]/95"],
  ["bg-slate-950/80", "bg-[var(--color-warm-cream)]/90"],
  ["bg-slate-950/70", "bg-[var(--color-warm-cream)]/85"],
  ["bg-slate-950/60", "bg-[var(--color-warm-cream)]/80"],
  ["bg-slate-950/50", "bg-[var(--color-warm-cream)]/75"],
  ["bg-slate-950/40", "bg-[var(--color-warm-cream)]/70"],
  ["bg-slate-950/35", "bg-[var(--color-warm-cream)]/65"],
  ["bg-slate-950/25", "bg-[var(--color-warm-cream)]/55"],
  ["bg-slate-950", "bg-[var(--color-warm-white)]"],
  ["bg-slate-900/90", "bg-white/95"],
  ["bg-slate-900/80", "bg-white/92"],
  ["bg-slate-900/70", "bg-[var(--color-warm-cream)]/90"],
  ["bg-slate-900/60", "bg-[var(--color-warm-cream)]/85"],
  ["bg-slate-900/55", "bg-[var(--color-warm-cream)]/82"],
  ["bg-slate-900/50", "bg-[var(--color-warm-cream)]/80"],
  ["bg-slate-900/40", "bg-[var(--color-warm-cream)]/75"],
  ["bg-slate-900", "bg-white"],
  ["bg-slate-800/90", "bg-[var(--color-light-sand)]/90"],
  ["bg-slate-800/80", "bg-[var(--color-light-sand)]/85"],
  ["bg-slate-800/70", "bg-[var(--color-light-sand)]/80"],
  ["bg-slate-800/60", "bg-[var(--color-light-sand)]/75"],
  ["bg-slate-800/50", "bg-[var(--color-light-sand)]/70"],
  ["bg-slate-800/40", "bg-[var(--color-light-sand)]/65"],
  ["bg-slate-800", "bg-[var(--color-light-sand)]"],
  ["hover:bg-slate-900/60", "hover:bg-[var(--color-teal-light)]/50"],
  ["hover:bg-slate-900/50", "hover:bg-[var(--color-teal-light)]/45"],
  ["hover:bg-slate-900/40", "hover:bg-[var(--color-teal-light)]/40"],
  ["hover:bg-slate-900", "hover:bg-[var(--color-warm-cream)]"],
  ["hover:bg-slate-800/80", "hover:bg-[var(--color-border-light)]"],
  ["hover:bg-slate-800", "hover:bg-[var(--color-border-light)]"],
  ["hover:bg-slate-950/40", "hover:bg-[var(--color-teal-light)]/40"],
  ["text-slate-600", "text-[var(--color-slate)]"],
  ["text-slate-500", "text-[var(--color-muted)]"],
  ["text-slate-400", "text-[var(--color-muted)]"],
  ["text-slate-300", "text-[var(--color-slate)]"],
  ["text-slate-200", "text-[var(--color-charcoal)]"],
  ["text-slate-100", "text-[var(--color-navy)]"],
  ["text-slate-50", "text-[var(--color-navy)]"],
  ["fill-slate-500", "fill-[var(--color-muted)]"],
  ["fill-slate-400", "fill-[var(--color-muted)]"],
  ["stroke-slate-400", "stroke-[var(--color-muted)]"],
  ["placeholder:text-slate-500", "placeholder:text-[var(--color-muted)]"],
  ["placeholder:text-slate-400", "placeholder:text-[var(--color-muted)]"],
  ["bg-blue-600", "bg-[var(--color-teal-deep)]"],
  ["hover:bg-blue-500", "hover:bg-[var(--color-teal)]"],
  ["bg-blue-500", "bg-[var(--color-teal)]"],
  ["text-blue-400", "text-[var(--color-teal)]"],
  ["hover:text-blue-300", "hover:text-[var(--color-teal-deep)]"],
  ["text-blue-300", "text-[var(--color-teal)]"],
  ["border-blue-500", "border-[var(--color-teal)]"],
  ["hover:border-blue-500", "hover:border-[var(--color-teal)]"],
  ["ring-blue-500", "ring-[var(--color-teal)]"],
  ["focus:ring-blue-500", "focus:ring-[var(--color-teal)]"],
  ["focus-visible:ring-blue-500", "focus-visible:ring-[var(--color-teal)]"],
  ["focus:ring-blue-500/40", "focus:ring-[var(--color-teal)]/40"],
  ["focus-visible:ring-blue-500/40", "focus-visible:ring-[var(--color-teal)]/40"],
  ["from-blue-950", "from-[var(--color-teal-deep)]"],
  ["to-blue-950", "to-[var(--color-navy)]"],
  ["shadow-black/40", "shadow-[var(--shadow-modal)]"],
  ["bg-slate-700/80", "bg-[var(--color-border-light)]"],
  ["bg-slate-700/70", "bg-[var(--color-border-light)]/90"],
  ["bg-slate-700/60", "bg-[var(--color-border-light)]/85"],
  ["bg-slate-700", "bg-[var(--color-teal-deep)]"],
  ["hover:bg-slate-600", "hover:bg-[var(--color-teal)]"],
  ["focus-visible:ring-slate-500/40", "focus-visible:ring-[var(--color-teal)]/40"],
  ["ring-slate-500/40", "ring-[var(--color-teal)]/40"],
  ["border-slate-500/50", "border-[var(--color-muted)]/50"],
  ["border-slate-500/40", "border-[var(--color-muted)]/40"],
  ["border-slate-500", "border-[var(--color-muted)]"],
  ["bg-slate-600/90", "bg-[var(--color-light-sand)]/90"],
  ["bg-slate-600/80", "bg-[var(--color-light-sand)]/85"],
  ["bg-slate-600/50", "bg-[var(--color-light-sand)]/70"],
  ["bg-slate-600", "bg-[var(--color-light-sand)]"],
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name === "node_modules" || name.name === ".next") continue;
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name.name) && !name.name.endsWith(".d.ts")) {
      if (p.includes(`${path.sep}lib${path.sep}i18n${path.sep}`)) continue;
      out.push(p);
    }
  }
  return out;
}

let files = walk(path.join(ROOT, "app"));
files = files.concat(walk(path.join(ROOT, "components")));
files = files.concat(walk(path.join(ROOT, "lib")));

let total = 0;
for (const file of files) {
  let s = fs.readFileSync(file, "utf8");
  const orig = s;
  for (const [a, b] of SUBS) {
    if (s.includes(a)) {
      const parts = s.split(a);
      s = parts.join(b);
    }
  }
  if (s !== orig) {
    fs.writeFileSync(file, s);
    total++;
  }
}
console.log(`Updated ${total} files.`);
