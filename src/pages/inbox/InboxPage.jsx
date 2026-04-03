import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, MoreVertical, CheckCheck, Paperclip, Smile, Mic,
  Video, Loader2, Smartphone, Send as SendIcon, X, RefreshCw,
  UserPlus, CheckCheck as CheckAll, Settings, Archive, Trash2,
  BellOff, Star, Copy, Forward,
} from 'lucide-react'
import { evolution } from '../../lib/evolution'

// ── Dropdown Menu ─────────────────────────────────────────────────────────────
function DropdownMenu({ items, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref} style={{
      position: 'absolute', top: 32, right: 0, zIndex: 200,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '4px 0', minWidth: 200,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {items.map((item, i) => item === 'divider' ? (
        <div key={i} style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
      ) : (
        <div key={i} onClick={() => { item.action?.(); onClose() }} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', cursor: 'pointer', fontSize: 14,
          color: item.danger ? 'var(--danger)' : 'var(--text)',
          transition: 'background 0.1s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {item.icon && <item.icon size={15} color={item.danger ? 'var(--danger)' : 'var(--muted)'} />}
          {item.label}
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InboxPage() {
  const [instances, setInstances] = useState([])
  const [activeInstance, setActiveInstance] = useState(null)
  const [chats, setChats] = useState([])
  const [loadingChats, setLoadingChats] = useState(false)
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [syncing, setSyncing] = useState(false)

  // Menus
  const [headerMenu, setHeaderMenu] = useState(false)
  const [chatMenu, setChatMenu] = useState(false)

  const messagesEndRef = useRef(null)
  const chatPollRef = useRef(null)
  const msgPollRef = useRef(null)

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // 1. Load ALL instances (don't filter by status — let chat fetch determine usability)
  useEffect(() => {
    evolution.listInstances().then(res => {
      const raw = Array.isArray(res) ? res : (res?.instances || [])
      // Unwrap nested .instance if present, normalise status
      const list = raw.map(i => {
        const info = i.instance || i
        const statusRaw = info.connectionStatus || info.state || info.status || ''
        return {
          instanceName: info.instanceName || info.name || '',
          number: info.owner || info.ownerJid?.split('@')[0] || info.number || null,
          connected: ['open', 'CONNECTED', 'connected'].includes(statusRaw),
        }
      }).filter(i => i.instanceName) // only need a name

      // Sort: connected first
      list.sort((a, b) => (b.connected ? 1 : 0) - (a.connected ? 1 : 0))

      setInstances(list)
      if (list.length > 0) setActiveInstance(list[0].instanceName)
    }).catch(console.error)
  }, [])

  // 2. Fetch & poll chats when instance changes
  const fetchChats = useCallback(async (inst) => {
    if (!inst) return
    try {
      const data = await evolution.findChats(inst)
      let list = Array.isArray(data) ? data : (data?.data || data?.chats || [])
      list = list.filter(c => c.remoteJid || c.id)
      list.sort((a, b) => (b.conversationTimestamp || 0) - (a.conversationTimestamp || 0))
      setChats(list)
    } catch (e) { console.error('Chat fetch error', e) }
  }, [])

  useEffect(() => {
    if (!activeInstance) return
    setLoadingChats(true)
    fetchChats(activeInstance).finally(() => setLoadingChats(false))
    clearInterval(chatPollRef.current)
    chatPollRef.current = setInterval(() => fetchChats(activeInstance), 8000)
    return () => clearInterval(chatPollRef.current)
  }, [activeInstance, fetchChats])

  // 3. Fetch & poll messages when chat selected
  const fetchMessages = useCallback(async (inst, chat) => {
    if (!inst || !chat) return
    const jid = chat.remoteJid || chat.id
    try {
      const data = await evolution.findMessages(inst, jid)
      const list = Array.isArray(data) ? data : (data?.data || data?.messages || [])
      list.sort((a, b) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0))
      setMessages(list)
    } catch (e) { console.error('Message fetch error', e) }
  }, [])

  useEffect(() => {
    if (!activeInstance || !selectedChat) { setMessages([]); return }
    setLoadingMessages(true)
    fetchMessages(activeInstance, selectedChat).finally(() => setLoadingMessages(false))
    clearInterval(msgPollRef.current)
    msgPollRef.current = setInterval(() => fetchMessages(activeInstance, selectedChat), 4000)
    return () => clearInterval(msgPollRef.current)
  }, [selectedChat, activeInstance, fetchMessages])

  // Send message
  const handleSend = async (e) => {
    e?.preventDefault()
    if (!messageText.trim() || !activeInstance || !selectedChat || sending) return
    const jid = selectedChat.remoteJid || selectedChat.id
    setSending(true)
    const optimistic = {
      key: { fromMe: true, id: `opt-${Date.now()}` },
      message: { conversation: messageText },
      messageTimestamp: Math.floor(Date.now() / 1000),
    }
    setMessages(prev => [...prev, optimistic])
    const text = messageText
    setMessageText('')
    try {
      await evolution.sendMessage(activeInstance, jid, text)
    } catch (err) {
      setMessages(prev => prev.filter(m => m.key.id !== optimistic.key.id))
      setMessageText(text)
      alert('Failed to send: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  // Sync WhatsApp contacts into Wabiri Contacts page
  const handleSyncContacts = async () => {
    if (!activeInstance) return alert('No instance connected')
    setSyncing(true)
    try {
      const data = await evolution.syncContacts(activeInstance)
      const contacts = Array.isArray(data) ? data : (data?.data || [])
      alert(`✅ Synced ${contacts.length} contacts from WhatsApp.\nGo to Contacts page to view them.`)
      // TODO: persist to Supabase here
    } catch (e) {
      alert('Contact sync failed: ' + e.message)
    } finally {
      setSyncing(false)
    }
  }

  // Mark chat as read
  const handleMarkRead = async (chat) => {
    if (!activeInstance || !chat) return
    const jid = chat.remoteJid || chat.id
    try {
      await evolution.markRead(activeInstance, jid)
      setChats(prev => prev.map(c =>
        (c.remoteJid || c.id) === jid ? { ...c, unreadCount: 0 } : c
      ))
    } catch (e) { console.error('Mark read error', e) }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const fmtTime = (ts) => {
    if (!ts) return ''
    const d = new Date(ts > 1e12 ? ts : ts * 1000)
    if (isNaN(d)) return ''
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getMsgText = (msg) => {
    if (!msg?.message) return ''
    const m = msg.message
    return m.conversation || m.extendedTextMessage?.text
      || (m.imageMessage ? '📷 Photo' : '')
      || (m.videoMessage ? '🎥 Video' : '')
      || (m.audioMessage ? '🎵 Audio' : '')
      || (m.documentMessage ? '📄 Document' : '')
      || ''
  }

  const getChatPreview = (chat) => {
    if (chat._optimisticPreview) return chat._optimisticPreview
    if (chat.lastMessage) return getMsgText({ message: chat.lastMessage })
    if (chat.conversation) return chat.conversation
    return ''
  }

  const getChatName = (chat) =>
    chat.pushName || chat.name || (chat.remoteJid || chat.id || '').split('@')[0] || 'Unknown'

  const Avatar = ({ name, size = 48, connected = false }) => (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: connected ? 'var(--accent-glow)' : 'var(--surface2)',
      border: `2px solid ${connected ? 'var(--accent)' : 'var(--border)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: 'var(--accent)', fontFamily: 'Syne',
    }}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  )

  const filteredChats = chats.filter(c =>
    !search || getChatName(c).toLowerCase().includes(search.toLowerCase())
  )

  // ── Header 3-dot menu items ───────────────────────────────────────────────
  const headerMenuItems = [
    { icon: UserPlus, label: syncing ? 'Syncing…' : 'Sync WhatsApp Contacts', action: handleSyncContacts },
    { icon: CheckAll, label: 'Mark All as Read', action: () => filteredChats.forEach(c => handleMarkRead(c)) },
    { icon: RefreshCw, label: 'Refresh Chats', action: () => fetchChats(activeInstance) },
    'divider',
    ...(instances.length > 1 ? [{ icon: Smartphone, label: 'Switch Instance…', action: () => {} }] : []),
  ]

  // ── Per-chat 3-dot menu items ─────────────────────────────────────────────
  const chatMenuItems = selectedChat ? [
    { icon: Star, label: 'Starred Messages', action: () => {} },
    { icon: BellOff, label: 'Mute Notifications', action: () => {} },
    { icon: CheckAll, label: 'Mark as Read', action: () => handleMarkRead(selectedChat) },
    'divider',
    { icon: Archive, label: 'Archive Chat', action: () => {} },
    { icon: Trash2, label: 'Delete Chat', danger: true, action: () => {
        if (confirm(`Delete chat with ${getChatName(selectedChat)}?`)) {
          setChats(prev => prev.filter(c => (c.remoteJid || c.id) !== (selectedChat.remoteJid || selectedChat.id)))
          setSelectedChat(null)
        }
      }
    },
  ] : []

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--surface2)' }}>

      {/* ── Left Pane ── */}
      <div style={{
        width: '30%', minWidth: 320, maxWidth: 420,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--surface)',
      }}>
        {/* Header */}
        <div style={{
          height: 60, padding: '0 16px',
          background: 'var(--surface-header)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          position: 'relative',
        }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>WhatsApp</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setHeaderMenu(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <MoreVertical size={20} />
            </button>
          </div>
          {headerMenu && (
            <DropdownMenu items={headerMenuItems} onClose={() => setHeaderMenu(false)} />
          )}
        </div>

        {/* Instance strip */}
        {instances.length > 1 && (
          <div style={{ padding: '6px 12px', background: 'rgba(59,130,246,0.06)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone size={14} color="var(--accent)" />
            <select value={activeInstance || ''} onChange={e => { setActiveInstance(e.target.value); setSelectedChat(null) }}
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', fontWeight: 600, fontSize: 13 }}>
              {instances.map(i => (
                <option key={i.instanceName} value={i.instanceName}>
                  {i.instanceName}{i.number ? ` · ${i.number}` : ''}{i.connected ? '' : ' (offline)'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search */}
        <div style={{ padding: '8px 12px', background: 'var(--surface)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search or start new chat"
              style={{ width: '100%', padding: '8px 12px 8px 38px', borderRadius: 8, border: 'none', background: 'var(--surface2)', fontSize: 14, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
            />
            {search && (
              <X size={14} onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)' }} />
            )}
          </div>
        </div>

        {/* Chat list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {instances.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.8 }}>
              <Smartphone size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
              No WhatsApp devices connected.<br />
              <a href="/instances" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Connect a device →</a>
            </div>
          ) : loadingChats && filteredChats.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              <Loader2 className="animate-spin" size={22} style={{ margin: '0 auto 10px', display: 'block' }} />
              Loading chats…
            </div>
          ) : filteredChats.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
              {search ? `No chats matching "${search}"` : 'No chats yet.'}
            </div>
          ) : (
            filteredChats.map(chat => {
              const jid = chat.remoteJid || chat.id
              const isSelected = selectedChat && (selectedChat.remoteJid || selectedChat.id) === jid
              const name = getChatName(chat)
              const preview = getChatPreview(chat)
              const hasUnread = chat.unreadCount > 0

              return (
                <div
                  key={jid}
                  onClick={() => setSelectedChat(chat)}
                  style={{
                    display: 'flex', cursor: 'pointer', alignItems: 'center',
                    background: isSelected ? 'var(--surface2)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ padding: '8px 12px' }}>
                    <Avatar name={name} size={46} />
                  </div>
                  <div style={{
                    flex: 1, padding: '12px 12px 12px 0',
                    borderBottom: '1px solid var(--border-strong)',
                    minWidth: 0,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: hasUnread ? 700 : 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </span>
                      <span style={{ fontSize: 12, color: hasUnread ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                        {fmtTime(chat.conversationTimestamp)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {preview}
                      </p>
                      {hasUnread && (
                        <div style={{ background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 6px', minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, marginLeft: 8, flexShrink: 0 }}>
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right Pane ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Background */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none', backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")', backgroundRepeat: 'repeat', backgroundSize: '400px' }} />

        {selectedChat ? (
          <>
            {/* Chat header */}
            <div style={{
              height: 60, padding: '0 16px',
              background: 'var(--surface-header)', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1,
              position: 'relative',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={getChatName(selectedChat)} size={40} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{getChatName(selectedChat)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>click here for contact info</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <IconBtn icon={Video} />
                <IconBtn icon={Search} />
                <IconBtn icon={MoreVertical} onClick={() => setChatMenu(v => !v)} />
              </div>
              {chatMenu && (
                <DropdownMenu items={chatMenuItems} onClose={() => setChatMenu(false)} />
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, padding: '16px 6%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, zIndex: 1 }}>
              {loadingMessages && messages.length === 0 && (
                <div style={{ alignSelf: 'center', background: 'var(--surface-header)', padding: '6px 14px', borderRadius: 8, fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Loader2 className="animate-spin" size={12} /> Loading messages…
                </div>
              )}

              {messages.map((msg, i) => {
                const isMe = msg.key?.fromMe
                const text = getMsgText(msg)
                if (!text) return null
                const isOptimistic = msg.key?.id?.startsWith('opt-')

                return (
                  <div key={msg.key?.id || i} style={{
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '65%',
                    padding: '6px 9px 8px',
                    borderRadius: 8,
                    borderTopRightRadius: isMe && i === messages.length - 1 ? 2 : 8,
                    borderTopLeftRadius: !isMe && i === 0 ? 2 : 8,
                    background: isMe ? 'var(--bubble-out)' : 'var(--bubble-in)',
                    boxShadow: 'var(--shadow)',
                    opacity: isOptimistic ? 0.7 : 1,
                    transition: 'opacity 0.3s',
                  }}>
                    <span style={{ fontSize: 14.2, color: 'var(--text)', lineHeight: '19px', display: 'block', paddingRight: isMe ? 48 : 28 }}>{text}</span>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>
                        {fmtTime(msg.messageTimestamp)}
                      </span>
                      {isMe && <CheckCheck size={14} color={isOptimistic ? 'var(--muted)' : '#53BDEB'} />}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <form onSubmit={handleSend} style={{
              padding: '10px 16px',
              background: 'var(--surface-header)', borderTop: '1px solid var(--border)',
              display: 'flex', gap: 14, alignItems: 'center', zIndex: 1,
            }}>
              <div style={{ display: 'flex', gap: 14, color: 'var(--text-muted)' }}>
                <IconBtn icon={Smile} />
                <IconBtn icon={Paperclip} />
              </div>
              <input
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Type a message"
                disabled={sending}
                style={{ flex: 1, padding: '9px 14px', borderRadius: 24, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 15, color: 'var(--text)', outline: 'none' }}
              />
              <button type="submit" disabled={!messageText.trim() || sending}
                style={{ background: 'none', border: 'none', cursor: messageText.trim() ? 'pointer' : 'default', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center' }}>
                {sending
                  ? <Loader2 className="animate-spin" size={22} color="var(--accent)" />
                  : messageText
                    ? <SendIcon size={22} color="var(--accent)" />
                    : <Mic size={22} />
                }
              </button>
            </form>
          </>
        ) : (
          /* Empty state */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', zIndex: 1 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 28, borderRadius: '50%', marginBottom: 24 }}>
              <Smartphone size={52} color="var(--accent)" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 26, margin: '0 0 10px', color: 'var(--text)', fontWeight: 300, fontFamily: 'Syne' }}>WhatsApp Web</p>
            <p style={{ opacity: 0.7, maxWidth: 340, textAlign: 'center', lineHeight: 1.6, fontSize: 14 }}>
              {instances.length === 0
                ? 'Connect a WhatsApp instance first to see your chats.'
                : 'Select a conversation from the left to start messaging.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Small reusable icon button
function IconBtn({ icon: Icon, onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <Icon size={20} />
    </button>
  )
}
