export function placePhotoUrl(photoRef: string, mapsApiKey: string, maxHeightPx = 400) {
  return `https://places.googleapis.com/v1/${photoRef}/media?maxHeightPx=${maxHeightPx}&key=${mapsApiKey}`
}
