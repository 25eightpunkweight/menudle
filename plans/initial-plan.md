# Menudle — Game Plan

A daily "-dle" style game where players guess a restaurant from progressive clues about their menu items.

---

## Core Concept

Each day, all players get the same puzzle: a set of clues about a specific restaurant, revealed one at a time with each wrong guess. The goal is to identify the restaurant in as few guesses as possible. A shareable result card (like Wordle's emoji grid) is generated at the end.

---

## Clue Structure

### Always Visible (Ambient Clues)
Shown before the player makes any guess. Individually uninformative, but together they paint a picture.

| Clue | Example |
|---|---|
| ⭐ Rating | 4.2 |
| 💬 Review count bracket | 200–500 reviews |
| 💰 Price range | ₱₱ |
| 📅 Years in operation | Opened 6 years ago |

### Progressive Clues (Unlocked per wrong guess)

| Guess | Clue Revealed |
|---|---|
| **1** | Photo of the restaurant's most popular menu item as served |
| **2** | Dish name + description (if available) + price of that item |
| **3** | Establishment type + Cuisine (e.g. "Casual dining · Filipino") |
| **4** | Photo + name + description + price of the next most popular item |
| **5** | Neighborhood / location |

Players have **5 attempts** total. Each wrong guess unlocks the next clue tier.

---

## Data Requirements

Each restaurant entry in the database needs:

```json
{
  "id": "unique-restaurant-id",
  "name": "Restaurant Name",
  "rating": 4.2,
  "review_count": 350,
  "price_range": 2,
  "years_open": 6,
  "establishment_type": "Casual dining",
  "cuisine": "Filipino",
  "neighborhood": "BGC, Taguig",
  "menu_items": [
    {
      "rank": 1,
      "name": "Crispy Pata",
      "description": "Deep-fried pork knuckle served with vinegar dip",
      "price": 485,
      "photo_url": "https://..."
    },
    {
      "rank": 2,
      "name": "Sizzling Sisig",
      "description": "Chopped pork face and ears on a hot plate",
      "price": 320,
      "photo_url": "https://..."
    }
  ]
}
```

---

## Content Pipeline

### Phase 1 — Automated Collection
- Scrape or query restaurants in target area (start with one city/neighborhood)
- Sources to consider: Google Maps, Zomato (better structured menu data in PH)
- Pull per restaurant: name, rating, review count, price range, cuisine, location, menu items (name + description + price + photo)

### Phase 2 — Light Human Review (Admin UI)
- Simple dashboard to approve / reject / edit scraped entries
- Flag items where photos are too generic (stock photos, poor quality)
- Ensure the top 2 menu items are distinct and recognizable

### Puzzle Scheduling
- Maintain a queue of approved restaurant entries
- One puzzle per day, same for all players, seeded by date
- Aim for 60–90 entries at launch (enough for 2–3 months)

---

## Game UI — Key Screens

### Main Game Screen
- Ambient clue bar at the top (always visible)
- Clue reveal area (center) — updates with each wrong guess
- Search/guess input with fuzzy autocomplete against restaurant list
- Guess history showing previous wrong guesses
- Progress indicator (Guess X of 5)

### Result Screen
- Win/loss state
- Shareable emoji grid (e.g. 🟥🟥🟩 = got it on guess 3)
- Streak counter
- Countdown to next puzzle

---

## Tech Stack (Suggested)

| Layer | Option |
|---|---|
| Frontend | Next.js (React) |
| Database | Supabase (Postgres) |
| Image storage | Supabase Storage or Cloudflare R2 |
| Hosting | Vercel |
| Scraping/pipeline | Python (BeautifulSoup / Playwright) |
| Admin UI | Simple Next.js admin route or Retool |

---

## Phased Rollout

### v1 — Local MVP
- Single city/neighborhood (e.g. BGC or Makati)
- 60–90 manually reviewed restaurant entries
- Core game loop only (no accounts, no streaks stored server-side)
- Share card via clipboard copy

### v2 — Engagement Layer
- User accounts (or anonymous device-based streaks)
- Streak tracking + stats page (like Wordle's stats modal)
- Leaderboard or friend challenges

### v3 — Scale
- Expand to more cities / neighborhoods
- Community submissions with moderation queue
- Multiple puzzle modes (e.g. harder mode: no ambient clues)

---

## Open Questions
- What city/neighborhood to launch with?
- Use Google Places API (official, consistent) or scrape Zomato (richer menu data)?
- How to handle restaurant name variants in the autocomplete (e.g. "McDonald's" vs "Mcdo")?
- Puzzle selection strategy — rotate by cuisine type to keep variety day-to-day?