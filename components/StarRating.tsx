"use client";

import { useCallback } from "react";

const MAX = 10;

type Props = {
  value: number | null;
  onChange: (value: number | null) => void;
  readonly?: boolean;
  size?: "sm" | "md";
};

export function StarRating({ value, onChange, readonly = false, size = "md" }: Props) {
  const handleClick = useCallback(
    (n: number) => {
      if (readonly) return;
      onChange(value === n ? null : n);
    },
    [value, onChange, readonly]
  );

  const sizeClass = size === "sm" ? "w-4 h-4" : "w-6 h-6";

  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {Array.from({ length: MAX }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => handleClick(n)}
          className={`${sizeClass} rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          }`}
          aria-label={`Оценка ${n}`}
        >
          <span
            className={`block ${sizeClass} ${
              value !== null && n <= value
                ? "text-amber-400"
                : "text-gray-300 dark:text-gray-600"
            }`}
          >
            ★
          </span>
        </button>
      ))}
      {!readonly && value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 underline"
        >
          Сбросить
        </button>
      )}
    </div>
  );
}
