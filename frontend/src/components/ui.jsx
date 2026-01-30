import { useState, forwardRef } from 'react';
import { 
  X, Check, AlertCircle, Info, Loader2, ChevronDown, 
  User, DollarSign, Clock 
} from 'lucide-react';
import { formatCurrency } from '../hooks';

// Button Component
export const Button = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props 
}, ref) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      ref={ref}
      className={`btn ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
});

// Input Component
export const Input = forwardRef(({ 
  label, 
  error, 
  className = '',
  ...props 
}, ref) => (
  <div className="w-full">
    {label && <label className="input-label">{label}</label>}
    <input ref={ref} className={`input ${error ? 'border-red-500' : ''} ${className}`} {...props} />
    {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
  </div>
));

// Select Component
export const Select = forwardRef(({ 
  label, 
  options = [], 
  placeholder = 'Select...',
  className = '',
  ...props 
}, ref) => (
  <div className="w-full">
    {label && <label className="input-label">{label}</label>}
    <div className="relative">
      <select ref={ref} className={`input appearance-none pr-10 ${className}`} {...props}>
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
    </div>
  </div>
));

// Card Component
export const Card = ({ children, className = '', hover = false, ...props }) => (
  <div className={`card ${hover ? 'card-hover' : ''} ${className}`} {...props}>
    {children}
  </div>
);

// Modal Component
export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 animate-slide-up max-h-[90vh] overflow-hidden flex flex-col`}>
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

// Toast Component
export const Toast = ({ message, type = 'info', onClose }) => {
  const icons = {
    success: <Check className="w-5 h-5 text-felt-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
  };

  const styles = {
    success: 'toast-success',
    error: 'toast-error',
    info: 'toast-info',
  };

  return (
    <div className={`toast ${styles[type]}`}>
      <div className="flex items-center gap-3">
        {icons[type]}
        <p className="flex-1 text-sm font-medium">{message}</p>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// Toast Container
export const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 space-y-2">
    {toasts.map(toast => (
      <Toast
        key={toast.id}
        message={toast.message}
        type={toast.type}
        onClose={() => removeToast(toast.id)}
      />
    ))}
  </div>
);

// Avatar Component
export const Avatar = ({ name, url, size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-xl',
  };

  const initials = name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  if (url) {
    return (
      <img 
        src={url} 
        alt={name} 
        className={`${sizes[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div className={`avatar ${sizes[size]} ${className}`}>
      {initials}
    </div>
  );
};

// Badge Component
export const Badge = ({ children, variant = 'info', className = '' }) => {
  const variants = {
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
  };

  return (
    <span className={`badge ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// Player Row Component
export const PlayerRow = ({ 
  player, 
  gamePlayer, 
  onBuyIn, 
  onCashOut,
  isHost = false,
  showActions = true 
}) => {
  const balance = parseFloat(gamePlayer?.totalInvested || 0);
  const cashOut = parseFloat(gamePlayer?.cashOut || 0);
  const profit = cashOut > 0 ? cashOut - balance : 0;

  const statusColors = {
    ACTIVE: 'status-active',
    SITTING_OUT: 'status-away',
    ELIMINATED: 'status-offline',
    CASHED_OUT: 'status-offline',
    INVITED: 'status-away',
    CONFIRMED: 'status-active',
  };

  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar name={player.displayName} url={player.avatarUrl} />
          <span className={`absolute -bottom-0.5 -right-0.5 status-dot ${statusColors[gamePlayer?.status] || 'status-offline'}`} />
        </div>
        <div>
          <p className="font-medium text-white">{player.displayName}</p>
          <p className="text-xs text-gray-400 capitalize">
            {gamePlayer?.status?.toLowerCase().replace('_', ' ') || 'Invited'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="chip-amount text-white">{formatCurrency(balance)}</p>
          {cashOut > 0 && (
            <p className={`text-xs chip-amount ${profit >= 0 ? 'chip-positive' : 'chip-negative'}`}>
              {formatCurrency(profit, true)}
            </p>
          )}
        </div>
        
        {showActions && isHost && gamePlayer?.status === 'ACTIVE' && (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => onBuyIn?.(player.id)}>
              <DollarSign className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onCashOut?.(player.id)}>
              <Clock className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Empty State Component
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    {Icon && (
      <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-500" />
      </div>
    )}
    <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
    {description && <p className="text-gray-400 text-sm mb-4">{description}</p>}
    {action}
  </div>
);

// Loading Spinner
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`spinner ${sizes[size]} ${className}`} />
  );
};

// Loading Screen
export const LoadingScreen = ({ message = 'Loading...' }) => (
  <div className="min-h-screen flex flex-col items-center justify-center">
    <Spinner size="lg" />
    <p className="mt-4 text-gray-400">{message}</p>
  </div>
);

// Stat Card
export const StatCard = ({ label, value, icon: Icon, trend, className = '' }) => (
  <Card className={`p-4 ${className}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white mt-1 chip-amount">{value}</p>
        {trend && (
          <p className={`text-xs mt-1 ${trend > 0 ? 'text-felt-400' : 'text-red-400'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </p>
        )}
      </div>
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-felt-500/20 flex items-center justify-center">
          <Icon className="w-6 h-6 text-felt-400" />
        </div>
      )}
    </div>
  </Card>
);
