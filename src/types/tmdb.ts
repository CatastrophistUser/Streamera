export interface Movie {
    id: number;
    title: string;
    overview: string;
    poster_path: string;
    backdrop_path: string;
    release_date: string;
    vote_average: number;
    media_type: 'movie';
}

export interface TVShow {
    id: number;
    name: string;
    overview: string;
    poster_path: string;
    backdrop_path: string;
    first_air_date: string;
    vote_average: number;
    media_type: 'tv';
}

export type Media = Movie | TVShow;

export interface TMDBResponse<T> {
    page: number;
    results: T[];
    total_pages: number;
    total_results: number;
}

export interface Genre {
    id: number;
    name: string;
}

export interface Season {
    id: number;
    season_number: number;
    name: string;
    episode_count?: number;
}

export interface Episode {
    id: number;
    episode_number: number;
    name: string;
    overview?: string;
    still_path?: string | null;
    runtime?: number | null;
}

export interface SeasonDetails {
    id: number;
    season_number: number;
    episodes?: Episode[];
}

export interface CastMember {
    id: number;
    name: string;
    character?: string;
    profile_path?: string | null;
    popularity?: number;
}

export interface Credits {
    id: number;
    cast?: CastMember[];
}

/**
 * Detail payloads from `/movie/{id}` and `/tv/{id}`. TMDB returns a different
 * field set per media type and the watch page reads across both, so the
 * type-specific fields are optional rather than split into a union.
 */
export interface MediaDetails {
    id: number;
    overview?: string;
    backdrop_path?: string | null;
    poster_path?: string | null;
    vote_average?: number;
    genres?: Genre[];
    // movie
    title?: string;
    release_date?: string;
    runtime?: number | null;
    // tv
    name?: string;
    first_air_date?: string;
    number_of_episodes?: number;
    seasons?: Season[];
}
