'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [formData, setFormData] = useState({ fullName: '', email: '' });
  const [loading, setLoading]   = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [pwForm, setPwForm]     = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError]   = useState<string | null>(null);
  const [pwSaved, setPwSaved]   = useState(false);

  const [notifications, setNotifications] = useState({
    youtube:   false,
    instagram: false,
    tiktok:    false,
    linkedin:  false,
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved]   = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, notification_preferences')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setFormData({ fullName: profile.full_name ?? '', email: profile.email ?? '' });
        if (profile.notification_preferences) {
          setNotifications((prev) => ({ ...prev, ...profile.notification_preferences }));
        }
      }
    };
    load();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false);
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); setLoading(false); return; }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: formData.fullName, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) setError(updateError.message);
    else setSaved(true);
    setLoading(false);
  };

  const handlePasswordChange = async () => {
    setPwError(null);
    setPwSaved(false);
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match'); return; }
    if (pwForm.next.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setPwLoading(true);
    const supabase = createClient();
    const { error: pwErr } = await supabase.auth.updateUser({ password: pwForm.next });
    if (pwErr) setPwError(pwErr.message);
    else { setPwSaved(true); setPwForm({ current: '', next: '', confirm: '' }); }
    setPwLoading(false);
  };

  const handleNotificationToggle = useCallback(async (key: keyof typeof notifications) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    setNotifSaving(true);
    setNotifSaved(false);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ notification_preferences: updated, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        setNotifSaved(true);
        setTimeout(() => setNotifSaved(false), 2000);
      }
    } catch (err) {
      console.error('Failed to save notification preference:', err);
    } finally {
      setNotifSaving(false);
    }
  }, [notifications]);

  const notificationItems = [
    { key: 'youtube'   as const, label: 'YouTube notifications' },
    { key: 'instagram' as const, label: 'Instagram alerts' },
    { key: 'tiktok'    as const, label: 'TikTok updates' },
    { key: 'linkedin'  as const, label: 'LinkedIn updates' },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-black">Settings</h1>
        <p className="text-slate-600">Manage your Flow-Media account preferences</p>
      </div>

      <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 bg-white">
          <h2 className="text-lg font-semibold text-black mb-1">Account</h2>
          <p className="text-sm text-slate-500 mb-4">Your profile and contact information</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Full name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                readOnly
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed here</p>
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {saved && <p className="mt-2 text-sm text-green-600">Saved successfully</p>}
          <button
            className="mt-4 px-4 py-2 bg-brand-purple text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="p-6 bg-white">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-lg font-semibold text-black">Platform Connections</h2>
            {notifSaving && <span className="text-xs text-slate-400">Saving…</span>}
            {notifSaved  && <span className="text-xs text-green-600">Saved</span>}
          </div>
          <p className="text-sm text-slate-500 mb-4">Manage social platform notification preferences</p>
          <div className="space-y-3">
            {notificationItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{item.label}</span>
                <button
                  onClick={() => handleNotificationToggle(item.key)}
                  disabled={notifSaving}
                  role="switch"
                  aria-checked={notifications[item.key]}
                  aria-label={`Toggle ${item.label}`}
                  className={`w-10 h-6 rounded-full relative transition-colors duration-200 disabled:opacity-60 ${notifications[item.key] ? 'bg-brand-purple' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${notifications[item.key] ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-white">
          <h2 className="text-lg font-semibold text-black mb-1">Change Password</h2>
          <p className="text-sm text-slate-500 mb-4">Update your account password</p>
          <div className="space-y-3">
            {(['current','next','confirm'] as const).map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-black mb-1">
                  {field === 'current' ? 'Current password' : field === 'next' ? 'New password' : 'Confirm new password'}
                </label>
                <input
                  type="password"
                  value={pwForm[field]}
                  onChange={e => { setPwSaved(false); setPwForm(prev => ({ ...prev, [field]: e.target.value })); }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
                />
              </div>
            ))}
          </div>
          {pwError && <p className="mt-2 text-sm text-red-600">{pwError}</p>}
          {pwSaved && <p className="mt-2 text-sm text-green-600">Password updated</p>}
          <button
            onClick={handlePasswordChange}
            disabled={pwLoading}
            className="mt-4 px-4 py-2 bg-brand-purple text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {pwLoading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
