import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthed } from '@/lib/admin-auth'
import { parseAmbientClues } from '@/lib/puzzle'

export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const placeId = req.nextUrl.searchParams.get('place_id')
  if (!placeId) return NextResponse.json({ error: 'Missing place_id' }, { status: 400 })

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY!
  const name = `places/${placeId}`

  const res = await fetch(
    `https://places.googleapis.com/v1/${name}?key=${apiKey}`,
    {
      headers: { 'X-Goog-FieldMask': 'photos,rating,userRatingCount,priceLevel,formattedAddress,addressComponents' },
      cache: 'no-store',
    }
  )
  if (!res.ok) {
    const body = await res.text()
    return NextResponse.json({ error: `Places API ${res.status}: ${body}` }, { status: 502 })
  }

  const data: {
    photos?: { name: string }[]
    rating?: number
    userRatingCount?: number
    priceLevel?: string
    formattedAddress?: string
    addressComponents?: { longText: string; shortText: string; types: string[] }[]
  } = await res.json()

  const photos = (data.photos ?? []).slice(0, 10).map((p) => ({
    name: p.name,
    url: `https://places.googleapis.com/v1/${p.name}/media?maxHeightPx=200&key=${apiKey}`,
  }))

  return NextResponse.json({
    photos,
    address: data.formattedAddress ?? '',
    ambient_clues: parseAmbientClues(data),
  })
}
