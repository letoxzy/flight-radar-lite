let cachedData = null;
let cachedAt = 0;

const CACHE_TTL_MS = 10000;

const BBOX = {
  lamin: Number(process.env.BBOX_LAMIN ?? 24),
  lomin: Number(process.env.BBOX_LOMIN ?? 122),
  lamax: Number(process.env.BBOX_LAMAX ?? 46),
  lomax: Number(process.env.BBOX_LOMAX ?? 154),
};

export default async function handler(req, res) {
  try {
    // Serve cached data when available.
    if (cachedData && Date.now() - cachedAt < CACHE_TTL_MS) {
      return res.status(200).json(cachedData);
    }

    const params = new URLSearchParams({
      lamin: BBOX.lamin,
      lomin: BBOX.lomin,
      lamax: BBOX.lamax,
      lomax: BBOX.lomax,
    });

    const url =
      `https://opensky-network.org/api/states/all?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        `OpenSky returned ${response.status}: ${errorText}`
      );

      // If we have old data, keep the radar alive.
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

    // Keep serving the last successful response if possible.
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    return res.status(500).json({
      error: "Unable to connect to OpenSky",
      details: error.message,
    });
  }
}