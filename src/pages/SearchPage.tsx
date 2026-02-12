import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { searchMedia, getByGenre } from '@/services/tmdb';
import type { Media } from '@/types/tmdb';
import { MediaCard } from '@/components/media/MediaCard';
import { useDebounce } from '@/hooks/useDebounce';

export function SearchPage() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const genreId = searchParams.get('gid');
    const genreName = searchParams.get('gn');
    const mediaType = searchParams.get('type') as 'movie' | 'tv' | null;
    const debouncedQuery = useDebounce(query, 500);

    const [results, setResults] = useState<Media[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [fetchingMore, setFetchingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLDivElement) => {
        if (loading || fetchingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => prev + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, fetchingMore, hasMore]);

    // Initial Search or Genre Discover
    useEffect(() => {
        if (!debouncedQuery.trim() && !genreId) {
            setResults([]);
            setHasMore(false);
            return;
        }

        setLoading(true);
        setResults([]);
        setPage(1);
        setHasMore(true);

        const fetchInitial = genreId && mediaType
            ? getByGenre(mediaType, parseInt(genreId), 1)
            : searchMedia(debouncedQuery, 1);

        fetchInitial
            .then(res => {
                setResults(res);
                if (res.length < 10) setHasMore(false);
            })
            .finally(() => setLoading(false));
    }, [debouncedQuery, genreId, mediaType]);

    // Fetch More
    useEffect(() => {
        if (page === 1 || (!debouncedQuery.trim() && !genreId)) return;

        setFetchingMore(true);
        const fetchMore = genreId && mediaType
            ? getByGenre(mediaType, parseInt(genreId), page)
            : searchMedia(debouncedQuery, page);

        fetchMore
            .then(res => {
                if (res.length === 0) {
                    setHasMore(false);
                } else {
                    setResults(prev => [...prev, ...res]);
                }
            })
            .finally(() => setFetchingMore(false));
    }, [page, debouncedQuery, genreId, mediaType]);

    return (
        <div className="max-w-7xl mx-auto px-4 pt-32 pb-12 min-h-screen">
            <div className="flex flex-col gap-2 mb-12">
                <h1 className="text-3xl font-black italic uppercase tracking-tighter">
                    {genreName ? `${genreName} ${mediaType === 'tv' ? 'Shows' : 'Movies'}` : 'Search Results'}
                </h1>
                <p className="text-white/40 font-medium lowercase italic tracking-tight">
                    {genreName
                        ? `Discovering the best of ${genreName}`
                        : query ? `Showing results for "${query}"` : 'Discover something new'}
                </p>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : results.length > 0 ? (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {results.map((item, index) => (
                            <div
                                key={`${item.id}-${index}`}
                                ref={index === results.length - 1 ? lastElementRef : null}
                            >
                                <MediaCard item={item} />
                            </div>
                        ))}
                    </div>
                    {fetchingMore && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mt-6">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-white/20">
                    <p className="text-xl font-bold">No results found.</p>
                </div>
            )}
        </div>
    );
}
