import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Moon, Save } from 'lucide-react';
import {
  getNotificationPreferenceSummary,
  NotificationPreference,
  readNotificationPreferences,
  requestBrowserNotificationPermission,
  saveNotificationPreferences,
  shouldAskForBrowserNotificationPermission,
} from './featureNotifications';

interface Props {
  userId: string;
  onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void;
}

const timeOptions = [
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00',
  '23:30', '00:00', '00:30', '01:00', '01:30', '02:00', '06:00',
  '06:30', '07:00', '07:30', '08:00',
];

export const FeatureNotificationSettings: React.FC<Props> = ({ userId, onNotice }) => {
  const [preferences, setPreferences] = useState<NotificationPreference>(() => readNotificationPreferences(userId));
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  });
  const [saved, setSaved] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    setPreferences(readNotificationPreferences(userId));
  }, [userId]);

  const update = <K extends keyof NotificationPreference>(key: K, value: NotificationPreference[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const save = () => {
    try {
      saveNotificationPreferences(userId, preferences);
      setSaved(true);
      onNotice('Notification preferences saved on this device.');
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'Could not save notification preferences.', 'error');
    }
  };

  const askPermission = async () => {
    setRequesting(true);
    try {
      const result = await requestBrowserNotificationPermission();
      setPermission(result);
      if (result === 'granted') onNotice('Browser notifications are allowed. Reminder delivery still depends on the app being open.', 'info');
      else if (result === 'denied') onNotice('Browser notifications are blocked in your browser settings.', 'error');
      else onNotice('Browser notifications are not supported here.', 'info');
    } finally {
      setRequesting(false);
    }
  };

  const summaries = getNotificationPreferenceSummary(preferences);
  const canAsk = shouldAskForBrowserNotificationPermission(preferences);

  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><Bell className="h-5 w-5" /></span>
        <div><h3 className="font-extrabold text-slate-900">Notification preferences</h3><p className="mt-1 text-xs leading-5 text-slate-500">Choose which local reminders and in-app notices you want to see.</p></div>
      </div>
      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${permission === 'granted' ? 'bg-emerald-50 text-emerald-700' : permission === 'denied' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>Browser: {permission}</span>
    </div>

    <div className="mt-5 space-y-4">
      <ToggleRow title="Enable notifications" detail="Master switch for this feature suite." checked={preferences.enabled} onChange={(value) => update('enabled', value)} />
      <ToggleRow title="Scheduled ride reminders" detail="Show a reminder before a saved plan's scheduled time." checked={preferences.scheduledRideReminders} onChange={(value) => update('scheduledRideReminders', value)} disabled={!preferences.enabled} />
      <div className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Reminder lead time</span><select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={preferences.reminderLeadMinutes} onChange={(event) => update('reminderLeadMinutes', Number(event.target.value))} disabled={!preferences.enabled || !preferences.scheduledRideReminders}><option value={0}>No reminder</option><option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={120}>2 hours</option><option value={1440}>1 day</option></select></label>
        <ToggleRow title="In-app notices" detail="Show saved and reminder messages in the feature suite." checked={preferences.showInAppNotices} onChange={(value) => update('showInAppNotices', value)} />
      </div>
      <div className="rounded-xl border border-slate-200 p-3">
        <ToggleRow title="Quiet hours" detail="Suppress reminders during the selected time window." checked={preferences.quietHoursEnabled} onChange={(value) => update('quietHoursEnabled', value)} />
        {preferences.quietHoursEnabled && <div className="mt-3 grid grid-cols-2 gap-3"><label className="block"><span className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Start</span><select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={preferences.quietHoursStart} onChange={(event) => update('quietHoursStart', event.target.value)}>{timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}</select></label><label className="block"><span className="mb-1 block text-[10px] font-bold uppercase text-slate-400">End</span><select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={preferences.quietHoursEnd} onChange={(event) => update('quietHoursEnd', event.target.value)}>{timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}</select></label></div>}
      </div>
    </div>

    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1">{summaries.map((summary) => <span key={summary} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">{summary}</span>)}</div>
      <div className="flex gap-2">{canAsk && <button onClick={askPermission} disabled={requesting} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-50">{requesting ? 'Requesting…' : 'Allow browser notices'}</button>}<button onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"><Save className="h-3.5 w-3.5" />{saved ? 'Saved' : 'Save preferences'}</button></div>
    </div>
    <p className="mt-3 text-[10px] leading-4 text-slate-400">Browser notifications are optional. This prototype does not run a background scheduler, so reminders are evaluated only while the application is open.</p>
  </section>;
};

const ToggleRow: React.FC<{ title: string; detail: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }> = ({ title, detail, checked, onChange, disabled = false }) => <label className={`flex items-start justify-between gap-4 ${disabled ? 'opacity-40' : 'cursor-pointer'}`}><span><span className="block text-sm font-bold text-slate-800">{title}</span><span className="mt-0.5 block text-xs text-slate-500">{detail}</span></span><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 accent-indigo-600" /></label>;
