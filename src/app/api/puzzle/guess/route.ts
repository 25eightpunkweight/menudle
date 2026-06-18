import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getPHTDateString } from '@/lib/puzzle'

type QueueRow = {
  restaurants: { place_id: string; name: string } | null
}

export async function POST(req: NextRequest) {
  const body: { place_id?: string; puzzle_date?: string; guess_number?: number } = await req.json()

  if (!body.place_id || !body.puzzle_date) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const today = getPHTDateString()
  if (body.puzzle_date !== today) {
    return NextResponse.json({ error: 'Invalid puzzle date' }, { status: 400 })
  }

  const { data, error } = await getSupabase()
    .from('puzzle_queue')
    .select('restaurants(place_id, name)')
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

  const correct = body.place_id === restaurant.place_id
  const isLastGuess = (body.guess_number ?? 0) >= 6

  return NextResponse.json({
    correct,
    restaurant_name: correct || isLastGuess ? restaurant.name : null,
  })
}
