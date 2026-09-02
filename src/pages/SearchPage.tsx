import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { searchMedia, getByGenre, getPersonCredits } from '@/services/tmdb';
import type { Media } from '@/types/tmdb';
import { MediaCard } from '@/components/media/MediaCard';
import { useDebounce } from '@/hooks/useDebounce';

export function SearchPage() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const genreId = searchParams.get('gid');
    const genreName = searchParams.get('gn');
    const starId = searchParams.get('sid');
    const starName = searchParams.get('sn');
    const mediaType = searchParams.get('type') as 'movie' | 'tv' | null;
    const debouncedQuery = useDebounce(query, 500);

    const [page, setPage] = useState(1);

    const criteriaKey = `${debouncedQuery.trim()}|${genreId ?? ''}|${mediaType ?? ''}|${starId ?? ''}`;
    const hasCriteria = Boolean(debouncedQuery.trim() || genreId || starId);

    // Results carry the criteria they were fetched for, so "loading" and "stale"
    // are derived instead of being set synchronously inside an effect.
    const [fetched, setFetched] = useState<{ key: string; items: Media[]; hasMore: boolean }>({
        key: '', items: [], hasMore: false,
    });
    const isCurrent = fetched.key === criteriaKey;
    const results = isCurrent ? fetched.items : [];
    const loading = hasCriteria && !isCurrent;
    const hasMore = isCurrent && fetched.hasMore;

    const [loadedPage, setLoadedPage] = useState(1);
    const fetchingMore = loadedPage < page;

    // Reset pagination when the criteria change. Adjusting state during render is
    // React's recommended alternative to doing this in an effect.
    const [prevCriteriaKey, setPrevCriteriaKey] = useState(criteriaKey);
    if (prevCriteriaKey !== criteriaKey) {
        setPrevCriteriaKey(criteriaKey);
        setPage(1);
        setLoadedPage(1);
    }

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

    // Initial Search, Genre, or Star Discover
    useEffect(() => {
        if (!hasCriteria) return;
        let cancelled = false;

        const fetchInitial = starId
            ? getPersonCredits(starId)
            : (genreId && mediaType
                ? getByGenre(mediaType, parseInt(genreId), 1)
                : searchMedia(debouncedQuery, 1));

        fetchInitial
            .then(res => {
                if (cancelled) return;
                // For star credits, TMDB returns everything at once, so we disable load more
                setFetched({ key: criteriaKey, items: res, hasMore: !(starId || res.length < 10) });
            })
            .catch(() => {
                if (!cancelled) setFetched({ key: criteriaKey, items: [], hasMore: false });
            });

        return () => { cancelled = true; };
    }, [criteriaKey, hasCriteria, debouncedQuery, genreId, mediaType, starId]);

    // Fetch More
    useEffect(() => {
        if (page === 1 || (!debouncedQuery.trim() && !genreId)) return;
        let cancelled = false;

        const fetchMore = genreId && mediaType
            ? getByGenre(mediaType, parseInt(genreId), page)
            : searchMedia(debouncedQuery, page);

        fetchMore
            .then(res => {
                if (cancelled) return;
                setFetched(prev => {
                    // A newer search landed while this page was in flight.
                    if (prev.key !== criteriaKey) return prev;
                    return res.length === 0
                        ? { ...prev, hasMore: false }
                        : { ...prev, items: [...prev.items, ...res] };
                });
            })
            .catch(() => { /* keep whatever is already rendered */ })
            .finally(() => { if (!cancelled) setLoadedPage(page); });

        return () => { cancelled = true; };
    }, [page, criteriaKey, debouncedQuery, genreId, mediaType]);

    return (
        <div className="max-w-7xl mx-auto px-4 pt-32 pb-12 min-h-screen">
            <div className="flex flex-col gap-2 mb-12">
                <h1 className="text-3xl font-black italic uppercase tracking-tighter">
                    {starName ? `Titles Featuring ${starName}` : (genreName ? `${genreName} ${mediaType === 'tv' ? 'Shows' : 'Movies'}` : 'Search Results')}
                </h1>
                <p className="text-white/40 font-medium lowercase italic tracking-tight">
                    {starName
                        ? `Exploring the career of ${starName}`
                        : (genreName
                            ? `Discovering the best of ${genreName}`
                            : query ? `Showing results for "${query}"` : 'Discover something new')}
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
