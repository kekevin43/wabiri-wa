import { useState, useEffect, useRef } from 'react'
import { Search, MoreVertical, CheckCheck, Paperclip, Smile, Mic, Video, Loader2, Smartphone, Send as SendIcon } from 'lucide-react'
import { evolution } from '../../lib/evolution'
import { Badge } from '../../components/ui'

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
  
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 1. Fetch connected instances on mount
  useEffect(() => {
    evolution.listInstances().then(res => {
      const list = Array.isArray(res) ? res : (res?.instances || [])
      const connected = list.map(i => i.instance || i).filter(i => i.state === 'open' || i.status === 'CONNECTED')
      setInstances(connected)
      if (connected.length > 0) setActiveInstance(connected[0].instanceName)
    }).catch(console.error)
  }, [])

  // 2. Fetch chats when active instance changes
  useEffect(() => {
    if (!activeInstance) return
    setLoadingChats(true)
    const fetchChats = () => {
      evolution.findChats(activeInstance).then(data => {
        let chatList = Array.isArray(data) ? data : (data?.data || data?.chats || [])
        // Ensure remoteJid exists
        chatList = chatList.filter(c => c.remoteJid || c.id)
        // Sort by timestamp
        chatList.sort((a,b) => (b.conversationTimestamp || 0) - (a.conversationTimestamp || 0))
        setChats(chatList)
        setLoadingChats(false)
      }).catch((e) => {
        console.error("Chat fetch err", e)
        setLoadingChats(false)
      })
    }
    fetchChats()
    const timer = setInterval(fetchChats, 8000)
    return () => clearInterval(timer)
  }, [activeInstance])

  // 3. Fetch messages when a chat is selected
  useEffect(() => {
    if (!activeInstance || !selectedChat) {
      setMessages([])
      return
    }
    setLoadingMessages(true)
    const fetchMessages = () => {
      const jid = selectedChat.remoteJid || selectedChat.id
      evolution.findMessages(activeInstance, jid).then(data => {
        const msgList = Array.isArray(data) ? data : (data?.data || data?.messages || [])
        msgList.sort((a,b) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0))
        setMessages(msgList)
        setLoadingMessages(false)
      }).catch((e) => {
        console.error("Message fetch err", e)
        setLoadingMessages(false)
      })
    }
    fetchMessages()
    const timer = setInterval(fetchMessages, 4000)
    return () => clearInterval(timer)
  }, [selectedChat, activeInstance])

  const handleSend = async (e) => {
    e?.preventDefault()
    if (!messageText.trim() || !activeInstance || !selectedChat || sending) return
    
    const jid = selectedChat.remoteJid || selectedChat.id
    setSending(true)
    try {
      await evolution.sendMessage(activeInstance, jid, messageText)
      
      // Optimistically add message to UI
      const newMsg = {
        key: { fromMe: true, id: Date.now().toString() },
        message: { conversation: messageText },
        pushName: 'Me',
        messageTimestamp: Math.floor(Date.now() / 1000)
      }
      setMessages(prev => [...prev, newMsg])
      
      // Update the chat list preview optimistically
      setChats(prev => {
        const copy = [...prev]
        const idx = copy.findIndex(c => (c.remoteJid || c.id) === jid)
        if (idx !== -1) {
           // Create new copy of chat to trigger re-render
           const chatCopy = { ...copy[idx] }
           // Try to find the most common fields Evolution uses to store the last message
           chatCopy.conversationTimestamp = newMsg.messageTimestamp
           chatCopy.lastMsg = messageText // Fallback custom property for UI rendering
           // Move to top
           copy.splice(idx, 1)
           copy.unshift(chatCopy)
        }
        return copy
      })
      
      setMessageText('')
    } catch (err) {
      alert("Failed to send: " + err.message)
    } finally {
      setSending(false)
    }
  }

  // --- Helpers ---
  const formatTime = (ts) => {
    if (!ts) return ''
    // Handle both seconds and milliseconds depending on API version
    const timestamp = ts > 1000000000000 ? ts : ts * 1000
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getMessageText = (msg) => {
    if (!msg || !msg.message) return ''
    const m = msg.message
    return m.conversation || m.extendedTextMessage?.text || (m.imageMessage?.caption ? '📷 Photo' : '💬 Message')
  }

  const getChatPreview = (chat) => {
    // Some versions put the last message object directly on the chat, others use properties
    if (chat.lastMsg) return chat.lastMsg // our optimistic flag
    if (chat.lastMessage) return getMessageText({ message: chat.lastMessage })
    if (chat.conversation) return chat.conversation 
    return 'Tap to view conversation'
  }

  const getChatName = (chat) => {
     return chat.pushName || chat.name || chat.remoteJid?.split('@')[0] || chat.id?.split('@')[0] || 'Unknown'
  }

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--surface2)' }}>
      {/* Left Pane: Chat List */}
      <div style={{ 
        width: '30%', minWidth: 320, maxWidth: 420, 
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', 
        background: 'var(--surface)' 
      }}>
        {/* Header */}
        <div style={{ 
          height: 60, padding: '10px 16px', background: 'var(--surface-header)', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid var(--border)'
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text)' }}>WhatsApp</h1>
          <div style={{ display: 'flex', gap: 16, color: 'var(--text-muted)' }}>
             <MoreVertical size={20} style={{ cursor: 'pointer' }} />
          </div>
        </div>
        
        {/* Instance Selector */}
        {instances.length > 1 && (
          <div style={{ padding: '8px 12px', background: 'rgba(59,130,246,0.05)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
             <Smartphone size={16} color="var(--accent)" />
             <select 
                value={activeInstance || ''} 
                onChange={e => { setActiveInstance(e.target.value); setSelectedChat(null); }}
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', fontWeight: 600 }}
             >
               {instances.map(i => <option key={i.instanceName} value={i.instanceName}>{i.instanceName}</option>)}
             </select>
          </div>
        )}

        {/* Search */}
        <div style={{ padding: '8px 12px', background: 'var(--surface)' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={18} color="var(--text-muted)" />
            </div>
            <input 
              placeholder="Search or start new chat" 
              style={{ 
                width: '100%', padding: '8px 12px 8px 46px', borderRadius: 8, border: 'none',
                background: 'var(--surface2)', fontSize: 15, color: 'var(--text)', outline: 'none'
              }} 
            />
          </div>
        </div>
        
        {/* Chat List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {instances.length === 0 ? (
             <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
               No connected instances.<br/>Go to Instances to connect WhatsApp.
             </div>
          ) : loadingChats && chats.length === 0 ? (
             <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 12px' }} />
                Fetching WhatsApp chats...
             </div>
          ) : chats.length === 0 ? (
             <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
                No active chats found on {activeInstance}.
             </div>
          ) : (
            chats.map(chat => {
              const jid = chat.remoteJid || chat.id
              const isSelected = selectedChat && (selectedChat.remoteJid || selectedChat.id) === jid
              return (
                <div 
                  key={jid}
                  onClick={() => setSelectedChat(chat)}
                  style={{
                    display: 'flex', cursor: 'pointer',
                    background: isSelected ? 'var(--surface2)' : 'transparent',
                  }}
                >
                  <div style={{ padding: '0 12px 0 12px', display: 'flex', alignItems: 'center' }}>
                    <div style={{ 
                       width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-glow)', 
                       display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 700 
                    }}>
                       {getChatName(chat).charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div style={{ 
                    flex: 1, padding: '12px 16px 12px 0', borderBottom: '1px solid var(--border-strong)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 16, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                         {getChatName(chat)}
                      </span>
                      <span style={{ fontSize: 12, color: chat.unreadCount > 0 ? 'var(--accent)' : 'var(--text-muted)', marginTop: 2 }}>
                         {formatTime(chat.conversationTimestamp)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                         {getChatPreview(chat)}
                      </p>
                      {chat.unreadCount > 0 && (
                        <div style={{ background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '0 6px', minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
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

      {/* Right Pane: Chat Window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* WhatsApp Background Pattern */}
        <div style={{ 
           position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none',
           backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")',
           backgroundRepeat: 'repeat', backgroundSize: '400px'
        }} />

        {selectedChat ? (
          <>
            {/* Header */}
            <div style={{ 
              height: 60, padding: '10px 16px', background: 'var(--surface-header)', 
              borderLeft: '1px solid var(--border-strong)', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ 
                   width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-glow)', 
                   display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 700 
                }}>
                   {getChatName(selectedChat).charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 16, color: 'var(--text)' }}>{getChatName(selectedChat)}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tap here for contact info</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, color: 'var(--text-muted)' }}>
                <Video size={20} style={{ cursor: 'pointer' }} />
                <Search size={20} style={{ cursor: 'pointer' }} />
                <MoreVertical size={20} style={{ cursor: 'pointer' }} />
              </div>
            </div>

            {/* Messages Body */}
            <div style={{ flex: 1, padding: '20px 6%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 1 }}>
              
              {loadingMessages && messages.length === 0 && (
                 <div style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-header)', padding: '6px 12px', borderRadius: 8, fontSize: 12.5, color: 'var(--text-muted)', boxShadow: 'var(--shadow)' }}>
                    <Loader2 className="animate-spin" size={14} /> Loading messages...
                 </div>
              )}
              
              {messages.map((msg, i) => {
                const isMe = msg.key?.fromMe
                const text = getMessageText(msg)
                if (!text) return null; // Skip system messages or unknown types for now
                
                return (
                  <div key={msg.key?.id || i} style={{
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '65%',
                    padding: '6px 7px 8px 9px',
                    borderRadius: 8,
                    borderTopRightRadius: isMe ? (i === messages.length - 1 ? 0 : 8) : 8,
                    borderTopLeftRadius: !isMe && i === 0 ? 0 : 8,
                    background: isMe ? 'var(--bubble-out)' : 'var(--bubble-in)',
                    boxShadow: 'var(--shadow)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <span style={{ fontSize: 14.2, color: 'var(--text)', lineHeight: '19px', paddingRight: isMe ? 50 : 30 }}>{text}</span>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: -10, float: 'right' }}>
                      <span style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                        {formatTime(msg.messageTimestamp)}
                      </span>
                      {isMe && <CheckCheck size={15} color="#53BDEB" />}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer: Input Area */}
            <form onSubmit={handleSend} style={{ 
              padding: '10px 16px', background: 'var(--surface-header)', 
              borderLeft: '1px solid var(--border-strong)', borderTop: '1px solid var(--border)',
              display: 'flex', gap: 16, alignItems: 'center', zIndex: 1
            }}>
              <div style={{ display: 'flex', gap: 16, color: 'var(--text-muted)' }}>
                  <Smile size={24} style={{ cursor: 'pointer' }} />
                  <Paperclip size={24} style={{ cursor: 'pointer' }} />
              </div>
              
              <input 
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Type a message" 
                  disabled={sending}
                  style={{ 
                    flex: 1, padding: '9px 12px', borderRadius: 8, border: 'none', 
                    background: 'var(--surface)', fontSize: 15, color: 'var(--text)', outline: 'none',
                    opacity: sending ? 0.7 : 1
                  }}
              />
              
              <div style={{ color: 'var(--text-muted)' }}>
                {messageText ? (
                   <button type="submit" disabled={sending} style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer' }}>
                     {sending ? <Loader2 className="animate-spin" size={24} color="var(--accent)" /> : <SendIcon size={24} color="var(--accent)" />}
                   </button>
                ) : (
                   <Mic size={24} style={{ cursor: 'pointer' }} />
                )}
              </div>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', zIndex: 1, fontSize: 15 }}>
             <div style={{ background: 'var(--surface-header)', padding: 24, borderRadius: '50%', marginBottom: 20 }}>
               <Smartphone size={48} color="var(--accent)" />
             </div>
             <p style={{ fontSize: 24, margin: '0 0 10px', color: 'var(--text)', fontWeight: 300 }}>WhatsApp Web for Wabiri</p>
             <p style={{ opacity: 0.8, maxWidth: 360, textAlign: 'center', lineHeight: 1.5 }}>
               Seamlessly sync your WhatsApp chats directly from your connected instance. 
               Select a chat to start messaging instantly.
             </p>
          </div>
        )}
      </div>
    </div>
  )
}
