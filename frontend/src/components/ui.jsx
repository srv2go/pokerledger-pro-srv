import { X, Loader2 } from 'lucide-react';

export const Button = ({ children, variant = 'primary', size = 'md', loading, className = '', ...p }) => {
  const base = size === 'sm' ? 'btn-sm' : 'btn';
  const v = { primary: 'btn-primary', secondary: 'btn-secondary', danger: 'btn-danger', ghost: 'btn-ghost' }[variant] || 'btn-primary';
  return <button className={`${base} ${size !== 'sm' ? v : `btn ${v.replace('btn ', '')}`} ${className}`} disabled={loading || p.disabled} {...p}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}</button>;
};

export const Card = ({ children, className = '', ...p }) => <div className={`card ${className}`} {...p}>{children}</div>;

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const w = size === 'lg' ? 'max-w-lg' : size === 'xl' ? 'max-w-xl' : 'max-w-md';
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className={`relative w-full ${w} bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-800 animate-slide-up max-h-[85vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h3 className="font-bold text-lg text-white">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-800"><X className="w-5 h-5 text-gray-400" /></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export const Input = ({ label, error, className = '', ...p }) => (
  <div className={className}>
    {label && <label className="label">{label}</label>}
    <input className="input" {...p} />
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

export const Select = ({ label, options = [], className = '', ...p }) => (
  <div className={className}>
    {label && <label className="label">{label}</label>}
    <select className="input" {...p}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
  </div>
);

export const Avatar = ({ name = '', size = 'md' }) => {
  const s = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-lg' : 'w-10 h-10 text-sm';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['bg-felt-600', 'bg-blue-600', 'bg-purple-600', 'bg-amber-600', 'bg-rose-600', 'bg-cyan-600'];
  const c = colors[name.length % colors.length];
  return <div className={`${s} ${c} rounded-full flex items-center justify-center font-bold text-white shrink-0`}>{initials}</div>;
};

export const Badge = ({ children, variant = 'info' }) => {
  const v = { success: 'badge-success', warning: 'badge-warning', danger: 'badge-danger', info: 'badge-info' }[variant];
  return <span className={v}>{children}</span>;
};

export const StatCard = ({ label, value, icon: Icon, className = '' }) => (
  <Card className={`p-3 ${className}`}>
    {Icon && <Icon className="w-4 h-4 text-gray-500 mb-1" />}
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-lg font-bold text-white truncate">{value}</p>
  </Card>
);

export const LoadingScreen = ({ message = 'Loading...' }) => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center">
    <div className="text-center"><Loader2 className="w-8 h-8 text-felt-500 animate-spin mx-auto mb-3" /><p className="text-gray-400">{message}</p></div>
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="text-center py-8">
    {Icon && <Icon className="w-12 h-12 text-gray-600 mx-auto mb-3" />}
    <h3 className="font-semibold text-gray-300 mb-1">{title}</h3>
    {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
    {action}
  </div>
);

export const Toast = ({ toasts, remove }) => (
  <div className="fixed top-4 right-4 left-4 z-[100] space-y-2 pointer-events-none" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
    {toasts.map(t => (
      <div key={t.id} className={`p-3 rounded-xl text-sm font-medium animate-slide-up pointer-events-auto ${t.type === 'success' ? 'bg-felt-600 text-white' : t.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-200 border border-gray-700'}`} onClick={() => remove(t.id)}>
        {t.message}
      </div>
    ))}
  </div>
);

export const Tabs = ({ tabs, active, onChange }) => (
  <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
    {tabs.map(t => (
      <button key={t.value} onClick={() => onChange(t.value)}
        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${active === t.value ? 'bg-felt-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
        {t.label}
      </button>
    ))}
  </div>
);
