"use client";

import Link from "next/link";

export function PrintActions({ setId }: { setId: string }) {
  return (
    <div className="no-print p-4 bg-amber-50 flex gap-3">
      <button
        onClick={() => window.print()}
        className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
      >
        🖨 Печать
      </button>
      <Link
        href={`/sets/${setId}`}
        className="text-amber-600 text-sm self-center hover:underline"
      >
        ← Редактор
      </Link>
    </div>
  );
}
