// Returns today's date string in PHT (UTC+8) as YYYY-MM-DD
export function getPHTDateString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export type AmbientClues = {
  rating: number
  review_count_bracket: string
  price_level: string
  neighborhood: string
}

// Shape returned by Places API (New) Place Details REST endpoint
type AddressComponent = {
  longText: string
  shortText: string
  types: string[]
}

type PlaceDetailsResult = {
  rating?: number
  userRatingCount?: number
  priceLevel?: string
  addressComponents?: AddressComponent[]
}

function reviewCountBracket(count: number): string {
  if (count < 50) return 'Under 50 reviews'
  if (count < 100) return '50–100 reviews'
  if (count < 200) return '100–200 reviews'
  if (count < 500) return '200–500 reviews'
  if (count < 1000) return '500–1,000 reviews'
  if (count < 5000) return '1,000–5,000 reviews'
  return '5,000+ reviews'
}

// Places API (New) uses string enum for price level
const PRICE_LABELS: Record<string, string> = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '₱ · Under ₱300/person',
  PRICE_LEVEL_MODERATE: '₱₱ · ₱300–800/person',
  PRICE_LEVEL_EXPENSIVE: '₱₱₱ · ₱800–2,000/person',
  PRICE_LEVEL_VERY_EXPENSIVE: '₱₱₱₱ · ₱2,000+/person',
}

export function parseAmbientClues(place: PlaceDetailsResult): AmbientClues {
  const components = place.addressComponents ?? []
  const neighborhood =
    components.find((c) => c.types?.includes('sublocality_level_1'))?.longText ??
    components.find((c) => c.types?.includes('locality'))?.longText ??
    'Metro Manila'

  return {
    rating: place.rating ?? 0,
    review_count_bracket: reviewCountBracket(place.userRatingCount ?? 0),
    price_level: PRICE_LABELS[place.priceLevel ?? ''] ?? '₱₱',
    neighborhood,
  }
}

export async function fetchPlaceAmbient(placeId: string): Promise<AmbientClues> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!
  // places/ prefix required by Places API (New)
  const name = placeId.startsWith('places/') ? placeId : `places/${placeId}`
  const fields = 'rating,userRatingCount,priceLevel,addressComponents'

  const res = await fetch(
    `https://places.googleapis.com/v1/${name}?fields=${fields}&key=${apiKey}`,
    { next: { revalidate: 3600 } } // cache for 1h — ambient data changes slowly
  )

  if (!res.ok) throw new Error(`Places API error: ${res.status}`)
  const data: PlaceDetailsResult = await res.json()
  return parseAmbientClues(data)
}

export async function fetchPlacePhotos(placeId: string): Promise<string[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!
  const name = placeId.startsWith('places/') ? placeId : `places/${placeId}`

  const res = await fetch(
    `https://places.googleapis.com/v1/${name}?fields=photos&key=${apiKey}`
  )
  if (!res.ok) throw new Error(`Places API error: ${res.status}`)
  const data: { photos?: { name: string }[] } = await res.json()
  return (data.photos ?? []).map((p) => p.name)
}
