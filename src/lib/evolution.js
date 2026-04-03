async function request(path, options = {}) {
  const isProd = import.meta.env.PROD;
  const url = isProd 
    ? `/api/whatsapp?path=${encodeURIComponent(path)}` 
    : (import.meta.env.VITE_EVOLUTION_URL || `http://localhost:8080`) + path;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      // If it's local dev without the proxy, add the VITE_ key (to keep your local testing working)
      ...(isProd ? {} : { 'apikey': import.meta.env.VITE_EVOLUTION_API_KEY }),
      ...options.headers,
    },
    body: options.method && options.method !== 'GET' ? options.body : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API Request failed' }));
    throw new Error(error.message || 'API Request failed');
  }
  return response.json();
}

export const evolution = {
  // Instance management
  listInstances: async () => request('/instance/fetchInstances'),
  
  createInstance: async (instanceName) => 
    request('/instance/create', {
      method: 'POST',
      body: JSON.stringify({ instanceName, token: EVOLUTION_API_KEY, qrcode: true }),
    }),
  
  deleteInstance: async (instanceName) =>
    request(`/instance/delete/${instanceName}`, { method: 'DELETE' }),
    
  connectInstance: async (instanceName) =>
    request(`/instance/connect/${instanceName}`),

  // Messaging
  sendMessage: async (instanceName, number, text) => {
    // Clean number (remove non-digits, but keep + for international)
    const cleanNumber = number.replace(/[^\d]/g, '')
    return request(`/message/sendText/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number: cleanNumber,
        options: { delay: 1200, presence: 'composing', linkPreview: true },
        textMessage: { text },
      }),
    })
  },

  // State
  getQrCode: async (instanceName) =>
    request(`/instance/connect/${instanceName}`),
    
  getStatus: async (instanceName) =>
    request(`/instance/connectionState/${instanceName}`),
}
