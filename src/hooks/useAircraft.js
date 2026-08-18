import { useCallback, useEffect, useState } from "react";
import { parseAircraftStates } from "../utils/parseAircraft";

// Set VITE_API_URL in .env.local (dev) or your host's env settings
// (prod) to point at wherever the backend is deployed, e.g. Render.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const POLL_INTERVAL_MS = 15000;
const STALE_AFTER_MS = POLL_INTERVAL_MS * 2;

// Rendering every aircraft OpenSky knows about (often several
// thousand at once) would choke Leaflet's DOM-based markers,
// especially on mobile. Cap what we actually draw.
const MAX_MARKERS = 250;

export function useAircraft() {
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [now, setNow] = useState(Date.now());

  const fetchAircraft = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/aircraft`);

      if (!res.ok) {
        throw new Error(`API responded with ${res.status}`);
      }

      const data = await res.json();
      const parsed = parseAircraftStates(data.states);

      setAircraft(parsed.slice(0, MAX_MARKERS));
      setLastUpdated(Date.now());
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to reach the flight data API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAircraft();

    const pollTimer = setInterval(fetchAircraft, POLL_INTERVAL_MS);
    const clockTimer = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      clearInterval(pollTimer);
      clearInterval(clockTimer);
    };
  }, [fetchAircraft]);

  const isStale = Boolean(lastUpdated) && now - lastUpdated > STALE_AFTER_MS;
  const secondsAgo = lastUpdated ? Math.max(0, Math.round((now - lastUpdated) / 1000)) : null;

  return {
    aircraft,
    loading,
    error,
    isStale,
    secondsAgo,
    refresh: fetchAircraft,
  };
}
