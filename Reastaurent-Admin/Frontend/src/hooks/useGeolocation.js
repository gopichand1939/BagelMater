import { useState, useCallback } from "react";

/**
 * Custom React Hook to manage Geolocation and Nominatim Reverse Geocoding for Admin panel.
 */
export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addressData, setAddressData] = useState(null);

  const clearError = useCallback(() => setError(null), []);

  const detectLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const errMsg = "Geolocation is not supported by your browser.";
        setError(errMsg);
        return reject(new Error(errMsg));
      }

      setLoading(true);
      setError(null);

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          try {
            // Reverse Geocoding using Nominatim
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
              {
                headers: {
                  "Accept-Language": "en", // Force English response
                },
              }
            );

            if (!response.ok) {
              throw new Error("Failed to contact Nominatim geocoding server.");
            }

            const data = await response.json();
            
            // Extract components securely
            const addr = data.address || {};
            const city = addr.city || addr.town || addr.village || addr.suburb || addr.city_district || "";
            const state = addr.state || addr.region || addr.county || "";
            const postalCode = addr.postcode || "";
            const fullAddress = data.display_name || "";

            const resolvedLocation = {
              latitude: lat,
              longitude: lon,
              fullAddress,
              city,
              state,
              postalCode,
            };

            setAddressData(resolvedLocation);
            setLoading(false);
            resolve(resolvedLocation);
          } catch (err) {
            console.error("Nominatim Reverse Geocoding Error:", err);
            // Fallback: save coordinates but flag address lookup error
            const resolvedLocation = {
              latitude: lat,
              longitude: lon,
              fullAddress: `Latitude: ${lat.toFixed(6)}, Longitude: ${lon.toFixed(6)}`,
              city: "",
              state: "",
              postalCode: "",
            };
            setAddressData(resolvedLocation);
            setLoading(false);
            resolve(resolvedLocation);
          }
        },
        (geoError) => {
          setLoading(false);
          let errorMsg = "An unknown error occurred while getting location.";
          
          switch (geoError.code) {
            case geoError.PERMISSION_DENIED:
              errorMsg = "Location permission denied. Please allow location access in your browser settings or enter your address manually.";
              break;
            case geoError.POSITION_UNAVAILABLE:
              errorMsg = "Location information is unavailable. Please try manual entry.";
              break;
            case geoError.TIMEOUT:
              errorMsg = "Location request timed out. Please try again or type manually.";
              break;
            default:
              break;
          }
          
          setError(errorMsg);
          reject(new Error(errorMsg));
        },
        options
      );
    });
  }, []);

  return {
    loading,
    error,
    addressData,
    detectLocation,
    clearError,
  };
}
