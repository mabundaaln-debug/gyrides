import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const GIYANI_CENTER: [number, number] = [-23.31, 30.72];

const pickupIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:36px;height:36px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
    <div style="width:10px;height:10px;background:white;border-radius:50%"></div>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const dropoffIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:36px;height:36px;background:#000;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const carIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:44px;height:44px;background:#facc15;border:3px solid white;border-radius:50%;box-shadow:0 4px 14px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>
  </div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const pinDropIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:36px;height:46px;display:flex;flex-direction:column;align-items:center">
    <div style="width:32px;height:32px;background:#6366f1;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg>
    </div>
    <div style="width:3px;height:10px;background:#6366f1;border-radius:0 0 2px 2px;margin-top:-2px"></div>
  </div>`,
  iconSize: [36, 46],
  iconAnchor: [18, 46],
});

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

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    }
  }, [JSON.stringify(points)]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

async function fetchRoute(from: [number, number], to: [number, number], googleApiKey?: string): Promise<[number, number][]> {
  if (googleApiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${from[0]},${from[1]}&destination=${to[0]},${to[1]}&key=${googleApiKey}`;
      const res = await fetch(`/api/directions?origin=${from[0]},${from[1]}&destination=${to[0]},${to[1]}`);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        return data.routes;
      }
    } catch (err) {
      console.warn("Google Directions failed, trying OSRM", err);
    }
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const coords = data.routes[0].geometry.coordinates;
      return coords.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
    }
  } catch (err) {
    console.warn("Route fetch failed, falling back to straight line", err);
  }
  return [from, to];
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
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [driverRouteCoords, setDriverRouteCoords] = useState<[number, number][]>([]);
  const googleApiKey = useGoogleMapsKey();
  const [tileUrl, setTileUrl] = useState<string>("");
  const [tileChecked, setTileChecked] = useState(false);

  useEffect(() => {
    if (!googleApiKey) {
      setTileUrl("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
      setTileChecked(true);
      return;
    }

    const testImg = new Image();
    const testTileUrl = `https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=1&size=1x1&key=${googleApiKey}`;
    testImg.onload = () => {
      setTileUrl(`https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${googleApiKey}`);
      setTileChecked(true);
    };
    testImg.onerror = () => {
      setTileUrl("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
      setTileChecked(true);
    };
    testImg.src = testTileUrl;

    const timeout = setTimeout(() => {
      if (!tileChecked) {
        setTileUrl("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
        setTileChecked(true);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [googleApiKey]);

  useEffect(() => {
    if (pickup && dropoff && showRoute) {
      fetchRoute([pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng], googleApiKey).then(setRouteCoords);
    } else {
      setRouteCoords([]);
    }
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, showRoute, googleApiKey]);

  useEffect(() => {
    if (driverLocation && pickup && showRoute) {
      fetchRoute([driverLocation.lat, driverLocation.lng], [pickup.lat, pickup.lng], googleApiKey).then(setDriverRouteCoords);
    } else {
      setDriverRouteCoords([]);
    }
  }, [driverLocation?.lat, driverLocation?.lng, pickup?.lat, pickup?.lng, showRoute, googleApiKey]);

  const fitPoints: [number, number][] = [];
  if (pickup) fitPoints.push([pickup.lat, pickup.lng]);
  if (dropoff) fitPoints.push([dropoff.lat, dropoff.lng]);
  if (driverLocation) fitPoints.push([driverLocation.lat, driverLocation.lng]);
  if (pinDropLocation) fitPoints.push([pinDropLocation.lat, pinDropLocation.lng]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (interactive && onPinDrop) {
      onPinDrop(lat, lng);
    }
  }, [interactive, onPinDrop]);

  if (!tileChecked) {
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

  const isGoogleTile = tileUrl.includes("google.com");

  return (
    <div className={`w-full ${className}`} style={{ minHeight: "200px" }}>
      <MapContainer
        center={GIYANI_CENTER}
        zoom={14}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={!isGoogleTile}
        style={{ width: "100%", height: "100%", borderRadius: "inherit" }}
      >
        <TileLayer
          url={tileUrl}
          maxZoom={20}
          subdomains={isGoogleTile ? ["mt0", "mt1", "mt2", "mt3"] : ["a", "b", "c"]}
        />

        {fitPoints.length > 0 && <FitBounds points={fitPoints} />}

        {interactive && <MapClickHandler onMapClick={handleMapClick} />}

        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            <Popup><b>Pickup:</b> {pickup.name || "Pickup point"}</Popup>
          </Marker>
        )}

        {dropoff && (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
            <Popup><b>Drop-off:</b> {dropoff.name || "Drop-off point"}</Popup>
          </Marker>
        )}

        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={carIcon}>
            <Popup>Driver location</Popup>
          </Marker>
        )}

        {pinDropLocation && (
          <Marker position={[pinDropLocation.lat, pinDropLocation.lng]} icon={pinDropIcon}>
            <Popup>Dropped pin</Popup>
          </Marker>
        )}

        {routeCoords.length > 1 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: "#000", weight: 5, opacity: 0.8 }}
          />
        )}

        {driverRouteCoords.length > 1 && (
          <Polyline
            positions={driverRouteCoords}
            pathOptions={{ color: "#facc15", weight: 4, opacity: 0.9, dashArray: "8, 6" }}
          />
        )}
      </MapContainer>
    </div>
  );
}
