import { McpAgent } from "agents/mcp";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildMakeGeniusRequest, MakeGeniusRequest } from "./utils/makeGeniusRequest";
import { GeniusArtistApiResponse, GeniusArtistSongsApiResponse, GeniusSearchApiResponse, GeniusSongApiResponse } from "./types";
import { scrapeLyrics } from "./utils/scrapeLyrics";

// Define our MCP agent with tools
export class GeniusMcpServer extends McpAgent {
  server = new McpServer({
    name: "genius",
    version: "1.0.0",
  });

  apiToken: string;
  apiBase: string;
  makeGeniusRequest: MakeGeniusRequest;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.apiToken = env.GENIUS_API_KEY;
    this.apiBase = "https://api.genius.com";
    this.makeGeniusRequest = buildMakeGeniusRequest(this.apiBase, this.apiToken);
  }

  async init() {
    this.configureTools();
    this.configureResources();
    this.configurePrompts();
  }

  /**
   * Fetches song details with lyrics for a given song ID
   * @param songId - The numeric ID of the song in Genius
   * @returns Song data object with lyrics
   */
  private async getSongWithLyrics(songId: number) {
    const songResponse = await this.makeGeniusRequest<GeniusSongApiResponse>(
      `/songs/${songId}`,
      undefined
    );

    const songDetails = songResponse?.response?.song;

    if (!songDetails) {
      throw new Error(
        "No song details found for the provided ID or unexpected response from the API."
      );
    }

    const lyrics = await scrapeLyrics(songDetails.url);

    return {
      id: songDetails.id,
      title: songDetails.title,
      artist_names: songDetails.artist_names,
      full_title: songDetails.full_title,
      url: songDetails.url,
      release_date: songDetails.release_date_for_display,
      lyrics_state: songDetails.lyrics_state,
      primary_artist: {
        id: songDetails.primary_artist.id,
        name: songDetails.primary_artist.name,
        url: songDetails.primary_artist.url,
      },
      album: songDetails.album ? {
        name: songDetails.album.name,
        artist_names: songDetails.album.artist_names,
        url: songDetails.album.url,
      } : null,
      stats: songDetails.stats ? {
        pageviews: songDetails.stats.pageviews,
      } : null,
      producers: songDetails.producer_artists?.map((a) => ({
        name: a.name,
        url: a.url,
      })) || [],
      writers: songDetails.writer_artists?.map((a) => ({
        name: a.name,
        url: a.url,
      })) || [],
      samples: songDetails.song_relationships
        ?.filter((rel) => rel.type === "samples")
        .flatMap((rel) =>
          rel.songs.map((s) => ({
            id: s.id,
            title: s.title,
            artist_names: s.artist_names,
            url: s.url,
          }))
        ) || [],
      lyrics: lyrics || null,
    };
  }

  // genius-search-song
  async configureTools() {
    this.server.tool(
      "genius-search-song",
      "Search for songs or web pages in genius",
      {
        q: z
          .string()
          .describe("The song name to search for")
          .default('All my life'),
      },
      async ({ q }) => {
        try {
          const searchResponse = await this.makeGeniusRequest<GeniusSearchApiResponse>(
            `/search`,
            new URLSearchParams({ q })
          );

          const hits = searchResponse?.response?.hits;

          if (!hits || hits.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    query: q,
                    results: [],
                    message: `No results found in Genius for "${q}".`,
                  }, null, 2),
                },
              ],
            };
          }

          const formattedResults = hits.map((hit) => {
            const result = hit.result;
            switch (hit.type) {
              case "song":
                return {
                  type: "song",
                  id: result.id,
                  title: result.title,
                  artist_names: result.artist_names,
                  url: result.url,
                  primary_artist: {
                    id: result.primary_artist.id,
                    name: result.primary_artist.name,
                    url: result.primary_artist.url,
                  },
                };
              case "artist":
                return {
                  type: "artist",
                  id: result.id,
                  name: result.name,
                  url: result.url,
                };
              case "web_page":
                return {
                  type: "web_page",
                  id: result.id,
                  title: result.title || result.url,
                  url: result.url,
                };
              default:
                return {
                  type: hit.type,
                  id: result.id,
                };
            }
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  query: q,
                  results: formattedResults,
                  count: formattedResults.length,
                }, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: true,
                  message: `Error executing search in Genius: ${error.message}`,
                  query: q,
                }, null, 2),
              },
            ],
          };
        }
      }
    );

    this.server.tool('genius-song-lyrics', `Get a song's lyrics by song id`, {
      songId: z.number().describe("The numeric ID of the song in Genius.").default(378195),
    }, async ({ songId }) => {
      console.info(`Reading the song lyrics resource genius://songs/${songId}/lyrics`);

      try {
        const songData = await this.getSongWithLyrics(songId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(songData, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error(
          `Error reading the song resource genius://songs/${songId}: ${error.message}`
        );
        throw new Error(
          `Could not read the song resource ${songId}: ${error.message}`
        );
      }
    });

    // genius-list-artist-songs
    this.server.tool(
      "genius-list-artist-songs",
      "List songs of an artist in Genius by their ID",
      {
        artistId: z.number().describe("The numeric ID of the artist in Genius.").default(21964),
        sort: z
          .enum(["title", "popularity"])
          .optional()
          .describe("Sorting criterion: 'title' (alphabetical) or 'popularity'."),
        page: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Number of page for pagination (starting at 1)."),
        perPage: z
          .number()
          .int()
          .positive()
          .max(50)
          .optional()
          .describe("Number of results per page (maximum 50)."),
      },
      async ({ artistId, sort, page, perPage }) => {
        try {
          const params = new URLSearchParams();
          if (sort) params.append("sort", sort);
          if (page) params.append("page", page.toString());
          if (perPage) params.append("per_page", perPage.toString());

          const songsResponse =
            await this.makeGeniusRequest<GeniusArtistSongsApiResponse>(
              `/artists/${artistId}/songs`,
              params
            );

          const songs = songsResponse?.response?.songs;

          if (!songs || songs.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    artist_id: artistId,
                    songs: [],
                    message: `No songs found for artist with ID ${artistId} (or the ID is invalid).`,
                  }, null, 2),
                },
              ],
            };
          }

          const formattedSongs = songs.map((song) => ({
            id: song.id,
            title: song.title,
            artist_names: song.artist_names,
            url: song.url,
            full_title: song.full_title,
            release_date: song.release_date_for_display,
            lyrics_state: song.lyrics_state,
          }));

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  artist_id: artistId,
                  songs: formattedSongs,
                  count: formattedSongs.length,
                  sort: sort || null,
                  page: page || null,
                  per_page: perPage || null,
                }, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: true,
                  message: `Error listing songs for artist ${artistId}: ${error.message}`,
                  artist_id: artistId,
                }, null, 2),
              },
            ],
          };
        }
      }
    );


  }


  async configureResources() {
    this.server.resource(
      "genius-song",
      new ResourceTemplate("genius://songs/{id}", { list: undefined }),
      async (uri, { id }) => {
        const songId = id;

        console.error(`Reading the song resource genius://songs/${songId}`);

        try {
          const songResponse = await this.makeGeniusRequest<GeniusSongApiResponse>(
            `/songs/${songId}`,
            undefined
          );

          const songDetails = songResponse?.response?.song;

          if (!songDetails) {
            throw new Error(
              "No song details found for the provided ID or unexpected response from the API."
            );
          }
          const songData = {
            id: songDetails.id,
            title: songDetails.title,
            artist_names: songDetails.artist_names,
            full_title: songDetails.full_title,
            url: songDetails.url,
            release_date: songDetails.release_date_for_display,
            lyrics_state: songDetails.lyrics_state,
            primary_artist: {
              id: songDetails.primary_artist.id,
              name: songDetails.primary_artist.name,
              url: songDetails.primary_artist.url,
            },
            album: songDetails.album ? {
              name: songDetails.album.name,
              artist_names: songDetails.album.artist_names,
              url: songDetails.album.url,
            } : null,
            stats: songDetails.stats ? {
              pageviews: songDetails.stats.pageviews,
            } : null,
            producers: songDetails.producer_artists?.map((a) => ({
              name: a.name,
              url: a.url,
            })) || [],
            writers: songDetails.writer_artists?.map((a) => ({
              name: a.name,
              url: a.url,
            })) || [],
            samples: songDetails.song_relationships
              ?.filter((rel) => rel.type === "samples")
              .flatMap((rel) =>
                rel.songs.map((s) => ({
                  id: s.id,
                  title: s.title,
                  artist_names: s.artist_names,
                  url: s.url,
                }))
              ) || [],
          };

          return {
            contents: [
              {
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(songData, null, 2),
              },
            ],
          };
        } catch (error: any) {
          console.error(
            `Error reading the song resource genius://songs/${songId}: ${error.message}`
          );
          throw new Error(
            `Could not read the song resource ${songId}: ${error.message}`
          );
        }
      }
    );

    this.server.resource(
      "genius-song-lyrics",
      new ResourceTemplate("genius://songs/{id}/lyrics", { list: undefined }),
      async (uri, { id }) => {
        const songId = typeof id === 'string' ? parseInt(id, 10) : Array.isArray(id) ? parseInt(id[0], 10) : id;

        if (isNaN(songId)) {
          throw new Error(`Invalid song ID: ${id}`);
        }

        console.error(`Reading the song lyrics resource genius://songs/${songId}/lyrics`);

        try {
          const songData = await this.getSongWithLyrics(songId);

          return {
            contents: [
              {
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(songData, null, 2),
              },
            ],
          };
        } catch (error: any) {
          console.error(
            `Error reading the song resource genius://songs/${songId}: ${error.message}`
          );
          throw new Error(
            `Could not read the song resource ${songId}: ${error.message}`
          );
        }
      }
    );


    this.server.resource(
      "genius-artist",
      new ResourceTemplate("genius://artists/{id}", { list: undefined }),
      async (uri, { id }) => {
        const artistId = id;

        console.error(`Reading the artist resource genius://artists/${artistId}`);

        try {
          const artistResponse = await this.makeGeniusRequest<GeniusArtistApiResponse>(
            `/artists/${artistId}`,
            undefined
          );

          const artistDetails = artistResponse?.response?.artist;

          if (!artistDetails) {
            throw new Error(
              "No artist details found for the provided ID or unexpected response from the API."
            );
          }

          const artistData = {
            id: artistDetails.id,
            name: artistDetails.name,
            url: artistDetails.url,
            description: {
              plain: artistDetails.description?.plain || null,
              html: artistDetails.description?.html || null,
            },
          };

          return {
            contents: [
              {
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(artistData, null, 2),
              },
            ],
          };
        } catch (error: any) {
          console.error(
            `Error reading the artist resource genius://artists/${artistId}: ${error.message}`
          );
          throw new Error(
            `Could not read the artist resource ${artistId}: ${error.message}`
          );
        }
      }
    );
  }


  async configurePrompts() {
    this.server.prompt(
      "genius-search-prompt",
      "Prepare a query to search for content in Genius.", {
        // We can add an optional argument for the initial search term if the client supports prompts with arguments
        initialQuery: z
          .string()
          .optional()
          .describe("An initial search term to include in the prompt."),
      },
      ({ initialQuery }) => {
        const queryText = initialQuery ? ` sobre "${initialQuery}"` : "";
        return {
          description: "This prompt helps you search in Genius.",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Please help me find information in Genius${queryText}. What do you want to search for?`,
              },
            },
          ],
        };
      }
    );
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return GeniusMcpServer.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      return GeniusMcpServer.serve("/mcp").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};
