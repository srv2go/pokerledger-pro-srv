import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { automationsApi } from '../services/api';
import { useToast } from '../hooks';
import { Card, Button, Badge, Modal, Select, Input, Toast } from '../components/ui';
import { BottomNav } from './Dashboard';
import { Zap, AlarmClockCheck, BellRing, ArrowRightLeft } from 'lucide-react';

const presets = [
  { value: '2h_before', label: '2 hours before' },
  { value: '1h_before', label: '1 hour before' },
  { value: '30m_before', label: '30 minutes before' },
  { value: 'day_after', label: '1 day after' },
  { value: 'weekly_summary', label: 'Weekly summary (Mon 9am)' },
  { value: 'monthly_report', label: 'Monthly report' },
];

export default function AutomationsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await automationsApi.list();
        setAutomations(data.automations || []);
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const toggle = async (automation) => {
    try {
      await automationsApi.update(automation.id, { enabled: !automation.enabled });
      setAutomations(list => list.map(a => (a.id === automation.id ? { ...a, enabled: !a.enabled } : a)));
      toast.success(`${automation.name} ${automation.enabled ? 'paused' : 'enabled'}`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const saveSchedule = async (form) => {
    try {
      await automationsApi.update(editing.id, form);
      setAutomations(list => list.map(a => (a.id === editing.id ? { ...a, ...form } : a)));
      toast.success('Schedule updated');
      setEditing(null);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-gray-50)] pb-28">
      <header className="sticky-header px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--color-text-secondary)]">Workflow automation</p>
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Automations</h1>
          </div>
          <Button variant="secondary" onClick={() => navigate('/players')}>
            <ArrowRightLeft className="w-4 h-4" /> Player Overrides
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 page-enter">
        <div className="max-w-5xl mx-auto space-y-4">
          {(loading ? [] : automations).map(auto => (
            <Card key={auto.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">{auto.name}</span>
                    <Badge variant={auto.enabled ? 'success' : 'warning'}>{auto.enabled ? 'Enabled' : 'Paused'}</Badge>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{auto.description}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-2">Trigger: {auto.trigger}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">Schedule: {labelPreset(auto.schedule?.preset)}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">Channels: {(auto.channels || []).join(', ') || '—'}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(auto)}>
                    <AlarmClockCheck className="w-4 h-4" /> Schedule
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggle(auto)}>
                    {auto.enabled ? 'Pause' : 'Enable'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {!loading && automations.length === 0 && (
            <Card className="p-6 text-center">
              <Zap className="w-10 h-10 text-brand-500 mx-auto mb-3" />
              <p className="text-sm text-[var(--color-text-secondary)]">No automations configured yet. Use the API or admin console to seed workflows.</p>
            </Card>
          )}
        </div>
      </main>

      <BottomNav current="/settings" navigate={navigate} />
      <Toast toasts={toast.toasts} remove={toast.remove} />

      <AutomationModal automation={editing} onClose={() => setEditing(null)} onSave={saveSchedule} />
    </div>
  );
}

function labelPreset(value) {
  const option = presets.find(p => p.value === value);
  return option ? option.label : 'Custom';
}

function AutomationModal({ automation, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    preset: automation?.schedule?.preset || '2h_before',
    timezone: automation?.schedule?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    cronExpression: automation?.schedule?.cronExpression || '',
  }));

  useEffect(() => {
    setForm({
      preset: automation?.schedule?.preset || '2h_before',
      timezone: automation?.schedule?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      cronExpression: automation?.schedule?.cronExpression || '',
    });
  }, [automation]);

  if (!automation) return null;

  const submit = (e) => {
    e.preventDefault();
    onSave({ schedule: { ...form } });
  };

  return (
    <Modal isOpen={Boolean(automation)} onClose={onClose} title={`Schedule • ${automation.name}`} size="lg">
      <form onSubmit={submit} className="p-4 space-y-4">
        <Select label="Preset" value={form.preset} onChange={e => setForm({ ...form, preset: e.target.value })} options={presets} />
        <Input label="Timezone" value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })} placeholder="America/Los_Angeles" />
        <Input label="Cron Expression (optional)" value={form.cronExpression} onChange={e => setForm({ ...form, cronExpression: e.target.value })} placeholder="0 9 * * 1" />
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
