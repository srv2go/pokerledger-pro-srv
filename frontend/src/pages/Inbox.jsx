import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../services/api';
import { Card, Button, EmptyState, LoadingScreen } from '../components/ui';
import { BottomNav } from './Dashboard';
import { fmtTime } from '../hooks';
import { Inbox, Mail, MailOpen, CheckCheck } from 'lucide-react';

export default function InboxPage() {
  const nav = useNavigate();
  const { isHost } = useAuth();
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const d = await notificationsApi.getInbox(); setMessages(d.messages); setUnread(d.unreadCount); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await notificationsApi.markRead(id);
    setMessages(messages.map(m => m.id === id ? { ...m, isRead: true } : m));
    setUnread(Math.max(0, unread - 1));
  };

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setMessages(messages.map(m => ({ ...m, isRead: true })));
    setUnread(0);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[var(--color-gray-50)] pb-28">
      <header className="sticky-header px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Inbox</h1>
            {unread > 0 && <p className="text-xs text-brand-600">{unread} unread</p>}
          </div>
          {unread > 0 && <Button size="sm" variant="ghost" onClick={markAllRead}><CheckCheck className="w-4 h-4" /> Read All</Button>}
        </div>
      </header>

      <main className="px-4 py-4 page-enter">
        {messages.length === 0 ? (
          <EmptyState icon={Inbox} title="No messages" description="Messages from games and reminders will appear here" />
        ) : (
          <div className="space-y-2">
            {messages.map(m => (
              <Card key={m.id} className={`p-4 cursor-pointer transition ${!m.isRead ? 'border-brand-200 bg-brand-50/60' : ''}`} onClick={() => !m.isRead && markRead(m.id)}>
                <div className="flex items-start gap-3">
                  {m.isRead ? <MailOpen className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" /> : <Mail className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${m.isRead ? 'text-gray-500' : 'text-[var(--color-text-primary)]'}`}>{m.title}</p>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{m.body}</p>
                    <p className="text-xs text-gray-600 mt-1">{fmtTime(m.createdAt)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BottomNav current="/inbox" navigate={nav} />
    </div>
  );
}
