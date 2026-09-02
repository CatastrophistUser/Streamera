import type { Provider, ProvidersConfig } from '@/types/providers';

const PROVIDERS_URL = `${import.meta.env.BASE_URL}providers.json`;
const SUPPORTED_VERSION = 1;

/**
 * Mirrors public/providers.json so the player still renders if that fetch fails
 * (offline, bad deploy, malformed edit). Keep in sync when the shape changes.
 */
export const FALLBACK_PROVIDERS: Provider[] = [
    { id: 'server-vip', label: 'Server VIP', host: 'vidlink.pro', movie: 'https://{host}/movie/{id}', tv: 'https://{host}/tv/{id}/{season}/{episode}' },
    { id: 'mirror-ultra', label: 'Ultra', host: 'vidsrcme.ru', movie: 'https://{host}/embed/movie/{id}', tv: 'https://{host}/embed/tv/{id}/{season}/{episode}' },
    { id: 'classic-multi', label: 'Multi', host: 'vidsrc.pm', movie: 'https://{host}/embed/movie/{id}', tv: 'https://{host}/embed/tv/{id}/{season}/{episode}' },
];

const isProvider = (value: unknown): value is Provider => {
    if (typeof value !== 'object' || value === null) return false;
    const p = value as Record<string, unknown>;
    return (['id', 'label', 'host', 'movie', 'tv'] as const).every(
        (key) => typeof p[key] === 'string' && (p[key] as string).length > 0
    );
};

let cached: Promise<Provider[]> | null = null;

/**
 * Loads the provider list from public/providers.json, falling back to
 * FALLBACK_PROVIDERS on any failure. The result is cached for the page session,
 * so repeated WatchPage mounts share a single request.
 */
export const loadProviders = (): Promise<Provider[]> => {
    cached ??= fetch(PROVIDERS_URL)
        .then((res) => {
            if (!res.ok) throw new Error(`providers.json responded ${res.status}`);
            return res.json() as Promise<ProvidersConfig>;
        })
        .then((config) => {
            if (config?.version !== SUPPORTED_VERSION) {
                throw new Error(`unsupported providers.json version: ${config?.version}`);
            }
            const providers = (config.providers ?? []).filter(isProvider);
            if (providers.length === 0) throw new Error('providers.json contained no valid entries');
            return providers;
        })
        .catch((err) => {
            console.warn('[providers] falling back to built-in list:', err);
            return FALLBACK_PROVIDERS;
        });

    return cached;
};

/** Fills a provider's URL template. Unknown placeholders are left untouched. */
export const buildEmbedUrl = (
    provider: Provider,
    type: 'movie' | 'tv',
    id: string,
    season = 1,
    episode = 1
): string => {
    const values: Record<string, string> = {
        host: provider.host,
        id,
        season: String(season),
        episode: String(episode),
    };
    return (type === 'movie' ? provider.movie : provider.tv)
        .replace(/\{(host|id|season|episode)\}/g, (_match, key: string) => values[key]);
};
