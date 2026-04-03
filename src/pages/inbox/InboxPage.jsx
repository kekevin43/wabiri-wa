import { useState } from 'react'
import { Search, MoreVertical, CheckCheck, Paperclip, Smile, Mic, Phone, Video } from 'lucide-react'

const MOCK_CHATS = [
  { id: 1, name: 'John Doe', lastMsg: 'Is the property in Ruaka still available?', time: '10:24 AM', unread: 2, online: true, avatar: 'https://i.pravatar.cc/150?u=1' },
  { id: 2, name: 'Jane Smith', lastMsg: 'Thank you for the details!', time: 'Yesterday', unread: 0, online: false, avatar: 'https://i.pravatar.cc/150?u=2' },
  { id: 3, name: 'Robert Kamau', lastMsg: 'I want to schedule a viewing.', time: 'Yesterday', unread: 0, online: true, avatar: 'https://i.pravatar.cc/150?u=3' },
  { id: 4, name: 'Alice Mwangi', lastMsg: 'Can you send the contract?', time: 'Tuesday', unread: 1, online: false, avatar: 'https://i.pravatar.cc/150?u=4' },
]

const MOCK_MESSAGES = [
  { id: 1, text: 'Hello, I saw your listing for the 3-bedroom house in Ruaka.', time: '10:20 AM', sent: false },
  { id: 2, text: 'Hi John! Yes, it is still available. Would you like more details or a site visit?', time: '10:22 AM', sent: true },
  { id: 3, text: 'Is the property in Ruaka still available?', time: '10:24 AM', sent: false },
]

export default function InboxPage() {
  const [selectedChat, setSelectedChat] = useState(MOCK_CHATS[0])
  const [message, setMessage] = useState('')

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--surface2)' }}>
      {/* Left Pane: Chat List */}
      <div style={{ 
        width: '30%', minWidth: 300, maxWidth: 420, 
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
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text)' }}>Chats</h1>
          <div style={{ display: 'flex', gap: 16, color: 'var(--text-muted)' }}>
             <MoreVertical size={20} style={{ cursor: 'pointer' }} />
          </div>
        </div>
        
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
          {MOCK_CHATS.map(chat => (
            <div 
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              style={{
                display: 'flex', cursor: 'pointer',
                background: selectedChat.id === chat.id ? 'var(--surface2)' : 'transparent',
              }}
            >
              <div style={{ padding: '0 12px 0 12px', display: 'flex', alignItems: 'center' }}>
                 <img src={chat.avatar} alt={chat.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
              </div>
              <div style={{ 
                flex: 1, padding: '12px 16px 12px 0', borderBottom: '1px solid var(--border-strong)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 16, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.name}</span>
                  <span style={{ fontSize: 12, color: chat.unread > 0 ? 'var(--accent)' : 'var(--text-muted)', marginTop: 2 }}>{chat.time}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.lastMsg}</p>
                  {chat.unread > 0 && <div style={{ background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '0 6px', minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>{chat.unread}</div>}
                </div>
              </div>
            </div>
          ))}
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

        {/* Header */}
        <div style={{ 
          height: 60, padding: '10px 16px', background: 'var(--surface-header)', 
          borderLeft: '1px solid var(--border-strong)', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <img src={selectedChat.avatar} alt={selectedChat.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
             <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 16, color: 'var(--text)' }}>{selectedChat.name}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedChat.online ? 'online' : 'click here for contact info'}</span>
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
          <div style={{ alignSelf: 'center', background: 'var(--surface-header)', padding: '6px 12px', borderRadius: 8, fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12, boxShadow: 'var(--shadow)' }}>
            TODAY
          </div>
          
          {MOCK_MESSAGES.map((msg, i) => (
            <div key={msg.id} style={{
              alignSelf: msg.sent ? 'flex-end' : 'flex-start',
              maxWidth: '65%',
              padding: '6px 7px 8px 9px',
              borderRadius: 8,
              borderTopRightRadius: msg.sent ? (i === MOCK_MESSAGES.length - 1 ? 0 : 8) : 8,
              borderTopLeftRadius: !msg.sent && i === 0 ? 0 : 8,
              background: msg.sent ? 'var(--bubble-out)' : 'var(--bubble-in)',
              boxShadow: 'var(--shadow)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <span style={{ fontSize: 14.2, color: 'var(--text)', lineHeight: '19px', paddingRight: msg.sent ? 50 : 30 }}>{msg.text}</span>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: -10, float: 'right' }}>
                <span style={{ fontSize: 11, color: msg.sent ? 'var(--accent)' : 'var(--text-muted)' }}>{msg.time}</span>
                {msg.sent && <CheckCheck size={15} color="#53BDEB" />}
              </div>
            </div>
          ))}
        </div>

        {/* Footer: Input Area */}
        <div style={{ 
          padding: '10px 16px', background: 'var(--surface-header)', 
          borderLeft: '1px solid var(--border-strong)', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 16, alignItems: 'center', zIndex: 1
        }}>
           <div style={{ display: 'flex', gap: 16, color: 'var(--text-muted)' }}>
              <Smile size={24} style={{ cursor: 'pointer' }} />
              <Paperclip size={24} style={{ cursor: 'pointer' }} />
           </div>
           
           <input 
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type a message" 
              style={{ 
                flex: 1, padding: '9px 12px', borderRadius: 8, border: 'none', 
                background: 'var(--surface)', fontSize: 15, color: 'var(--text)', outline: 'none' 
              }}
           />
           
           <div style={{ color: 'var(--text-muted)' }}>
             {message ? <CheckCheck size={24} color="var(--accent)" style={{ cursor: 'pointer' }} /> : <Mic size={24} style={{ cursor: 'pointer' }} />}
           </div>
        </div>
      </div>
    </div>
  )
}

