'use client'

import { useEffect, useRef, useState } from 'react'
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps'

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!

const ESTABLISHMENT_TYPES = [
  'Fast Food',
  'Fast Casual',
  'Casual Dining',
  'Upscale Casual',
  'Fine Dining',
  'Cafe',
  'Bakery',
  'Buffet',
  'Eat-All-You-Can',
  'Diner',
]

// ── Types ──────────────────────────────────────────────────────────────────────

type PhotoOption = { name: string; url: string }

type PhotoSelection = {
  photo_reference: string
  photo_url: string | null
  photo_attribution: string | null
}

type AmbientClues = {
  rating: number
  review_count_bracket: string
  price_level: string
  neighborhood: string
}

type PlacePreview = {
  place_id: string
  name: string
  address: string
  photos: PhotoOption[]
  ambient_clues: AmbientClues
}

type RestaurantInfo = {
  id: string
  name: string
  cuisine: string
  establishment_type: string
}

type QueueEntry = {
  puzzle_date: string
  restaurant: RestaurantInfo
}

type MenuItemFull = {
  rank: number
  name: string
  description: string
  price: string
  price_currency_prefix: boolean
  photo_reference: string
  photo_url: string | null
  photo_attribution: string | null
  photo_date: string | null
}

type RestaurantFull = {
  id: string
  place_id: string
  name: string
  cuisine: string
  establishment_type: string
  price_level: string
  menu_items: MenuItemFull[]
  exterior_photo_ref: string | null
  exterior_photo_url: string | null
  exterior_photo_attribution: string | null
  exterior_photo_date: string | null
  approved: boolean
  created_at: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function clientDate(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toLocaleDateString('en-CA')
}

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-PH', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function recalcDates(items: QueueEntry[]): QueueEntry[] {
  return items.map((item, i) => ({ ...item, puzzle_date: clientDate(i) }))
}

// ── PhotoPicker ────────────────────────────────────────────────────────────────

function PhotoPicker({ photos, selection, onChange, label }: {
  photos: PhotoOption[]
  selection: PhotoSelection
  onChange: (next: PhotoSelection) => void
  label: string
}) {
  const usingManual = Boolean(selection.photo_url)
  const [manualOpen, setManualOpen] = useState(usingManual)

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-zinc-500">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {photos.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => onChange({ photo_reference: p.name, photo_url: null, photo_attribution: null })}
            className={`shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
              !usingManual && selection.photo_reference === p.name
                ? 'border-zinc-900'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <img src={p.url} alt="" className="h-24 w-24 object-cover" />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setManualOpen((v) => !v)}
        className="text-xs text-zinc-400 underline hover:text-zinc-600"
      >
        {manualOpen ? 'Hide custom URL' : 'Use a custom URL instead'}
      </button>
      {manualOpen && (
        <div className="mt-2 space-y-1.5">
          <input
            value={selection.photo_url ?? ''}
            onChange={(e) => onChange({ ...selection, photo_url: e.target.value || null })}
            placeholder="Image URL"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
          <input
            value={selection.photo_attribution ?? ''}
            onChange={(e) => onChange({ ...selection, photo_attribution: e.target.value || null })}
            placeholder="Attribution (e.g. Yelp, Zomato, restaurant's website — optional)"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
        </div>
      )}
    </div>
  )
}

// ── MonthYearPicker ────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 2009 }, (_, i) => CURRENT_YEAR - i)

function MonthYearPicker({ value, onChange }: {
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [selMonth, setSelMonth] = useState(() => value ? value.split('-')[1] : '')
  const [selYear, setSelYear] = useState(() => value ? value.split('-')[0] : '')

  // Re-sync if parent resets value (e.g. form cancel)
  useEffect(() => {
    setSelMonth(value ? value.split('-')[1] : '')
    setSelYear(value ? value.split('-')[0] : '')
  }, [value])

  function handleMonth(month: string) {
    setSelMonth(month)
    if (selYear && month) onChange(`${selYear}-${month}`)
    else if (!month && !selYear) onChange(null)
  }

  function handleYear(year: string) {
    setSelYear(year)
    if (year && selMonth) onChange(`${year}-${selMonth}`)
    else if (!year && !selMonth) onChange(null)
  }

  function clear() {
    setSelMonth('')
    setSelYear('')
    onChange(null)
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <p className="text-xs font-medium text-zinc-500 shrink-0">As of</p>
      <select
        value={selMonth}
        onChange={e => handleMonth(e.target.value)}
        className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-zinc-500"
      >
        <option value="">Month</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
        ))}
      </select>
      <select
        value={selYear}
        onChange={e => handleYear(e.target.value)}
        className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-zinc-500"
      >
        <option value="">Year</option>
        {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
      </select>
      {(selMonth || selYear) && (
        <button
          type="button"
          onClick={clear}
          className="text-xs text-zinc-400 hover:text-zinc-600"
        >
          Clear
        </button>
      )}
    </div>
  )
}

// ── AmbientCluesPreview ────────────────────────────────────────────────────────

function AmbientCluesPreview({ clues }: { clues: AmbientClues }) {
  return (
    <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-zinc-500">
      <span>⭐ {clues.rating}</span>
      <span>💬 {clues.review_count_bracket}</span>
      <span>💰 {clues.price_level}</span>
      <span>📍 {clues.neighborhood}</span>
    </div>
  )
}

// ── PlaceLookup ────────────────────────────────────────────────────────────────

function PlaceLookup({ onFound, password }: {
  onFound: (preview: PlacePreview) => void
  password: string
}) {
  const placesLib = useMapsLibrary('places')
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!placesLib || !containerRef.current) return

    const element = new google.maps.places.PlaceAutocompleteElement({
      includedPrimaryTypes: ['establishment'],
      includedRegionCodes: ['PH'],
      requestedRegion: 'ph',
      locationRestriction: {
        south: 14.3167,
        west: 120.9333,
        north: 14.7667,
        east: 121.1333,
      },
    })
    element.setAttribute('placeholder', 'Start typing a restaurant name…')
    containerRef.current.appendChild(element)

    async function handleSelect(event: Event) {
      setError(null)
      const { placePrediction } = event as Event & {
        placePrediction: {
          toPlace: () => {
            id?: string
            displayName?: string
            fetchFields: (opts: { fields: string[] }) => Promise<void>
          }
        }
      }
      if (!placePrediction) { setError('No prediction in select event.'); return }

      const place = placePrediction.toPlace()
      try {
        await place.fetchFields({ fields: ['id', 'displayName'] })
      } catch (err) {
        setError(`fetchFields error: ${err}`)
        return
      }
      if (!place.id) { setError('No place ID returned from Google Maps.'); return }

      setLoading(true)
      fetch(`/api/admin/place-details?place_id=${place.id}`, {
        headers: { 'x-admin-secret': password },
      })
        .then(async (r) => {
          if (!r.ok) { const t = await r.text(); throw new Error(`place-details API ${r.status}: ${t}`) }
          return r.json()
        })
        .then((data: { photos: PhotoOption[]; address: string; ambient_clues: AmbientClues }) => {
          onFound({
            place_id: place.id!,
            name: place.displayName ?? '',
            address: data.address ?? '',
            photos: data.photos ?? [],
            ambient_clues: data.ambient_clues,
          })
        })
        .catch((err) => setError(String(err)))
        .finally(() => setLoading(false))
    }

    element.addEventListener('gmp-select', handleSelect)
    return () => { element.removeEventListener('gmp-select', handleSelect); element.remove() }
  }, [placesLib, onFound, password])

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">Search restaurant</label>
      <div ref={containerRef} className="w-full [&>*]:w-full" />
      {loading && <p className="text-xs text-zinc-400">Fetching place details…</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── QueueManager ───────────────────────────────────────────────────────────────

type DragState = { id: string; source: 'queue' | 'unqueued' }
type DropTarget = { list: 'queue'; index: number }

function DropZone({ active, onDragOver, onDrop }: {
  active: boolean
  onDragOver: () => void
  onDrop: () => void
}) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onDragOver() }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop() }}
      className={`rounded-md transition-all duration-100 ${
        active ? 'h-8 border-2 border-dashed border-blue-400 bg-blue-50' : 'h-1'
      }`}
    />
  )
}

function QueueManager({ password }: { password: string }) {
  const [queued, setQueued] = useState<QueueEntry[]>([])
  const [unqueued, setUnqueued] = useState<RestaurantInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  useEffect(() => {
    fetch('/api/admin/queue', { headers: { 'x-admin-secret': password } })
      .then(r => r.json())
      .then(data => {
        setQueued(recalcDates(data.queued ?? []))
        setUnqueued(data.unqueued ?? [])
        setLoading(false)
      })
  }, [password])

  function dragStart(id: string, source: 'queue' | 'unqueued') {
    setDrag({ id, source })
    setSaved(false)
  }

  function dragEnd() {
    setDrag(null)
    setDropTarget(null)
  }

  function drop(targetList: 'queue' | 'unqueued', insertIndex: number) {
    if (!drag) return
    const { id, source } = drag

    if (source === 'unqueued' && targetList === 'queue') {
      const item = unqueued.find(u => u.id === id)
      if (!item) return
      const next = [...queued]
      next.splice(insertIndex, 0, { puzzle_date: '', restaurant: item })
      setQueued(recalcDates(next))
      setUnqueued(unqueued.filter(u => u.id !== id))

    } else if (source === 'queue' && targetList === 'unqueued') {
      const entry = queued.find(q => q.restaurant.id === id)
      if (!entry) return
      setQueued(recalcDates(queued.filter(q => q.restaurant.id !== id)))
      setUnqueued([...unqueued, entry.restaurant].sort((a, b) => a.name.localeCompare(b.name)))

    } else if (source === 'queue' && targetList === 'queue') {
      const from = queued.findIndex(q => q.restaurant.id === id)
      // dropping before itself or right after itself = no-op
      if (from === -1 || from === insertIndex || from === insertIndex - 1) return
      const next = [...queued]
      const [item] = next.splice(from, 1)
      next.splice(from < insertIndex ? insertIndex - 1 : insertIndex, 0, item)
      setQueued(recalcDates(next))
    }

    dragEnd()
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/admin/queue', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': password },
      body: JSON.stringify({ restaurant_ids: queued.map(q => q.restaurant.id) }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
    } else {
      const err = await res.json()
      alert(`Error: ${err.error}`)
    }
  }

  if (loading) return <p className="text-sm text-zinc-400">Loading…</p>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-6">

        {/* ── Queue (List A) ── */}
        <div>
          <p className="mb-2 text-sm font-semibold">
            Queue <span className="font-normal text-zinc-400">({queued.length})</span>
          </p>
          <div
            className="min-h-48 rounded-xl border-2 border-dashed border-zinc-200 p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); drop('queue', queued.length) }}
          >
            {queued.length === 0 && (
              <p className="py-10 text-center text-xs text-zinc-400">
                Drag restaurants here to schedule them
              </p>
            )}
            {queued.map((entry, i) => (
              <div key={entry.restaurant.id}>
                <DropZone
                  active={dropTarget?.index === i}
                  onDragOver={() => setDropTarget({ list: 'queue', index: i })}
                  onDrop={() => drop('queue', i)}
                />
                <div
                  draggable
                  onDragStart={() => dragStart(entry.restaurant.id, 'queue')}
                  onDragEnd={dragEnd}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ list: 'queue', index: i }) }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); drop('queue', i) }}
                  className={`flex cursor-grab items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm active:cursor-grabbing ${
                    drag?.id === entry.restaurant.id ? 'opacity-40' : ''
                  }`}
                >
                  <span className="w-20 shrink-0 text-xs text-zinc-400">
                    {formatDisplayDate(entry.puzzle_date)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{entry.restaurant.name}</p>
                    <p className="truncate text-xs text-zinc-400">
                      {entry.restaurant.cuisine} · {entry.restaurant.establishment_type}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <DropZone
              active={dropTarget?.index === queued.length}
              onDragOver={() => setDropTarget({ list: 'queue', index: queued.length })}
              onDrop={() => drop('queue', queued.length)}
            />
          </div>
        </div>

        {/* ── Unqueued (List B) ── */}
        <div>
          <p className="mb-2 text-sm font-semibold">
            Restaurants <span className="font-normal text-zinc-400">({unqueued.length})</span>
          </p>
          <div
            className="min-h-48 rounded-xl border-2 border-dashed border-zinc-200 p-2 space-y-1"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); drop('unqueued', 0) }}
          >
            {unqueued.length === 0 && (
              <p className="py-10 text-center text-xs text-zinc-400">All restaurants are queued</p>
            )}
            {unqueued.map(r => (
              <div
                key={r.id}
                draggable
                onDragStart={() => dragStart(r.id, 'unqueued')}
                onDragEnd={dragEnd}
                className={`flex cursor-grab items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm active:cursor-grabbing ${
                  drag?.id === r.id ? 'opacity-40' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="truncate text-xs text-zinc-400">
                    {r.cuisine} · {r.establishment_type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save queue'}
        </button>
        {saved && <p className="text-sm text-green-600">Saved!</p>}
      </div>

      <p className="text-xs text-zinc-400">
        Drag from Restaurants → Queue to schedule. Drag within Queue to reorder.
        Drag back to Restaurants to remove from queue. Dates are assigned consecutively starting today.
      </p>
    </div>
  )
}

// ── RestaurantsCRUDTab ─────────────────────────────────────────────────────────

type MenuItemDraft = {
  rank: number
  name: string
  description: string
  price: string
  price_currency_prefix: boolean
  photo_reference: string
  photo_url: string | null
  photo_attribution: string | null
  photo_date: string | null
}

function RestaurantRow({ restaurant, password, onDeleted, onUpdated }: {
  restaurant: RestaurantFull
  password: string
  onDeleted: () => void
  onUpdated: (r: RestaurantFull) => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [name, setName] = useState(restaurant.name)
  const [cuisine, setCuisine] = useState(restaurant.cuisine)
  const [estType, setEstType] = useState(restaurant.establishment_type)
  const [priceLevel, setPriceLevel] = useState(restaurant.price_level ?? '₱₱')
  const [items, setItems] = useState<MenuItemDraft[]>(restaurant.menu_items)
  const [exteriorPhotoRef, setExteriorPhotoRef] = useState(restaurant.exterior_photo_ref ?? '')
  const [exteriorPhotoUrl, setExteriorPhotoUrl] = useState(restaurant.exterior_photo_url)
  const [exteriorPhotoAttribution, setExteriorPhotoAttribution] = useState(restaurant.exterior_photo_attribution)
  const [exteriorPhotoDate, setExteriorPhotoDate] = useState<string | null>(restaurant.exterior_photo_date ?? null)
  const [editPhotos, setEditPhotos] = useState<PhotoOption[]>([])
  const [editAmbientClues, setEditAmbientClues] = useState<AmbientClues | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [refetching, setRefetching] = useState(false)

  function fetchPlaceData() {
    setRefetching(true)
    fetch(`/api/admin/place-details?place_id=${restaurant.place_id}`, {
      headers: { 'x-admin-secret': password },
    })
      .then(r => r.json())
      .then((data: { photos: PhotoOption[]; ambient_clues: AmbientClues }) => {
        setEditPhotos(data.photos ?? [])
        setEditAmbientClues(data.ambient_clues ?? null)
      })
      .catch(() => {})
      .finally(() => setRefetching(false))
  }

  useEffect(() => {
    if (!editing) return
    fetchPlaceData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  function resetDraft() {
    setName(restaurant.name)
    setCuisine(restaurant.cuisine)
    setEstType(restaurant.establishment_type)
    setPriceLevel(restaurant.price_level ?? '₱₱')
    setItems(restaurant.menu_items)
    setExteriorPhotoRef(restaurant.exterior_photo_ref ?? '')
    setExteriorPhotoUrl(restaurant.exterior_photo_url)
    setExteriorPhotoAttribution(restaurant.exterior_photo_attribution)
    setExteriorPhotoDate(restaurant.exterior_photo_date ?? null)
  }

  function updateItem(rank: number, field: keyof MenuItemDraft, value: string) {
    setItems(prev => prev.map(m => m.rank === rank ? { ...m, [field]: value } : m))
  }

  function updateItemPhoto(rank: number, selection: PhotoSelection) {
    setItems(prev => prev.map(m => m.rank === rank ? { ...m, ...selection } : m))
  }

  function updateItemPrefix(rank: number, value: boolean) {
    setItems(prev => prev.map(m => m.rank === rank ? { ...m, price_currency_prefix: value } : m))
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/admin/restaurants?id=${restaurant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': password },
      body: JSON.stringify({
        name, cuisine, establishment_type: estType, price_level: priceLevel,
        menu_items: items,
        exterior_photo_ref: exteriorPhotoRef || null,
        exterior_photo_url: exteriorPhotoUrl,
        exterior_photo_attribution: exteriorPhotoAttribution,
        exterior_photo_date: exteriorPhotoDate,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const { restaurant: updated } = await res.json()
      onUpdated(updated as RestaurantFull)
      setEditing(false)
    } else {
      const err = await res.json()
      alert(`Error: ${err.error}`)
    }
  }

  async function destroy() {
    setDeleting(true)
    const res = await fetch(`/api/admin/restaurants?id=${restaurant.id}`, {
      method: 'DELETE',
      headers: { 'x-admin-secret': password },
    })
    setDeleting(false)
    if (res.ok) { onDeleted() }
    else { const err = await res.json(); alert(`Error: ${err.error}`) }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200">
      <div className="flex items-center justify-between bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{restaurant.name}</p>
          <p className="truncate text-xs text-zinc-400">
            {restaurant.cuisine} · {restaurant.establishment_type}
          </p>
        </div>
        <div className="ml-4 flex shrink-0 items-center gap-2">
          {!editing && (
            <button
              onClick={() => { setEditing(true); setConfirmDelete(false) }}
              className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
            >
              Edit
            </button>
          )}
          {!confirmDelete ? (
            <button
              onClick={() => { setConfirmDelete(true); setEditing(false); resetDraft() }}
              className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50"
            >
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={destroy}
                disabled={deleting}
                className="rounded-md bg-red-500 px-2.5 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Confirm delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div className="space-y-4 border-t border-zinc-100 bg-zinc-50 p-4">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500">Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Cuisine</label>
              <input value={cuisine} onChange={e => setCuisine(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Establishment type</label>
              <select value={estType} onChange={e => setEstType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500">
                {ESTABLISHMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Price range</label>
              <select value={priceLevel} onChange={e => setPriceLevel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500">
                <option value="₱">₱ · Php1–300 per person</option>
                <option value="₱₱">₱₱ · Php300–800 per person</option>
                <option value="₱₱₱">₱₱₱ · Php800–1,000 per person</option>
                <option value="₱₱₱₱">₱₱₱₱ · Php1,000+ per person</option>
              </select>
            </div>
          </div>

          {items.map(item => (
            <div key={item.rank} className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-xs font-semibold text-zinc-500">Menu item #{item.rank}</p>
              {editPhotos.length > 0 && (
                <PhotoPicker
                  photos={editPhotos}
                  selection={{ photo_reference: item.photo_reference, photo_url: item.photo_url, photo_attribution: item.photo_attribution }}
                  onChange={(s) => updateItemPhoto(item.rank, s)}
                  label="Select dish photo"
                />
              )}
              <MonthYearPicker
                value={item.photo_date}
                onChange={(v) => setItems(prev => prev.map(m => m.rank === item.rank ? { ...m, photo_date: v } : m))}
              />
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-zinc-500">Dish name</label>
                  <input value={item.name} onChange={e => updateItem(item.rank, 'name', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500">Price</label>
                  <input type="text" value={item.price} onChange={e => updateItem(item.rank, 'price', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500" />
                  <label className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                    <input type="checkbox" checked={item.price_currency_prefix ?? true} onChange={e => updateItemPrefix(item.rank, e.target.checked)} />
                    ₱ prefix
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500">Description</label>
                <textarea value={item.description} onChange={e => updateItem(item.rank, 'description', e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500" />
              </div>
            </div>
          ))}

          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-500">Ambient clues (live from Google)</p>
              <button
                type="button"
                onClick={fetchPlaceData}
                disabled={refetching}
                className="rounded px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50"
              >
                {refetching ? 'Fetching…' : 'Re-fetch'}
              </button>
            </div>
            {editAmbientClues
              ? <AmbientCluesPreview clues={editAmbientClues} />
              : <p className="text-xs text-zinc-400">Loading…</p>
            }
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <p className="mb-2 text-xs font-semibold text-zinc-500">Exterior / signage photo</p>
            {editPhotos.length === 0 ? (
              <p className="text-xs text-zinc-400">Loading photos…</p>
            ) : (
              <PhotoPicker
                photos={editPhotos}
                selection={{ photo_reference: exteriorPhotoRef, photo_url: exteriorPhotoUrl, photo_attribution: exteriorPhotoAttribution }}
                onChange={(s) => { setExteriorPhotoRef(s.photo_reference); setExteriorPhotoUrl(s.photo_url); setExteriorPhotoAttribution(s.photo_attribution) }}
                label="Select exterior photo (shown as clue 5)"
              />
            )}
            <MonthYearPicker value={exteriorPhotoDate} onChange={setExteriorPhotoDate} />
          </div>

          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button onClick={() => { setEditing(false); resetDraft() }}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RestaurantsCRUDTab({ password }: { password: string }) {
  // Add-new state
  const [preview, setPreview] = useState<PlacePreview | null>(null)
  const [cuisine, setCuisine] = useState('')
  const [estType, setEstType] = useState('')
  const [priceLevel, setPriceLevel] = useState('₱₱')
  const [draftItems, setDraftItems] = useState<MenuItemDraft[]>([
    { rank: 1, name: '', description: '', price: '', price_currency_prefix: true, photo_reference: '', photo_url: null, photo_attribution: null, photo_date: null },
    { rank: 2, name: '', description: '', price: '', price_currency_prefix: true, photo_reference: '', photo_url: null, photo_attribution: null, photo_date: null },
  ])
  const [exteriorPhotoRef, setExteriorPhotoRef] = useState('')
  const [exteriorPhotoUrl, setExteriorPhotoUrl] = useState<string | null>(null)
  const [exteriorPhotoAttribution, setExteriorPhotoAttribution] = useState<string | null>(null)
  const [exteriorPhotoDate, setExteriorPhotoDate] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // List state
  const [restaurants, setRestaurants] = useState<RestaurantFull[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/restaurants', { headers: { 'x-admin-secret': password } })
      .then(r => r.json())
      .then(data => { setRestaurants(data.restaurants ?? []); setLoading(false) })
  }, [password])

  function updateDraftItem(rank: number, field: keyof MenuItemDraft, value: string) {
    setDraftItems(prev => prev.map(it => it.rank === rank ? { ...it, [field]: value } : it))
  }

  function updateDraftItemPhoto(rank: number, selection: PhotoSelection) {
    setDraftItems(prev => prev.map(it => it.rank === rank ? { ...it, ...selection } : it))
  }

  function updateDraftItemPrefix(rank: number, value: boolean) {
    setDraftItems(prev => prev.map(it => it.rank === rank ? { ...it, price_currency_prefix: value } : it))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!preview) return
    setSaving(true)

    const menuItems = draftItems
    const res = await fetch('/api/admin/restaurants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': password },
      body: JSON.stringify({
        place_id: preview.place_id,
        name: preview.name,
        cuisine,
        establishment_type: estType,
        price_level: priceLevel,
        menu_items: menuItems,
        exterior_photo_ref: exteriorPhotoRef || null,
        exterior_photo_url: exteriorPhotoUrl,
        exterior_photo_attribution: exteriorPhotoAttribution,
        exterior_photo_date: exteriorPhotoDate,
        puzzle_date: null,
      }),
    })

    setSaving(false)
    if (res.ok) {
      const { id } = await res.json()
      const newRestaurant: RestaurantFull = {
        id,
        place_id: preview.place_id,
        name: preview.name,
        cuisine,
        establishment_type: estType,
        price_level: priceLevel,
        menu_items: menuItems,
        exterior_photo_ref: exteriorPhotoRef || null,
        exterior_photo_url: exteriorPhotoUrl,
        exterior_photo_attribution: exteriorPhotoAttribution,
        exterior_photo_date: exteriorPhotoDate,
        approved: true,
        created_at: new Date().toISOString(),
      }
      setRestaurants(prev => [newRestaurant, ...prev])
      setPreview(null)
      setCuisine('')
      setEstType('')
      setPriceLevel('₱₱')
      setDraftItems([
        { rank: 1, name: '', description: '', price: '', price_currency_prefix: true, photo_reference: '', photo_url: null, photo_attribution: null, photo_date: null },
        { rank: 2, name: '', description: '', price: '', price_currency_prefix: true, photo_reference: '', photo_url: null, photo_attribution: null, photo_date: null },
      ])
      setExteriorPhotoRef('')
      setExteriorPhotoUrl(null)
      setExteriorPhotoAttribution(null)
      setExteriorPhotoDate(null)
    } else {
      const err = await res.json()
      alert(`Error: ${err.error}`)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <PlaceLookup onFound={setPreview} password={password} />

        {preview && (
          <>
            <div className="rounded-xl bg-zinc-50 p-4 text-sm">
              <p className="font-semibold">{preview.name}</p>
              <p className="text-zinc-500">{preview.address}</p>
              <AmbientCluesPreview clues={preview.ambient_clues} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-500">Cuisine</label>
                <input
                  required
                  value={cuisine}
                  onChange={e => setCuisine(e.target.value)}
                  placeholder="e.g. Filipino"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500">Establishment type</label>
                <select
                  required
                  value={estType}
                  onChange={e => setEstType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500">
                  <option value="" disabled>Select type…</option>
                  {ESTABLISHMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500">Price range</label>
                <select
                  value={priceLevel}
                  onChange={e => setPriceLevel(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                >
                  <option value="₱">₱ · Php1–300 per person</option>
                  <option value="₱₱">₱₱ · Php300–800 per person</option>
                  <option value="₱₱₱">₱₱₱ · Php800–1,000 per person</option>
                  <option value="₱₱₱₱">₱₱₱₱ · Php1,000+ per person</option>
                </select>
              </div>
            </div>

            {draftItems.map(item => (
              <div key={item.rank} className="space-y-3 rounded-xl border border-zinc-200 p-4">
                <p className="text-sm font-semibold">Menu item #{item.rank}</p>
                <PhotoPicker
                  photos={preview.photos}
                  selection={{ photo_reference: item.photo_reference, photo_url: item.photo_url, photo_attribution: item.photo_attribution }}
                  onChange={(s) => updateDraftItemPhoto(item.rank, s)}
                  label="Select dish photo"
                />
                <MonthYearPicker
                  value={item.photo_date}
                  onChange={(v) => setDraftItems(prev => prev.map(it => it.rank === item.rank ? { ...it, photo_date: v } : it))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-500">Dish name</label>
                    <input
                      required
                      value={item.name}
                      onChange={e => updateDraftItem(item.rank, 'name', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500">Price</label>
                    <input
                      required
                      type="text"
                      value={item.price}
                      onChange={e => updateDraftItem(item.rank, 'price', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                    />
                    <label className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                      <input type="checkbox" checked={item.price_currency_prefix ?? true} onChange={e => updateDraftItemPrefix(item.rank, e.target.checked)} />
                      ₱ prefix
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500">Description</label>
                  <textarea
                    value={item.description}
                    onChange={e => updateDraftItem(item.rank, 'description', e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                  />
                </div>
              </div>
            ))}

            <div className="rounded-xl border border-zinc-200 p-4">
              <p className="mb-3 text-sm font-semibold">Exterior / signage photo</p>
              <PhotoPicker
                photos={preview.photos}
                selection={{ photo_reference: exteriorPhotoRef, photo_url: exteriorPhotoUrl, photo_attribution: exteriorPhotoAttribution }}
                onChange={(s) => { setExteriorPhotoRef(s.photo_reference); setExteriorPhotoUrl(s.photo_url); setExteriorPhotoAttribution(s.photo_attribution) }}
                label="Select exterior photo (shown as clue 5)"
              />
              <MonthYearPicker value={exteriorPhotoDate} onChange={setExteriorPhotoDate} />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save restaurant'}
            </button>
          </>
        )}
      </form>

      {!loading && restaurants.length > 0 && (
        <div className="border-t border-zinc-100 pt-6">
          <p className="mb-3 text-sm font-semibold">
            All restaurants <span className="font-normal text-zinc-400">({restaurants.length})</span>
          </p>
          <div className="space-y-2">
            {restaurants.map(r => (
              <RestaurantRow
                key={r.id}
                restaurant={r}
                password={password}
                onDeleted={() => setRestaurants(prev => prev.filter(x => x.id !== r.id))}
                onUpdated={updated => setRestaurants(prev => prev.map(x => x.id === updated.id ? updated : x))}
              />
            ))}
          </div>
        </div>
      )}
      {loading && <p className="text-sm text-zinc-400">Loading…</p>}
    </div>
  )
}

// ── AdminPage ──────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState(false)
  const [tab, setTab] = useState<'restaurants' | 'queue'>('restaurants')

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) { setAuthed(true) }
    else { setAuthError(true) }
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <form onSubmit={handleAuth} className="w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold">Admin</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-500"
          />
          {authError && <p className="text-xs text-red-500">Incorrect password.</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white"
          >
            Enter
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-xl font-bold">Admin</h1>
        <div className="flex rounded-lg border border-zinc-200 p-0.5">
          <button
            onClick={() => setTab('restaurants')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === 'restaurants' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Restaurants
          </button>
          <button
            onClick={() => setTab('queue')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === 'queue' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Queue
          </button>
        </div>
      </div>

      {tab === 'restaurants' && (
        <APIProvider apiKey={MAPS_API_KEY}>
          <RestaurantsCRUDTab password={password} />
        </APIProvider>
      )}
      {tab === 'queue' && <QueueManager password={password} />}
    </main>
  )
}
