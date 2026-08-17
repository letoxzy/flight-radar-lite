const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

let accessToken = null;
let tokenExpiresAt = 0;

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
    const token = await getAccessToken();

    const response = await fetch(
      "https://opensky-network.org/api/states/all?lamin=3.5&lomin=2.5&lamax=14.5&lomax=15.5",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      return res.status(response.status).json({
        error: errorText,
      });
    }

    const data = await response.json();

    res.json(data);
  } catch (error) {
  console.error("OpenSky error:", error);

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