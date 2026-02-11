import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { searchMedia } from '@/services/tmdb';
import type { Media } from '@/types/tmdb';
import { MediaCard } from '@/components/media/MediaCard';
import { useDebounce } from '@/hooks/useDebounce';

export function SearchPage() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const debouncedQuery = useDebounce(query, 500);
    const [results, setResults] = useState<Media[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (debouncedQuery) {
            setLoading(true);
            searchMedia(debouncedQuery)
                .then(setResults)
                .finally(() => setLoading(false));
        } else {
            setResults([]);
        }
    }, [debouncedQuery]);

    return (
        <div className="max-w-7xl mx-auto px-4 pt-32 pb-12 min-h-screen">
            <div className="flex flex-col gap-2 mb-12">
                <h1 className="text-3xl font-black italic uppercase tracking-tighter">
                    Search Results
                </h1>
                <p className="text-white/40 font-medium">
                    Showing results for <span className="text-brand-primary">"{query}"</span>
                </p>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : results.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {results.map((item) => (
                        <MediaCard key={item.id} item={item} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-white/20">
                    <p className="text-xl font-bold">No results found for your search.</p>
                </div>
            )}
        </div>
    );
}
