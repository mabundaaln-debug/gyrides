import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const GIYANI_CENTER: [number, number] = [-23.31, 30.72];

const pickupIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:32px;height:32px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
    <div style="width:8px;height:8px;background:white;border-radius:50%"></div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const dropoffIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:32px;height:32px;background:#000;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const carIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:40px;height:40px;background:#facc15;border:3px solid white;border-radius:50%;box-shadow:0 2px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [points, map]);
  return null;
}

interface GiyaniMapProps {
  pickup?: { lat: number; lng: number; name?: string } | null;
  dropoff?: { lat: number; lng: number; name?: string } | null;
  driverLocation?: { lat: number; lng: number } | null;
  className?: string;
  showRoute?: boolean;
}

export default function GiyaniMap({ pickup, dropoff, driverLocation, className = "", showRoute = true }: GiyaniMapProps) {
  const points: [number, number][] = [];
  if (pickup) points.push([pickup.lat, pickup.lng]);
  if (dropoff) points.push([dropoff.lat, dropoff.lng]);
  if (driverLocation) points.push([driverLocation.lat, driverLocation.lng]);

  const routePoints: [number, number][] = [];
  if (pickup && dropoff && showRoute) {
    const midLat = (pickup.lat + dropoff.lat) / 2 + (Math.random() - 0.5) * 0.005;
    const midLng = (pickup.lng + dropoff.lng) / 2 + (Math.random() - 0.5) * 0.005;
    routePoints.push([pickup.lat, pickup.lng], [midLat, midLng], [dropoff.lat, dropoff.lng]);
  }

  return (
    <div className={`w-full ${className}`} style={{ minHeight: "200px" }}>
      <MapContainer
        center={GIYANI_CENTER}
        zoom={14}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={false}
        style={{ width: "100%", height: "100%", borderRadius: "inherit" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {points.length > 0 && <FitBounds points={points} />}

        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            <Popup><b>Pickup:</b> {pickup.name || "Pickup"}</Popup>
          </Marker>
        )}

        {dropoff && (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
            <Popup><b>Drop-off:</b> {dropoff.name || "Drop-off"}</Popup>
          </Marker>
        )}

        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={carIcon}>
            <Popup>Driver</Popup>
          </Marker>
        )}

        {routePoints.length > 0 && (
          <Polyline
            positions={routePoints}
            pathOptions={{ color: "#000", weight: 4, opacity: 0.7, dashArray: "10, 8" }}
          />
        )}
      </MapContainer>
    </div>
  );
}
