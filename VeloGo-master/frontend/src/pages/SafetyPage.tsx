import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SupportTicket } from '../types';
import {
  Shield,
  PhoneCall,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  Send,
  MessageSquare,
} from 'lucide-react';

export const SafetyPage: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('SAFETY');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      api.support
        .getMyTickets()
        .then(setTickets)
        .catch(() => {});
    }
  }, [user]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to submit a support ticket');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await api.support.createTicket({
        subject,
        category,
        description,
      });
      setTickets([created, ...tickets]);
      setSubject('');
      setDescription('');
      setTicketSuccess(true);
      setTimeout(() => setTicketSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Safety Center & Help Desk
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Your safety is our non-negotiable priority. Find guidelines, emergency protocols, and 24x7 resolution support.
        </p>
      </div>

      {/* Emergency Contacts Banner */}
      <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <span className="text-[10px] font-black uppercase tracking-wider bg-red-600 text-white px-2.5 py-0.5 rounded-full">
            24X7 EMERGENCY SOS
          </span>
          <h3 className="text-xl font-black text-red-950 mt-1">
            Need urgent emergency assistance?
          </h3>
          <p className="text-xs text-red-800">
            For critical physical safety incidents or medical accidents, reach national emergency helplines immediately.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="tel:112"
            className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-5 py-3 rounded-xl text-sm flex items-center gap-2 shadow-md transition-colors"
          >
            <PhoneCall className="w-4 h-4" /> Call 112 (Police)
          </a>
          <a
            href="tel:108"
            className="bg-white border border-red-300 hover:bg-red-100 text-red-900 font-extrabold px-5 py-3 rounded-xl text-sm flex items-center gap-2 transition-colors"
          >
            <PhoneCall className="w-4 h-4" /> Call 108 (Ambulance)
          </a>
        </div>
      </div>

      {/* Safety Guidelines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            1
          </div>
          <h4 className="font-extrabold text-base text-slate-900">Verify Vehicle Plate</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Always match the captain's license plate number shown on your screen with the actual vehicle before boarding.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            2
          </div>
          <h4 className="font-extrabold text-base text-slate-900">Always Wear Helmet</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every VeloGo bike captain provides a sanitized rider helmet. Fasten the strap properly throughout the trip.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            3
          </div>
          <h4 className="font-extrabold text-base text-slate-900">Never Share OTP Early</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Only provide your 4-digit ride OTP once your captain has arrived and you are ready to begin the journey.
          </p>
        </div>
      </div>

      {/* Submit Support Ticket Form & Ticket History */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Support Ticket Form */}
        <div className="md:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-600" />
            <h3 className="font-extrabold text-lg text-slate-900">Raise a Support Ticket</h3>
          </div>
          <p className="text-xs text-slate-500">
            Have a question about a ride fare, driver behavior, lost property, or platform feedback?
          </p>

          {ticketSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
              ✓ Ticket submitted! Our support team will respond shortly.
            </div>
          )}

          <form onSubmit={handleSubmitTicket} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-600 block mb-1">Issue Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
              >
                <option value="SAFETY">Safety or Driver Behavior</option>
                <option value="BILLING">Billing / Fare Dispute</option>
                <option value="RIDE_EXPERIENCE">Ride Experience / Cleanliness</option>
                <option value="OTHER">Other Query / Feedback</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-600 block mb-1">Subject</label>
              <input
                type="text"
                required
                placeholder="Brief summary of issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-600 block mb-1">Description</label>
              <textarea
                rows={4}
                required
                placeholder="Describe what happened in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" /> {isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}
            </button>
          </form>
        </div>

        {/* Existing User Tickets */}
        <div className="md:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-lg text-slate-900">Your Support Tickets</h3>
          {tickets.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No support tickets raised yet.
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div key={t.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{t.subject}</span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        t.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <p className="text-slate-600">{t.description}</p>
                  {t.adminResponse && (
                    <div className="mt-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-medium">
                      <strong>Admin Response:</strong> {t.adminResponse}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 pt-1">{t.createdAt}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
