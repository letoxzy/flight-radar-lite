export default async function handler(req, res) {
  const tests = {};

  try {
    const response = await fetch("https://example.com");

    tests.example = {
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    tests.example = {
      error: error.message,
      cause: error.cause?.message || null,
      code: error.cause?.code || null,
    };
  }

  try {
    const response = await fetch(
      "https://opensky-network.org/api/states/all?lamin=35&lomin=139&lamax=36&lomax=140"
    );

    tests.opensky = {
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    tests.opensky = {
      error: error.message,
      cause: error.cause?.message || null,
      code: error.cause?.code || null,
    };
  }

  return res.status(200).json({
    region: process.env.VERCEL_REGION || "unknown",
    tests,
  });
}