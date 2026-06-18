'use client'

import type { MenuItem } from '@/lib/database.types'

type Props = {
  guessCount: number // number of wrong guesses made so far
  menuItems: MenuItem[]
  establishmentType: string
  cuisine: string
  exteriorPhotoRef: string | null
  mapsApiKey: string
}

function PhotoFromRef({ photoRef, alt, mapsApiKey }: { photoRef: string; alt: string; mapsApiKey: string }) {
  // Places API (New) photo URL
  const src = `https://places.googleapis.com/v1/${photoRef}/media?maxHeightPx=400&key=${mapsApiKey}`
  return (
    <img
      src={src}
      alt={alt}
      className="mx-auto max-h-64 w-full rounded-xl object-cover"
    />
  )
}

function MenuItem({ item, showPhoto, mapsApiKey }: { item: MenuItem; showPhoto: boolean; mapsApiKey: string }) {
  return (
    <div className="space-y-2">
      {showPhoto && (
        <PhotoFromRef photoRef={item.photo_reference} alt={item.name} mapsApiKey={mapsApiKey} />
      )}
      <div className="text-center">
        <p className="font-semibold">{item.name}</p>
        {item.description && <p className="text-sm text-zinc-500">{item.description}</p>}
        <p className="text-sm font-medium">₱{item.price.toLocaleString()}</p>
      </div>
    </div>
  )
}

export default function ClueReveal({
  guessCount,
  menuItems,
  establishmentType,
  cuisine,
  exteriorPhotoRef,
  mapsApiKey,
}: Props) {
  const item1 = menuItems[0]
  const item2 = menuItems[1]

  return (
    <div className="space-y-4 rounded-xl bg-zinc-50 p-6">
      {/* Blind guess slot — no clues yet */}
      {guessCount === 0 && (
        <p className="text-center text-sm text-zinc-400 italic">No clues yet — guess blind!</p>
      )}

      {/* Clue 1: establishment type + cuisine */}
      {guessCount >= 1 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Clue 1 · Type and Cuisine</p>
          <p className="text-center text-sm font-medium text-zinc-600">
            {establishmentType} · {cuisine}
          </p>
        </div>
      )}

      {/* Clue 2 / 3: menu picture #1, label updates when description is revealed */}
      {guessCount >= 2 && item1 && (
        <div className="border-t border-zinc-200 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            {guessCount >= 3 ? 'Clue 2 · Menu Picture #1 + Description' : 'Clue 2 · Menu Picture #1'}
          </p>
          <PhotoFromRef photoRef={item1.photo_reference} alt="Mystery dish" mapsApiKey={mapsApiKey} />
          {guessCount >= 3 && (
            <div className="mt-2 text-center">
              <p className="font-semibold">{item1.name}</p>
              {item1.description && <p className="text-sm text-zinc-500">{item1.description}</p>}
              <p className="text-sm font-medium">₱{item1.price.toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

      {/* Clue 4: second menu item with photo + description */}
      {guessCount >= 4 && item2 && (
        <div className="border-t border-zinc-200 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Clue 4 · Menu Picture #2 + Description</p>
          <MenuItem item={item2} showPhoto={true} mapsApiKey={mapsApiKey} />
        </div>
      )}

      {/* Clue 5: restaurant exterior photo */}
      {guessCount >= 5 && exteriorPhotoRef && (
        <div className="border-t border-zinc-200 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Clue 5 · Exterior</p>
          <PhotoFromRef photoRef={exteriorPhotoRef} alt="Restaurant exterior" mapsApiKey={mapsApiKey} />
        </div>
      )}
    </div>
  )
}
