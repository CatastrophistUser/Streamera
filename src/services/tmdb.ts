import axios from 'axios';
import type { TMDBResponse, Media } from '@/types/tmdb';

const TMDB_ACCESS_TOKEN = import.meta.env.VITE_TMDB_ACCESS_TOKEN;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

const tmdbApi = axios.create({
    baseURL: BASE_URL,
    headers: {
        Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
        Accept: 'application/json',
    },
});

export const getTrending = async (type: 'movie' | 'tv' | 'all' = 'all', page: number = 1): Promise<Media[]> => {
    const { data } = await tmdbApi.get<TMDBResponse<Media>>(`/trending/${type}/day`, {
        params: { page }
    });
    return data.results;
};

export const getDiscover = async (type: 'movie' | 'tv', page: number = 1): Promise<Media[]> => {
    const { data } = await tmdbApi.get<TMDBResponse<Media>>(`/discover/${type}`, {
        params: {
            page,
            sort_by: 'popularity.desc',
            'vote_count.gte': 100
        }
    });
    return data.results;
};

export const getByGenre = async (type: 'movie' | 'tv', genreId: number, page: number = 1): Promise<Media[]> => {
    const { data } = await tmdbApi.get<TMDBResponse<Media>>(`/discover/${type}`, {
        params: {
            page,
            with_genres: genreId,
            sort_by: 'popularity.desc',
            'vote_count.gte': 50
        }
    });
    return data.results;
};

export const searchMedia = async (query: string, page: number = 1): Promise<Media[]> => {
    const { data } = await tmdbApi.get<TMDBResponse<Media>>('/search/multi', {
        params: { query, page },
    });
    return data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
};

export const getMediaDetails = async (type: 'movie' | 'tv', id: string) => {
    const { data } = await tmdbApi.get(`/${type}/${id}`);
    return data;
};

export const getSeasonDetails = async (id: string, seasonNumber: number) => {
    const { data } = await tmdbApi.get(`/tv/${id}/season/${seasonNumber}`);
    return data;
};

export const getSimilar = async (type: 'movie' | 'tv', id: string): Promise<Media[]> => {
    const { data } = await tmdbApi.get<TMDBResponse<Media>>(`/${type}/${id}/similar`);
    return data.results;
};

export const getCredits = async (type: 'movie' | 'tv', id: string) => {
    const { data } = await tmdbApi.get(`/${type}/${id}/credits`);
    return data;
};

export const getPersonCredits = async (id: string): Promise<Media[]> => {
    const { data } = await tmdbApi.get(`/person/${id}/combined_credits`);
    return data.cast.sort((a: any, b: any) => b.popularity - a.popularity);
};

export const getImageUrl = (path: string, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w300') =>
    path ? `${IMAGE_BASE_URL}/${size}${path}` : null;

export const getEmbedUrl = (
    type: 'movie' | 'tv',
    id: string,
    season?: number,
    episode?: number,
    source: string = 'vidsrc.xyz'
) => {
    if (source.includes('multiembed')) {
        const baseUrl = `https://multiembed.mov?video_id=${id}&tmdb=1`;
        return type === 'movie' ? baseUrl : `${baseUrl}&s=${season || 1}&e=${episode || 1}`;
    }

    if (source.includes('vidlink')) {
        return type === 'movie'
            ? `https://vidlink.pro/movie/${id}`
            : `https://vidlink.pro/tv/${id}/${season || 1}/${episode || 1}`;
    }

    if (source.includes('superembed')) {
        return type === 'movie'
            ? `https://superembed.stream/movie/${id}`
            : `https://superembed.stream/tv/${id}/${season || 1}/${episode || 1}`;
    }

    if (type === 'movie') {
        return `https://${source}/embed/movie/${id}`;
    }
    return `https://${source}/embed/tv/${id}/${season || 1}/${episode || 1}`;
};
