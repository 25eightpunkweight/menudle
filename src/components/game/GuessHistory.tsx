'use client'

type Guess = { name: string; correct: boolean; skipped?: boolean }

export default function GuessHistory({ guesses }: { guesses: Guess[] }) {
  if (guesses.length === 0) return null

  return (
    <ul className="space-y-1">
      {guesses.map((g, i) => (
        <li
          key={i}
          className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm"
        >
          <span>{g.correct ? '🟩' : g.skipped ? '🟧' : '🟥'}</span>
          <span className={g.correct ? 'font-semibold text-green-700' : g.skipped ? 'italic text-zinc-400' : 'text-zinc-600'}>
            {g.name}
          </span>
        </li>
      ))}
    </ul>
  )
}
