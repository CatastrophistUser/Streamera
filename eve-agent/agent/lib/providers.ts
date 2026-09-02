import { z } from "zod";

export const providerSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "id must be lowercase kebab-case"),
  label: z.string().min(1).max(24),
  host: z
    .string()
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/, "host must be a bare hostname"),
  movie: z.string(),
  tv: z.string(),
});

export const configSchema = z.object({
  version: z.literal(1),
  providers: z.array(providerSchema).min(1).max(24),
});

export type Provider = z.infer<typeof providerSchema>;
export type ProvidersConfig = z.infer<typeof configSchema>;

const PLACEHOLDERS = ["host", "id", "season", "episode"];

export function fillTemplate(
  template: string,
  provider: Pick<Provider, "host">,
  id: string,
  season = 1,
  episode = 1,
) {
  const values: Record<string, string> = {
    host: provider.host,
    id,
    season: String(season),
    episode: String(episode),
  };
  return template.replace(/\{(host|id|season|episode)\}/g, (_m, k: string) => values[k]);
}

/**
 * The same rules the site's own CI validator enforces. Run before any write so a
 * bad edit cannot reach production, since the agent commits straight to main.
 */
export function validateConfig(config: unknown): string[] {
  const parsed = configSchema.safeParse(config);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
  }
  const errors: string[] = [];
  const { providers } = parsed.data;

  for (const field of ["id", "label"] as const) {
    const counts = new Map<string, number>();
    for (const p of providers) {
      const key = field === "label" ? p[field].toLowerCase() : p[field];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [value, n] of counts) {
      if (n > 1) errors.push(`duplicate ${field}: "${value}" appears ${n} times`);
    }
  }

  for (const p of providers) {
    for (const kind of ["movie", "tv"] as const) {
      const tpl = p[kind];
      const unknown = [...tpl.matchAll(/\{(\w+)\}/g)]
        .map((m) => m[1])
        .filter((n) => !PLACEHOLDERS.includes(n));
      if (unknown.length) errors.push(`${p.id}.${kind}: unknown placeholder(s) {${unknown.join("}, {")}}`);
      if (!tpl.includes("{id}")) errors.push(`${p.id}.${kind}: template must contain {id}`);

      try {
        const url = new URL(fillTemplate(tpl, p, "1"));
        if (url.protocol !== "https:") errors.push(`${p.id}.${kind}: must be https`);
        if (url.hostname !== p.host) {
          errors.push(`${p.id}.${kind}: resolves to ${url.hostname}, expected declared host ${p.host}`);
        }
      } catch {
        errors.push(`${p.id}.${kind}: does not form a valid URL`);
      }
    }
    if (!p.tv.includes("{season}") && !p.tv.includes("{episode}")) {
      errors.push(`${p.id}.tv: template ignores both {season} and {episode}`);
    }
  }

  return errors;
}
