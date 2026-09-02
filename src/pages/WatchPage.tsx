import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { getMediaDetails, getSeasonDetails, getSimilar, getCredits, getImageUrl } from '@/services/tmdb';
import { buildEmbedUrl, loadProviders, FALLBACK_PROVIDERS } from '@/services/providers';
import { useState, useEffect, useRef } from 'react';
import { RefreshCw, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Media, MediaDetails, SeasonDetails, Credits, Genre, Season, Episode, CastMember } from '@/types/tmdb';

export function WatchPage() {
    const { type, id } = useParams<{ type: 'movie' | 'tv'; id: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const season = parseInt(searchParams.get('s') || '1');
    const episode = parseInt(searchParams.get('e') || '1');
    const [providers, setProviders] = useState(FALLBACK_PROVIDERS);
    const [activeSourceId, setActiveSourceId] = useState(FALLBACK_PROVIDERS[0].id);

    const [details, setDetails] = useState<MediaDetails | null>(null);
    const [seasonData, setSeasonData] = useState<SeasonDetails | null>(null);
    const [similar, setSimilar] = useState<Media[]>([]);
    const [credits, setCredits] = useState<Credits | null>(null);
    const [playerKey, setPlayerKey] = useState(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Loading flags are derived by comparing what has finished loading against
    // what is currently requested, so no effect has to set them synchronously.
    const mediaKey = type && id ? `${type}/${id}` : null;
    const [loadedMediaKey, setLoadedMediaKey] = useState<string | null>(null);
    const loading = mediaKey !== null && loadedMediaKey !== mediaKey;

    const seasonKey = type === 'tv' && id ? `${id}/${season}` : null;
    const [loadedSeasonKey, setLoadedSeasonKey] = useState<string | null>(null);
    const episodesLoading = seasonKey !== null && loadedSeasonKey !== seasonKey;

    const playerIdentity = `${playerKey}-${activeSourceId}-${season}-${episode}`;
    const [loadedPlayerIdentity, setLoadedPlayerIdentity] = useState<string | null>(null);
    const isIframeLoading = loadedPlayerIdentity !== playerIdentity;

    useEffect(() => {
        if (!type || !id) return;
        let cancelled = false;
        window.scrollTo(0, 0);

        Promise.all([
            getMediaDetails(type, id),
            getSimilar(type, id),
            getCredits(type, id)
        ]).then(([detailsRes, similarRes, creditsRes]) => {
            if (cancelled) return;
            setDetails(detailsRes);
            setSimilar(similarRes);
            setCredits(creditsRes);
        }).finally(() => {
            if (!cancelled) setLoadedMediaKey(`${type}/${id}`);
        });

        return () => { cancelled = true; };
    }, [type, id]);

    useEffect(() => {
        if (type !== 'tv' || !id) return;
        let cancelled = false;

        getSeasonDetails(id, season)
            .then((data) => { if (!cancelled) setSeasonData(data); })
            .finally(() => { if (!cancelled) setLoadedSeasonKey(`${id}/${season}`); });

        return () => { cancelled = true; };
    }, [id, type, season]);

    useEffect(() => {
        let cancelled = false;
        loadProviders().then((list) => {
            if (cancelled) return;
            setProviders(list);
            // The fetched list may have dropped the selected source; fall back to the first.
            setActiveSourceId((current) => list.some((p) => p.id === current) ? current : list[0].id);
        });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeSource = providers.find((source) => source.id === activeSourceId) ?? providers[0];
    const embedUrl = type && id ? buildEmbedUrl(activeSource, type, id, season, episode) : '';

    const handleEpisodeClick = (s: number, e: number) => {
        setSearchParams({ s: s.toString(), e: e.toString() });
        setIsDropdownOpen(false);
    };

    const handleGenreClick = (genreId: number, genreName: string) => {
        if (!type) return;
        navigate(`/search?gid=${genreId}&gn=${encodeURIComponent(genreName)}&type=${type}`);
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-12 space-y-8 animate-pulse text-center">
                <div className="h-[60vh] bg-white/5 rounded-[2.5rem]" />
            </div>
        );
    }

    const releaseYear = (details?.release_date || details?.first_air_date)?.split('-')[0];
    const runtime = type === 'movie' ? `${details?.runtime}m` : `${details?.number_of_episodes} Episodes`;

    return (
        <div className="min-h-screen pt-24">
            <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 border-b border-white/5 pb-6 md:pb-8">
                    <div className="space-y-2 md:space-y-3 px-2 md:px-0">
                        <h1 className="text-2xl md:text-5xl font-black tracking-tighter italic leading-none text-white">
                            {details?.title || details?.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">
                            <span className="text-accent bg-accent/10 px-2 py-1 rounded border border-accent/20">{type}</span>
                            <span className="text-white/20">/</span>
                            <span className="text-white/60 font-black">{runtime}</span>
                            <span className="text-white/20 invisible md:visible">/</span>
                            <span className="text-white/40">{releaseYear}</span>
                            {type === 'tv' && (
                                <>
                                    <span className="text-white/20 invisible md:visible">/</span>
                                    <span className="text-accent px-2 py-1 rounded bg-accent/5">S{season} E{episode}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 p-1 bg-black rounded-2xl border border-white/5 w-full md:w-fit shadow-2xl overflow-x-auto custom-scrollbar-hidden keep-dark">
                        <div className="flex items-center gap-2 min-w-max px-1 md:px-0">
                            {providers.map((src) => (
                                <button
                                    key={src.id}
                                    onClick={() => setActiveSourceId(src.id)}
                                    className={cn(
                                        "px-4 md:px-5 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all",
                                        activeSourceId === src.id
                                            ? "bg-accent text-brand-secondary shadow-lg shadow-accent/20"
                                            : "text-white/20 hover:text-white"
                                    )}
                                >
                                    {src.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-start">

                    <div className="lg:col-span-3 space-y-8">
                        <div className="group relative">
                            <div className="relative aspect-video w-full overflow-hidden rounded-[2.5rem] bg-black shadow-2xl border border-white/5 transition-all duration-500">
                                {isIframeLoading && (
                                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black gap-4">
                                        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 animate-pulse">Initializing Secure Stream...</p>
                                    </div>
                                )}
                                <iframe
                                    key={playerIdentity}
                                    src={embedUrl}
                                    onLoad={() => setLoadedPlayerIdentity(playerIdentity)}
                                    className={cn(
                                        "h-full w-full transition-opacity duration-1000",
                                        isIframeLoading ? "opacity-0" : "opacity-100"
                                    )}
                                    allowFullScreen
                                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen *"
                                    frameBorder="0"
                                    scrolling="no"
                                    title="Video Player"
                                />
                            </div>

                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all z-10">
                                <button
                                    onClick={() => setPlayerKey(k => k + 1)}
                                    className="p-4 bg-black/60 backdrop-blur-3xl rounded-2xl text-white hover:bg-accent hover:text-brand-secondary transition-all border border-white/5"
                                >
                                    <RefreshCw size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-20">
                            <div className="md:col-span-2 space-y-10">
                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent/60">Storyline</h3>
                                    <p className="text-white/60 text-base md:text-xl leading-relaxed font-medium tracking-tight">
                                        {details?.overview}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2 md:gap-3">
                                    {details?.genres?.map((g: Genre) => (
                                        <button
                                            key={g.id}
                                            onClick={() => handleGenreClick(g.id, g.name)}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border flex items-center gap-2 group/genre",
                                                "bg-white/[0.02] border-white/5 text-white/40 hover:text-white hover:border-white/10 hover:bg-white/5"
                                            )}
                                        >
                                            {g.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-8">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Featured Cast</h3>
                                <div className="space-y-5">
                                    {credits?.cast?.slice(0, 5).map((person: CastMember) => (
                                        <button
                                            key={person.id}
                                            onClick={() => navigate(`/search?sid=${person.id}&sn=${encodeURIComponent(person.name)}`)}
                                            className="flex items-center gap-4 group w-full text-left"
                                        >
                                            <div className="h-14 w-14 rounded-2xl overflow-hidden grayscale group-hover:grayscale-0 transition-all border border-white/10 shadow-2xl shrink-0">
                                                <img
                                                    src={getImageUrl(person.profile_path) || ''}
                                                    alt={person.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-white group-hover:text-accent transition-colors">{person.name}</p>
                                                <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mt-0.5">{person.character}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <aside className="lg:col-span-1 space-y-6 sticky top-28 h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar-hidden pr-2">
                        {type === 'tv' && (
                            <div className="relative mb-8" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-full bg-black text-white border border-white/10 rounded-2xl px-6 py-4 flex items-center justify-between group hover:border-accent transition-all shadow-2xl"
                                >
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Season {season}</span>
                                    <ChevronDown size={18} className={cn("text-white/20 group-hover:text-accent transition-all", isDropdownOpen && "rotate-180")} />
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-black border border-white/10 rounded-2xl overflow-hidden z-[60] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {details?.seasons?.filter((s: Season) => s.season_number > 0).map((s: Season) => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => handleEpisodeClick(s.season_number, 1)}
                                                    className={cn(
                                                        "w-full px-6 py-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/5",
                                                        season === s.season_number ? "text-accent bg-accent/5" : "text-white/40"
                                                    )}
                                                >
                                                    Season {s.season_number}
                                                    {season === s.season_number && <Check size={14} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col gap-6">
                            {type === 'tv' ? (
                                episodesLoading ? (
                                    [...Array(8)].map((_, i) => (
                                        <div key={i} className="h-16 w-full bg-white/5 rounded-2xl animate-pulse" />
                                    ))
                                ) : (
                                    seasonData?.episodes?.map((ep: Episode) => (
                                        <button
                                            key={ep.id}
                                            onClick={() => handleEpisodeClick(season, ep.episode_number)}
                                            className="flex items-start gap-4 text-left group transition-all p-2 rounded-2xl hover:bg-white/[0.02]"
                                        >
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center text-[11px] font-black border transition-all flex-shrink-0",
                                                episode === ep.episode_number
                                                    ? "bg-accent text-brand-secondary border-accent shadow-xl shadow-accent/30 ring-4 ring-accent/10"
                                                    : "bg-white/5 border-white/5 text-white/30 group-hover:text-white group-hover:bg-white/10"
                                            )}>
                                                {ep.episode_number.toString().padStart(2, '0')}
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <span className={cn(
                                                    "text-sm font-black uppercase italic tracking-tighter leading-tight transition-colors line-clamp-1",
                                                    episode === ep.episode_number ? "text-accent" : "text-white/70 group-hover:text-white"
                                                )}>
                                                    {ep.name}
                                                </span>
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.15em] mt-1">EP {ep.episode_number}</p>
                                            </div>
                                        </button>
                                    ))
                                )
                            ) : (
                                similar.slice(0, 15).map((item) => (
                                    <Link
                                        key={item.id}
                                        to={`/watch/${type}/${item.id}`}
                                        className="flex items-start gap-5 group p-2 rounded-2xl hover:bg-white/[0.02] transition-all"
                                    >
                                        <div className="w-32 aspect-video rounded-xl overflow-hidden border border-white/10 flex-shrink-0 shadow-lg bg-white/5 relative">
                                            <img
                                                src={getImageUrl(item.backdrop_path || item.poster_path) || ''}
                                                alt=""
                                                className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                            <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500" />
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <h4 className="text-sm font-black uppercase italic tracking-tighter leading-tight text-white/80 group-hover:text-accent transition-colors line-clamp-2">
                                                {'title' in item ? item.title : item.name}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-black text-white/30 tracking-tighter">
                                                    {('release_date' in item ? item.release_date : item.first_air_date)?.split('-')[0]}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest truncate">
                                                    {item.vote_average?.toFixed(1)} ★
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
