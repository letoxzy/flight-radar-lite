export default async function handler(req, res) {
  const results = {};

  try {
    const authResponse = await fetch(
      "https://auth.opensky-network.org",
      { signal: AbortSignal.timeout(15000) }
    );

    results.auth = {
      reachable: true,
      status: authResponse.status,
    };
  } catch (error) {
    results.auth = {
      reachable: false,
      error: error.message,
      cause: error.cause?.code ?? null,
    };
  }

  try {
    const apiResponse = await fetch(
      "https://opensky-network.org",
      { signal: AbortSignal.timeout(15000) }
    );

    results.api = {
      reachable: true,
      status: apiResponse.status,
    };
  } catch (error) {
    results.api = {
      reachable: false,
      error: error.message,
      cause: error.cause?.code ?? null,
    };
  }

  return res.status(200).json(results);
}