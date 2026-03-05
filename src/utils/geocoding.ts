/**
 * Geocoding utilities for converting coordinates to addresses and vice versa
 */

/**
 * Reverse geocoding: Convert coordinates (lat, lng) to address
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
  try {
    // Use Nominatim API (OpenStreetMap) - free, no API key needed
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=vi,en`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BOFin-App/1.0', // Required by Nominatim
      },
    })

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`)
    }

    const data = await response.json()

    if (data && data.address) {
      // Build address string from components
      const address = data.address
      const addressParts: string[] = []

      // Road/Street
      if (address.road || address.pedestrian || address.footway) {
        addressParts.push(address.road || address.pedestrian || address.footway)
      }

      // Suburb/Neighborhood
      if (address.suburb || address.neighbourhood) {
        addressParts.push(address.suburb || address.neighbourhood)
      }

      // City/District
      if (address.city || address.town || address.village || address.municipality) {
        addressParts.push(address.city || address.town || address.village || address.municipality)
      }

      // District (for Vietnamese addresses)
      if (address.district && !addressParts.includes(address.district)) {
        addressParts.push(address.district)
      }

      // State/Province
      if (address.state || address.province) {
        addressParts.push(address.state || address.province)
      }

      // Country
      if (address.country) {
        // Translate country name if needed
        const countryName = address.country === 'Việt Nam' ? 'Việt Nam' : address.country
        addressParts.push(countryName)
      }

      // If we have address components, return formatted address
      if (addressParts.length > 0) {
        return addressParts.join(', ')
      }

      // Fallback to display_name if available
      if (data.display_name) {
        return data.display_name
      }
    }

    // If no address found, return coordinates
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    // Return coordinates as fallback
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
}

/**
 * Check if a string is coordinates (lat, lng format)
 */
export const isCoordinates = (location: string): boolean => {
  const coordPattern = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/
  return coordPattern.test(location.trim())
}

/**
 * Parse coordinates from string
 */
export const parseCoordinates = (location: string): { lat: number; lng: number } | null => {
  if (!isCoordinates(location)) {
    return null
  }

  const parts = location.trim().split(',').map(s => s.trim())
  if (parts.length !== 2) {
    return null
  }

  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])

  if (isNaN(lat) || isNaN(lng)) {
    return null
  }

  return { lat, lng }
}

/**
 * Get Google Maps URL from coordinates or address
 */
export const getGoogleMapsUrl = (location: string): string => {
  const coords = parseCoordinates(location)
  if (coords) {
    return `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
  }
  // If it's an address, encode it
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
}

/**
 * Get Apple Maps URL from coordinates or address
 */
export const getAppleMapsUrl = (location: string): string => {
  const coords = parseCoordinates(location)
  if (coords) {
    return `https://maps.apple.com/?ll=${coords.lat},${coords.lng}&q=${coords.lat},${coords.lng}`
  }
  // If it's an address, encode it
  return `https://maps.apple.com/?q=${encodeURIComponent(location)}`
}

/**
 * Get Maps URL - automatically choose based on device or user preference
 */
export const getMapsUrl = (location: string): string => {
  // Default to Google Maps (works on all platforms)
  return getGoogleMapsUrl(location)
}


