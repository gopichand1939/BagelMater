import { useState, useCallback } from "react";

/**
 * Custom React Hook to manage Geolocation and Nominatim Reverse Geocoding.
 * 
 * JSDoc types:
 * @typedef {Object} GeolocationAddress
 * @property {number|null} latitude
 * @property {number|null} longitude
 * @property {string} fullAddress
 * @property {string} city
 * @property {string} state
 * @property {string} postalCode
 * 
 * @typedef {Object} GeolocationHookState
 * @property {boolean} loading
 * @property {string|null} error
 * @property {GeolocationAddress|null} addressData
 * @property {function} detectLocation
 * @property {function} geocodeAddress
 * @property {function} clearError
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

  const geocodeAddress = useCallback(async (addressStr, details = {}) => {
    if (!addressStr || !addressStr.trim()) {
      return null;
    }

    setLoading(true);
    setError(null);

    const queriesToTry = [];
    // 1. Try full input query
    queriesToTry.push(addressStr);

    // 2. Try Area Name + City
    if (details.line1 && details.city) {
      const primaryLine = details.line1.split(",")[0].trim();
      if (primaryLine && primaryLine.toLowerCase() !== details.city.toLowerCase()) {
        queriesToTry.push(`${primaryLine}, ${details.city}`);
      }
    }

    // 3. Try City + Pincode
    if (details.city && details.pincode) {
      queriesToTry.push(`${details.city}, ${details.pincode}`);
    }

    // 4. Try Pincode + India
    if (details.pincode) {
      queriesToTry.push(`${details.pincode}, India`);
    }

    // 5. Try City + India
    if (details.city) {
      queriesToTry.push(`${details.city}, India`);
    }

    for (const q of queriesToTry) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
          {
            headers: {
              "Accept-Language": "en",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const firstMatch = data[0];
            const lat = parseFloat(firstMatch.lat);
            const lon = parseFloat(firstMatch.lon);

            // Fetch precise details using reverse geocode on resolved coordinates
            const detailRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
              {
                headers: {
                  "Accept-Language": "en",
                },
              }
            );

            if (detailRes.ok) {
              const detailData = await detailRes.json();
              const addr = detailData.address || {};
              const city = addr.city || addr.town || addr.village || addr.suburb || addr.city_district || details.city || "";
              const state = addr.state || addr.region || addr.county || details.state || "";
              const postalCode = addr.postcode || details.pincode || "";
              const fullAddress = detailData.display_name || addressStr;

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
              return resolvedLocation;
            }
          }
        }
      } catch (err) {
        console.error(`Fallback search query "${q}" failed:`, err);
      }
    }

    setLoading(false);
    const resolvedErr = new Error("Address coordinates could not be resolved. Please adjust your input.");
    setError(resolvedErr.message);
    throw resolvedErr;
  }, []);

  return {
    loading,
    error,
    addressData,
    detectLocation,
    geocodeAddress,
    clearError,
  };
}
