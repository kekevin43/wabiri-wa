export default async function handler(req, res) {
  // 1. Get secrets from private environment (Never exposed to browser)
  const EVOLUTION_URL = process.env.EVOLUTION_URL;
  const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

  if (!EVOLUTION_URL || !EVOLUTION_API_KEY) {
    return res.status(500).json({ error: 'Evolution API secrets not configured on server' });
  }

  // 2. Extract path and all other query parameters
  const { path, ...queryParams } = req.query;
  if (!path) return res.status(400).json({ error: 'Missing path parameter' });

  // Construct the full URL — req.query already URL-decodes the path string,
  // so just prefix a slash and append it directly. Do NOT re-encode segments
  // because that would turn "/instance/delete/foo" into "%2Finstance%2F..."
  const baseUrl = EVOLUTION_URL.endsWith('/') ? EVOLUTION_URL.slice(0, -1) : EVOLUTION_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const searchParams = new URLSearchParams(queryParams).toString();
  const fullUrl = `${baseUrl}${cleanPath}${searchParams ? `?${searchParams}` : ''}`;
  console.log(`[proxy] ${req.method} ${fullUrl}`);

  try {
    const method = req.method;
    const hasBody = method !== 'GET' && method !== 'DELETE' && req.body && Object.keys(req.body).length > 0;

    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: hasBody ? JSON.stringify(req.body) : undefined,
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { message: text };
    }
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to connect to WhatsApp Engine' });
  }
}
