import { useState, useEffect, useRef } from 'react';
import { Search, X, Star, Play, Tv } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchMedia, getImageUrl } from '@/services/tmdb';
import { useDebounce } from '@/hooks/useDebounce';

interface SpotlightSearchProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SpotlightSearch({ isOpen, onClose }: SpotlightSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const debouncedQuery = useDebounce(query, 300);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
            setQuery('');
            setResults([]);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    useEffect(() => {
        if (debouncedQuery.trim()) {
            setLoading(true);
            searchMedia(debouncedQuery).then((res) => {
                setResults(res.slice(0, 10)); // Top 10 results for the 5x2 grid
                setLoading(false);
            });
        } else {
            setResults([]);
        }
    }, [debouncedQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center pt-[15vh] px-4 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-brand-secondary/95 backdrop-blur-3xl"
                onClick={onClose}
            />

            {/* Search Container */}
            <div className="relative w-full max-w-4xl space-y-6 animate-in zoom-in-95 duration-300">
                <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-accent transition-colors" size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search... (Ctrl + K)"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-14 pr-12 text-base font-black italic tracking-tighter text-white focus:outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all placeholder:text-white/5 shadow-2xl"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/20 hover:text-white"
                    >
                        <X size={18} />
                    </button>

                    {loading && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-accent animate-pulse" />
                    )}
                </div>

                {/* Results Grid - 5 per line */}
                {results.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6 animate-in slide-in-from-top-4 duration-500">
                        {results.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    navigate(`/watch/${item.media_type}/${item.id}`);
                                    onClose();
                                }}
                                className="group flex flex-col gap-3 text-left"
                            >
                                <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl bg-white/2">
                                    <img
                                        src={getImageUrl(item.poster_path) || ''}
                                        alt=""
                                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-brand-secondary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="p-4 bg-accent rounded-full scale-50 group-hover:scale-100 transition-transform duration-500 shadow-xl">
                                            {item.media_type === 'tv' ? <Tv size={20} className="text-brand-secondary fill-brand-secondary" /> : <Play size={20} className="text-brand-secondary fill-brand-secondary" />}
                                        </div>
                                    </div>
                                    <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-1">
                                        <Star size={10} className="text-accent fill-accent" />
                                        <span className="text-[10px] font-black text-white">{item.vote_average.toFixed(1)}</span>
                                    </div>
                                </div>
                                <div className="px-1">
                                    <h4 className="text-xs font-black uppercase italic tracking-tighter text-white/80 group-hover:text-accent transition-colors line-clamp-1">
                                        {item.title || item.name}
                                    </h4>
                                    <div className="flex items-center gap-2 text-[9px] text-white/20 uppercase font-black tracking-widest mt-1">
                                        <span>{item.media_type === 'tv' ? 'Series' : 'Movie'}</span>
                                        <span className="text-white/10">/</span>
                                        <span>{(item.release_date || item.first_air_date)?.split('-')[0]}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
