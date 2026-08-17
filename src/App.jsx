import { useEffect, useState } from "react";
import {
  Plane,
  Radio,
  Navigation,
  Gauge,
  ArrowUp,
  Clock3,
  Activity,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

// Fix Leaflet marker icons when using Vite
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});


const nigeriaCenter = [9.082, 8.6753];

function createPlaneIcon(heading) {
  return L.divIcon({
    className: "plane-marker",
    html: `
      <div class="plane-marker-inner" style="transform: rotate(${heading}deg)">
        <span>✈</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function MapController({ selectedAircraft }) {
  const map = useMap();

  if (selectedAircraft) {
    map.flyTo(
      [selectedAircraft.latitude, selectedAircraft.longitude],
      7,
      {
        duration: 0.8,
      }
    );
  }

  return null;
}

function App() {
  const [aircraft, setAircraft] = useState([]);
  const [selectedAircraft, setSelectedAircraft] = useState(null);

  useEffect(() => {
  // We will connect this to our backend API next.
  setAircraft([]);
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Plane size={20} />
          </div>

          <div>
            <h1>FLIGHT RADAR</h1>
            <span>LITE</span>
          </div>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          LIVE TRACKING
        </div>
      </header>

      <main className="dashboard">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div>
              <p className="eyebrow">AIRSPACE MONITOR</p>
              <h2>Nigeria</h2>
            </div>

            <Radio size={22} />
          </div>

          <div className="stats">
            <div className="stat-card">
              <span>Aircraft</span>
              <strong>{aircraft.length}</strong>
            </div>

            <div className="stat-card">
              <span>Coverage</span>
              <strong>NG</strong>
            </div>
          </div>

          <div className="aircraft-list">
            <div className="section-heading">
              <span>ACTIVE FLIGHTS</span>
              <Activity size={16} />
            </div>

            {aircraft.map((plane) => (
              <button
                className={`aircraft-card ${
                  selectedAircraft?.id === plane.id ? "active" : ""
                }`}
                key={plane.id}
                onClick={() => setSelectedAircraft(plane)}
              >
                <div className="aircraft-icon">
                  <Plane size={18} />
                </div>

                <div className="aircraft-info">
                  <strong>{plane.callsign}</strong>
                  <span>
                    {plane.altitude.toLocaleString()} ft · {plane.speed} kt
                  </span>
                </div>

                <Navigation size={16} />
              </button>
            ))}
          </div>

          {selectedAircraft && (
            <div className="details-panel">
              <div className="details-header">
                <div>
                  <p className="eyebrow">SELECTED FLIGHT</p>
                  <h3>{selectedAircraft.callsign}</h3>
                </div>

                <button
                  className="close-details"
                  onClick={() => setSelectedAircraft(null)}
                >
                  ×
                </button>
              </div>

              <div className="detail-grid">
                <div>
                  <Clock3 size={17} />
                  <span>Altitude</span>
                  <strong>
                    {selectedAircraft.altitude.toLocaleString()} ft
                  </strong>
                </div>

                <div>
                  <Gauge size={17} />
                  <span>Speed</span>
                  <strong>{selectedAircraft.speed} kt</strong>
                </div>

                <div>
                  <ArrowUp size={17} />
                  <span>Heading</span>
                  <strong>{selectedAircraft.heading}°</strong>
                </div>

                <div>
                  <Navigation size={17} />
                  <span>Position</span>
                  <strong>
                    {selectedAircraft.latitude.toFixed(2)}°,{" "}
                    {selectedAircraft.longitude.toFixed(2)}°
                  </strong>
                </div>
              </div>
            </div>
          )}

          <div className="footer-info">
            <span>DATA SOURCE</span>
            <strong>OpenSky Network</strong>
          </div>
        </aside>

        <section className="map-section">
          <div className="map-overlay">
            <div>
              <p className="eyebrow">LIVE AIRSPACE</p>
              <h2>Nigerian Airspace</h2>
            </div>

            <div className="map-time">
              <span className="status-dot"></span>
              LIVE
            </div>
          </div>

          <MapContainer
            center={nigeriaCenter}
            zoom={6}
            minZoom={5}
            maxZoom={12}
            maxBounds={[
              [3.5, 2.5],
              [14.5, 15.5],
            ]}
            className="flight-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapController selectedAircraft={selectedAircraft} />

            {aircraft.map((plane) => (
              <Marker
                key={plane.id}
                position={[plane.latitude, plane.longitude]}
                icon={createPlaneIcon(plane.heading)}
                eventHandlers={{
                  click: () => setSelectedAircraft(plane),
                }}
              >
                <Popup>
                  <strong>{plane.callsign}</strong>
                  <br />
                  Altitude: {plane.altitude.toLocaleString()} ft
                  <br />
                  Speed: {plane.speed} kt
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          <div className="map-legend">
            <div>
              <span className="legend-plane">✈</span>
              Aircraft
            </div>
            <div>
              <span className="legend-live"></span>
              Live data
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;