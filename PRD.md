# Product Requirements Document (PRD)
## Genius MCP Server

### 1. Overview

#### 1.1 Purpose
This document defines the requirements for a Model Context Protocol (MCP) server that provides AI applications with access to the Genius API, enabling them to search for songs, artists, fetch lyrics, and retrieve music metadata.

#### 1.2 Goals
- Provide a standardized MCP interface to the Genius API
- Enable LLMs to interact with Genius music data through tools and resources
- Deploy as a scalable serverless solution on Cloudflare Workers
- Maintain high performance and reliability

#### 1.3 Target Users
- AI application developers
- LLM-powered applications requiring music data
- Developers building music-related AI features

### 2. Features and Requirements

#### 2.1 Tools

##### 2.1.1 `genius-search-song`
**Purpose:** Search for songs by title

**Input Parameters:**
- `title` (string, required): The song title to search for

**Output:**
- List of matching songs with metadata (ID, title, artist, URL)

**Success Criteria:**
- Returns relevant song matches from Genius API
- Handles API errors gracefully
- Returns empty results when no matches found

##### 2.1.2 `genius-search-artist`
**Purpose:** Search for artists by name

**Input Parameters:**
- `name` (string, required): The artist name to search for

**Output:**
- List of matching artists with metadata (ID, name, URL)

**Success Criteria:**
- Returns relevant artist matches from Genius API
- Handles API errors gracefully
- Returns empty results when no matches found

##### 2.1.3 `genius-list-artist-songs`
**Purpose:** List all songs by a specific artist

**Input Parameters:**
- `artistId` (number, required): The Genius artist ID

**Output:**
- List of songs by the artist with basic metadata

**Success Criteria:**
- Returns all songs associated with the artist
- Handles pagination if needed
- Returns empty list for artists with no songs

##### 2.1.4 `genius-get-song-lyrics`
**Purpose:** Fetch lyrics for a specific song

**Input Parameters:**
- `songId` (number, required): The Genius song ID

**Output:**
- Song lyrics in plain text format

**Success Criteria:**
- Returns complete lyrics when available
- Handles songs with incomplete lyrics
- Returns appropriate message when lyrics unavailable

##### 2.1.5 `genius-get-song`
**Purpose:** Fetch comprehensive song metadata

**Input Parameters:**
- `songId` (number, required): The Genius song ID

**Output:**
- Complete song metadata including:
  - Title, artist, album
  - Release date
  - URL, pageviews
  - Producer and writer information
  - Song relationships (samples, remixes, etc.)
  - Media links

**Success Criteria:**
- Returns all available song metadata
- Handles missing optional fields gracefully
- Formats data for easy consumption by LLMs

##### 2.1.6 `genius-get-artist`
**Purpose:** Fetch artist metadata

**Input Parameters:**
- `artistId` (number, required): The Genius artist ID

**Output:**
- Artist metadata including:
  - Name, ID, URL
  - Description
  - Verification status
  - Follower count (if available)

**Success Criteria:**
- Returns all available artist metadata
- Handles missing optional fields gracefully
- Formats data for easy consumption by LLMs

#### 2.2 Resources

##### 2.2.1 `genius-artist`
**URI Pattern:** `genius://artists/{id}`

**Purpose:** Provide read-only access to artist information

**Content Format:**
- Plain text format for easy LLM consumption
- Optional JSON format for structured data

**Success Criteria:**
- Returns artist information when valid ID provided
- Returns appropriate error for invalid IDs
- Supports resource listing (if applicable)

##### 2.2.2 `genius-song`
**URI Pattern:** `genius://songs/{id}`

**Purpose:** Provide read-only access to song metadata

**Content Format:**
- Plain text format for easy LLM consumption
- Optional JSON format for structured data

**Success Criteria:**
- Returns song metadata when valid ID provided
- Returns appropriate error for invalid IDs
- Supports resource listing (if applicable)

##### 2.2.3 `genius-song-lyrics`
**URI Pattern:** `genius://songs/{id}/lyrics`

**Purpose:** Provide read-only access to song lyrics

**Content Format:**
- Plain text format for lyrics
- Optional structured format with annotations

**Success Criteria:**
- Returns lyrics when available
- Handles incomplete lyrics appropriately
- Returns appropriate message when lyrics unavailable

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

### 5. Implementation Phases

#### Phase 1: Core Tools
- [ ] Implement `genius-search-song`
- [ ] Implement `genius-search-artist`
- [ ] Implement `genius-get-song`
- [ ] Implement `genius-get-artist`

#### Phase 2: Advanced Features
- [ ] Implement `genius-list-artist-songs`
- [ ] Implement `genius-get-song-lyrics`

#### Phase 3: Resources
- [ ] Implement `genius-artist` resource
- [ ] Implement `genius-song` resource
- [ ] Implement `genius-song-lyrics` resource

#### Phase 4: Testing & Documentation
- [ ] Unit tests for all tools
- [ ] Integration tests with Genius API
- [ ] Error handling tests
- [ ] Documentation updates

#### Phase 5: Deployment
- [ ] Cloudflare Workers deployment configuration
- [ ] Environment variable setup
- [ ] Production testing
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

