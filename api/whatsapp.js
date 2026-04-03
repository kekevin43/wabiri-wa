export default async function handler(req, res) {
  // 1. Get secrets from private environment (Never exposed to browser)
  const EVOLUTION_URL = process.env.EVOLUTION_URL;
  const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

  if (!EVOLUTION_URL || !EVOLUTION_API_KEY) {
    return res.status(500).json({ error: 'Evolution API secrets not configured on server' });
  }

  // 2. Extract path and method from the request
  const { path } = req.query; // Expecting /api/whatsapp?path=/instance/fetchInstances
  const fullUrl = `${EVOLUTION_URL}${path}`;

  try {
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to connect to WhatsApp Engine' });
  }
}
