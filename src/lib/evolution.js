const request = async (path, options = {}) => {
  const PROXY_URL = '/api/whatsapp'
  const cleanPath = path.startsWith('/') ? path.substring(1) : path
  const url = `${PROXY_URL}/${cleanPath}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    clearTimeout(timeoutId)

    const text = await res.text()
    let data
    try {
      data = text ? JSON.parse(text) : {}
    } catch (e) {
      data = { message: text }
    }

    if (!res.ok) {
      let errMsg = `API Error ${res.status}`
      if (typeof data === 'object') {
        const nest = data.response?.message || data.message
        errMsg = Array.isArray(nest) ? nest.join(', ') : (nest || data.error || errMsg)
      } else if (text) {
        errMsg = text
      }
      throw new Error(errMsg)
    }
    return data
  } catch (error) {
    console.error(`Evolution API Error [${path}]:`, error)
    if (error.name === 'AbortError') throw new Error('Request timed out after 12 seconds.')
    throw error
  }
}

export const evolution = {
  // Instances
  listInstances: async () => request('/instance/fetchInstances'),
  
  createInstance: async (instanceName) => 
    request('/instance/create', { 
      method: 'POST', 
      body: JSON.stringify({ 
        instanceName, 
        qrcode: true, 
        integration: 'WHATSAPP-BAILEYS' 
      }) 
    }),

  deleteInstance: async (instanceName) =>
    request(`/instance/delete/${instanceName}`, { method: 'DELETE' }),

  logoutInstance: async (instanceName) =>
    request(`/instance/logout/${instanceName}`, { method: 'DELETE' }),

  // Messaging
  sendMessage: async (instanceName, remoteJid, text) =>
    request(`/message/sendText/${instanceName}`, { 
      method: 'POST', 
      body: JSON.stringify({
        number: remoteJid,
        text: text,
        delay: 1200,
        linkPreview: false 
      }) 
    }),

  sendMedia: async (instanceName, remoteJid, media, fileName, caption = '', mediaType = 'image') =>
    request(`/message/sendMedia/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number: remoteJid,
        media: media, // Can be base64 string OR public URL
        mediatype: mediaType, 
        fileName: fileName,
        caption: caption,
        delay: 1200
      })
    }),

  // Chats
  findChats: async (instanceName) => 
    request(`/chat/findChats/${instanceName}`, { method: 'POST', body: JSON.stringify({}) }),

  findMessages: async (instanceName, remoteJid) =>
    request(`/chat/findMessages/${instanceName}`, { 
      method: 'POST', 
      body: JSON.stringify({ where: { remoteJid } }) 
    }),

  syncContacts: async (instanceName) =>
    request(`/chat/findContacts/${instanceName}`, { method: 'POST', body: JSON.stringify({}) }),

  markRead: async (instanceName, remoteJid) =>
    request(`/chat/markMessageAsRead/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ readMessages: [{ remoteJid, fromMe: false, id: 'all' }] }),
    }),

  // State
  getQrCode: async (instanceName) =>
    request(`/instance/connect/${instanceName}`),

  getStatus: async (instanceName) =>
    request(`/instance/connectionState/${instanceName}`),

  fetchProfilePicture: async (instanceName, remoteJid) =>
    request(`/chat/fetchProfilePictureUrl/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ number: remoteJid }),
    }),
}
