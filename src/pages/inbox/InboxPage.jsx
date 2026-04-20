import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, MoreVertical, CheckCheck, Paperclip, Smile, Mic,
  Video, Loader2, Smartphone, Send as SendIcon, X, RefreshCw,
  UserPlus, CheckCheck as CheckAll, Settings, Archive, Trash2,
  BellOff, Star, Copy, Forward, StopCircle, FileText, Image as ImageIcon,
  Check, User, LogOut
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

  const Avatar = ({ name, url, jid, size = 48, connected = false }) => {
    const finalUrl = url || (jid ? profilePics[jid] : null)
    const isUnknownNumber = name?.match(/^\+?\d+$/)
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: connected ? 'var(--accent-glow)' : 'var(--surface2)', border: `2px solid ${connected ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: 'var(--accent)', fontFamily: 'Syne' }}>
        {finalUrl ? (
          <img src={finalUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : isUnknownNumber ? (
          <User size={size * 0.55} color="var(--muted)" />
        ) : (
          (name || '?').charAt(0).toUpperCase()
        )}
      </div>
    )
  }

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
      <div style={{ width: '30%', minWidth: 340, maxWidth: 420, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--wa-sidebar)' }}>
        <div style={{ height: 60, padding: '0 16px', background: 'var(--wa-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--wa-active)', overflow: 'hidden' }}>
             {user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User color="var(--muted)" style={{ margin: 10 }} />}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
            <IconBtn icon={RefreshCw} onClick={handleDeepSync} spinning={syncing} />
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
        <div style={{ padding: '8px 12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or number" style={{ width: '100%', padding: '8px 12px 8px 38px', borderRadius: 8, border: 'none', background: 'var(--surface2)', fontSize: 14, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingChats && isConnected && chats.length === 0 ? (
             <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}><Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 12px' }} /><div style={{ fontSize: 13 }}>Connecting...</div></div>
          ) : !isConnected && activeInstance ? (
             <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Device offline.<br /><a href="/instances" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Reconnect →</a></div>
          ) : (chats.length === 0 && isConnected) ? (
             <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
               <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 12px' }} />
               <div style={{ fontSize: 13, fontWeight: 500 }}>Synchronizing Chats...</div>
               <div style={{ fontSize: 11, marginTop: 4 }}>This can take up to 60 seconds for large accounts.</div>
             </div>
          ) : (chats.filter(c => {
            const jid = c.remoteJid || c.id || ''
            if (jid === 'status@broadcast' || jid.endsWith('@newsletter')) return false
            const name = getChatName(c).toLowerCase(); const num = jid.split('@')[0]; const s = search.toLowerCase()
            return !search || name.includes(s) || num.includes(s)
          })).map(chat => (
            <div key={chat.remoteJid || chat.id} onClick={() => setSelectedChat(chat)} style={{ display: 'flex', cursor: 'pointer', alignItems: 'center', background: (selectedChat && (selectedChat.remoteJid || selectedChat.id) === (chat.remoteJid || chat.id)) ? 'var(--wa-active)' : 'transparent', transition: 'background 0.1s' }} onMouseEnter={e => !selectedChat && (e.currentTarget.style.background = 'var(--wa-hover)')} onMouseLeave={e => !selectedChat && (e.currentTarget.style.background = 'transparent')}>
              <div style={{ padding: '8px 15px' }}><Avatar name={getChatName(chat)} url={chat.profilePicUrl} jid={chat.remoteJid || chat.id} size={50} /></div>
                <div style={{ flex: 1, padding: '12px 15px 12px 0', borderBottom: '1px solid var(--border)', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--wa-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getChatName(chat)}
                    </span>
                    <span style={{ fontSize: 12, color: chat.unreadCount > 0 ? 'var(--wa-accent)' : 'var(--wa-text-muted)' }}>{fmtTime(chat.conversationTimestamp)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 14, color: 'var(--wa-text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {chat.lastMessage?.conversation || chat.lastMessage?.extendedTextMessage?.text || (chat.unreadCount ? 'New message(s)' : 'Tap to view chat')}
                    </p>
                    {chat.unreadCount > 0 && (
                      <div style={{ background: 'var(--wa-accent)', color: '#000', borderRadius: '50%', minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, padding: '0 4px' }}>
                        {chat.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat View ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0b141a', position: 'relative' }}>
        {selectedChat ? (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
                <div style={{ height: 60, padding: '0 16px', background: 'var(--wa-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 15, cursor: 'pointer' }} onClick={() => setShowSidebar(!showSidebar)}>
                    <Avatar name={getChatName(selectedChat)} url={selectedChat.profilePicUrl} jid={selectedChat.remoteJid || selectedChat.id} size={40} />
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 400, color: 'var(--wa-text)' }}>{getChatName(selectedChat)}</div>
                      <div style={{ fontSize: 12, color: 'var(--wa-text-muted)' }}>click to info {showSidebar ? '▼' : '►'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 15 }}><IconBtn icon={Search} /><IconBtn icon={MoreVertical} /></div>
                </div>
                <div className="wa-chat-bg" style={{ flex: 1, padding: '20px 7%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {loadingMessages && <div style={{ textAlign: 'center', padding: 10 }}><Loader2 className="animate-spin" size={16} color="var(--accent)" /></div>}
                  {messages.map(msg => (
                    <div key={msg.key?.id} style={{ alignSelf: msg.key?.fromMe ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '6px 10px 8px', borderRadius: 8, background: msg.key?.fromMe ? 'var(--wa-bubble-out)' : 'var(--wa-bubble-in)', boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)', fontSize: 14.2, position: 'relative', color: 'var(--wa-text)' }}>
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.message?.conversation || msg.message?.extendedTextMessage?.text || '📎 Media'}</div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: -4, fontSize: 11, color: msg.key?.fromMe ? 'rgba(255,255,255,0.6)' : 'var(--wa-text-muted)', textAlign: 'right', float: 'right', marginLeft: 8, position: 'relative', top: 6 }}>
                        <span>{fmtTime(msg.messageTimestamp)}</span>
                        {msg.key?.fromMe && <MessageStatus status={msg.status} />}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div style={{ padding: '5px 10px', background: 'var(--wa-header)', display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <IconBtn icon={Smile} onClick={() => setEmojiOpen(!emojiOpen)} />
                    <IconBtn icon={Paperclip} onClick={() => fileInputRef.current?.click()} />
                  </div>
                  <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', margin: '5px 10px' }}>
                    <input value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Type a message" style={{ width: '100%', padding: '9px 15px', borderRadius: 8, border: 'none', background: 'var(--wa-active)', color: 'var(--wa-text)', outline: 'none', fontSize: 15 }} />
                  </form>
                  {messageText.trim() ? <button type="submit" onClick={handleSend} style={{ background: 'none', border: 'none', color: 'var(--wa-text-muted)', cursor: 'pointer', padding: 10 }}><SendIcon size={24} /></button> : <IconBtn icon={Mic} />}
                </div>
             </div>

             {/* ── CRM Sidebar ── */}
             {showSidebar && (
             <div style={{ width: 300, background: 'var(--surface)', display: 'flex', flexDirection: 'column', padding: 24, boxSizing: 'border-box', overflowY: 'auto', borderLeft: '1px solid var(--border)' }}>
                <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative' }}>
                   <button onClick={() => setShowSidebar(false)} style={{ position: 'absolute', top: 0, left: 0, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={20} /></button>
                   <Avatar name={getChatName(selectedChat)} url={selectedChat.profilePicUrl} jid={selectedChat.remoteJid || selectedChat.id} size={84} />
                   <h3 style={{ margin: '16px 0 4px', fontSize: 18, fontFamily: 'Syne' }}>{formatContactName(getChatName(selectedChat))}</h3>
                   <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>+{(selectedChat.remoteJid || selectedChat.id).split('@')[0]}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                   <div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Tags</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                         {(contactInfo?.tags || []).map(t => (
                            <span key={t} style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--accent-glow)', color: 'var(--accent)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                               {t}
                               <X size={12} style={{ cursor: 'pointer' }} onClick={() => handleUpdateContact({ tags: contactInfo.tags.filter(tg => tg !== t) })} />
                            </span>
                         ))}
                         {(!contactInfo?.tags || contactInfo.tags.length === 0) && <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No tags assigned</div>}
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
                         placeholder="+ Add Tag" 
                         style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 12, outline: 'none', color: 'var(--text)' }} 
                      />
                   </div>

                   <div style={{ height: 1, background: 'var(--border)' }} />

                   <div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Notes</div>
                      <textarea 
                         value={contactInfo?.remarks || ''}
                         onChange={(e) => setContactInfo(p => ({ ...p, remarks: e.target.value }))}
                         onBlur={(e) => handleUpdateContact({ remarks: e.target.value })}
                         placeholder="Add private notes about this contact..."
                         style={{ width: '100%', height: 120, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, outline: 'none', color: 'var(--text)', resize: 'none', fontFamily: 'inherit' }}
                      />
                      {savingContact && <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4, textAlign: 'right' }}>Saving...</div>}
                   </div>
                </div>
             </div>
             )}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}><Smartphone size={52} color="var(--accent)" /></div>
            <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: 'var(--text)' }}>WhatsApp Web</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>Select a conversation to start messaging.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function IconBtn({ icon: Icon, onClick, spinning }) {
  return (<button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}><Icon size={20} className={spinning ? 'animate-spin' : ''} /></button>)
}
