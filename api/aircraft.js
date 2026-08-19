import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

let cachedData = null;
let cachedAt = 0;

let cachedToken = null;
let tokenExpiresAt = 0;

const CACHE_TTL_MS = 10000;

const BBOX = {
  lamin: Number(process.env.BBOX_LAMIN ?? 24),
  lomin: Number(process.env.BBOX_LOMIN ?? 122),
  lamax: Number(process.env.BBOX_LAMAX ?? 46),
  lomax: Number(process.env.BBOX_LOMAX ?? 154),
};

async function getOpenSkyToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("OpenSky credentials are missing");
  }

  const tokenResponse = await fetch(
    "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    }
  );

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();

    throw new Error(
      `OpenSky authentication failed (${tokenResponse.status}): ${errorText}`
    );
  }

  const tokenData = await tokenResponse.json();

  cachedToken = tokenData.access_token;

  // Refresh a little before the token actually expires.
  const expiresIn = Number(tokenData.expires_in ?? 1800);
  tokenExpiresAt = Date.now() + (expiresIn - 60) * 1000;

  return cachedToken;
}

export default async function handler(req, res) {
  try {
    // Serve cached data when available.
    if (cachedData && Date.now() - cachedAt < CACHE_TTL_MS) {
      return res.status(200).json(cachedData);
    }

    const token = await getOpenSkyToken();

    const params = new URLSearchParams({
      lamin: String(BBOX.lamin),
      lomin: String(BBOX.lomin),
      lamax: String(BBOX.lamax),
      lomax: String(BBOX.lomax),
    });

    const url =
      `https://opensky-network.org/api/states/all?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        `OpenSky returned ${response.status}: ${errorText}`
      );

      if (cachedData) {
        return res.status(200).json(cachedData);
      }

      return res.status(response.status).json({
        error: `OpenSky API returned ${response.status}`,
        details: errorText,
      });
    }

    const data = await response.json();

    cachedData = data;
    cachedAt = Date.now();

    return res.status(200).json(data);
  } catch (error) {
    console.error("OpenSky error:", error);

    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    return res.status(500).json({
      error: "Unable to connect to OpenSky",
      details: error.message,
    });
  }
}