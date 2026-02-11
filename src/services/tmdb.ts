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

export const searchMedia = async (query: string): Promise<Media[]> => {
    const { data } = await tmdbApi.get<TMDBResponse<Media>>('/search/multi', {
        params: { query },
    });
    return data.results;
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

export const getImageUrl = (path: string, size: 'w500' | 'original' = 'w500') =>
    path ? `${IMAGE_BASE_URL}/${size}${path}` : null;

export const getEmbedUrl = (
    type: 'movie' | 'tv',
    id: string,
    season?: number,
    episode?: number,
    source: string = 'vidsrc.dev'
) => {
    if (type === 'movie') {
        return `https://${source}/embed/movie/${id}`;
    }
    return `https://${source}/embed/tv/${id}/${season || 1}/${episode || 1}`;
};
