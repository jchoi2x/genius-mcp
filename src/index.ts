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
                  text: `No results found in Genius for "${q}".`,
                },
              ],
            };
          }

          const formattedResults = hits
            .map((hit) => {
              const result = hit.result;
              switch (hit.type) {
                case "song":
                  return `Song: "${result.title}" by ${result.artist_names} (ID: ${result.id}, URL: ${result.url}), Artist ID: ${result.primary_artist.id}, Artist Name: ${result.primary_artist.name}, Artist URL: ${result.primary_artist.url}`;
                case "artist":
                  return `Artist: ${result.name} (ID: ${result.id}, URL: ${result.url})`;
                case "web_page":
                  return `Web Page: "${result.title || result.url}" (ID: ${result.id}, URL: ${result.url})`;
                default:
                  return `Unknown result (${hit.type}): ID ${result.id}`;
              }
            })
            .join("\n---\n");

          return {
            content: [
              {
                type: "text",
                text: `Search results for "${q}":\n\n${formattedResults}`,
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error executing search in Genius: ${error.message}`,
              },
            ],
          };
        }
      }
    );

    this.server.tool('genius-song-lyrics', `Get a song's lyrics by song id`, {
      songId: z.number().describe("The numeric ID of the song in Genius.").default(378195),
    }, async ({ songId }) => {

      console.error(`Reading the song lyrics resource genius://songs/${songId}/lyrics`);

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
        const producerNames =
          songDetails.producer_artists?.map((a) => a.name).join(", ") ||
          "No producers listed";
        const writerNames =
          songDetails.writer_artists?.map((a) => a.name).join(", ") ||
          "No writers listed";
        const samplesUsed = songDetails.song_relationships
          ?.filter((rel) => rel.type === "samples")
          .flatMap((rel) =>
            rel.songs.map((s) => `"${s.title}" por ${s.artist_names}`)
          )
          .join(", ");
        const lyrics = await scrapeLyrics(songDetails.url);

        const plainTextContent = `
          Title: ${songDetails.title || "Unknown"}
          Artist(s): ${songDetails.artist_names || "Unknown"}
          Artist IDs: ${songDetails.primary_artist.id || "Unknown"}
          Full Title: ${songDetails.full_title || "Unknown"}
          ID: ${songDetails.id || "Unknown"}
          URL: ${songDetails.url || "Unknown"}
          Fecha de lanzamiento: ${songDetails.release_date_for_display || "Unknown"}
          Album: ${songDetails.album?.name || "Unknown"} by ${songDetails.album?.artist_names || "Unknown Artist"}
          Views: ${songDetails.stats?.pageviews?.toLocaleString() || "Unknown"}
          Lyrics State: ${songDetails.lyrics_state || "Unknown"}
          Producers: ${producerNames}
          Writers: ${writerNames}
          Samples used: ${samplesUsed || "None"}
          Lyrics: \n${lyrics ? lyrics : "None"}
        `.trim();

        return {
          content: [
            {
              type: "text",
              text: plainTextContent,
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
                  text: `No songs found for artist with ID ${artistId} (or the ID is invalid).`,
                },
              ],
            };
          }

          const formattedSongs = songs
            .map(
              (song) =>
                `"${song.title}" por ${song.artist_names} (ID: ${song.id}, URL: ${song.url})`
            )
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Songs for artist with ID ${artistId}:\n${formattedSongs}`,
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error listing songs for artist ${artistId}: ${error.message}`,
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
          const producerNames =
            songDetails.producer_artists?.map((a) => a.name).join(", ") ||
            "No producers listed";
          const writerNames =
            songDetails.writer_artists?.map((a) => a.name).join(", ") ||
            "No writers listed";
          const samplesUsed = songDetails.song_relationships
            ?.filter((rel) => rel.type === "samples")
            .flatMap((rel) =>
              rel.songs.map((s) => `"${s.title}" por ${s.artist_names}`)
            )
            .join(", ");
          const plainTextContent = `
      Title: ${songDetails.title || "Unknown"}
      Artist(s): ${songDetails.artist_names || "Unknown"}
      Full Title: ${songDetails.full_title || "Unknown"}
      ID: ${songDetails.id || "Unknown"}
      URL: ${songDetails.url || "Unknown"}
      Fecha de lanzamiento: ${songDetails.release_date_for_display || "Unknown"
            }
      Album: ${songDetails.album?.name || "Unknown"} by ${songDetails.album?.artist_names || "Unknown Artist"
            }
      Views: ${songDetails.stats?.pageviews?.toLocaleString() || "Unknown"}
      Lyrics State: ${songDetails.lyrics_state || "Unknown"}
      Producers: ${producerNames}
      Writers: ${writerNames}
      Samples used: ${samplesUsed || "None"}
      `.trim();

          return {
            contents: [
              {
                uri: uri.href,
                mimeType: "text/plain",
                text: plainTextContent,
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
        const songId = id;

        console.error(`Reading the song lyrics resource genius://songs/${songId}/lyrics`);

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
          const producerNames =
            songDetails.producer_artists?.map((a) => a.name).join(", ") ||
            "No producers listed";
          const writerNames =
            songDetails.writer_artists?.map((a) => a.name).join(", ") ||
            "No writers listed";
          const samplesUsed = songDetails.song_relationships
            ?.filter((rel) => rel.type === "samples")
            .flatMap((rel) =>
              rel.songs.map((s) => `"${s.title}" por ${s.artist_names}`)
            )
            .join(", ");
          const lyrics = await scrapeLyrics(songDetails.url);

          // Formatear detalles en texto plano para fácil consumo por LLM
          const plainTextContent = `
      Title: ${songDetails.title || "Unknown"}
      Artist(s): ${songDetails.artist_names || "Unknown"}
      Artist IDs: ${songDetails.primary_artist.id || "Unknown"}
      Full Title: ${songDetails.full_title || "Unknown"}
      ID: ${songDetails.id || "Unknown"}
      URL: ${songDetails.url || "Unknown"}
      Fecha de lanzamiento: ${songDetails.release_date_for_display || "Unknown"
            }
      Album: ${songDetails.album?.name || "Unknown"} by ${songDetails.album?.artist_names || "Unknown Artist"
            }
      Views: ${songDetails.stats?.pageviews?.toLocaleString() || "Unknown"}
      Lyrics State: ${songDetails.lyrics_state || "Unknown"}
      Producers: ${producerNames}
      Writers: ${writerNames}
      Samples used: ${samplesUsed || "None"}
      Lyrics: \n${lyrics ? lyrics : "None"}
      `.trim();

          return {
            contents: [
              {
                uri: uri.href,
                mimeType: "text/plain",
                text: plainTextContent,
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

          const plainTextContent = `
  Artist: ${artistDetails.name}
  ID: ${artistDetails.id}
  URL: ${artistDetails.url}
  Description (plain text): ${artistDetails.description?.plain || "Not available"
            }
  `.trim();

          return {
            contents: [
              {
                uri: uri.href,
                mimeType: "text/plain",
                text: plainTextContent,
              },
            ],
            // {
            //   uri: uri.href,
            //   mimeType: "application/json",
            //   text: JSON.stringify(artistDetails, null, 2)
            // }
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
      "Prepare a query to search for content in Genius.",
      {
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
