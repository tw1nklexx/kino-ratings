import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { MovieDetailClient } from "./MovieDetailClient";

export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movie = await prisma.movie.findUnique({
    where: { id },
    include: { ratings: true },
  });
  if (!movie) notFound();

  const title = movie.titleRu || movie.titleOriginal || `ID ${movie.kinopoiskId}`;
  const cast = (movie.cast as Array<{ name?: string; profession?: string }>) ?? [];

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      >
        ← Назад к списку
      </Link>

      <div className="flex flex-col sm:flex-row gap-6">
        <div className="relative w-full sm:w-56 h-80 sm:h-84 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
          {movie.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={movie.posterUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Нет постера
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h1>
          {movie.titleOriginal && movie.titleOriginal !== title && (
            <p className="text-gray-500 dark:text-gray-400 mt-0.5">{movie.titleOriginal}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300 mt-2">
            {movie.year != null && <span>{movie.year}</span>}
            {movie.durationMinutes != null && (
              <span>{movie.durationMinutes} мин</span>
            )}
            {movie.ratingKinopoisk != null && (
              <span>КП: {movie.ratingKinopoisk.toFixed(1)}</span>
            )}
          </div>
          {movie.genres.length > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {movie.genres.join(", ")}
            </p>
          )}
          {movie.countries.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {movie.countries.join(", ")}
            </p>
          )}
          <MovieDetailClient
            movie={{
              id: movie.id,
              status: movie.status,
              watchedAt: movie.watchedAt?.toISOString().slice(0, 10) ?? null,
            }}
            ratings={movie.ratings}
            lastFetchedAt={movie.lastFetchedAt?.toISOString() ?? null}
          />
        </div>
      </div>

      {movie.description && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Описание
          </h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {movie.description}
          </p>
        </section>
      )}

      {cast.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            В ролях (топ-10)
          </h2>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {cast.map((p, i) => (
              <li key={i}>
                {p.name}
                {p.profession ? ` — ${p.profession}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
