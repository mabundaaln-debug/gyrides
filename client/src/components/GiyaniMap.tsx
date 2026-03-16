import { useEffect, useState, useCallback, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
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

function PickupPin() {
  return (
    <div style={{ width: 36, height: 36, background: "#22c55e", border: "3px solid white", borderRadius: "50%", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 10, height: 10, background: "white", borderRadius: "50%" }} />
    </div>
  );
}

function DropoffPin() {
  return (
    <div style={{ width: 36, height: 36, background: "#000", border: "3px solid white", borderRadius: "50%", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>
  );
}

function CarPin() {
  return (
    <div style={{ width: 44, height: 44, background: "#facc15", border: "3px solid white", borderRadius: "50%", boxShadow: "0 4px 14px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>
    </div>
  );
}

function PinDropPin() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: 32, height: 32, background: "#6366f1", border: "3px solid white", borderRadius: "50%", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 10, height: 10, background: "white", borderRadius: "50%" }} />
      </div>
      <div style={{ width: 3, height: 10, background: "#6366f1", borderRadius: "0 0 2px 2px", marginTop: -2 }} />
    </div>
  );
}

function DirectionsRenderer({ origin, destination, color, weight, dashPattern }: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  color: string;
  weight: number;
  dashPattern?: number[];
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
            const icons: google.maps.IconSequence[] = [];
            if (dashPattern && dashPattern.length >= 2) {
              icons.push({
                icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: weight / 2 },
                offset: "0",
                repeat: `${dashPattern[0] + dashPattern[1]}px`,
              });
            }

            polylineRef.current = new google.maps.Polyline({
              path,
              strokeColor: color,
              strokeWeight: weight,
              strokeOpacity: dashPattern ? 0.0 : 0.8,
              icons: dashPattern ? icons : undefined,
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
          mapId="gy-rides-map"
          style={{ width: "100%", height: "100%", borderRadius: "inherit" }}
        >
          {fitPoints.length > 0 && <FitBoundsInner points={fitPoints} />}

          {interactive && <ClickHandler onMapClick={handleMapClick} />}

          {pickup && (
            <AdvancedMarker position={{ lat: pickup.lat, lng: pickup.lng }} title={pickup.name || "Pickup point"}>
              <PickupPin />
            </AdvancedMarker>
          )}

          {dropoff && (
            <AdvancedMarker position={{ lat: dropoff.lat, lng: dropoff.lng }} title={dropoff.name || "Drop-off point"}>
              <DropoffPin />
            </AdvancedMarker>
          )}

          {driverLocation && (
            <AdvancedMarker position={{ lat: driverLocation.lat, lng: driverLocation.lng }} title="Driver location">
              <CarPin />
            </AdvancedMarker>
          )}

          {pinDropLocation && (
            <AdvancedMarker position={{ lat: pinDropLocation.lat, lng: pinDropLocation.lng }} title="Dropped pin">
              <PinDropPin />
            </AdvancedMarker>
          )}

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
              dashPattern={[8, 6]}
            />
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
