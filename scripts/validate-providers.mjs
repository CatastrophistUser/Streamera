#!/usr/bin/env node
/**
 * Validates public/providers.json before it can reach production.
 *
 * Run locally with `yarn validate:providers`; CI runs it on every PR that
 * touches the provider config. Checks beyond the JSON Schema live here because
 * draft-07 cannot express them (unique ids, cross-file consistency).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const failures = [];
const fail = (msg) => failures.push(msg);

// ---------------------------------------------------------------- schema
const schema = JSON.parse(read('schema/providers.schema.json'));
const config = JSON.parse(read('public/providers.json'));

const ajv = new Ajv({ allErrors: true, strict: false });
if (!ajv.validate(schema, config)) {
    for (const e of ajv.errors) {
        fail(`schema: ${e.instancePath || '/'} ${e.message}`);
    }
}

const providers = Array.isArray(config.providers) ? config.providers : [];

// ------------------------------------------------- unique ids and labels
// JSON Schema's uniqueItems only compares whole objects, so these are manual.
for (const field of ['id', 'label']) {
    const seen = new Map();
    for (const p of providers) {
        const key = field === 'label' ? String(p?.[field]).toLowerCase() : p?.[field];
        seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    for (const [value, count] of seen) {
        if (count > 1) fail(`duplicate ${field}: ${JSON.stringify(value)} appears ${count} times`);
    }
}

// --------------------------------------------- templates must be usable
for (const p of providers) {
    for (const kind of ['movie', 'tv']) {
        const tpl = p?.[kind];
        if (typeof tpl !== 'string') continue;

        const unknown = [...tpl.matchAll(/\{(\w+)\}/g)]
            .map((m) => m[1])
            .filter((n) => !['host', 'id', 'season', 'episode'].includes(n));
        if (unknown.length) {
            fail(`${p.id}.${kind}: unknown placeholder(s) {${unknown.join('}, {')}}`);
        }

        // The filled URL must actually parse, and must stay on the declared host.
        const filled = tpl
            .replace(/\{host\}/g, p.host)
            .replace(/\{id\}/g, '1')
            .replace(/\{season\}/g, '1')
            .replace(/\{episode\}/g, '1');
        try {
            const url = new URL(filled);
            if (url.protocol !== 'https:') fail(`${p.id}.${kind}: must be https`);
            if (url.hostname !== p.host) {
                fail(`${p.id}.${kind}: resolves to ${url.hostname}, expected declared host ${p.host}`);
            }
        } catch {
            fail(`${p.id}.${kind}: does not form a valid URL (${filled})`);
        }
    }
    if (typeof p?.tv === 'string' && !p.tv.includes('{season}') && !p.tv.includes('{episode}')) {
        fail(`${p.id}.tv: template ignores both {season} and {episode}`);
    }
}

// ------------------------------- FALLBACK_PROVIDERS must not drift stale
// providers.ts ships a hardcoded copy used when the fetch fails. If it points at
// a provider that no longer exists, that failure path serves a dead host.
const source = read('src/services/providers.ts');
const block = source.match(/FALLBACK_PROVIDERS[^=]*=\s*\[([\s\S]*?)\n\];/);
if (!block) {
    fail('providers.ts: could not locate the FALLBACK_PROVIDERS array');
} else {
    const byId = new Map(providers.map((p) => [p.id, p]));
    const entries = [...block[1].matchAll(/id:\s*'([^']+)'[^}]*?host:\s*'([^']+)'/g)];
    if (entries.length === 0) fail('providers.ts: FALLBACK_PROVIDERS appears to be empty');
    for (const [, id, host] of entries) {
        const match = byId.get(id);
        if (!match) fail(`fallback "${id}" is not in providers.json (stale fallback)`);
        else if (match.host !== host) {
            fail(`fallback "${id}" host ${host} != providers.json host ${match.host}`);
        }
    }
}

// ------------------------------------------------------------------ done
if (failures.length) {
    console.error(`providers.json validation FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
}
console.log(`providers.json OK - ${providers.length} provider(s): ${providers.map((p) => p.host).join(', ')}`);
