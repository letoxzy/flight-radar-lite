let accessToken = null;
let tokenExpiresAt = 0;

let cachedData = null;
let cachedAt = 0;

const CACHE_TTL_MS = 8000;

const BBOX = {
  lamin: Number(process.env.BBOX_LAMIN ?? 24),
  lomin: Number(process.env.BBOX_LOMIN ?? 122),
  lamax: Number(process.env.BBOX_LAMAX ?? 46),
  lomax: Number(process.env.BBOX_LOMAX ?? 154),
};

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

export default async function handler(req, res) {
  try {
    // Return cached data if still fresh
    if (cachedData && Date.now() - cachedAt < CACHE_TTL_MS) {
      return res.status(200).json(cachedData);
    }

    const token = await getAccessToken();

    const params = new URLSearchParams({
      lamin: BBOX.lamin,
      lomin: BBOX.lomin,
      lamax: BBOX.lamax,
      lomax: BBOX.lomax,
    });

    const response = await fetch(
      `https://opensky-network.org/api/states/all?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      if (cachedData) {
        return res.status(200).json(cachedData);
      }

      return res.status(response.status).json({
        error: errorText,
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
      error: error.message,
    });
  }
}
