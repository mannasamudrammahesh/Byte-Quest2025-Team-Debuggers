// LocationIQ API integration for enhanced location services
const LOCATIONIQ_API_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY;
const LOCATIONIQ_BASE_URL = 'https://us1.locationiq.com/v1';

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface AddressComponents {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

export interface LocationResult {
  display_name: string;
  lat: string;
  lon: string;
  address: AddressComponents;
  place_id?: string;
  importance?: number;
}

export interface AutocompleteResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

class LocationService {
  private apiKey: string;

  constructor() {
    this.apiKey = LOCATIONIQ_API_KEY || '';
    if (!this.apiKey) {
      console.warn('LocationIQ API key not found. Location services will use fallback.');
    }
  }

  /**
   * Get current GPS coordinates using browser geolocation
   */
  async getCurrentPosition(): Promise<LocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = 'Unable to get your location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }

  /**
   * Reverse geocoding: Convert coordinates to address using LocationIQ with better accuracy
   */
  async reverseGeocode(lat: number, lng: number): Promise<LocationResult> {
    if (!this.apiKey) {
      throw new Error('LocationIQ API key not configured');
    }

    // Use higher zoom level for more precise results
    const url = `${LOCATIONIQ_BASE_URL}/reverse.php?key=${this.apiKey}&lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18&extratags=1`;

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GrievAI-App/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('LocationIQ API key is invalid or expired');
        } else if (response.status === 429) {
          throw new Error('LocationIQ API rate limit exceeded');
        }
        throw new Error(`LocationIQ API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data as LocationResult;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      throw error;
    }
  }

  /**
   * Forward geocoding: Convert address to coordinates using LocationIQ
   */
  async forwardGeocode(address: string): Promise<LocationResult[]> {
    if (!this.apiKey) {
      throw new Error('LocationIQ API key not configured');
    }

    const url = `${LOCATIONIQ_BASE_URL}/search.php?key=${this.apiKey}&q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=5`;

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`LocationIQ API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data as LocationResult[];
    } catch (error) {
      console.error('Forward geocoding failed:', error);
      throw error;
    }
  }

  /**
   * Address autocomplete using LocationIQ with better error handling
   */
  async autocomplete(query: string, limit: number = 5): Promise<AutocompleteResult[]> {
    if (!this.apiKey || query.length < 3) {
      return [];
    }

    // Add country bias for better local results (adjust as needed)
    const countryCode = 'in'; // Change this to your target country
    const url = `${LOCATIONIQ_BASE_URL}/autocomplete.php?key=${this.apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&format=json&countrycodes=${countryCode}&addressdetails=1`;

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GrievAI-App/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('LocationIQ API key is invalid or expired');
        } else if (response.status === 429) {
          console.error('LocationIQ API rate limit exceeded');
        }
        throw new Error(`LocationIQ API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        console.error('LocationIQ API error:', data.error);
        throw new Error(data.error);
      }

      // Filter and enhance results
      return (data as AutocompleteResult[]).map(result => ({
        ...result,
        // Ensure we have a proper type
        type: result.type || 'location',
        // Ensure importance is a number
        importance: typeof result.importance === 'number' ? result.importance : 0.5,
      }));
    } catch (error) {
      console.error('Autocomplete failed:', error);
      return [];
    }
  }

  /**
   * Format address components into a readable string
   */
  formatAddress(address: AddressComponents): string {
    const parts = [];
    
    if (address.house_number && address.road) {
      parts.push(`${address.house_number} ${address.road}`);
    } else if (address.road) {
      parts.push(address.road);
    }
    
    if (address.neighbourhood) parts.push(address.neighbourhood);
    if (address.suburb) parts.push(address.suburb);
    if (address.city) parts.push(address.city);
    if (address.county) parts.push(address.county);
    if (address.state) parts.push(address.state);
    if (address.postcode) parts.push(address.postcode);
    if (address.country) parts.push(address.country);
    
    return parts.join(', ');
  }

  /**
   * Get location with address - combines GPS and reverse geocoding
   */
  async getLocationWithAddress(): Promise<{
    coordinates: LocationCoordinates;
    address: string;
    fullData: LocationResult;
  }> {
    try {
      // Get GPS coordinates
      const coordinates = await this.getCurrentPosition();
      
      // Get address from coordinates
      const locationData = await this.reverseGeocode(coordinates.lat, coordinates.lng);
      
      const address = locationData.display_name || this.formatAddress(locationData.address);
      
      return {
        coordinates,
        address,
        fullData: locationData,
      };
    } catch (error) {
      console.error('Get location with address failed:', error);
      throw error;
    }
  }

  /**
   * Fallback reverse geocoding using OpenStreetMap (when LocationIQ fails)
   */
  async fallbackReverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'GrievAI-App/1.0',
            'Accept': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          return data.display_name;
        }
      }
      
      throw new Error('Fallback geocoding failed');
    } catch (error) {
      // Final fallback: return coordinates as string
      return `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }
}

export const locationService = new LocationService();