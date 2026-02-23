import { MoviesList } from "./MoviesList";

export default function HomePage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Фильмы и сериалы
      </h1>
      <MoviesList />
    </div>
  );
}
