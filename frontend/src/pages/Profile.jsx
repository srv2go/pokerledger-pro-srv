import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { Card, Button, Input, Avatar, LoadingScreen } from '../components/ui';
import { ArrowLeft, User, Mail, Phone, LogOut, Edit2, Check, X } from 'lucide-react';

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        phone: user.phone || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updated = await authApi.updateProfile(formData);
      updateUser(updated.user);
      setSuccess('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      displayName: user?.displayName || '',
      phone: user?.phone || '',
      email: user?.email || '',
    });
    setEditing(false);
    setError('');
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login');
    }
  };

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-6">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="font-bold text-white">Profile</h1>
          <div className="w-9" /> {/* Spacer */}
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Profile Avatar */}
        <div className="flex flex-col items-center">
          <Avatar 
            name={user.displayName} 
            size="xl"
            className="mb-4"
          />
          <h2 className="text-xl font-bold text-white">{user.displayName}</h2>
          <p className="text-sm text-gray-400 capitalize">{user.role?.toLowerCase()}</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <Card className="bg-green-500/10 border-green-500/20">
            <p className="text-sm text-green-400">{success}</p>
          </Card>
        )}
        
        {error && (
          <Card className="bg-red-500/10 border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </Card>
        )}

        {/* Profile Info */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Personal Information</h3>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            ) : null}
          </div>

          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Display Name"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                icon={User}
                required
              />
              
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                icon={Mail}
                required
                disabled
                helpText="Email cannot be changed"
              />
              
              <Input
                label="Phone Number"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                icon={Phone}
                placeholder="+1 (555) 000-0000"
              />

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Display Name
                </label>
                <p className="text-white">{user.displayName}</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Email
                </label>
                <p className="text-white">{user.email}</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Phone Number
                </label>
                <p className="text-white">{user.phone || 'Not provided'}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Account Info */}
        <Card>
          <h3 className="font-semibold text-white mb-4">Account Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Account Type</span>
              <span className="text-white font-medium capitalize">
                {user.role?.toLowerCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Member Since</span>
              <span className="text-white">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Verified</span>
              <span className={user.isVerified ? "text-green-400" : "text-yellow-400"}>
                {user.isVerified ? 'Yes' : 'Pending'}
              </span>
            </div>
          </div>
        </Card>

        {/* Logout Button */}
        <Button
          variant="danger"
          onClick={handleLogout}
          className="w-full"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
