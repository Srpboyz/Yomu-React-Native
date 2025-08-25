export interface ReduxState {
    httpAddress?: string
    websocketAddress?: string
    readerDirection: ReaderDirection
    sources: Source[]
}

export interface Filter {
    key: string;
    display_name: string;
    type: "CHECKBOX" | "LIST";
    value: any;
    options?: any
}

export interface Source {
    id: number;
    name: string;
    base_url: string;
    has_filters: boolean;
    filters: Filter[];
    supports_latest: boolean;
    supports_search: boolean;
    rate_limit: { rate: number; per: number; unit: string }
}

export interface Category {
    id: number;
    name: string;
    mangas: Manga[]
}

export interface Manga {
    id: number;
    source: number;
    title: string;
    description: string;
    author: string | null;
    artist: string | null;
    thumbnail: string | null;
    library: boolean;
    initialized: boolean;
}

export interface Chapter {
    id: number;
    manga: number;
    number: number;
    title: string | null;
    uploaded: number;
    downloaded: boolean;
    read: boolean;
    url: string;
}

export enum ReaderDirection {
    Vertical = "Vertical",
    RightToLeft = "Right-To-Left",
    LeftToRight = "Left-To-Right",
}