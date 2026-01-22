import { NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

type SearchResult = {
  title: string;
  link: string;
  snippet: string;
  displayLink?: string;
};

type GoogleSearchResponse = {
  items?: Array<{
    title: string;
    link: string;
    snippet: string;
    displayLink?: string;
  }>;
};

const summarizeResults = (query: string, results: SearchResult[]) => {
  if (!results.length) {
    return `I could not find any results for ${query}.`;
  }

  const highlightCount = Math.min(results.length, 3);
  const highlights = results
    .slice(0, highlightCount)
    .map((item) => `${item.title}. ${item.snippet}`)
    .join(" ");

  return `Here is what I found for ${query}. ${highlights}`;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query || !query.trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    return NextResponse.json(
      {
        error:
          "Search service is not configured. Please add GOOGLE_API_KEY and GOOGLE_CSE_ID to the environment.",
      },
      { status: 500 }
    );
  }

  const searchUrl = new URL("https://www.googleapis.com/customsearch/v1");
  searchUrl.searchParams.set("key", GOOGLE_API_KEY);
  searchUrl.searchParams.set("cx", GOOGLE_CSE_ID);
  searchUrl.searchParams.set("q", query);

  try {
    const response = await fetch(searchUrl.toString(), {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message = typeof payload.error === "string" ? payload.error : "Google Search API error";
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const payload = (await response.json()) as GoogleSearchResponse;
    const results = (payload.items ?? []).map((item) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink,
    }));

    return NextResponse.json({
      results,
      summary: summarizeResults(query, results),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Search request failed" }, { status: 500 });
  }
}
