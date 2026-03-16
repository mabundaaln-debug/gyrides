import { useEffect, useState, useCallback, useRef } from "react";
import {
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";

const GIYANI_CENTER = { lat: -23.31, lng: 30.72 };

function useGoogleMapsKey() {
  const [apiKey, setApiKey] = useState<string>("");
  useEffect(() => {
    fetch("/api/config/maps")
      .then((r) => r.json())
      .then((d) => setApiKey(d.apiKey || ""))
      .catch(() => {});
  }, []);
  return apiKey;
}

function CustomMarkers({ pickup, dropoff, driverLocation, pinDropLocation }: {
  pickup?: { lat: number; lng: number; name?: string } | null;
  dropoff?: { lat: number; lng: number; name?: string } | null;
  driverLocation?: { lat: number; lng: number } | null;
  pinDropLocation?: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (pickup) {
      const marker = new google.maps.Marker({
        position: { lat: pickup.lat, lng: pickup.lng },
        map,
        title: pickup.name || "Pickup point",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#22c55e",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });
      markersRef.current.push(marker);
    }

    if (dropoff) {
      const marker = new google.maps.Marker({
        position: { lat: dropoff.lat, lng: dropoff.lng },
        map,
        title: dropoff.name || "Drop-off point",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#000000",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });
      markersRef.current.push(marker);
    }

    if (driverLocation) {
      const marker = new google.maps.Marker({
        position: { lat: driverLocation.lat, lng: driverLocation.lng },
        map,
        title: "Driver location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 16,
          fillColor: "#facc15",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });
      markersRef.current.push(marker);
    }

    if (pinDropLocation) {
      const marker = new google.maps.Marker({
        position: { lat: pinDropLocation.lat, lng: pinDropLocation.lng },
        map,
        title: "Dropped pin",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#6366f1",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });
      markersRef.current.push(marker);
    }

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [map, pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, driverLocation?.lat, driverLocation?.lng, pinDropLocation?.lat, pinDropLocation?.lng]);

  return null;
}

function DirectionsRenderer({ origin, destination, color, weight, dashed }: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  color: string;
  weight: number;
  dashed?: boolean;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !routesLib) return;

    const directionsService = new routesLib.DirectionsService();

    directionsService.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (polylineRef.current) {
          polylineRef.current.setMap(null);
          polylineRef.current = null;
        }

        if (status === google.maps.DirectionsStatus.OK && result) {
          const path = result.routes[0]?.overview_path;
          if (path) {
            polylineRef.current = new google.maps.Polyline({
              path,
              strokeColor: color,
              strokeWeight: weight,
              strokeOpacity: dashed ? 0 : 0.8,
              icons: dashed
                ? [
                    {
                      icon: {
                        path: "M 0,-1 0,1",
                        strokeOpacity: 1,
                        strokeColor: color,
                        scale: weight / 2,
                      },
                      offset: "0",
                      repeat: "14px",
                    },
                  ]
                : undefined,
              map,
            });
          }
        }
      }
    );

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, routesLib, origin.lat, origin.lng, destination.lat, destination.lng, color, weight]);

  return null;
}

function FitBoundsInner({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(15);
    } else {
      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
    }
  }, [map, JSON.stringify(points)]);

  return null;
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onMapClick(e.latLng.lat(), e.latLng.lng());
      }
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, onMapClick]);

  return null;
}

interface GiyaniMapProps {
  pickup?: { lat: number; lng: number; name?: string } | null;
  dropoff?: { lat: number; lng: number; name?: string } | null;
  driverLocation?: { lat: number; lng: number } | null;
  className?: string;
  showRoute?: boolean;
  interactive?: boolean;
  onPinDrop?: (lat: number, lng: number) => void;
  pinDropLocation?: { lat: number; lng: number } | null;
}

export default function GiyaniMap({
  pickup,
  dropoff,
  driverLocation,
  className = "",
  showRoute = true,
  interactive = false,
  onPinDrop,
  pinDropLocation,
}: GiyaniMapProps) {
  const apiKey = useGoogleMapsKey();

  const fitPoints: { lat: number; lng: number }[] = [];
  if (pickup) fitPoints.push({ lat: pickup.lat, lng: pickup.lng });
  if (dropoff) fitPoints.push({ lat: dropoff.lat, lng: dropoff.lng });
  if (driverLocation) fitPoints.push({ lat: driverLocation.lat, lng: driverLocation.lng });
  if (pinDropLocation) fitPoints.push({ lat: pinDropLocation.lat, lng: pinDropLocation.lng });

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (interactive && onPinDrop) {
        onPinDrop(lat, lng);
      }
    },
    [interactive, onPinDrop]
  );

  if (!apiKey) {
    return (
      <div className={`w-full ${className} flex items-center justify-center bg-gray-900`} style={{ minHeight: "200px" }}>
        <div className="text-center text-gray-400 p-4">
          <div className="animate-pulse mb-2">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-yellow-400">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} style={{ minHeight: "200px" }}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={GIYANI_CENTER}
          defaultZoom={14}
          gestureHandling="greedy"
          disableDefaultUI={true}
          zoomControl={true}
          style={{ width: "100%", height: "100%", borderRadius: "inherit" }}
        >
          {fitPoints.length > 0 && <FitBoundsInner points={fitPoints} />}

          {interactive && <ClickHandler onMapClick={handleMapClick} />}

          <CustomMarkers
            pickup={pickup}
            dropoff={dropoff}
            driverLocation={driverLocation}
            pinDropLocation={pinDropLocation}
          />

          {showRoute && pickup && dropoff && (
            <DirectionsRenderer
              origin={{ lat: pickup.lat, lng: pickup.lng }}
              destination={{ lat: dropoff.lat, lng: dropoff.lng }}
              color="#000000"
              weight={5}
            />
          )}

          {showRoute && driverLocation && pickup && (
            <DirectionsRenderer
              origin={{ lat: driverLocation.lat, lng: driverLocation.lng }}
              destination={{ lat: pickup.lat, lng: pickup.lng }}
              color="#facc15"
              weight={4}
              dashed
            />
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
