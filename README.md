# Genius MCP Server

A Model Context Protocol (MCP) server designed for interacting with the [Genius API](https://docs.genius.com/). This server enables LLMs and AI applications to search for songs, artists, fetch lyrics, and retrieve metadata from Genius.com through a standardized MCP interface.

## Overview

The Genius MCP Server provides a bridge between AI applications and the Genius API, allowing seamless access to one of the world's largest databases of song lyrics and music metadata. The server is designed to be deployed on Cloudflare Workers, providing a scalable and performant solution for music-related queries.
Since genius.com's api doesn't have a resource to fetch lyrics, we fetch the html of the song's page and scrape the lyrics from the html.

## Features

### Tools

The server exposes the following tools that enable LLMs to execute actions or search for information:

- ~~**`genius-search`** - Search for songs, artists or web pages in genius by title~~
- **`genius-search-song`** - Search for songs by title
- ~~**`genius-search-artist`** - Search for artists by name~~
- **`genius-list-artist-songs`** - List all songs by a specific artist using their ID
- ~~**`genius-get-song-lyrics`** - Fetch lyrics for a song given its ID~~
- ~~**`genius-get-song`** - Fetch song metadata for a song given its ID~~
- ~~**`genius-get-artist`** - Fetch artist metadata given an ID~~

### Resources

The server provides the following resources that can be accessed via URI:

- **`genius-artist`** - Artist information accessible via `genius://artists/{id}`
- **`genius-song`** - Song metadata accessible via `genius://songs/{id}`
- **`genius-song-lyrics`** - Song lyrics accessible via `genius://songs/{id}/lyrics`

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
npm run lint:fix
npm run format
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
