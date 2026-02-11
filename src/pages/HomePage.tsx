import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { MediaCard } from '@/components/media/MediaCard';
import { Play, Info, ArrowLeft, ArrowRight } from 'lucide-react';
import { getImageUrl, getTrending, getDiscover } from '@/services/tmdb';
import type { Media } from '@/types/tmdb';
import { cn } from '@/utils/cn';

export function HomePage() {
    const location = useLocation();
    const type = location.pathname === '/tv' ? 'tv' : (location.pathname === '/movies' ? 'movie' : 'all');

    const [items, setItems] = useState<Media[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [fetchingMore, setFetchingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [carouselIndex, setCarouselIndex] = useState(0);

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

    // Initial Fetch
    useEffect(() => {
        setLoading(true);
        setItems([]);
        setPage(1);
        setHasMore(true);
        setCarouselIndex(0);

        const fetchInitial = async () => {
            try {
                const data = type === 'all'
                    ? await getTrending('all', 1)
                    : await getDiscover(type as 'movie' | 'tv', 1);

                setItems(data);
                setLoading(false);
            } catch (error) {
                console.error(error);
                setLoading(false);
            }
        };

        fetchInitial();
    }, [type]);

    // Fetch More
    useEffect(() => {
        if (page === 1) return;

        setFetchingMore(true);
        const fetchMore = async () => {
            try {
                const data = type === 'all'
                    ? await getTrending('all', page)
                    : await getDiscover(type as 'movie' | 'tv', page);

                if (data.length === 0) {
                    setHasMore(false);
                } else {
                    setItems(prev => [...prev, ...data]);
                }
                setFetchingMore(false);
            } catch (error) {
                console.error(error);
                setFetchingMore(false);
            }
        };

        fetchMore();
    }, [page, type]);

    const handleNext = useCallback(() => {
        setCarouselIndex((prev) => {
            const nextIdx = prev + 1;
            // Trigger pre-fetch if needed
            if (nextIdx >= items.length - 5 && hasMore && !fetchingMore) {
                setPage(p => p + 1);
            }
            return nextIdx;
        });
    }, [items.length, hasMore, fetchingMore]);

    const handlePrev = useCallback(() => {
        setCarouselIndex((prev) => Math.max(0, prev - 1));
    }, []);

    // Auto-play Timer (10 Seconds)
    useEffect(() => {
        if (loading || items.length === 0) return;

        const timer = setInterval(() => {
            handleNext();
        }, 10000);

        return () => clearInterval(timer);
    }, [handleNext, loading, items.length, carouselIndex]); // carouselIndex resets timer on manual click

    if (loading) {
        return (
            <div className="flex flex-col gap-12 animate-pulse bg-brand-secondary min-h-screen">
                <div className="h-[70vh] w-full bg-white/5" />
                <div className="max-w-7xl mx-auto w-full px-4 grid grid-cols-2 md:grid-cols-5 gap-6">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    const featured = items[carouselIndex];
    const gridItems = items.slice(5);

    return (
        <div className="flex flex-col gap-12 bg-brand-secondary min-h-screen">
            {/* Hero Section */}
            {featured && (
                <section className="relative h-screen w-full overflow-hidden">
                    <div className="absolute inset-0">
                        <img
                            src={getImageUrl(featured.backdrop_path, 'original') || ''}
                            alt=""
                            key={featured.id}
                            className="h-full w-full object-cover animate-in fade-in zoom-in-105 duration-1000"
                        />
                        <div className="absolute inset-0 bg-brand-secondary/60" />
                    </div>

                    <div className="absolute bottom-1/4 left-0 w-full z-10">
                        <div className="max-w-7xl mx-auto px-4 flex flex-col gap-6">
                            <h1 className="text-4xl md:text-7xl font-black max-w-3xl leading-tight text-white italic tracking-tighter animate-in slide-in-from-left-8 duration-700">
                                {'title' in featured ? featured.title : featured.name}
                            </h1>

                            <div className="flex items-center gap-3 animate-in slide-in-from-left-8 duration-700 delay-100">
                                <span className="bg-accent text-brand-secondary text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                                    {type === 'all' ? (featured.media_type || 'trending') : type}
                                </span>
                                <span className="text-white/60 text-sm font-black italic">
                                    {('release_date' in featured ? featured.release_date : featured.first_air_date)?.split('-')[0]}
                                </span>
                            </div>

                            <p className="text-white/60 text-base md:text-lg max-w-xl line-clamp-3 leading-relaxed font-medium animate-in slide-in-from-left-8 duration-700 delay-200">
                                {featured.overview}
                            </p>

                            <div className="flex items-center gap-4 mt-2 animate-in slide-in-from-left-8 duration-700 delay-300">
                                <button className="bg-white text-brand-secondary px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-accent hover:text-brand-secondary transition-all transform hover:scale-105 shadow-xl">
                                    <Play fill="currentColor" size={20} /> Play Now
                                </button>
                                <button className="bg-white/10 backdrop-blur-md text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-white/20 transition-all">
                                    <Info size={20} /> More Info
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Carousel Controls */}
                    <div className="absolute bottom-12 right-12 z-20 flex items-center gap-2">
                        {/* Progress Ring (Background) */}
                        <div className="absolute inset-0 -m-1 pointer-events-none">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="50%"
                                    cy="50%"
                                    r="48%"
                                    className="stroke-accent/10 fill-none"
                                    strokeWidth="1"
                                />
                            </svg>
                        </div>

                        <button
                            onClick={handlePrev}
                            disabled={carouselIndex === 0}
                            className={cn(
                                "p-5 rounded-full backdrop-blur-3xl border border-white/10 transition-all group relative overflow-hidden",
                                carouselIndex === 0
                                    ? "opacity-10 cursor-not-allowed bg-white/5"
                                    : "bg-white/[0.03] text-white/40 hover:text-accent hover:border-accent/40 active:scale-90"
                            )}
                        >
                            <ArrowLeft size={20} />
                        </button>

                        <button
                            onClick={handleNext}
                            className="p-5 rounded-full bg-white/[0.03] backdrop-blur-3xl border border-white/10 text-white/40 hover:text-accent hover:border-accent/40 transition-all group relative overflow-hidden active:scale-90"
                        >
                            <ArrowRight size={20} />
                            {/* Visual Progress Bar on the "Next" button circle */}
                            <div className="absolute bottom-0 left-0 h-1 bg-accent/40 animate-[grow_10s_linear_infinite]" />
                        </button>
                    </div>
                </section>
            )}

            {/* Content Grid */}
            <section className="max-width-7xl mx-auto px-4 w-full py-12">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-12">
                    {gridItems.map((item, index) => (
                        <div key={`${item.id}-${index}`} ref={index === gridItems.length - 1 ? lastElementRef : null}>
                            <MediaCard item={item} />
                        </div>
                    ))}
                </div>

                {fetchingMore && (
                    <div className="mt-12 flex justify-center">
                        <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
                    </div>
                )}
            </section>
        </div>
    );
}
