'use client'

import { useEffect, useRef } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'

type Props = {
  onGuess: (placeId: string, placeName: string) => void
  disabled: boolean
}

const METRO_MANILA_BOUNDS = {
  south: 14.3167,
  west: 120.9333,
  north: 14.7667,
  east: 121.1333,
}

export default function GuessInput({ onGuess, disabled }: Props) {
  const placesLib = useMapsLibrary('places')
  const containerRef = useRef<HTMLDivElement>(null)
  const elementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null)

  useEffect(() => {
    if (!placesLib || !containerRef.current) return

    const element = new google.maps.places.PlaceAutocompleteElement({
      includedPrimaryTypes: ['establishment'],
      includedRegionCodes: ['PH'],
      requestedRegion: 'ph',
      locationRestriction: {
        south: METRO_MANILA_BOUNDS.south,
        west: METRO_MANILA_BOUNDS.west,
        north: METRO_MANILA_BOUNDS.north,
        east: METRO_MANILA_BOUNDS.east,
      },
    })

    element.setAttribute('placeholder', 'Type a restaurant name…')
    containerRef.current.appendChild(element)
    elementRef.current = element

    async function handleSelect(event: Event) {
      const { placePrediction } = event as Event & {
        placePrediction: {
          toPlace: () => {
            id?: string | null
            displayName?: string | null
            location?: { lat: () => number; lng: () => number } | null
            fetchFields: (opts: { fields: string[] }) => Promise<void>
          }
        }
      }
      if (!placePrediction) return
      const place = placePrediction.toPlace()
      await place.fetchFields({ fields: ['id', 'displayName', 'location'] })
      const lat = place.location?.lat()
      const lng = place.location?.lng()
      const inMetroManila =
        lat != null &&
        lng != null &&
        lat >= METRO_MANILA_BOUNDS.south &&
        lat <= METRO_MANILA_BOUNDS.north &&
        lng >= METRO_MANILA_BOUNDS.west &&
        lng <= METRO_MANILA_BOUNDS.east
      if (place.id && place.displayName && inMetroManila) {
        onGuess(place.id, place.displayName)
        element.value = ''
      }
    }

    element.addEventListener('gmp-select', handleSelect)
    return () => {
      element.removeEventListener('gmp-select', handleSelect)
      element.remove()
      elementRef.current = null
    }
  }, [placesLib, onGuess])

  useEffect(() => {
    if (!elementRef.current) return
    if (disabled) {
      elementRef.current.setAttribute('disabled', '')
    } else {
      elementRef.current.removeAttribute('disabled')
    }
  }, [disabled])

  return <div ref={containerRef} className="w-full [&>*]:w-full" />
}
