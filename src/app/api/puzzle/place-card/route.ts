import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getPHTDateString, PRICE_SYMBOL_LABELS } from '@/lib/puzzle'

type QueueRow = {
  restaurants: { place_id: string; price_level: string } | null
}

export async function GET() {
  const today = getPHTDateString()

  const { data, error } = await getSupabaseAdmin()
    .from('puzzle_queue')
    .select('restaurants(place_id, price_level)')
    .eq('puzzle_date', today)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'No puzzle today' }, { status: 404 })
  }

  const queued = data as unknown as QueueRow
  const restaurant = queued.restaurants
  if (!restaurant) {
    return NextResponse.json({ error: 'Puzzle data missing' }, { status: 500 })
  }

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY!
  const name = `places/${restaurant.place_id}`

  const res = await fetch(
    `https://places.googleapis.com/v1/${name}?key=${apiKey}`,
    {
      headers: {
        'X-Goog-FieldMask':
          'displayName,formattedAddress,rating,priceLevel,photos,googleMapsUri,websiteUri',
      },
    }
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'Places API error' }, { status: 502 })
  }

  const place: {
    displayName?: { text: string }
    formattedAddress?: string
    rating?: number
    priceLevel?: string
    photos?: { name: string }[]
    googleMapsUri?: string
    websiteUri?: string
  } = await res.json()

  const firstPhoto = place.photos?.[0]?.name
  const photoUrl = firstPhoto
    ? `https://places.googleapis.com/v1/${firstPhoto}/media?maxHeightPx=400&key=${apiKey}`
    : null

  return NextResponse.json({
    name: place.displayName?.text ?? '',
    address: place.formattedAddress ?? '',
    rating: place.rating ?? null,
    price_level: PRICE_SYMBOL_LABELS[restaurant.price_level] ?? null,
    photo_url: photoUrl,
    maps_url: place.googleMapsUri ?? null,
    website: place.websiteUri ?? null,
  })
}
