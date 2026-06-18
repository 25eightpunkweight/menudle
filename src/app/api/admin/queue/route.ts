import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthed } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase'

function phtDate(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000)
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
}

type QueueRow = {
  puzzle_date: string
  restaurant_id: string
  restaurants: { id: string; name: string; cuisine: string; establishment_type: string }
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = phtDate(0)

  const { data: queueData, error: queueError } = await getSupabaseAdmin()
    .from('puzzle_queue')
    .select('puzzle_date, restaurant_id, restaurants(id, name, cuisine, establishment_type)')
    .gte('puzzle_date', today)
    .order('puzzle_date')

  if (queueError) return NextResponse.json({ error: queueError.message }, { status: 500 })

  const rows = (queueData ?? []) as unknown as QueueRow[]
  const queuedIds = rows.map(r => r.restaurant_id)

  let unqueuedQuery = getSupabaseAdmin()
    .from('restaurants')
    .select('id, name, cuisine, establishment_type')
    .order('name')

  if (queuedIds.length > 0) {
    unqueuedQuery = unqueuedQuery.not('id', 'in', `(${queuedIds.join(',')})`)
  }

  const { data: unqueuedData, error: unqueuedError } = await unqueuedQuery
  if (unqueuedError) return NextResponse.json({ error: unqueuedError.message }, { status: 500 })

  return NextResponse.json({
    queued: rows.map(r => ({ puzzle_date: r.puzzle_date, restaurant: r.restaurants })),
    unqueued: unqueuedData ?? [],
  })
}

export async function PUT(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { restaurant_ids }: { restaurant_ids: string[] } = await req.json()

  const today = phtDate(0)

  // Clear today and all future queue entries and replace with the new ordered list
  const { error: deleteError } = await getSupabaseAdmin()
    .from('puzzle_queue')
    .delete()
    .gte('puzzle_date', today)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  if (restaurant_ids.length === 0) return NextResponse.json({ ok: true })

  const entries = restaurant_ids.map((id, i) => ({
    restaurant_id: id,
    puzzle_date: phtDate(i),
  }))

  const { error: insertError } = await getSupabaseAdmin()
    .from('puzzle_queue')
    .insert(entries)

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
