import { useState } from 'react'
import { User, Plus, Search, Filter, MoreVertical, Tag as TagIcon, Mail, Phone, MapPin, Download } from 'lucide-react'
import { Card, Button, Badge, PageHeader, Input } from '../../components/ui'

const MOCK_CONTACTS = [
  { id: 1, name: 'John Doe', phone: '+254 712 345 678', tags: ['interested-ruaka', 'hot-lead'], lastActive: '2h ago' },
  { id: 2, name: 'Jane Smith', phone: '+254 722 987 654', tags: ['follow-up'], lastActive: '1d ago' },
  { id: 3, name: 'Robert Kamau', phone: '+254 733 111 222', tags: ['client'], lastActive: '3h ago' },
]

export default function ContactsPage() {
  const [contacts, setContacts] = useState(MOCK_CONTACTS)
  const [search, setSearch] = useState('')

  const downloadContacts = () => {
    const headers = ['Name', 'Phone', 'Tags', 'Last Active'];
    const csvData = contacts.map(c => [c.name, c.phone, c.tags.join(';'), c.lastActive]);
    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "wabiri_contacts_export.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <PageHeader
          title="Contacts"
          subtitle="Manage your leads and client relationships"
          style={{ marginBottom: 0 }}
        />
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="ghost" size="sm" onClick={downloadContacts}><Download size={16} /> Export CSV</Button>
          <Button size="sm"><Plus size={16} /> Add Contact</Button>
        </div>
      </div>

      <Card style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1, position: 'relative' }}>
             <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
             <input 
               value={search}
               onChange={e => setSearch(e.target.value)}
               placeholder="Search by name, phone or tag..." 
               style={{ 
                 width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8, border: '1px solid var(--border)',
                 background: 'var(--surface2)', fontSize: 14, outline: 'none'
               }} 
             />
          </div>
          <Button variant="ghost" size="sm"><Filter size={14} /> Filter</Button>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {contacts.map(contact => (
          <Card key={contact.id} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                 <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} color="var(--accent)" />
                 </div>
                 <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{contact.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'JetBrains Mono' }}>{contact.phone}</div>
                 </div>
              </div>
              <MoreVertical size={18} color="var(--muted)" style={{ cursor: 'pointer' }} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {contact.tags.map(tag => (
                <Badge key={tag} color="muted">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TagIcon size={10} /> {tag}
                  </span>
                </Badge>
              ))}
            </div>

            <div style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              paddingTop: 12, borderTop: '1px solid var(--border)',
              fontSize: 12, color: 'var(--muted)'
            }}>
              <span>Last Active: {contact.lastActive}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                 <div style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Phone size={14} />
                 </div>
                 <div style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Mail size={14} />
                 </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
