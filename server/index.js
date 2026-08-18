const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

let accessToken = null;
let tokenExpiresAt = 0;

// Simple in-memory cache. The worldwide feed is heavy and OpenSky
// rate-limits authenticated requests to roughly one call every ~5s,
// so if the frontend polls faster than that (or two tabs are open)
// we just serve the last good response instead of hitting the API.
let cachedData = null;
let cachedAt = 0;
const CACHE_TTL_MS = 8000;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  const response = await fetch(
    "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.OPENSKY_CLIENT_ID,
        client_secret: process.env.OPENSKY_CLIENT_SECRET,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenSky authentication failed: ${errorText}`);
  }

  const data = await response.json();

  accessToken = data.access_token;

  tokenExpiresAt =
    Date.now() + ((data.expires_in || 1800) - 60) * 1000;

  return accessToken;
}

app.get("/api/aircraft", async (req, res) => {
  try {
    // Serve from cache if it's still fresh.
    if (cachedData && Date.now() - cachedAt < CACHE_TTL_MS) {
      return res.json(cachedData);
    }

    const token = await getAccessToken();

    // No lamin/lomin/lamax/lomax params => worldwide coverage
    // (this used to be scoped to Nigeria's airspace only).
    const response = await fetch(
      "https://opensky-network.org/api/states/all",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      // If OpenSky is rate-limiting/erroring but we have a recent
      // cached response, serve that instead of failing the client.
      if (cachedData) {
        return res.json(cachedData);
      }

      return res.status(response.status).json({
        error: errorText,
      });
    }

    const data = await response.json();

    cachedData = data;
    cachedAt = Date.now();

    res.json(data);
  } catch (error) {
    console.error("OpenSky error:", error);

    if (cachedData) {
      return res.json(cachedData);
    }

    res.status(500).json({
      error: error.message,
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "Flight Radar API is running",
  });
});

app.listen(PORT, () => {
  console.log(`Flight Radar API running on http://localhost:${PORT}`);
});