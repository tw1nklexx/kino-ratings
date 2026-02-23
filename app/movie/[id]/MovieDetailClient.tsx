"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { StarRating } from "@/components/StarRating";

type MovieMeta = {
  id: string;
  status: string;
  watchedAt: string | null;
};

type RatingRow = {
  userKey: string;
  rating: number | null;
  comment: string | null;
};

const STATUS_OPTIONS = [
  { value: "queued", label: "В очереди" },
  { value: "watched", label: "Просмотрено" },
  { value: "dropped", label: "Отложено" },
];

export function MovieDetailClient({
  movie,
  ratings,
  lastFetchedAt,
}: {
  movie: MovieMeta;
  ratings: RatingRow[];
  lastFetchedAt?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(movie.status);
  const [watchedAt, setWatchedAt] = useState(movie.watchedAt ?? "");
  const [commentMe, setCommentMe] = useState(
    ratings.find((r) => r.userKey === "me")?.comment ?? ""
  );
  const [commentHer, setCommentHer] = useState(
    ratings.find((r) => r.userKey === "her")?.comment ?? ""
  );

  useEffect(() => {
    setStatus(movie.status);
    setWatchedAt(movie.watchedAt ?? "");
  }, [movie.status, movie.watchedAt]);
  useEffect(() => {
    setCommentMe(ratings.find((r) => r.userKey === "me")?.comment ?? "");
    setCommentHer(ratings.find((r) => r.userKey === "her")?.comment ?? "");
  }, [ratings]);

  const meRating = ratings.find((r) => r.userKey === "me");
  const herRating = ratings.find((r) => r.userKey === "her");

  const updateStatus = async (newStatus: string) => {
    setStatus(newStatus);
    const body: { status: string; watchedAt?: string | null } = { status: newStatus };
    if (newStatus === "watched" && !watchedAt) body.watchedAt = new Date().toISOString().slice(0, 10);
    if (newStatus !== "watched") body.watchedAt = null;
    await fetch(`/api/movie/${movie.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  };

  const updateWatchedAt = async (date: string) => {
    setWatchedAt(date);
    await fetch(`/api/movie/${movie.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchedAt: date || null }),
    });
    router.refresh();
  };

  const setRating = async (userKey: "me" | "her", rating: number | null, comment?: string) => {
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieId: movie.id,
        userKey,
        rating,
        comment: comment !== undefined ? comment : userKey === "me" ? commentMe : commentHer,
      }),
    });
    router.refresh();
  };

  const saveComment = async (userKey: "me" | "her", comment: string) => {
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieId: movie.id,
        userKey,
        rating: userKey === "me" ? meRating?.rating ?? null : herRating?.rating ?? null,
        comment: comment || null,
      }),
    });
    router.refresh();
  };

  const [refreshing, setRefreshing] = useState(false);
  const refreshDetails = async () => {
    setRefreshing(true);
    try {
      await fetch(`/api/movie/${movie.id}/refresh`, { method: "POST" });
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {lastFetchedAt ? (
          <>Данные с КиноПоиск: {new Date(lastFetchedAt).toLocaleDateString("ru")}. </>
        ) : (
          "Данные с КиноПоиск не загружены. "
        )}
        <button
          type="button"
          onClick={refreshDetails}
          disabled={refreshing}
          className="underline hover:no-underline disabled:opacity-50"
        >
          {refreshing ? "Обновление…" : lastFetchedAt ? "Обновить данные" : "Загрузить данные"}
        </button>
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
          Статус
        </label>
        <select
          value={status}
          onChange={(e) => updateStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {status === "watched" && (
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Дата просмотра
          </label>
          <input
            type="date"
            value={watchedAt}
            onChange={(e) => updateWatchedAt(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Я</div>
          <StarRating
            value={meRating?.rating ?? null}
            onChange={(v) => setRating("me", v)}
          />
          <div className="mt-2">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              Комментарий
            </label>
            <textarea
              value={commentMe}
              onChange={(e) => setCommentMe(e.target.value)}
              onBlur={() => saveComment("me", commentMe)}
              placeholder="Краткий отзыв..."
              rows={2}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Она</div>
          <StarRating
            value={herRating?.rating ?? null}
            onChange={(v) => setRating("her", v)}
          />
          <div className="mt-2">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              Комментарий
            </label>
            <textarea
              value={commentHer}
              onChange={(e) => setCommentHer(e.target.value)}
              onBlur={() => saveComment("her", commentHer)}
              placeholder="Краткий отзыв..."
              rows={2}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
