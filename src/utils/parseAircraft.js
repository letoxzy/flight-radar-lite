// OpenSky's /states/all endpoint returns each aircraft as a raw array
// (not an object), documented here:
// https://openskynetwork.github.io/opensky-api/rest.html#response
//
// index  field
//   0    icao24
//   1    callsign
//   2    origin_country
//   5    longitude
//   6    latitude
//   7    baro_altitude (meters)
//   8    on_ground
//   9    velocity (m/s)
//  10    true_track / heading (degrees)
//  13    geo_altitude (meters)

const METERS_TO_FEET = 3.28084;
const MPS_TO_KNOTS = 1.94384;

export function parseAircraftStates(states) {
  if (!Array.isArray(states)) return [];

  return states
    .filter((s) => s[5] !== null && s[6] !== null && s[8] !== true)
    .map((s) => {
      const altitudeMeters = s[7] ?? s[13] ?? 0;
      const speedMps = s[9] ?? 0;

      return {
        id: s[0],
        callsign: (s[1] || "UNKNOWN").trim() || "UNKNOWN",
        country: s[2],
        longitude: s[5],
        latitude: s[6],
        altitude: Math.max(0, Math.round(altitudeMeters * METERS_TO_FEET)),
        speed: Math.max(0, Math.round(speedMps * MPS_TO_KNOTS)),
        heading: Math.round(s[10] ?? 0),
      };
    });
}
