import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getPHTDateString, fetchPlaceAmbient, fetchPlacePhotos } from '@/lib/puzzle'
import type { MenuItem } from '@/lib/database.types'

type QueueRow = {
  restaurant_id: string
  restaurants: {
    place_id: string
    cuisine: string
    establishment_type: string
    menu_items: MenuItem[]
    exterior_photo_ref: string | null
    exterior_photo_url: string | null
    exterior_photo_attribution: string | null
  } | null
}

export async function GET() {
  const today = getPHTDateString()

  const { data, error } = await getSupabaseAdmin()
    .from('puzzle_queue')
    .select('restaurant_id, restaurants(place_id, cuisine, establishment_type, menu_items, exterior_photo_ref, exterior_photo_url, exterior_photo_attribution)')
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

  const [ambient, fallbackPhotos] = await Promise.all([
    fetchPlaceAmbient(restaurant.place_id),
    restaurant.exterior_photo_ref ? Promise.resolve([] as string[]) : fetchPlacePhotos(restaurant.place_id),
  ])

  const exterior_photo_ref = restaurant.exterior_photo_ref ?? fallbackPhotos.at(-1) ?? null

  return NextResponse.json({
    puzzle_date: today,
    ambient,
    restaurant_id: queued.restaurant_id,
    cuisine: restaurant.cuisine,
    establishment_type: restaurant.establishment_type,
    menu_items: restaurant.menu_items,
    exterior_photo_ref,
    exterior_photo_url: restaurant.exterior_photo_url,
    exterior_photo_attribution: restaurant.exterior_photo_attribution,
  })
}
