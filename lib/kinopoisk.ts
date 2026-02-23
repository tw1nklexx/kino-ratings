/**
 * Kinopoisk.dev API client.
 * Docs: https://kinopoiskdev.readme.io/
 * Movie by ID: GET https://api.kinopoisk.dev/v1.4/movie/{id}
 */

const API_BASE = "https://api.kinopoisk.dev";
const CACHE_DAYS = 7;

export type KinopoiskCastPerson = {
  name: string;
  profession?: string;
  enProfession?: string;
};

export type MovieDetails = {
  titleRu: string | null;
  titleOriginal: string | null;
  year: number | null;
  durationMinutes: number | null;
  description: string | null;
  posterUrl: string | null;
  genres: string[];
  countries: string[];
  cast: KinopoiskCastPerson[];
  ratingKinopoisk: number | null;
};

type ApiMovieResponse = {
  name?: string | null;
  alternativeName?: string | null;
  year?: number | null;
  movieLength?: number | null;
  description?: string | null;
  poster?: { url?: string } | null;
  genres?: Array<{ name?: string }> | null;
  countries?: Array<{ name?: string }> | null;
  rating?: { kp?: number } | null;
  persons?: Array<{
    name?: string | null;
    profession?: string | null;
    enProfession?: string | null;
  }> | null;
};

function mapResponseToDetails(data: ApiMovieResponse): MovieDetails {
  const genres = (data.genres ?? []).map((g) => g.name ?? "").filter(Boolean);
  const countries = (data.countries ?? []).map((c) => c.name ?? "").filter(Boolean);
  const persons = (data.persons ?? []).slice(0, 10).map((p) => ({
    name: p.name ?? "",
    profession: p.profession ?? undefined,
    enProfession: p.enProfession ?? undefined,
  }));
  const posterUrl =
    data.poster?.url ?? (typeof (data as { poster?: string }).poster === "string" ? (data as { poster: string }).poster : null);

  return {
    titleRu: data.name ?? data.alternativeName ?? null,
    titleOriginal: data.alternativeName ?? data.name ?? null,
    year: data.year ?? null,
    durationMinutes: data.movieLength ?? null,
    description: data.description ?? null,
    posterUrl,
    genres,
    countries,
    cast: persons,
    ratingKinopoisk: data.rating?.kp ?? null,
  };
}

export async function fetchMovieDetails(
  kinopoiskId: number,
  _type: "film" | "series",
  options?: { timeoutMs?: number }
): Promise<MovieDetails | null> {
  const apiKey = process.env.KINOPOISK_API_KEY;
  if (!apiKey) {
    console.warn("[kinopoisk] KINOPOISK_API_KEY not set");
    return null;
  }

  const timeoutMs = options?.timeoutMs ?? 5000;
  const url = `${API_BASE}/v1.4/movie/${kinopoiskId}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: { "X-API-KEY": apiKey },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`[kinopoisk] ${url} returned ${res.status}`);
      return null;
    }
    const data = (await res.json()) as ApiMovieResponse;
    return mapResponseToDetails(data);
  } catch (e) {
    clearTimeout(timeout);
    if (e instanceof Error) console.warn("[kinopoisk] fetch error:", e.message);
    return null;
  }
}

export function shouldRefreshDetails(lastFetchedAt: Date | null): boolean {
  if (!lastFetchedAt) return true;
  const ageMs = Date.now() - new Date(lastFetchedAt).getTime();
  return ageMs > CACHE_DAYS * 24 * 60 * 60 * 1000;
}
