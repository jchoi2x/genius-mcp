# Product Requirements Document (PRD)
## Genius MCP Server

### 1. Overview

#### 1.1 Purpose
This document defines the requirements for a Model Context Protocol (MCP) server that provides AI applications with access to the Genius API, enabling them to search for songs, artists, fetch lyrics, and retrieve music metadata.

**Note:** All tools and resources return data in JSON format for structured, programmatic consumption. Since Genius.com's API doesn't provide lyrics directly, the server scrapes lyrics from HTML pages when needed.

#### 1.2 Goals
- Provide a standardized MCP interface to the Genius API
- Enable LLMs to interact with Genius music data through tools and resources
- Deploy as a scalable serverless solution on Cloudflare Workers
- Maintain high performance and reliability
- Return structured JSON responses for easy parsing and integration

#### 1.3 Target Users
- AI application developers
- LLM-powered applications requiring music data
- Developers building music-related AI features

### 2. Features and Requirements

#### 2.1 Tools

##### 2.1.1 `genius-search-song`
**Purpose:** Search for songs, artists, or web pages in Genius

**Input Parameters:**
- `q` (string, required): The search query (song name, artist name, etc.). Default: "All my life"

**Output:**
- JSON object containing:
  - `query`: The search query used
  - `results`: Array of search results (songs, artists, or web pages) with:
    - `type`: Result type ("song", "artist", or "web_page")
    - `id`: Genius ID
    - `title`/`name`: Title or name
    - `artist_names`: Artist names (for songs)
    - `url`: Genius URL
    - `primary_artist`: Primary artist info (for songs)
  - `count`: Number of results

**Success Criteria:**
- Returns relevant matches from Genius API (songs, artists, web pages)
- Handles API errors gracefully
- Returns empty results array when no matches found
- Returns results in JSON format

##### 2.1.2 `genius-song-lyrics`
**Purpose:** Get a song's lyrics and metadata by song ID

**Input Parameters:**
- `songId` (number, required): The numeric ID of the song in Genius. Default: 378195

**Output:**
- JSON object containing complete song data including:
  - `id`: Song ID
  - `title`: Song title
  - `artist_names`: Artist names
  - `full_title`: Full title
  - `url`: Genius URL
  - `release_date`: Release date
  - `lyrics_state`: Lyrics availability state
  - `primary_artist`: Primary artist information
  - `album`: Album information (if available)
  - `stats`: Statistics (pageviews, etc.)
  - `producers`: Array of producer information
  - `writers`: Array of writer information
  - `samples`: Array of sampled songs
  - `lyrics`: Song lyrics (scraped from HTML, null if unavailable)

**Success Criteria:**
- Returns complete song metadata with lyrics
- Handles songs with incomplete or unavailable lyrics
- Scrapes lyrics from Genius HTML when API doesn't provide them
- Returns appropriate error for invalid song IDs

##### 2.1.3 `genius-list-artist-songs`
**Purpose:** List songs of an artist in Genius by their ID

**Input Parameters:**
- `artistId` (number, required): The numeric ID of the artist in Genius. Default: 21964
- `sort` (enum, optional): Sorting criterion - "title" (alphabetical) or "popularity"
- `page` (number, optional): Page number for pagination (starting at 1)
- `perPage` (number, optional): Number of results per page (maximum 50)

**Output:**
- JSON object containing:
  - `artist_id`: The artist ID queried
  - `songs`: Array of songs with:
    - `id`: Song ID
    - `title`: Song title
    - `artist_names`: Artist names
    - `url`: Genius URL
    - `full_title`: Full title
    - `release_date`: Release date
    - `lyrics_state`: Lyrics availability state
  - `count`: Number of songs returned
  - `sort`: Sort option used (or null)
  - `page`: Page number (or null)
  - `per_page`: Results per page (or null)

**Success Criteria:**
- Returns all songs associated with the artist
- Supports pagination and sorting
- Returns empty songs array for artists with no songs or invalid IDs
- Handles API errors gracefully

#### 2.2 Resources

##### 2.2.1 `genius-artist`
**URI Pattern:** `genius://artists/{id}`

**Purpose:** Provide read-only access to artist information

**Content Format:**
- JSON format (`application/json`) containing:
  - `id`: Artist ID
  - `name`: Artist name
  - `url`: Genius URL
  - `description`: Object with `plain` and `html` description fields

**Success Criteria:**
- Returns artist information in JSON format when valid ID provided
- Returns appropriate error for invalid IDs
- Does not support resource listing

##### 2.2.2 `genius-song`
**URI Pattern:** `genius://songs/{id}`

**Purpose:** Provide read-only access to song metadata (without lyrics)

**Content Format:**
- JSON format (`application/json`) containing:
  - `id`: Song ID
  - `title`: Song title
  - `artist_names`: Artist names
  - `full_title`: Full title
  - `url`: Genius URL
  - `release_date`: Release date
  - `lyrics_state`: Lyrics availability state
  - `primary_artist`: Primary artist information
  - `album`: Album information (if available)
  - `stats`: Statistics (pageviews, etc.)
  - `producers`: Array of producer information
  - `writers`: Array of writer information
  - `samples`: Array of sampled songs

**Success Criteria:**
- Returns song metadata in JSON format when valid ID provided
- Returns appropriate error for invalid IDs
- Does not include lyrics (use `genius-song-lyrics` resource for that)
- Does not support resource listing

##### 2.2.3 `genius-song-lyrics`
**URI Pattern:** `genius://songs/{id}/lyrics`

**Purpose:** Provide read-only access to song metadata with lyrics

**Content Format:**
- JSON format (`application/json`) containing all song metadata plus:
  - `lyrics`: Song lyrics (scraped from HTML, null if unavailable)

**Success Criteria:**
- Returns song metadata with lyrics in JSON format when valid ID provided
- Scrapes lyrics from Genius HTML when API doesn't provide them
- Handles incomplete or unavailable lyrics appropriately
- Returns appropriate error for invalid IDs
- Does not support resource listing

### 3. Technical Requirements

#### 3.1 Platform
- **Deployment:** Cloudflare Workers
- **Runtime:** Node.js compatible (with nodejs_compat flag)
- **Protocol:** MCP over HTTP/SSE

#### 3.2 Dependencies
- `@modelcontextprotocol/sdk` - MCP server implementation
- `zod` - Schema validation
- `agents` - MCP agent framework (if needed)

#### 3.3 API Integration
- **Base URL:** `https://api.genius.com`
- **Authentication:** Bearer token (Client Access Token)
- **Rate Limiting:** Respect Genius API rate limits
- **Error Handling:** Comprehensive error handling for API failures

#### 3.4 Configuration
- Genius API key via environment variables
- Configurable via `wrangler.toml` for local development
- Secure key management in production

### 4. Non-Functional Requirements

#### 4.1 Performance
- Response time: < 2 seconds for most operations
- Support for concurrent requests
- Efficient caching where appropriate

#### 4.2 Reliability
- Graceful error handling
- Appropriate error messages for debugging
- Retry logic for transient failures

#### 4.3 Security
- Secure API key storage
- No exposure of credentials in logs
- Input validation and sanitization

#### 4.4 Scalability
- Serverless architecture for automatic scaling
- Efficient resource usage
- Support for high request volumes

### 5. Implementation Status

#### ✅ Phase 1: Core Tools - COMPLETED
- [x] Implement `genius-search-song` - Returns songs, artists, and web pages
- [x] Implement `genius-song-lyrics` - Returns song metadata with lyrics
- [x] Implement `genius-list-artist-songs` - Lists artist songs with pagination and sorting

#### ✅ Phase 2: Resources - COMPLETED
- [x] Implement `genius-artist` resource - Returns artist information in JSON
- [x] Implement `genius-song` resource - Returns song metadata in JSON (without lyrics)
- [x] Implement `genius-song-lyrics` resource - Returns song metadata with lyrics in JSON

#### ✅ Phase 3: Prompts - COMPLETED
- [x] Implement `genius-search-prompt` - Helper prompt for searching Genius

#### ✅ Phase 4: Deployment - COMPLETED
- [x] Cloudflare Workers deployment configuration
- [x] Environment variable setup
- [x] MCP server endpoints configured (`/sse` and `/mcp`)

#### 🔄 Phase 5: Future Enhancements
- [ ] Unit tests for all tools
- [ ] Integration tests with Genius API
- [ ] Error handling tests
- [ ] Response caching
- [ ] Monitoring and logging

### 6. Success Metrics

- All tools successfully interact with Genius API
- Resources return data in expected formats
- Error handling works correctly for edge cases
- Server responds within acceptable time limits
- Successful deployment to Cloudflare Workers
- Integration with MCP clients (Claude Desktop, Cloudflare AI Playground)

### 7. Out of Scope

- User authentication (uses Client Access Token only)
- Writing/editing data on Genius (read-only operations)
- Real-time updates or webhooks
- Caching layer (may be added in future)
- Rate limit management UI

### 8. Future Enhancements

- Support for additional Genius API endpoints
- Advanced search filters
- Batch operations
- Response caching
- Analytics and usage tracking
- Support for User Access Token (for authenticated user operations)

### 9. References

- [Genius API Documentation](https://docs.genius.com/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Reference Implementation](https://github.com/srsergiolazaro/genius-mcp-server)

