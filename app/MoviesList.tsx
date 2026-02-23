"use client";

import { useEffect, useState } from "react";
import { MovieCard } from "@/components/MovieCard";

type MovieItem = {
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
  cast: unknown;
  ratingKinopoisk: number | null;
  status: string;
  watchedAt: string | null;
  lastFetchedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ratings: { userKey: "me" | "her"; rating: number | null; comment: string | null }[];
  telegramPosts: { postedAt: Date | null }[];
};

export function MoviesList() {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");
  const [unratedBy, setUnratedBy] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (unratedBy) params.set("unratedBy", unratedBy);
    if (search.trim()) params.set("search", search.trim());
    fetch(`/api/movies?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setMovies(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoading(false));
  }, [status, unratedBy, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 text-sm min-w-[180px]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="">Все статусы</option>
          <option value="queued">В очереди</option>
          <option value="watched">Просмотрено</option>
          <option value="dropped">Отложено</option>
        </select>
        <select
          value={unratedBy}
          onChange={(e) => setUnratedBy(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="">Все</option>
          <option value="me">Без моей оценки</option>
          <option value="her">Без её оценки</option>
          <option value="both">Без оценок</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Загрузка...</p>
      ) : movies.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Нет фильмов. Добавьте бота в канал или импортируйте ссылки на странице Импорт.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-1">
          {movies.map((m) => (
            <li key={m.id}>
              <MovieCard
                movie={{
                  ...m,
                  ratings: m.ratings,
                  telegramPosts: m.telegramPosts.map((p) => ({
                    postedAt: p.postedAt ? new Date(p.postedAt) : null,
                  })),
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
