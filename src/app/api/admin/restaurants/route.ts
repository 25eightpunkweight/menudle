import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthed } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase'

type MenuItemInput = {
  rank: number
  name: string
  description: string
  price: number
  photo_reference: string
}

type Body = {
  place_id: string
  name: string
  cuisine: string
  establishment_type: string
  menu_items: MenuItemInput[]
  exterior_photo_ref: string | null
  puzzle_date: string | null
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await getSupabaseAdmin()
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ restaurants: data })
}

export async function PATCH(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { name, cuisine, establishment_type, menu_items, exterior_photo_ref } = await req.json()

  const { data, error } = await getSupabaseAdmin()
    .from('restaurants')
    .update({ name, cuisine, establishment_type, menu_items, exterior_photo_ref: exterior_photo_ref ?? null })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ restaurant: data })
}

export async function DELETE(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await getSupabaseAdmin()
    .from('restaurants')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: Body = await req.json()
  const { place_id, name, cuisine, establishment_type, menu_items, exterior_photo_ref, puzzle_date } = body

  if (!place_id || !name || !cuisine || !establishment_type || !menu_items?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error: insertError } = await getSupabaseAdmin()
    .from('restaurants')
    .upsert(
      { place_id, name, cuisine, establishment_type, menu_items, exterior_photo_ref: exterior_photo_ref ?? null, approved: true },
      { onConflict: 'place_id' }
    )
    .select('id')
    .single()

  if (insertError || !data) {
    return NextResponse.json({ error: insertError?.message ?? 'Insert failed' }, { status: 500 })
  }

  const restaurant = data as unknown as { id: string }

  if (puzzle_date) {
    const { error: queueError } = await getSupabaseAdmin()
      .from('puzzle_queue')
      .upsert(
        { restaurant_id: restaurant.id, puzzle_date },
        { onConflict: 'puzzle_date' }
      )
    if (queueError) {
      return NextResponse.json({ error: queueError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, id: restaurant.id })
}
