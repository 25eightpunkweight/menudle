'use client'

import type { AmbientClues } from '@/lib/puzzle'

export default function AmbientClues({ clues }: { clues: AmbientClues }) {
  return (
    <div className="rounded-xl bg-zinc-100 px-4 py-3">
      <div className="flex flex-wrap justify-center gap-3 text-sm">
        <span>⭐ {clues.rating.toFixed(1)}</span>
        <span>💬 {clues.review_count_bracket}</span>
        <span>💰 {clues.price_level}</span>
        <span>📍 {clues.neighborhood}</span>
      </div>
      <p className="mt-1 text-center text-xs text-zinc-400">from Google Maps data</p>
    </div>
  )
}
