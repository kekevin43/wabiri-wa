import { useState, useEffect } from 'react'
import { Search, User, Send, Phone, MoreVertical, CheckCheck } from 'lucide-react'
import { Card, Input } from '../../components/ui'

const MOCK_CHATS = [
  { id: 1, name: 'John Doe', lastMsg: 'Is the property in Ruaka still available?', time: '10:24 AM', unread: 2, online: true },
  { id: 2, name: 'Jane Smith', lastMsg: 'Thank you for the details!', time: 'Yesterday', unread: 0, online: false },
  { id: 3, name: 'Robert Kamau', lastMsg: 'I want to schedule a viewing.', time: 'Yesterday', unread: 0, online: true },
]

const MOCK_MESSAGES = [
  { id: 1, text: 'Hello, I saw your listing for the 3-bedroom house in Ruaka.', time: '10:20 AM', sent: false },
  { id: 2, text: 'Hi! Yes, it is still available. Would you like more details?', time: '10:22 AM', sent: true },
  { id: 3, text: 'Is the property in Ruaka still available?', time: '10:24 AM', sent: false },
]

export default function InboxPage() {
  const [selectedChat, setSelectedChat] = useState(MOCK_CHATS[0])
  const [message, setMessage] = useState('')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: 'calc(100vh - 100px)', gap: 0, margin: '-32px -36px', borderTop: '1px solid var(--border)' }}>
      {/* Sidebar: Chat List */}
      <div style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input 
              placeholder="Search chats..." 
              style={{ 
                width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg)', fontSize: 14, outline: 'none'
              }} 
            />
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {MOCK_CHATS.map(chat => (
            <div 
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              style={{
                padding: '16px 20px', display: 'flex', gap: 12, cursor: 'pointer',
                background: selectedChat.id === chat.id ? 'var(--accent-glow)' : 'transparent',
                borderBottom: '1px solid rgba(0,0,0,0.03)', transition: 'all 0.2s'
              }}
            >
              <div style={{ 
                width: 44, height: 44, borderRadius: '50%', background: 'var(--surface2)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
              }}>
                <User size={20} color="var(--muted)" />
                {chat.online && <div style={{ position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--surface)' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{chat.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{chat.time}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.lastMsg}</p>
                  {chat.unread > 0 && <div style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10 }}>{chat.unread}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main: Chat Window */}
      <div style={{ display: 'flex', flexDirection: 'column', background: '#F0F2F5' }}>
        {/* Header */}
        <div style={{ padding: '12px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={20} color="var(--muted)" />
             </div>
             <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{selectedChat.name}</div>
                <div style={{ fontSize: 12, color: 'var(--accent)' }}>{selectedChat.online ? 'Online' : 'Offline'}</div>
             </div>
          </div>
          <div style={{ display: 'flex', gap: 16, color: 'var(--muted)' }}>
            <Phone size={20} style={{ cursor: 'pointer' }} />
            <Search size={20} style={{ cursor: 'pointer' }} />
            <MoreVertical size={20} style={{ cursor: 'pointer' }} />
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MOCK_MESSAGES.map(msg => (
            <div key={msg.id} style={{
              alignSelf: msg.sent ? 'flex-end' : 'flex-start',
              maxWidth: '70%',
              padding: '8px 12px',
              borderRadius: 12,
              background: msg.sent ? '#D9FDD3' : 'var(--surface)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              position: 'relative'
            }}>
              <div style={{ fontSize: 14, color: '#111', lineHeight: '1.4' }}>{msg.text}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>{msg.time}</span>
                {msg.sent && <CheckCheck size={14} color="#53BDEB" />}
              </div>
            </div>
          ))}
        </div>

        {/* Footer: Input */}
        <div style={{ padding: '16px 24px', background: 'var(--surface)', display: 'flex', gap: 12, alignItems: 'center' }}>
           <input 
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type a message..." 
              style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: 'none', background: 'var(--bg)', fontSize: 14, outline: 'none' }}
           />
           <div 
             style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
           >
             <Send size={20} color="#fff" />
           </div>
        </div>
      </div>
    </div>
  )
}
