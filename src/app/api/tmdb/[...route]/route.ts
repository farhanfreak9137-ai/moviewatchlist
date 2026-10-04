import { NextRequest, NextResponse } from 'next/server';

// TMDB API Base URL
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Default public read-only educational key or process env
// Users can also supply their own key via x-tmdb-api-key header or Settings UI
const DEFAULT_TMDB_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || '2dca580c2a14b55200e784d157207b4d';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  try {
    const params = await context.params;
    const routePath = params.route.join('/');
    const searchParams = new URL(request.url).searchParams;

    const customKey = request.headers.get('x-tmdb-api-key');
    const apiKey = customKey || DEFAULT_TMDB_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No TMDB API key provided. Please configure one in Settings or .env' },
        { status: 401 }
      );
    }

    // Forward all query parameters and attach api_key
    const targetUrl = new URL(`${TMDB_BASE_URL}/${routePath}`);
    searchParams.forEach((val, key) => {
      targetUrl.searchParams.set(key, val);
    });
    targetUrl.searchParams.set('api_key', apiKey);

    const tmdbRes = await fetch(targetUrl.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 }, // 1 hour cache on server
    });

    if (!tmdbRes.ok) {
      const errText = await tmdbRes.text();
      return NextResponse.json(
        { error: `TMDB error (${tmdbRes.status}): ${errText}` },
        { status: tmdbRes.status }
      );
    }

    const data = await tmdbRes.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('TMDB Proxy Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch from TMDB' },
      { status: 500 }
    );
  }
}
