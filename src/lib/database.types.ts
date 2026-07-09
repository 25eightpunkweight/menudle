export type MenuItem = {
  rank: number
  name: string
  description: string
  price: number
  photo_reference: string
  photo_url: string | null
  photo_attribution: string | null
}

export type Restaurant = {
  id: string
  place_id: string
  name: string
  cuisine: string
  establishment_type: string
  menu_items: MenuItem[]
  exterior_photo_ref: string | null
  exterior_photo_url: string | null
  exterior_photo_attribution: string | null
  approved: boolean
  created_at: string
}

export type PuzzleQueue = {
  id: string
  restaurant_id: string
  puzzle_date: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      restaurants: {
        Row: Restaurant
        Insert: Omit<Restaurant, 'id' | 'created_at'>
        Update: Partial<Omit<Restaurant, 'id' | 'created_at'>>
      }
      puzzle_queue: {
        Row: PuzzleQueue
        Insert: Omit<PuzzleQueue, 'id' | 'created_at'>
        Update: Partial<Omit<PuzzleQueue, 'id' | 'created_at'>>
      }
    }
  }
}
