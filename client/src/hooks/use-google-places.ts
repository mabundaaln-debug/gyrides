import { useState, useEffect, useRef, useCallback } from "react";

export interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

let scriptLoadPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if ((window as any).google?.maps?.places) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    if (document.getElementById("google-maps-places-script")) {
      // Script tag already in DOM — wait for load
      const check = setInterval(() => {
        if ((window as any).google?.maps?.places) { clearInterval(check); resolve(); }
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-places-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

export function useGooglePlaces() {
  const [ready, setReady] = useState(false);
  const apiKeyRef = useRef<string>("");
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const placesServiceDivRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/config/maps");
        const data = await res.json();
        const key = data.apiKey;
        if (!key || cancelled) return;
        apiKeyRef.current = key;
        await loadGoogleMapsScript(key);
        if (cancelled) return;
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        placesServiceDivRef.current = document.createElement("div");
        placesServiceRef.current = new google.maps.places.PlacesService(placesServiceDivRef.current);
        setReady(true);
      } catch {
        // Google Places not available — caller will use fallback
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const searchPlaces = useCallback(async (query: string): Promise<PlaceResult[]> => {
    if (!ready || !autocompleteServiceRef.current || !placesServiceRef.current) return [];
    if (!query.trim()) return [];

    return new Promise((resolve) => {
      autocompleteServiceRef.current!.getPlacePredictions(
        {
          input: query,
          location: new google.maps.LatLng(-23.3058, 30.7183),
          radius: 80000,
          componentRestrictions: { country: "za" },
        },
        (predictions, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions?.length) {
            resolve([]);
            return;
          }
          const top = predictions.slice(0, 6);
          let done = 0;
          const results: PlaceResult[] = [];
          top.forEach((pred) => {
            placesServiceRef.current!.getDetails(
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
                if (done === top.length) resolve(results);
              }
            );
          });
        }
      );
    });
  }, [ready]);

  return { ready, searchPlaces };
}
