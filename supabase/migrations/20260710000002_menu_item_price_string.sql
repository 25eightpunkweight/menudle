-- Convert menu_items[].price from JSON number to JSON string,
-- and add price_currency_prefix: true to all existing items.
-- item->>'price' extracts the number as text ('450'), then
-- jsonb_build_object stores it back as a JSON string ("450").
UPDATE restaurants
SET menu_items = CASE
  WHEN jsonb_array_length(menu_items) = 0 THEN menu_items
  ELSE (
    SELECT jsonb_agg(
      item || jsonb_build_object(
        'price', (item->>'price'),
        'price_currency_prefix', true
      )
    )
    FROM jsonb_array_elements(menu_items) AS item
  )
END
WHERE menu_items IS NOT NULL;
