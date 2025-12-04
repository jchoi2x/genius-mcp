import * as cheerio from "cheerio";

/**
 * Fetches HTML from given URL and finds children within the element with id="lyrics-root"
 * that have a class starting with "Lyrics__Container", then joins all their text contents
 * @param url - The URL to fetch and parse
 * @returns The joined text content from all matching elements, or null if not found
 */
export async function scrapeLyrics(url: string): Promise<string | null> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "MCP-Genius-Server/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const lyricsRoot = $("#lyrics-root");

  if (lyricsRoot.length === 0) {
    return null;
  }

  // Find children with class starting with "Lyrics__Container"
  const lyricsContainers = $(`#lyrics-root [class^='Lyrics__Container']`)
    .each((_, element) => {
      // remove child in lyrics container where class is LyricsHeader
      $(element).find("[class^='LyricsHeader']").remove();
    });

  if (lyricsContainers.length === 0) {
    return null;
  }

  // Map over elements, get text content, apply regex replacement, and join
  const joinedText = lyricsContainers
    .map((_, element) => $(element).find('br').replaceWith('\n').end().text())
    .get()
    // .map((text) => text.replace(/(\[Verse\n)[ ]+/, "[Verse "))
    .join("");

  return joinedText;
}

