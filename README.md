# Genius MCP Server

A Model Context Protocol (MCP) server designed for interacting with the [Genius API](https://docs.genius.com/). This server enables LLMs and AI applications to search for songs, artists, fetch lyrics, and retrieve metadata from Genius.com through a standardized MCP interface.

## Overview

The Genius MCP Server provides a bridge between AI applications and the Genius API, allowing seamless access to one of the world's largest databases of song lyrics and music metadata. The server is designed to be deployed on Cloudflare Workers, providing a scalable and performant solution for music-related queries.

**Note:** Since Genius.com's API doesn't provide lyrics directly, the server fetches the HTML of the song's page and scrapes the lyrics from it.

**Response Format:** All tools and resources return data in JSON format for easy programmatic consumption.

## Features

### Tools

The server exposes the following tools that enable LLMs to execute actions or search for information:

- **`genius-search-song`** - Search for songs, artists, or web pages in Genius
  - Parameters: `q` (string) - The search query
  - Returns: JSON with search results including songs, artists, and web pages

- **`genius-song-lyrics`** - Get a song's lyrics and complete metadata by song ID
  - Parameters: `songId` (number) - The Genius song ID
  - Returns: JSON with complete song data including lyrics, metadata, producers, writers, samples, etc.

- **`genius-list-artist-songs`** - List songs of an artist by their ID
  - Parameters: 
    - `artistId` (number, required) - The Genius artist ID
    - `sort` (optional) - "title" or "popularity"
    - `page` (optional) - Page number for pagination
    - `perPage` (optional) - Results per page (max 50)
  - Returns: JSON with list of songs and pagination info

### Resources

The server provides the following resources that can be accessed via URI (all return JSON format):

- **`genius-artist`** - Artist information accessible via `genius://artists/{id}`
  - Returns: JSON with artist ID, name, URL, and description

- **`genius-song`** - Song metadata accessible via `genius://songs/{id}`
  - Returns: JSON with song metadata (title, artist, album, stats, producers, writers, samples) without lyrics

- **`genius-song-lyrics`** - Song lyrics and metadata accessible via `genius://songs/{id}/lyrics`
  - Returns: JSON with complete song data including lyrics (scraped from HTML)

### Prompts

- **`genius-search-prompt`** - Helper prompt to prepare a query for searching Genius
  - Parameters: `initialQuery` (string, optional) - An initial search term to include

## Prerequisites

To use this MCP server, you need:

1. A Genius API key (Client Access Token)
   - Sign up at [https://genius.com/api-clients](https://genius.com/api-clients)
   - Create a new API client to obtain your access token

2. A Cloudflare account (for deployment)
   - Sign up at [https://dash.cloudflare.com/](https://dash.cloudflare.com/)

## Setup

1. Clone this repository:
```bash
git clone <repository-url>
cd genius-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Configure your Genius API key:
   - Add your Genius API key to your Cloudflare Workers environment variables
   - Or configure it in `wrangler.toml` for local development

4. Run locally (development):
```bash
npm run dev 
```

5. Deploy to Cloudflare Workers:  
```bash
npm run deploy
```

## Development

### Local Development

Run the server locally:
```bash
npm run dev
```

This will start a local development server that you can test with MCP clients.

### Type Checking

```bash
npm run type-check
```

### Linting and Formatting

```bash
npm run lint          # Run ESLint
npm run lint:fix      # Run ESLint with auto-fix
npm run lint:biome    # Run Biome linter
npm run format        # Format code with Biome
```

## Usage

### Connecting from Cloudflare AI Playground

1. Deploy your server to Cloudflare Workers
2. Go to [https://playground.ai.cloudflare.com/](https://playground.ai.cloudflare.com/)
3. Enter your deployed MCP server URL (e.g., `genius-mcp.<your-account>.workers.dev/sse`)
4. Use the Genius tools directly from the playground

### Connecting using inspector

1. Run the server locally
2. In another terminal window, run `DANGEROUSLY_OMIT_AUTH=true npx @modelcontextprotocol/inspector@latest`
3. In the inspector, enter the URL of the local server (e.g., `http://localhost:8787/sse`)

### Connecting from Claude Desktop

You can connect to your remote MCP server from Claude Desktop using the [mcp-remote proxy](https://www.npmjs.com/package/mcp-remote).

1. Follow [Anthropic's Quickstart](https://modelcontextprotocol.io/quickstart/user)
2. In Claude Desktop, go to Settings > Developer > Edit Config
3. Add your server configuration:

```json
{
  "mcpServers": {
    "genius": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://genius-mcp.<your-account>.workers.dev/sse"
      ]
    }
  }
}
```

4. Restart Claude Desktop

## API Reference

### Genius API Documentation

For detailed information about the Genius API endpoints and data structures, refer to the [official Genius API documentation](https://docs.genius.com/).

## Architecture

This MCP server is built using:
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk) - For MCP server implementation
- [Cloudflare Workers](https://workers.cloudflare.com/) - For serverless deployment
- [Zod](https://zod.dev/) - For schema validation

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]

## Support

For issues and questions:
- Open an issue on GitHub
- Check the [Genius API documentation](https://docs.genius.com/)
- Review the [MCP documentation](https://modelcontextprotocol.io/)
