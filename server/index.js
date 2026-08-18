const express = require("express");
const cors = require("cors");
const dns = require("node:dns");

require("dotenv").config();

dns.setDefaultResultOrder("ipv4first");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

const BBOX = {
  lamin: Number(process.env.BBOX_LAMIN ?? 24),
  lomin: Number(process.env.BBOX_LOMIN ?? 122),
  lamax: Number(process.env.BBOX_LAMAX ?? 46),
  lomax: Number(process.env.BBOX_LOMAX ?? 154),
};

let cachedData = null;
let cachedAt = 0;

const CACHE_TTL_MS = 10000;

app.get("/api/aircraft", async (req, res) => {
  try {
    if (cachedData && Date.now() - cachedAt < CACHE_TTL_MS) {
      return res.json(cachedData);
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

      if (cachedData) {
        return res.json(cachedData);
      }

      return res.status(response.status).json({
        error: `OpenSky API returned ${response.status}`,
        details: errorText,
      });
    }

    const data = await response.json();

    cachedData = data;
    cachedAt = Date.now();

    return res.json(data);
  } catch (error) {
    console.error("OpenSky error:", error);

    if (cachedData) {
      return res.json(cachedData);
    }

    return res.status(500).json({
      error: "Unable to connect to OpenSky",
      details: error.message,
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "Flight Radar API is running",
    region: "Japan",
    bbox: BBOX,
  });
});

app.listen(PORT, () => {
  console.log(`Flight Radar API running on port ${PORT}`);
});