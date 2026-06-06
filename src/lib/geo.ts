// Browser Geolocation wrapper. Works identically on iOS/Android/desktop, but ONLY
// in a secure context (localhost or HTTPS). Over a LAN IP it silently fails — see README.
export function getLocation(timeoutMs = 8000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs },
    )
  })
}
