'use client'

import { useCallback, useEffect, useState } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import AmbientClues from '@/components/game/AmbientClues'
import ClueReveal from '@/components/game/ClueReveal'
import GuessInput from '@/components/game/GuessInput'
import GuessHistory from '@/components/game/GuessHistory'
import ResultScreen from '@/components/game/ResultScreen'
import type { AmbientClues as AmbientCluesType } from '@/lib/puzzle'
import type { MenuItem } from '@/lib/database.types'

const MAX_GUESSES = 6
const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!

type PuzzleData = {
  puzzle_date: string
  ambient: AmbientCluesType
  restaurant_id: string
  cuisine: string
  establishment_type: string
  menu_items: MenuItem[]
  exterior_photo_ref: string | null
  exterior_photo_url: string | null
  exterior_photo_attribution: string | null
  exterior_photo_date: string | null
}

type Guess = { name: string; correct: boolean; skipped?: boolean }

type GameState = {
  guesses: Guess[]
  won: boolean
  lost: boolean
}

const STORAGE_KEY = 'menudle_state'

function loadState(puzzleDate: string, restaurantId: string): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.puzzle_date !== puzzleDate || parsed.restaurant_id !== restaurantId) return null
    return parsed.game as GameState
  } catch {
    return null
  }
}

function saveState(puzzleDate: string, restaurantId: string, game: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ puzzle_date: puzzleDate, restaurant_id: restaurantId, game }))
}

function updateStreak(won: boolean) {
  try {
    const raw = localStorage.getItem('menudle_streak')
    const streak = raw ? JSON.parse(raw) : { current: 0, best: 0 }
    if (won) {
      streak.current += 1
      streak.best = Math.max(streak.best, streak.current)
    } else {
      streak.current = 0
    }
    localStorage.setItem('menudle_streak', JSON.stringify(streak))
  } catch {}
}

export default function Home() {
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null)
  const [game, setGame] = useState<GameState>({ guesses: [], won: false, lost: false })
  const [restaurantName, setRestaurantName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/puzzle/today')
        if (!res.ok) {
          setError('No puzzle today. Check back soon!')
          return
        }
        const data: PuzzleData = await res.json()
        setPuzzle(data)

        const saved = loadState(data.puzzle_date, data.restaurant_id)
        if (saved) setGame(saved)
      } catch {
        setError("Failed to load today's puzzle.")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleGuess = useCallback(
    async (placeId: string, placeName: string) => {
      if (!puzzle || game.won || game.lost) return

      const guessNumber = game.guesses.length + 1
      const res = await fetch('/api/puzzle/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: placeId, puzzle_date: puzzle.puzzle_date, guess_number: guessNumber }),
      })
      const { correct, restaurant_name }: { correct: boolean; restaurant_name: string | null } = await res.json()

      const newGuess: Guess = { name: placeName, correct }
      const newGuesses = [...game.guesses, newGuess]
      const wrongCount = newGuesses.filter((g) => !g.correct).length
      const won = correct
      const lost = !correct && wrongCount >= MAX_GUESSES

      if (restaurant_name) setRestaurantName(restaurant_name)
      if (won || lost) updateStreak(won)

      const newGame: GameState = { guesses: newGuesses, won, lost }
      setGame(newGame)
      saveState(puzzle.puzzle_date, puzzle.restaurant_id, newGame)
    },
    [puzzle, game]
  )

  const handleSkip = useCallback(() => {
    if (!puzzle || game.won || game.lost) return
    const currentWrong = game.guesses.filter((g) => !g.correct).length
    if (currentWrong >= 5) return
    const newGuess: Guess = { name: 'Skipped', correct: false, skipped: true }
    const newGuesses = [...game.guesses, newGuess]
    const wrongCount = newGuesses.filter((g) => !g.correct).length
    const lost = wrongCount >= MAX_GUESSES
    if (lost) updateStreak(false)
    const newGame: GameState = { guesses: newGuesses, won: false, lost }
    setGame(newGame)
    saveState(puzzle.puzzle_date, puzzle.restaurant_id, newGame)
  }, [puzzle, game])

  const handleReset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setGame({ guesses: [], won: false, lost: false })
    setRestaurantName('')
  }, [])

  const wrongGuesses = game.guesses.filter((g) => !g.correct).length
  const gameOver = game.won || game.lost

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Loading today&apos;s puzzle…</p>
      </main>
    )
  }

  if (error || !puzzle) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">{error ?? 'Something went wrong.'}</p>
      </main>
    )
  }

  return (
    <APIProvider apiKey={MAPS_API_KEY}>
      <main className="mx-auto w-full flex min-h-screen max-w-lg flex-col gap-4 px-4 py-8">
        <header className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Menudle</h1>
          <p className="text-xs text-zinc-400">Guess today&apos;s restaurant, Metro Manila only!</p>
        </header>

        <AmbientClues clues={puzzle.ambient} />

        {!gameOver ? (
          <>
            <ClueReveal
              guessCount={wrongGuesses}
              menuItems={puzzle.menu_items}
              establishmentType={puzzle.establishment_type}
              cuisine={puzzle.cuisine}
              exteriorPhotoRef={puzzle.exterior_photo_ref}
              exteriorPhotoUrl={puzzle.exterior_photo_url}
              exteriorPhotoAttribution={puzzle.exterior_photo_attribution}
              exteriorPhotoDate={puzzle.exterior_photo_date}
              mapsApiKey={MAPS_API_KEY}
            />

            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>
                Guess {Math.min(wrongGuesses + 1, MAX_GUESSES)} of {MAX_GUESSES}
              </span>
              {wrongGuesses < 5 && (
                <button
                  onClick={handleSkip}
                  className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 active:bg-zinc-200"
                >
                  Show next clue
                </button>
              )}
            </div>

            <GuessInput onGuess={handleGuess} disabled={gameOver} />
            <GuessHistory guesses={game.guesses} />
          </>
        ) : (
          <ResultScreen
            won={game.won}
            guesses={game.guesses}
            restaurantName={restaurantName}
            onReset={process.env.NODE_ENV === 'development' ? handleReset : undefined}
          />
        )}
      </main>
    </APIProvider>
  )
}
