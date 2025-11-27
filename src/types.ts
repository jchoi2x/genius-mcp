export interface GeniusApiResponse<T> {
  meta: { status: number; message?: string };
  response: T;
}

export interface SearchHitResult {
  id: number;
  title?: string;
  name?: string;
  artist_names?: string;
  url: string;
  primary_artist: {
    id: number;
    name: string;
    api_path: string;
    image_url: string;
    url: string;
  };
}

export interface SearchHit {
  highlights: any[];
  index: "song" | "artist" | "web_page";
  type: "song" | "artist" | "web_page";
  result: SearchHitResult;
}

export interface GeniusSearchResponseData {
  hits: SearchHit[];
}

export type GeniusSearchApiResponse = GeniusApiResponse<GeniusSearchResponseData>;

export interface SongDetails {
  id: number;
  title: string;
  artist_names: string;
  full_title: string;
  url: string;
  release_date_for_display?: string;
  lyrics_state: string;

  description_annotation?: {
    annotations: Array<{
      id: number;
      body: {
        plain?: string;
        html?: string;
        dom?: any;
      };
    }>;
  };

  album?: {
    name: string;
    artist_names?: string;
    url: string;
  };
  stats?: {
    pageviews?: number;
  };
  primary_artist: {
    name: string;
    id: number;
    url: string;
  },
  producer_artists?: Array<{ name: string; url?: string }>;
  writer_artists?: Array<{ name: string; url?: string }>;
  song_relationships?: Array<{
    type: string;
    songs: Array<{
      id: number;
      title: string;
      artist_names: string;
      url?: string;
    }>;
  }>;
  media?: Array<{
    provider: string;
    type: string;
    url: string;
  }>;
}

export interface GeniusSongResponseData {
  song: SongDetails;
}

export type GeniusSongApiResponse = GeniusApiResponse<GeniusSongResponseData>;

export interface ArtistDetails {
  id: number;
  name: string;
  url: string;
  description?: { plain?: string; html?: string; dom?: any };
}

export interface GeniusArtistResponseData {
  artist: ArtistDetails;
}

export type GeniusArtistApiResponse = GeniusApiResponse<GeniusArtistResponseData>;

export interface ArtistSongsResponseData {
  songs: SongDetails[];
}

export interface SongResponseData {
  song: SongDetails;
}


export type GeniusArtistSongsApiResponse = GeniusApiResponse<ArtistSongsResponseData>;

export interface WebPageDetails {
  id: number;
  url: string;
  canonical_url?: string;
  og_url?: string;
  title?: string;
  annotation_count?: number;
}

export interface GeniusWebPageLookupResponseData {
  web_page: WebPageDetails;
}

export type GeniusWebPageLookupApiResponse =
  GeniusApiResponse<GeniusWebPageLookupResponseData>;

export interface ReferentAnnotation {
  id: number;
  body: { plain?: string };
}

export interface ReferentDetails {
  id: number;
  url: string;
  annotations: ReferentAnnotation[];
  fragment: string;
  path: string;
  song_id?: number;
  web_page_id?: number;
}

export interface GeniusReferentsResponseData {
  referents: ReferentDetails[];
}

export type GeniusReferentsApiResponse =
  GeniusApiResponse<GeniusReferentsResponseData>;

export interface AccountDetails {
}

export interface GeniusAccountResponseData {
  user: AccountDetails;
}

export type GeniusAccountApiResponse = GeniusApiResponse<GeniusAccountResponseData>;
