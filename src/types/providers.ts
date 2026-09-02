export interface Provider {
    id: string;
    label: string;
    host: string;
    /** Movie embed URL template. Supports {host} and {id}. */
    movie: string;
    /** TV embed URL template. Supports {host}, {id}, {season} and {episode}. */
    tv: string;
}

export interface ProvidersConfig {
    version: number;
    providers: Provider[];
}
