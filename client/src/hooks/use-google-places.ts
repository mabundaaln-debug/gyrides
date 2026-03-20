import { useState, useEffect, useRef, useCallback } from "react";

export interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

// ── Photon geocoding (free, CORS-enabled, OSM-powered, no key needed) ──
async function photonSearch(query: string): Promise<PlaceResult[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=-23.3058&lon=30.7183&limit=8&lang=en`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data.features)) return [];
  return data.features
    .filter((f: any) => f.geometry?.coordinates?.length >= 2)
    .map((f: any) => {
      const p = f.properties || {};
      const nameParts = [p.name, p.street, p.housenumber].filter(Boolean);
      const addrParts = [p.street, p.housenumber, p.city, p.state, p.country].filter(Boolean);
      return {
        name: nameParts[0] || p.city || "Unknown",
        address: addrParts.join(", ") || p.name || "",
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      };
    })
    .filter((r: PlaceResult) => r.name && r.lat && r.lng);
}

// ── Google Maps JS API loader ──
let scriptLoadPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if ((window as any).google?.maps?.places?.AutocompleteService) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("google-maps-script");
    if (existing) {
      const poll = setInterval(() => {
        if ((window as any).google?.maps?.places?.AutocompleteService) {
          clearInterval(poll);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(poll); reject(new Error("timeout")); }, 8000);
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const poll = setInterval(() => {
        if ((window as any).google?.maps?.places?.AutocompleteService) {
          clearInterval(poll);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(poll); reject(new Error("timeout")); }, 5000);
    };
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

// ── Google Places search via JS SDK ──
async function googlePlacesSearch(
  query: string,
  autocomplete: google.maps.places.AutocompleteService,
  places: google.maps.places.PlacesService
): Promise<PlaceResult[]> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve([]), 5000);
    autocomplete.getPlacePredictions(
      {
        input: query,
        location: new google.maps.LatLng(-23.3058, 30.7183),
        radius: 80000,
        componentRestrictions: { country: "za" },
      },
      (predictions, status) => {
        if (
          status !== google.maps.places.PlacesServiceStatus.OK ||
          !predictions?.length
        ) {
          clearTimeout(timeoutId);
          resolve([]);
          return;
        }
        const top = predictions.slice(0, 6);
        let done = 0;
        const results: PlaceResult[] = [];
        top.forEach((pred) => {
          places.getDetails(
            { placeId: pred.place_id, fields: ["name", "formatted_address", "geometry"] },
            (place, detailStatus) => {
              done++;
              if (
                detailStatus === google.maps.places.PlacesServiceStatus.OK &&
                place?.geometry?.location
              ) {
                results.push({
                  name: place.name || pred.structured_formatting.main_text,
                  address: place.formatted_address || pred.description,
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                });
              }
              if (done === top.length) {
                clearTimeout(timeoutId);
                resolve(results);
              }
            }
          );
        });
      }
    );
  });
}

export function useGooglePlaces() {
  const [googleReady, setGoogleReady] = useState(false);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const attrDivRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/config/maps");
        const { apiKey } = await res.json();
        if (!apiKey || cancelled) return;
        await loadGoogleMapsScript(apiKey);
        if (cancelled) return;
        autocompleteRef.current = new google.maps.places.AutocompleteService();
        attrDivRef.current = document.createElement("div");
        placesRef.current = new google.maps.places.PlacesService(attrDivRef.current);
        setGoogleReady(true);
      } catch {
        // Google Maps SDK failed to load; will fall back to Photon
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const searchPlaces = useCallback(async (query: string): Promise<PlaceResult[]> => {
    if (!query.trim()) return [];

    if (googleReady && autocompleteRef.current && placesRef.current) {
      try {
        const results = await googlePlacesSearch(query, autocompleteRef.current, placesRef.current);
        if (results.length > 0) return results;
      } catch {
        // fall through to Photon
      }
    }

    // Fallback: Photon (always available, no API key, works from browser)
    return photonSearch(query);
  }, [googleReady]);

  return { googleReady, searchPlaces };
}
