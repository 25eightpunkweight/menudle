'use client'

import { useEffect, useState } from 'react'

const MAX_GUESSES = 6

type PlaceCardData = {
  name: string
  address: string
  rating: number | null
  price_level: string | null
  photo_url: string | null
  maps_url: string | null
  website: string | null
}

function PlaceCard() {
  const [data, setData] = useState<PlaceCardData | null>(null)

  useEffect(() => {
    fetch('/api/puzzle/place-card')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setData(d))
      .catch(() => {})
  }, [])

  if (!data) return null

  const meta = [
    data.rating ? `★ ${data.rating}` : null,
    data.price_level,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <a
      href={data.maps_url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-xl border border-zinc-200 text-left transition-shadow hover:shadow-md"
    >
      {data.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.photo_url} alt={data.name} className="h-40 w-full object-cover" />
      )}
      <div className="space-y-0.5 p-4">
        <p className="font-semibold text-zinc-900">{data.name}</p>
        {meta && <p className="text-sm text-zinc-500">{meta}</p>}
        {data.address && <p className="text-xs text-zinc-400">{data.address}</p>}
        <p className="pt-1 text-xs text-blue-500">View on Google Maps →</p>
      </div>
    </a>
  )
}

type Guess = { name: string; correct: boolean; skipped?: boolean }

type Props = {
  won: boolean
  guesses: Guess[]
  restaurantName: string
  onReset?: () => void
}

function buildEmojiGrid(guesses: Guess[]): string {
  const blocks = Array(MAX_GUESSES).fill('⬛')
  guesses.slice(0, MAX_GUESSES).forEach((g, i) => {
    blocks[i] = g.correct ? '🟩' : g.skipped ? '🟧' : '🟥'
  })
  return blocks.join('')
}

function Countdown() {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function update() {
      const now = new Date()
      // Midnight PHT = UTC+8
      const midnightPHT = new Date(
        new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now) + 'T00:00:00+08:00'
      )
      midnightPHT.setDate(midnightPHT.getDate() + 1)
      const diff = midnightPHT.getTime() - now.getTime()
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setTimeLeft(`${h}h ${m}m ${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return <span className="font-mono text-lg font-semibold">{timeLeft}</span>
}

export default function ResultScreen({ won, guesses, restaurantName, onReset }: Props) {
  const [copied, setCopied] = useState(false)
  const emoji = buildEmojiGrid(guesses)
  const shareText = `Menudle ${new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}\n${emoji}`

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(shareText)
    } catch {
      // clipboard unavailable — silently ignore
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <div>
        <p className="text-4xl">{won ? '🎉' : '😔'}</p>
        <h2 className="mt-2 text-xl font-bold">{won ? 'You got it!' : 'Better luck tomorrow'}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          The answer was <span className="font-semibold text-zinc-800">{restaurantName}</span>
        </p>
      </div>

      <PlaceCard />

      <p className="text-2xl tracking-widest">{emoji}</p>

      <div className="space-y-2">
        <button
          onClick={handleShare}
          className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 active:bg-zinc-800"
        >
          Share result
        </button>
        <p
          className={`text-xs text-zinc-500 transition-opacity duration-300 ${copied ? 'opacity-100' : 'opacity-0'}`}
        >
          Copied to clipboard!
        </p>
      </div>

      {onReset && (
        <button
          onClick={onReset}
          className="w-full rounded-xl border border-zinc-300 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Play again (dev only)
        </button>
      )}

      <div>
        <p className="text-xs text-zinc-400">Next puzzle in</p>
        <Countdown />
      </div>
    </div>
  )
}
