import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, MoreVertical, CheckCheck, Paperclip, Smile, Mic,
  Video, Loader2, Smartphone, Send as SendIcon, X, RefreshCw,
  UserPlus, CheckCheck as CheckAll, Settings, Archive, Trash2,
  BellOff, Star, Copy, Forward, StopCircle, FileText, Image as ImageIcon,
  Check
} from 'lucide-react'
import { evolution } from '../../lib/evolution'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

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
  const { user, refreshUser } = useAuth()
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
    const { data } = await supabase.from('contacts').select('name, phone').eq('user_id', user.id)
    if (data) {
      const map = {}
      data.forEach(c => { map[c.phone.replace(/\D/g, '')] = c.name })
      setSavedContacts(map)
    }
  }, [user])

  useEffect(() => { fetchLocalContacts() }, [fetchLocalContacts])

  // 2. Load instances & Logic
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

  // 3. Update Names to Database
  const updateContactNames = useCallback(async (list) => {
    if (!user) return
    const toUpsert = []
    list.forEach(chat => {
      const jid = chat.remoteJid || chat.id
      const num = jid.split('@')[0]
      const name = chat.pushName || chat.name
      if (name && !savedContacts[num]) {
        toUpsert.push({ user_id: user.id, name, phone: num })
      }
    })
    if (toUpsert.length > 0) {
      await supabase.from('contacts').upsert(toUpsert, { onConflict: 'phone,user_id' })
      fetchLocalContacts()
    }
  }, [user, savedContacts, fetchLocalContacts])

  // 4. Fetch & poll chats
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
    const isFirst = chats.length === 0
    if (isFirst) setLoadingChats(true)
    fetchChats(activeInstance).finally(() => { if (isFirst) setLoadingChats(false) })
    clearInterval(chatPollRef.current); chatPollRef.current = setInterval(() => fetchChats(activeInstance), 8000)
    return () => clearInterval(chatPollRef.current)
  }, [activeInstance, fetchChats])

  // 5. Messages
  const fetchMessages = useCallback(async (inst, chat) => {
    if (!inst || !chat) return
    const jid = chat.remoteJid || chat.id
    try {
      const data = await evolution.findMessages(inst, jid)
      const list = Array.isArray(data) ? data : (data?.data || data?.messages || [])
      list.sort((a, b) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0))
      setMessages(list)
    } catch (e) { console.error('Msg error', e) }
  }, [])

  useEffect(() => {
    if (!activeInstance || !selectedChat) { setMessages([]); return }
    setLoadingMessages(true); fetchMessages(activeInstance, selectedChat).finally(() => setLoadingMessages(false))
    clearInterval(msgPollRef.current); msgPollRef.current = setInterval(() => fetchMessages(activeInstance, selectedChat), 4000)
    return () => clearInterval(msgPollRef.current)
  }, [selectedChat, activeInstance, fetchMessages])

  const handleSend = async (e) => {
    e?.preventDefault()
    if (!messageText.trim() || !activeInstance || !selectedChat || sending) return
    const jid = selectedChat.remoteJid || selectedChat.id; setSending(true)
    const text = messageText; setMessageText('')
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
    return savedContacts[rawNum] || chat.pushName || chat.name || rawNum || 'Unknown'
  }

  const Avatar = ({ name, url, jid, size = 48, connected = false }) => {
    const finalUrl = url || (jid ? profilePics[jid] : null)
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: connected ? 'var(--accent-glow)' : 'var(--surface2)', border: `2px solid ${connected ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: 'var(--accent)', fontFamily: 'Syne' }}>
        {finalUrl ? <img src={finalUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name || '?').charAt(0).toUpperCase()}
      </div>
    )
  }

  const isConnected = instances.find(i => i.instanceName === activeInstance)?.connected

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--surface2)' }}>
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

      <div style={{ width: '30%', minWidth: 320, maxWidth: 420, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
        <div style={{ height: 60, padding: '0 16px', background: 'var(--surface-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', position: 'relative' }}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>WhatsApp</span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <IconBtn icon={RefreshCw} onClick={fetchInstances} spinning={loadingChats} />
            <IconBtn icon={MoreVertical} onClick={() => setHeaderMenu(v => !v)} />
          </div>
        </div>
        <div style={{ padding: '8px 12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or number" style={{ width: '100%', padding: '8px 12px 8px 38px', borderRadius: 8, border: 'none', background: 'var(--surface2)', fontSize: 14, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingChats && isConnected ? (
             <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}><Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 12px' }} /><div style={{ fontSize: 13 }}>Connecting...</div></div>
          ) : !isConnected && activeInstance ? (
             <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Device offline.<br /><a href="/instances" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Reconnect →</a></div>
          ) : (chats.filter(c => {
            const name = getChatName(c).toLowerCase(); const num = (c.remoteJid || c.id || '').split('@')[0]; const s = search.toLowerCase()
            return !search || name.includes(s) || num.includes(s)
          })).map(chat => (
            <div key={chat.remoteJid || chat.id} onClick={() => setSelectedChat(chat)} style={{ display: 'flex', cursor: 'pointer', alignItems: 'center', background: (selectedChat && (selectedChat.remoteJid || selectedChat.id) === (chat.remoteJid || chat.id)) ? 'var(--surface2)' : 'transparent', transition: 'background 0.1s' }}>
              <div style={{ padding: '8px 12px' }}><Avatar name={getChatName(chat)} url={chat.profilePicUrl} jid={chat.remoteJid || chat.id} size={46} /></div>
              <div style={{ flex: 1, padding: '12px 12px 12px 0', borderBottom: '1px solid var(--border-strong)', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getChatName(chat)}</span><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtTime(chat.conversationTimestamp)}</span></div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.lastMessage?.conversation || '📎 Media'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface2)' }}>
        {selectedChat ? (
          <>
            <div style={{ height: 60, padding: '0 16px', background: 'var(--surface-header)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Avatar name={getChatName(selectedChat)} url={selectedChat.profilePicUrl} jid={selectedChat.remoteJid || selectedChat.id} size={40} /><div><div style={{ fontSize: 16, fontWeight: 600 }}>{getChatName(selectedChat)}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>last active recently</div></div></div>
              <IconBtn icon={MoreVertical} />
            </div>
            <div style={{ flex: 1, padding: '16px 6%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {loadingMessages && <div style={{ textAlign: 'center', padding: 10 }}><Loader2 className="animate-spin" size={16} color="var(--accent)" /></div>}
              {messages.map(msg => (
                <div key={msg.key?.id} style={{ alignSelf: msg.key?.fromMe ? 'flex-end' : 'flex-start', maxWidth: '75%', padding: '8px 12px', borderRadius: 10, background: msg.key?.fromMe ? 'var(--bubble-out)' : 'var(--bubble-in)', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', fontSize: 14, position: 'relative' }}>
                  {msg.message?.conversation || '📎 Media'}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 10, color: 'var(--muted)' }}>
                    <span>{fmtTime(msg.messageTimestamp)}</span>
                    {msg.key?.fromMe && <MessageStatus status={msg.status} />}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div style={{ padding: '10px 16px', background: 'var(--surface-header)', borderTop: '1px solid var(--border)' }}>
              <form onSubmit={handleSend} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <IconBtn icon={Smile} onClick={() => setEmojiOpen(!emojiOpen)} />
                <IconBtn icon={Paperclip} onClick={() => fileInputRef.current?.click()} />
                <input value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Type a message" style={{ flex: 1, padding: '10px 16px', borderRadius: 24, border: 'none', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
                {messageText.trim() ? <button type="submit" style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}><SendIcon size={24} /></button> : <IconBtn icon={Mic} />}
              </form>
            </div>
          </>
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
