"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { StarRating } from "./StarRating";
import type { Movie, Rating } from "@prisma/client";

type RatingLite = {
  userKey: "me" | "her";
  rating: number | null;
  comment: string | null;
};

type MovieWithRelations = {
  id: string;
  kinopoiskId: number;
  type: string;
  titleRu: string | null;
  titleOriginal: string | null;
  year: number | null;
  durationMinutes: number | null;
  description: string | null;
  posterUrl: string | null;
  genres: string[];
  countries: string[];
  status: string;
  detailsStatus?: string; // "pending" | "ready" | "failed"
  ratings: RatingLite[];
  telegramPosts: { postedAt: Date | null }[];
};

const STATUS_LABELS: Record<string, string> = {
  queued: "В очереди",
  watched: "Просмотрено",
  dropped: "Отложено",
};

export function MovieCard({ movie }: { movie: MovieWithRelations }) {
  const router = useRouter();
  const title = movie.titleRu || movie.titleOriginal || `ID ${movie.kinopoiskId}`;
  const desc = movie.description
    ? movie.description.slice(0, 150).replace(/\n/g, " ") + (movie.description.length > 150 ? "…" : "")
    : "";
  const meRating = movie.ratings.find((r) => r.userKey === "me");
  const herRating = movie.ratings.find((r) => r.userKey === "her");

  const setRating = async (userKey: "me" | "her", rating: number | null) => {
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId: movie.id, userKey, rating }),
    });
    router.refresh();
  };

  return (
    <article className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
      <Link href={`/movie/${movie.id}`} className="flex flex-col sm:flex-row">
        <div className="relative w-full sm:w-32 h-48 sm:h-36 flex-shrink-0 bg-gray-100 dark:bg-gray-800">
          {movie.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={movie.posterUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              Нет постера
            </div>
          )}
        </div>
        <div className="p-3 flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 dark:text-white truncate">{title}</h2>
          <div className="flex flex-wrap gap-x-2 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {movie.year != null && <span>{movie.year}</span>}
            {movie.durationMinutes != null && (
              <span>{movie.durationMinutes} мин</span>
            )}
            {movie.genres.length > 0 && (
              <span>{movie.genres.slice(0, 3).join(", ")}</span>
            )}
          </div>
          {desc && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
              {desc}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs ${
                movie.status === "watched"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : movie.status === "dropped"
                    ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
              }`}
            >
              {STATUS_LABELS[movie.status] ?? movie.status}
            </span>
            {movie.detailsStatus === "pending" && (
              <span className="inline-block px-2 py-0.5 rounded text-xs bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
                Загружаю данные…
              </span>
            )}
            {movie.detailsStatus === "failed" && (
              <span className="inline-block px-2 py-0.5 rounded text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                Нет данных — нажмите «Обновить»
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">
            Я
          </div>
          <StarRating
            value={meRating?.rating ?? null}
            onChange={(v) => setRating("me", v)}
            size="sm"
          />
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">
            Она
          </div>
          <StarRating
            value={herRating?.rating ?? null}
            onChange={(v) => setRating("her", v)}
            size="sm"
          />
        </div>
      </div>
    </article>
  );
}
