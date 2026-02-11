import type { Media } from '@/types/tmdb';
import { getImageUrl } from '@/services/tmdb';
import { Link } from 'react-router-dom';
import { Star, Play } from 'lucide-react';
import { cn } from '@/utils/cn';

interface MediaCardProps {
    item: Media;
    className?: string;
}

export function MediaCard({ item, className }: MediaCardProps) {
    const title = 'title' in item ? item.title : item.name;
    const date = 'release_date' in item ? item.release_date : item.first_air_date;
    const type = item.media_type || (('title' in item) ? 'movie' : 'tv');
    const year = date?.split('-')[0];

    return (
        <Link
            to={`/watch/${type}/${item.id}`}
            className={cn("group relative flex flex-col gap-4 transition-all duration-300 hover:-translate-y-2", className)}
        >
            <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] shadow-2xl">
                <img
                    src={getImageUrl(item.poster_path) || ''}
                    alt={title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
                    <div className="bg-accent p-4 rounded-full text-brand-secondary scale-50 group-hover:scale-100 transition-all duration-500 shadow-2xl shadow-accent/20">
                        <Play fill="currentColor" size={24} />
                    </div>
                </div>

                {/* Rating Badge */}
                <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border border-white/10 text-white shadow-2xl">
                    <Star size={10} className="text-accent fill-accent" />
                    {item.vote_average.toFixed(1)}
                </div>
            </div>

            <div className="flex flex-col gap-2 px-1">
                <h3 className="font-black text-xs uppercase italic tracking-tighter leading-tight text-white/90 group-hover:text-accent transition-colors line-clamp-1">
                    {title}
                </h3>
                <div className="flex items-center gap-2 text-[9px] text-white/20 font-black uppercase tracking-widest">
                    <span>{type === 'movie' ? 'Movie' : 'Series'}</span>
                    <span className="text-white/10">/</span>
                    <span>{year}</span>
                </div>
            </div>
        </Link>
    );
}
