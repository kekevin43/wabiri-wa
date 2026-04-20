import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, MoreVertical, CheckCheck, Paperclip, Smile, Mic,
  Video, Loader2, Smartphone, Send as SendIcon, X, RefreshCw,
  UserPlus, CheckCheck as CheckAll, Settings, Archive, Trash2,
  BellOff, Star, Copy, Forward, StopCircle, FileText, Image as ImageIcon,
  Check, User, LogOut, Lock
} from 'lucide-react'
import { evolution } from '../../lib/evolution'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { parsePhoneNumberFromString } from 'libphonenumber-js'

const formatContactName = (rawName) => {
  if (!rawName) return 'Unknown'
  if (rawName.match(/^\d+$/)) {
    try {
      const pn = parsePhoneNumberFromString('+' + rawName)
      return pn ? pn.formatInternational() : `+${rawName}`
    } catch {
      return `+${rawName}`
    }
  }
  return rawName
}

// ── Status Component ─────────────────────────────────────────────────────────
function MessageStatus({ status }) {
  if (status === 3 || status === 4) return <CheckCheck size={14} color="#34b7f1" /> // Read (Blue)
  if (status === 2) return <CheckCheck size={14} color="var(--muted)" /> // Delivered (Gray)
  if (status === 1) return <Check size={14} color="var(--muted)" /> // Sent (Single Gray)
  return <Check size={14} style={{ opacity: 0.5 }} /> // Pending
}

// ── Dropdown Menu ─────────────────────────────────────────────────────────────
function DropdownMenu({ items, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  return (
    <div ref={ref} style={{ position: 'absolute', top: 32, right: 0, zIndex: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 0', minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      {items.map((item, i) => item === 'divider' ? (
        <div key={i} style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
      ) : (
        <div key={i} onClick={() => { item.action?.(); onClose() }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 14, color: item.danger ? 'var(--danger)' : 'var(--text)', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {item.icon && <item.icon size={15} color={item.danger ? 'var(--danger)' : 'var(--muted)'} />}
          {item.label}
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InboxPage() {
  const { user, refreshUser, signOut } = useAuth()
  const [instances, setInstances] = useState([])
  const [activeInstance, setActiveInstance] = useState(null)
  const [chats, setChats] = useState([])
  const [profilePics, setProfilePics] = useState({}) 
  const [savedContacts, setSavedContacts] = useState({}) // { phone: name }
  const [loadingChats, setLoadingChats] = useState(false)
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [chatFilter, setChatFilter] = useState('all')

  // Sidebar CRM State
  const [contactInfo, setContactInfo] = useState(null)
  const [savingContact, setSavingContact] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)

  const [headerMenu, setHeaderMenu] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)

  const messagesEndRef = useRef(null)
  const chatPollRef = useRef(null)
  const msgPollRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // 1. Fetch saved contacts
  const fetchLocalContacts = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('contacts').select('full_name, phone').eq('user_id', user.id)
    if (data) {
      const map = {}
      data.forEach(c => {
        const normalized = c.phone.replace(/\D/g, '')
        map[normalized] = c.full_name
        if (normalized.startsWith('254') && normalized.length === 12) {
          map['0' + normalized.slice(3)] = c.full_name
        }
      })
      setSavedContacts(map)
    }
  }, [user])

  useEffect(() => { fetchLocalContacts() }, [fetchLocalContacts])

  // 2. Fetch Contact Info for Sidebar
  const fetchContactInfo = useCallback(async (jid) => {
    if (!jid || !user) return
    const num = jid.split('@')[0]
    const { data } = await supabase.from('contacts').select('*').eq('user_id', user.id).eq('phone', num).maybeSingle()
    setContactInfo(data)
  }, [user])

  useEffect(() => {
    if (selectedChat) {
      const jid = selectedChat.remoteJid || selectedChat.id
      fetchContactInfo(jid)
    } else {
      setContactInfo(null)
    }
  }, [selectedChat, fetchContactInfo])

  const handleUpdateContact = async (updates) => {
    if (!contactInfo || !user) return
    setSavingContact(true)
    try {
      const { error } = await supabase.from('contacts').update(updates).eq('id', contactInfo.id)
      if (error) throw error
      setContactInfo(prev => ({ ...prev, ...updates }))
      if (updates.full_name) fetchLocalContacts()
    } catch (e) {
      alert('Failed: ' + e.message)
    } finally {
      setSavingContact(false)
    }
  }

  // 3. Load instances & Logic
  const fetchInstances = useCallback(async () => {
    setLoadingChats(true)
    try {
      const res = await evolution.listInstances()
      const raw = Array.isArray(res) ? res : (res?.instances || [])
      const list = raw.map(i => {
        const info = i.instance || i
        const s = info.connectionStatus || info.state || info.status || ''
        return {
          instanceName: info.instanceName || info.name || '',
          number: info.owner || info.ownerJid?.split('@')[0] || info.number || null,
          connected: ['open', 'CONNECTED', 'connected'].includes(s),
        }
      }).filter(i => i.instanceName)
      setInstances(list)
      
      const primary = list.find(i => i.connected)
      if (primary) {
        if (!activeInstance) setActiveInstance(primary.instanceName)
        if (primary.number && !user?.user_metadata?.avatar_url) {
           try {
              const picRes = await evolution.fetchProfilePicture(primary.instanceName, primary.number)
              const picUrl = picRes?.profilePictureUrl || picRes?.url
              if (picUrl) {
                await supabase.auth.updateUser({ data: { avatar_url: picUrl } })
                refreshUser()
              }
           } catch (_) {}
        }
      }
    } finally { setLoadingChats(false) }
  }, [activeInstance, user, refreshUser])

  useEffect(() => { fetchInstances() }, [fetchInstances])

  // 4. Update Names to Database
  const updateContactNames = useCallback(async (list) => {
    if (!user) return
    const toUpsert = []
    list.forEach(chat => {
      const jid = chat.remoteJid || chat.id || ''
      const num = jid.split('@')[0]
      
      // Skip groups, broadcasts, newsletters, status
      if (
        jid.endsWith('@g.us') ||
        jid.endsWith('@broadcast') ||
        jid.endsWith('@newsletter') ||
        jid === 'status@broadcast' ||
        num.length > 15 // valid E.164 max is 15 digits
      ) return

      const full_name = chat.pushName || chat.name || null
      if (full_name && !savedContacts[num]) {
        toUpsert.push({ 
          user_id: user.id, 
          full_name, 
          phone: num,
          source: 'WhatsApp Inbox'
        })
      }
    })
    if (toUpsert.length > 0) {
      await supabase.from('contacts').insert(toUpsert, { ignoreDuplicates: true })
      fetchLocalContacts()
    }
  }, [user, savedContacts, fetchLocalContacts])

  // 5. Fetch & poll chats
  const fetchChats = useCallback(async (inst) => {
    if (!inst) return
    try {
      const data = await evolution.findChats(inst)
      let list = Array.isArray(data) ? data : (data?.data || data?.chats || [])
      list = list.filter(c => c.remoteJid || c.id)

      // Map names from Supabase locally if pushName is missing
      list = list.map(c => {
         const num = (c.remoteJid || c.id).split('@')[0]
         return {
            ...c,
            name: c.pushName || c.name || savedContacts[num] || num
         }
      })

      list.sort((a, b) => (b.conversationTimestamp || 0) - (a.conversationTimestamp || 0))
      setChats(list)
      updateContactNames(list)
      
      // Background Profile Sync
      list.slice(0, 20).forEach(async (chat, i) => {
        const jid = chat.remoteJid || chat.id
        if (!profilePics[jid] && !chat.profilePicUrl) {
          try {
            // Tiny staggered delay to prevent rate-limiting the Cloudflare tunnel
            await new Promise(r => setTimeout(r, i * 400))
            const num = jid.split('@')[0]
            const picRes = await evolution.fetchProfilePicture(inst, num)
            const url = picRes?.profilePictureUrl || picRes?.url
            if (url) setProfilePics(prev => ({ ...prev, [jid]: url }))
          } catch (_) {}
        }
      })
    } finally { setLoadingChats(false) }
  }, [activeInstance, profilePics, savedContacts, updateContactNames])

  const handleDeepSync = async () => {
    if (!activeInstance) return
    setSyncing(true)
    try {
      await evolution.syncContacts(activeInstance)
      await new Promise(r => setTimeout(r, 2000)) // Wait for sync start
      await fetchChats(activeInstance)
      await fetchLocalContacts()
    } finally { setSyncing(false) }
  }

  useEffect(() => {
    if (!activeInstance) return
    const connected = instances.find(i => i.instanceName === activeInstance)?.connected
    // If instance exists but is disconnected, clear stale data and stop polling
    if (instances.length > 0 && !connected) {
      setChats([])
      setMessages([])
      setSelectedChat(null)
      clearInterval(chatPollRef.current)
      return
    }
    const isFirst = chats.length === 0
    if (isFirst) setLoadingChats(true)
    fetchChats(activeInstance).finally(() => { if (isFirst) setLoadingChats(false) })
    
    // Poll faster (3s) during initial sync, then slow down (8s) once chats are loaded
    const pollInterval = chats.length === 0 ? 3000 : 8000
    clearInterval(chatPollRef.current); chatPollRef.current = setInterval(() => fetchChats(activeInstance), pollInterval)
    return () => clearInterval(chatPollRef.current)
  }, [activeInstance, instances, fetchChats, chats.length])

  // 6. Messages
  const fetchMessages = useCallback(async (inst, chat) => {
    if (!inst || !chat) return
    const rawJid = chat.remoteJid || chat.id
    // Ensure we have a fully-qualified JID for the API request
    const jid = rawJid.includes('@') ? rawJid : `${rawJid}@s.whatsapp.net`
    try {
      const data = await evolution.findMessages(inst, jid)
      let list = []
      if (Array.isArray(data)) list = data
      else if (Array.isArray(data?.messages)) list = data.messages
      else if (Array.isArray(data?.messages?.records)) list = data.messages.records
      else if (Array.isArray(data?.data)) list = data.data
      else if (Array.isArray(data?.records)) list = data.records
      
      // Client-side filter: Evolution API may return ALL messages for the instance.
      // We must ensure only messages belonging to THIS contact/chat are shown.
      const chatNumber = rawJid.split('@')[0]
      list = list.filter(msg => {
        const msgJid = msg.key?.remoteJid || ''
        const msgNumber = msgJid.split('@')[0]
        return msgNumber === chatNumber
      })
      
      list.sort((a, b) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0))
      setMessages(list)
    } catch (e) { console.error('Msg error', e) }
  }, [])

  useEffect(() => {
    if (!activeInstance || !selectedChat) { setMessages([]); return }
    setMessages([])
    setLoadingMessages(true); fetchMessages(activeInstance, selectedChat).finally(() => setLoadingMessages(false))
    clearInterval(msgPollRef.current); msgPollRef.current = setInterval(() => fetchMessages(activeInstance, selectedChat), 4000)
    return () => clearInterval(msgPollRef.current)
  }, [selectedChat, activeInstance, fetchMessages])

  const handleSend = async (e) => {
    e?.preventDefault()
    if (!messageText.trim() || !activeInstance || !selectedChat || sending) return
    const jid = selectedChat.remoteJid || selectedChat.id; setSending(true)
    const text = messageText; setMessageText('')
    
    // Optimistic Update
    const tempMsg = {
       key: { id: Date.now().toString(), fromMe: true },
       message: { conversation: text },
       messageTimestamp: Math.floor(Date.now() / 1000),
       status: 0 // Pending
    }
    setMessages(prev => [...prev, tempMsg])
    
    try { await evolution.sendMessage(activeInstance, jid, text) }
    catch (err) { alert('Failed: ' + err.message); setMessageText(text) }
    finally { setSending(false) }
  }

  const fmtTime = (ts) => {
    if (!ts) return ''; const d = new Date(ts > 1e12 ? ts : ts * 1000)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  const getChatName = (chat) => {
    const rawNum = (chat.remoteJid || chat.id || '').split('@')[0]
    const saved = savedContacts[rawNum] || savedContacts[rawNum.replace(/^0+/, '')]
    if (saved) return saved
    const nameStr = chat.pushName || chat.name || rawNum
    return formatContactName(nameStr)
  }

  const Avatar = ({ name, url, jid, size = 49 }) => {
    const finalUrl = url || (jid ? profilePics[jid] : null)
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: '#6b7b8a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {finalUrl ? (
          <img src={finalUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <svg viewBox="0 0 212 212" width={size} height={size}>
            <path fill="#DFE5E7" d="M106.251 0.5C164.653 0.5 212 47.846 212 106.25S164.653 212 106.25 212C47.846 212 0.5 164.654 0.5 106.25S47.846 0.5 106.251 0.5Z" />
            <path fill="#FFF" d="M173.561 171.615a62.767 62.767 0 0 0-2.065-2.955 67.7 67.7 0 0 0-2.608-3.299 70.112 70.112 0 0 0-3.184-3.527 71.097 71.097 0 0 0-5.924-5.47 72.458 72.458 0 0 0-10.204-7.026 75.2 75.2 0 0 0-5.98-3.055c-.062-.028-.118-.059-.18-.087-9.792-4.44-22.106-7.529-37.416-7.529s-27.624 3.089-37.416 7.529c-.338.153-.67.312-1.004.474a75.37 75.37 0 0 0-5.156 2.668 72.46 72.46 0 0 0-10.204 7.026 71.09 71.09 0 0 0-5.924 5.47 70.08 70.08 0 0 0-3.184 3.527 67.67 67.67 0 0 0-2.608 3.299 62.696 62.696 0 0 0-2.065 2.955 56.33 56.33 0 0 0-1.447 2.324c-.033.056-.073.119-.104.174a47.92 47.92 0 0 0-1.07 1.926c-.559 1.068-.818 1.678-.818 1.678v.398c18.285 17.927 43.322 28.985 70.945 28.985 27.623 0 52.661-11.058 70.945-28.985v-.398s-.259-.61-.818-1.678a47.58 47.58 0 0 0-1.07-1.926Z" />
            <path fill="#FFF" d="M106 0.5C135.846 0.5 160 24.654 160 54.5S135.846 108.5 106 108.5 52 84.346 52 54.5 76.154 0.5 106 0.5Z" transform="translate(0 32)" />
          </svg>
        )}
      </div>
    )
  }

  const getLastPreview = (chat) => {
    const text = chat.lastMessage?.conversation || chat.lastMessage?.extendedTextMessage?.text
    if (text) return text
    if (chat.lastMessage?.imageMessage) return '📷 Photo'
    if (chat.lastMessage?.videoMessage) return '📹 Video'
    if (chat.lastMessage?.audioMessage || chat.lastMessage?.pttMessage) return '🎵 Audio'
    if (chat.lastMessage?.documentMessage) return '📄 Document'
    if (chat.lastMessage?.stickerMessage) return '🏷️ Sticker'
    if (chat.lastMessage?.contactMessage) return '👤 Contact'
    if (chat.lastMessage?.locationMessage) return '📍 Location'
    return null
  }

  const unreadCount = chats.filter(c => (c.unreadCount || 0) > 0).length

  const isConnected = instances.find(i => i.instanceName === activeInstance)?.connected

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--wa-bg)' }}>
      <input ref={fileInputRef} type="file" onChange={e => {
        const file = e.target.files?.[0]; if (!file || !activeInstance || !selectedChat) return
        const jid = selectedChat.remoteJid || selectedChat.id; setSending(true)
        const reader = new FileReader(); reader.onload = async (ev) => {
          const base64 = ev.target.result.split(',')[1]
          try { await evolution.sendMedia(activeInstance, jid, base64, file.name, '', file.type.split('/')[0]) }
          catch (err) { alert('Upload failed: ' + err.message) }
          finally { setSending(false) }
        }; reader.readAsDataURL(file)
      }} style={{ display: 'none' }} />

      {/* ── Chat List ── */}
      <div style={{ width: '30%', minWidth: 340, maxWidth: 420, borderRight: '1px solid var(--wa-border)', display: 'flex', flexDirection: 'column', background: 'var(--wa-sidebar)' }}>
        {/* Header */}
        <div style={{ height: 59, padding: '0 16px', background: 'var(--wa-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--wa-text)', letterSpacing: -0.2 }}>WhatsApp</span>
          <div style={{ display: 'flex', gap: 2, alignItems: 'center', position: 'relative' }}>
            <IconBtn icon={RefreshCw} onClick={handleDeepSync} spinning={syncing} />
            <IconBtn icon={UserPlus} />
            <IconBtn icon={MoreVertical} onClick={() => setHeaderMenu(v => !v)} />
            {headerMenu && (
              <DropdownMenu
                onClose={() => setHeaderMenu(false)}
                items={[
                  { icon: RefreshCw, label: 'Deep Sync Contacts', action: handleDeepSync },
                  { icon: Settings, label: 'Settings', action: () => window.location.href = '/settings' },
                  'divider',
                  { icon: LogOut, label: 'Sign Out', action: signOut, danger: true },
                ]}
              />
            )}
          </div>
        </div>
        {/* Search */}
        <div style={{ padding: '8px 12px 6px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--wa-text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search or start a new chat" style={{ width: '100%', padding: '7px 14px 7px 40px', borderRadius: 8, border: 'none', background: 'var(--wa-active)', fontSize: 13.5, color: 'var(--wa-text)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 6, padding: '4px 14px 8px', overflowX: 'auto' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: `Unread${unreadCount > 0 ? ` ${unreadCount}` : ''}` },
            { key: 'groups', label: 'Groups' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setChatFilter(tab.key)} style={{ padding: '5px 14px', borderRadius: 18, border: 'none', fontSize: 13, fontWeight: 400, cursor: 'pointer', background: chatFilter === tab.key ? 'var(--wa-accent)' : 'var(--wa-active)', color: chatFilter === tab.key ? '#111b21' : 'var(--wa-text)', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>{tab.label}</button>
          ))}
        </div>
        {/* Chat List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingChats && isConnected && chats.length === 0 ? (
             <div style={{ padding: 40, textAlign: 'center', color: 'var(--wa-text-muted)' }}><Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 12px' }} /><div style={{ fontSize: 13 }}>Connecting...</div></div>
          ) : !isConnected && activeInstance ? (
             <div style={{ padding: 30, textAlign: 'center', color: 'var(--wa-text-muted)', fontSize: 13 }}>Device offline.<br /><a href="/instances" style={{ color: 'var(--wa-accent)', textDecoration: 'none', fontWeight: 600 }}>Reconnect →</a></div>
          ) : (chats.length === 0 && isConnected) ? (
             <div style={{ padding: 40, textAlign: 'center', color: 'var(--wa-text-muted)' }}>
               <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 12px' }} />
               <div style={{ fontSize: 13, fontWeight: 500 }}>Synchronizing Chats...</div>
               <div style={{ fontSize: 11, marginTop: 4 }}>This can take up to 60 seconds for large accounts.</div>
             </div>
          ) : (chats.filter(c => {
            const jid = c.remoteJid || c.id || ''
            if (jid === 'status@broadcast' || jid.endsWith('@newsletter')) return false
            if (chatFilter === 'unread' && !(c.unreadCount > 0)) return false
            if (chatFilter === 'groups' && !jid.endsWith('@g.us')) return false
            const name = getChatName(c).toLowerCase(); const num = jid.split('@')[0]; const s = search.toLowerCase()
            return !search || name.includes(s) || num.includes(s)
          })).map(chat => {
            const isSelected = selectedChat && (selectedChat.remoteJid || selectedChat.id) === (chat.remoteJid || chat.id)
            const preview = getLastPreview(chat)
            const hasUnread = (chat.unreadCount || 0) > 0
            return (
            <div key={chat.remoteJid || chat.id} onClick={() => setSelectedChat(chat)} style={{ display: 'flex', cursor: 'pointer', alignItems: 'center', background: isSelected ? 'var(--wa-active)' : 'transparent', transition: 'background 0.15s' }} onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--wa-hover)' }} onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
              <div style={{ padding: '0 13px 0 15px', display: 'flex', alignItems: 'center' }}><Avatar name={getChatName(chat)} url={chat.profilePicUrl} jid={chat.remoteJid || chat.id} size={49} /></div>
              <div style={{ flex: 1, padding: '13px 15px 13px 0', borderBottom: '1px solid var(--wa-border)', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                  <span style={{ fontSize: 17, fontWeight: 400, color: 'var(--wa-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 6 }}>{getChatName(chat)}</span>
                  <span style={{ fontSize: 12, color: hasUnread ? 'var(--wa-accent)' : 'var(--wa-text-muted)', flexShrink: 0 }}>{fmtTime(chat.conversationTimestamp)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 14, color: 'var(--wa-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                    {chat.lastMessage && !hasUnread && <MessageStatus status={chat.lastMessage?.status || 2} />}
                    <span>{preview || ''}</span>
                  </div>
                  {hasUnread && (
                    <div style={{ background: 'var(--wa-accent)', color: '#111b21', borderRadius: '50%', minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, padding: '0 5px', marginLeft: 6, flexShrink: 0 }}>{chat.unreadCount}</div>
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>
      </div>

      {/* ── Chat View ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--wa-bg)', position: 'relative', borderLeft: '1px solid var(--wa-border)' }}>
        {selectedChat ? (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Chat Header */}
                <div style={{ height: 59, padding: '0 16px', background: 'var(--wa-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, cursor: 'pointer', flex: 1, minWidth: 0 }} onClick={() => setShowSidebar(!showSidebar)}>
                    <Avatar name={getChatName(selectedChat)} url={selectedChat.profilePicUrl} jid={selectedChat.remoteJid || selectedChat.id} size={40} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 400, color: 'var(--wa-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getChatName(selectedChat)}</div>
                      <div style={{ fontSize: 13, color: 'var(--wa-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedChat.remoteJid?.endsWith('@g.us') ? 'Group Info' : 'click here for contact info'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <IconBtn icon={Search} />
                    <IconBtn icon={MoreVertical} />
                  </div>
                </div>

                {/* Messages Area */}
                <div className="wa-chat-bg" style={{ flex: 1, padding: '20px 7%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {loadingMessages && <div style={{ textAlign: 'center', padding: 10 }}><Loader2 className="animate-spin" size={16} color="var(--wa-accent)" /></div>}
                  {messages.map((msg, idx) => {
                    const isMe = msg.key?.fromMe
                    const prevMsg = messages[idx - 1]
                    const showTail = !prevMsg || prevMsg.key?.fromMe !== isMe
                    
                    return (
                      <div key={msg.key?.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '65%', padding: '6px 7px 8px 9px', borderRadius: 7.5, background: isMe ? 'var(--wa-bubble-out)' : 'var(--wa-bubble-in)', boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)', fontSize: 14.2, position: 'relative', color: 'var(--wa-text)', marginBottom: showTail ? 8 : 2, marginTop: showTail ? 4 : 0 }}>
                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '19px' }}>{msg.message?.conversation || msg.message?.extendedTextMessage?.text || '📎 Media Message'}</div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3, marginTop: -4, fontSize: 11, color: 'var(--wa-text-muted)', textAlign: 'right', float: 'right', marginLeft: 8, position: 'relative', top: 5 }}>
                          <span style={{ fontSize: 11 }}>{fmtTime(msg.messageTimestamp)}</span>
                          {isMe && <MessageStatus status={msg.status} />}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={{ padding: '5px 16px', background: 'var(--wa-header)', display: 'flex', alignItems: 'center', minHeight: 62 }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <IconBtn icon={Smile} onClick={() => setEmojiOpen(!emojiOpen)} />
                    <IconBtn icon={Paperclip} onClick={() => fileInputRef.current?.click()} />
                  </div>
                  <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', margin: '0 8px' }}>
                    <input 
                      value={messageText} 
                      onChange={e => setMessageText(e.target.value)} 
                      placeholder="Type a message" 
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none', background: 'var(--wa-active)', color: 'var(--wa-text)', outline: 'none', fontSize: 15 }} 
                    />
                  </form>
                  {messageText.trim() ? (
                    <button type="submit" onClick={handleSend} style={{ background: 'none', border: 'none', color: 'var(--wa-text-muted)', cursor: 'pointer', padding: 8 }}>
                      <SendIcon size={24} />
                    </button>
                  ) : (
                    <IconBtn icon={Mic} />
                  )}
                </div>
             </div>

             {/* ── CRM Sidebar ── */}
             {showSidebar && (
             <div style={{ width: 400, background: 'var(--wa-bg)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflowY: 'auto', borderLeft: '1px solid var(--wa-border)' }}>
                <div style={{ height: 60, padding: '0 16px', background: 'var(--wa-header)', display: 'flex', alignItems: 'center', gap: 20 }}>
                   <IconBtn icon={X} onClick={() => setShowSidebar(false)} />
                   <div style={{ fontSize: 16, color: 'var(--wa-text)' }}>Contact info</div>
                </div>

                <div style={{ textAlign: 'center', padding: '28px 0', background: 'var(--wa-bg)' }}>
                   <div style={{ display: 'inline-block', marginBottom: 20 }}>
                      <Avatar name={getChatName(selectedChat)} url={selectedChat.profilePicUrl} jid={selectedChat.remoteJid || selectedChat.id} size={200} />
                   </div>
                   <h3 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 400, color: 'var(--wa-text)' }}>{getChatName(selectedChat)}</h3>
                   <div style={{ fontSize: 16, color: 'var(--wa-text-muted)' }}>+{(selectedChat.remoteJid || selectedChat.id).split('@')[0]}</div>
                </div>

                <div style={{ padding: '14px 30px', background: 'var(--wa-bg)', borderTop: '12px solid var(--wa-header)' }}>
                   <div style={{ fontSize: 14, color: 'var(--wa-accent)', marginBottom: 12, fontWeight: 500 }}>Tags</div>
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {(contactInfo?.tags || []).map(t => (
                         <span key={t} style={{ padding: '4px 12px', borderRadius: 10, background: 'var(--wa-active)', color: 'var(--wa-text)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {t}
                            <X size={14} style={{ cursor: 'pointer', color: 'var(--wa-text-muted)' }} onClick={() => handleUpdateContact({ tags: contactInfo.tags.filter(tg => tg !== t) })} />
                         </span>
                      ))}
                      {(!contactInfo?.tags || contactInfo.tags.length === 0) && <div style={{ fontSize: 14, color: 'var(--wa-text-muted)' }}>No tags</div>}
                   </div>
                   <input 
                      onKeyDown={(e) => {
                         if (e.key === 'Enter' && e.target.value.trim()) {
                            const nt = e.target.value.trim().toLowerCase().replace(/\s+/g, '-')
                            const tags = Array.from(new Set([...(contactInfo?.tags || []), nt]))
                            handleUpdateContact({ tags })
                            e.target.value = ''
                         }
                      }}
                      placeholder="Add tag..." 
                      style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: '1px solid var(--wa-border)', background: 'transparent', fontSize: 14, outline: 'none', color: 'var(--wa-text)' }} 
                   />
                </div>

                <div style={{ padding: '14px 30px', background: 'var(--wa-bg)', borderTop: '12px solid var(--wa-header)', flex: 1 }}>
                   <div style={{ fontSize: 14, color: 'var(--wa-accent)', marginBottom: 12, fontWeight: 500 }}>Notes</div>
                   <textarea 
                      value={contactInfo?.remarks || ''}
                      onChange={(e) => setContactInfo(p => ({ ...p, remarks: e.target.value }))}
                      onBlur={(e) => handleUpdateContact({ remarks: e.target.value })}
                      placeholder="Add a note..."
                      style={{ width: '100%', height: 120, padding: '0', border: 'none', background: 'transparent', fontSize: 14, outline: 'none', color: 'var(--wa-text)', resize: 'none', fontFamily: 'inherit', lineHeight: '20px' }}
                   />
                   {savingContact && <div style={{ fontSize: 12, color: 'var(--wa-accent)', marginTop: 8 }}>Saving...</div>}
                </div>
             </div>
             )}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--wa-header)', borderBottom: '6px solid var(--wa-accent)' }}>
            <div style={{ textAlign: 'center', maxWidth: 460, padding: 20 }}>
              <div style={{ marginBottom: 40, opacity: 0.8 }}>
                <svg width="320" height="188" viewBox="0 0 320 188" fill="none">
                  <path d="M160 188C248.366 188 320 145.915 320 94C320 42.0853 248.366 0 160 0C71.6344 0 0 42.0853 0 94C0 145.915 71.6344 188 160 188Z" fill="#202C33" />
                  <path d="M160 150C204.183 150 240 124.627 240 93.3333C240 62.0391 204.183 36.6667 160 36.6667C115.817 36.6667 80 62.0391 80 93.3333C80 124.627 115.817 150 160 150Z" fill="#2A3942" />
                  <rect x="135" y="70" width="50" height="70" rx="4" fill="#8696A0" />
                  <rect x="145" y="80" width="30" height="40" rx="2" fill="#202C33" />
                  <circle cx="160" cy="130" r="4" fill="#202C33" />
                </svg>
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 300, color: 'var(--wa-text)', marginBottom: 16 }}>WhatsApp Web</h1>
              <p style={{ fontSize: 14, color: 'var(--wa-text-muted)', lineHeight: '20px', marginBottom: 40 }}>
                Send and receive messages without keeping your phone online.<br />
                Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
              </p>
              <div style={{ fontSize: 14, color: 'var(--wa-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Lock size={14} /> End-to-end encrypted
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function IconBtn({ icon: Icon, onClick, spinning }) {
  return (<button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}><Icon size={20} className={spinning ? 'animate-spin' : ''} /></button>)
}
