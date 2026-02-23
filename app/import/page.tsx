"use client";

import { useState, useRef } from "react";

export default function ImportPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; results?: unknown[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseLines = (input: string): string[] => {
    return input
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const lines = parseLines(text);
    if (lines.length === 0) {
      setError("Вставьте ссылки (по одной на строку) или загрузите .txt файл.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: lines }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка импорта");
      setResult(data);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка импорта");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      setText((prev) => (prev ? prev + "\n" + content : content));
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
        Импорт по ссылкам
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Вставьте ссылки на КиноПоиск (фильмы или сериалы), по одной на строку. Либо загрузите
        .txt файл с ссылками. Дубликаты не создаются.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="https://www.kinopoisk.ru/film/123456/&#10;https://www.kinopoisk.ru/series/789..."
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 font-mono text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium"
          >
            {loading ? "Импорт…" : "Импортировать"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
          >
            Загрузить .txt
          </button>
        </div>
      </form>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {result && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Импортировано: {result.imported}.
        </p>
      )}
    </div>
  );
}
