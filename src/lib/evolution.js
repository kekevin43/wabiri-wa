async function request(path, options = {}) {
  const isProd = import.meta.env.PROD;
  const baseUrl = import.meta.env.VITE_EVOLUTION_URL || 'http://localhost:8080';

  // Use proxy in production to hide secrets, direct call in development
  const url = isProd
    ? `/api/whatsapp?path=${encodeURIComponent(path)}`
    : `${baseUrl}${path}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add apikey only if NOT using the proxy (proxy adds its own key)
  if (!isProd) {
    headers['apikey'] = import.meta.env.VITE_EVOLUTION_API_KEY || '277ab36ca8ab0744d6a80b912f38e1439712fba9ae00079fd5b877f2d34977b0';
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.method && options.method !== 'GET' ? options.body : undefined,
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || data.error || 'API Request failed');
  }
  return response.json();
}

export const evolution = {
  // Instance management
  listInstances: async () => request('/instance/fetchInstances'),

  createInstance: async (instanceName) => {
    return request('/instance/create', {
      method: 'POST',
      body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
    });
  },

  deleteInstance: async (instanceName) =>
    request(`/instance/delete/${instanceName}`, { method: 'DELETE' }),

  logoutInstance: async (instanceName) =>
    request(`/instance/logout/${instanceName}`, { method: 'DELETE' }),

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
