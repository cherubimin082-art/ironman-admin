import { useEffect, useRef, useState, useCallback } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer,
} from "@react-google-maps/api";

// ── Constants ─────────────────────────────────────────────────────
const API_KEY   = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const LIBS      = ["geometry"]; // stable reference → prevents re-load
const MAP_STYLE = { width: "100%", height: "100%" };
const MAP_OPTS  = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  clickableIcons: false,
};

// Colored pin URLs from Google's own CDN
const AGENT_ICON    = "https://maps.google.com/mapfiles/ms/icons/blue-dot.png";
const CUSTOMER_ICON = "https://maps.google.com/mapfiles/ms/icons/red-dot.png";

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };
const DIRECTIONS_INTERVAL_MS = 90_000; // re-fetch route every 90 s

// ── Helper ────────────────────────────────────────────────────────
function midpoint(a, b) {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

// ── No-key fallback ───────────────────────────────────────────────
function NoKeyFallback({ job, onClose }) {
  const addr = job.customer_address || "";
  const lat  = job.customer_latitude;
  const lng  = job.customer_longitude;
  const url  = lat && lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    : addr
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}&travelmode=driving`
    : null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1001, background: "#fff", display: "flex", flexDirection: "column" }}>
      <Header job={job} onClose={onClose} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
        <div style={{ fontSize: 48 }}>🗺️</div>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", textAlign: "center", margin: 0 }}>
          Google Maps API key not configured
        </p>
        <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
          Set <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>VITE_GOOGLE_MAPS_API_KEY</code> in{" "}
          <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>.env</code> and restart the dev server.
        </p>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" style={{
            padding: "12px 28px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none",
          }}>
            Open in Google Maps →
          </a>
        )}
      </div>
    </div>
  );
}

// ── Shared header ─────────────────────────────────────────────────
function Header({ job, onClose }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #10b981, #3b82f6)",
      padding: "16px 20px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexShrink: 0,
    }}>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>
          Riding to pickup
        </p>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 800, color: "#fff", margin: 0 }}>
          {job.order_code || `#${job.id}`} — {job.customer}
        </p>
        {job.customer_address && (
          <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.75)", margin: "3px 0 0" }}>
            {job.customer_address}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        style={{
          background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 10,
          padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 700,
          cursor: "pointer", flexShrink: 0,
        }}
      >
        ✕ Close
      </button>
    </div>
  );
}

// ── Route info bar ────────────────────────────────────────────────
function RouteBar({ routeInfo }) {
  if (!routeInfo) return null;
  return (
    <div style={{
      background: "#f0fdf4", borderBottom: "1px solid #bbf7d0",
      padding: "10px 20px",
      display: "flex", alignItems: "center", gap: 0, flexShrink: 0,
    }}>
      <div style={{ flex: 1, display: "flex", gap: 28 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>Distance</p>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 800, color: "#111827", margin: "2px 0 0" }}>
            {routeInfo.distance}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>ETA</p>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 800, color: "#111827", margin: "2px 0 0" }}>
            {routeInfo.duration}
          </p>
        </div>
      </div>
      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "#374151" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
          You
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "#374151" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
          Customer
        </span>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────
export default function RideMapModal({ job, onClose, onReach, reaching }) {
  if (!API_KEY || API_KEY === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
    return <NoKeyFallback job={job} onClose={onClose} />;
  }

  return <MapContent job={job} onClose={onClose} onReach={onReach} reaching={reaching} />;
}

// Separate inner component so useJsApiLoader runs only when API_KEY is set
function MapContent({ job, onClose, onReach, reaching }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: API_KEY,
    libraries: LIBS,
  });

  const [agentPos,   setAgentPos]   = useState(null);
  const [directions, setDirections] = useState(null);
  const [routeInfo,  setRouteInfo]  = useState(null);
  const [geoError,   setGeoError]   = useState("");
  const [mapBound,   setMapBound]   = useState(false); // has fitBounds been called once?

  const watchIdRef   = useRef(null);
  const mapRef       = useRef(null);
  const dirTimerRef  = useRef(null);
  const latestPosRef = useRef(null); // always current, avoids stale closure

  const destLat   = job.customer_latitude  ? parseFloat(job.customer_latitude)  : null;
  const destLng   = job.customer_longitude ? parseFloat(job.customer_longitude) : null;
  const hasCoords = destLat != null && destLng != null;
  const destAddr  = job.customer_address || "";

  // ── Watch delivery boy location ───────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported by this browser.");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        latestPosRef.current = p;
        setAgentPos(p);
      },
      (err) => setGeoError(`Location unavailable: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
    );
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // ── Fetch/refresh directions ──────────────────────────────────
  const fetchDirections = useCallback(() => {
    const pos = latestPosRef.current;
    if (!isLoaded || !window.google || !pos) return;
    if (!hasCoords && !destAddr) return;

    const ds = new window.google.maps.DirectionsService();
    ds.route(
      {
        origin:      pos,
        destination: hasCoords ? { lat: destLat, lng: destLng } : destAddr,
        travelMode:  window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          setDirections(result);
          const leg = result.routes[0]?.legs[0];
          if (leg) setRouteInfo({ distance: leg.distance.text, duration: leg.duration.text });
        }
      }
    );
  }, [isLoaded, hasCoords, destLat, destLng, destAddr]);

  // Trigger first fetch when agentPos first arrives
  useEffect(() => {
    if (agentPos && isLoaded && !directions) fetchDirections();
  }, [agentPos, isLoaded, directions, fetchDirections]);

  // Refresh route every DIRECTIONS_INTERVAL_MS
  useEffect(() => {
    if (!isLoaded) return;
    dirTimerRef.current = setInterval(fetchDirections, DIRECTIONS_INTERVAL_MS);
    return () => clearInterval(dirTimerRef.current);
  }, [isLoaded, fetchDirections]);

  // ── Fit map to both markers once after directions arrive ──────
  useEffect(() => {
    if (!mapBound && mapRef.current && directions && agentPos) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(agentPos);
      if (hasCoords) bounds.extend({ lat: destLat, lng: destLng });
      mapRef.current.fitBounds(bounds, 60);
      setMapBound(true);
    }
  }, [directions, agentPos, hasCoords, destLat, destLng, mapBound]);

  // ── Derived map center ────────────────────────────────────────
  const mapCenter = agentPos && hasCoords
    ? midpoint(agentPos, { lat: destLat, lng: destLng })
    : agentPos ?? (hasCoords ? { lat: destLat, lng: destLng } : INDIA_CENTER);

  const busy = reaching === job.id;

  function handleReachAndClose() {
    onReach(job);
    onClose();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1001,
      background: "#fff",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <Header job={job} onClose={onClose} />

      {/* Route info */}
      <RouteBar routeInfo={routeInfo} />

      {/* Geo / load errors */}
      {geoError && !agentPos && (
        <div style={{
          background: "#fef2f2", borderBottom: "1px solid #fecaca",
          padding: "10px 20px", fontSize: 12.5, color: "#dc2626", fontWeight: 600,
          flexShrink: 0,
        }}>
          ⚠️ {geoError}
        </div>
      )}

      {/* Loading hint when agent pos not yet available */}
      {!agentPos && !geoError && (
        <div style={{
          background: "#fffbeb", borderBottom: "1px solid #fde68a",
          padding: "8px 20px", fontSize: 12, color: "#92400e", flexShrink: 0,
        }}>
          Detecting your location…
        </div>
      )}

      {/* Map area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {loadError ? (
          <div style={{ padding: 24, color: "#dc2626", fontSize: 14 }}>
            Failed to load Google Maps: {loadError.message}
          </div>
        ) : !isLoaded ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
            <div style={{ width: 28, height: 28, border: "3px solid #e5e7eb", borderTopColor: "#10b981", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            <span style={{ fontSize: 13, color: "#9ca3af" }}>Loading map…</span>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={MAP_STYLE}
            center={mapCenter}
            zoom={14}
            options={MAP_OPTS}
            onLoad={(map) => { mapRef.current = map; }}
          >
            {/* Route — suppress default A/B markers so our custom ones show */}
            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: "#3b82f6",
                    strokeWeight: 5,
                    strokeOpacity: 0.85,
                  },
                }}
              />
            )}

            {/* Delivery boy — blue, live-updating */}
            {agentPos && (
              <Marker
                position={agentPos}
                icon={AGENT_ICON}
                title="Your current location"
                zIndex={10}
              />
            )}

            {/* Customer pickup location — red */}
            {hasCoords && (
              <Marker
                position={{ lat: destLat, lng: destLng }}
                icon={CUSTOMER_ICON}
                title={`${job.customer} (pickup)`}
                zIndex={9}
              />
            )}
          </GoogleMap>
        )}
      </div>

      {/* Bottom action bar */}
      <div style={{
        background: "#fff", borderTop: "1px solid #e5e7eb",
        padding: "14px 20px",
        display: "flex", gap: 10, flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            padding: "12px 20px", border: "1.5px solid #e5e7eb", borderRadius: 11,
            background: "#fff", color: "#374151", fontSize: 13, fontWeight: 700,
            cursor: "pointer", flexShrink: 0,
          }}
        >
          ← Back
        </button>
        <button
          onClick={handleReachAndClose}
          disabled={busy}
          style={{
            flex: 1, padding: "12px 0", border: "none", borderRadius: 11,
            cursor: busy ? "not-allowed" : "pointer",
            background: busy ? "#e5e7eb" : "linear-gradient(135deg, #3b82f6, #6366f1)",
            color: busy ? "#9ca3af" : "#fff",
            fontSize: 13, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {busy && (
            <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
          )}
          {busy ? "Notifying customer…" : "✓ I've Reached — Verify OTP"}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
