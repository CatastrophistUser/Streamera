import { useState, useEffect } from 'react';
import { getTrending } from '@/services/tmdb';
import type { Media } from '@/types/tmdb';

export function useTrending(type: 'movie' | 'tv' | 'all' = 'all') {
    const [data, setData] = useState<Media[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetch = async () => {
            try {
                setLoading(true);
                const results = await getTrending(type);
                setData(results);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetch();
    }, [type]);

    return { data, loading, error };
}
