import React, { useState } from 'react';
import { api } from '../services/api';
import { Star, X } from 'lucide-react';

interface RatingDialogProps {
  rideId: string;
  captainName: string;
  onClose: () => void;
}

export const RatingDialog: React.FC<RatingDialogProps> = ({ rideId, captainName, onClose }) => {
  const [score, setScore] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.support.submitRating(rideId, score, feedback);
      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e) {
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-xl font-bold">
              ✓
            </div>
            <h4 className="font-extrabold text-slate-900 mt-3">Thank you!</h4>
            <p className="text-xs text-slate-500 mt-1">Your feedback helps improve VeloGo rides.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="text-center space-y-4">
            <h3 className="font-black text-xl text-slate-900">How was your ride?</h3>
            <p className="text-xs text-slate-500">Rate your experience with Captain {captainName}</p>

            {/* Stars */}
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setScore(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= score
                        ? 'fill-amber-400 text-amber-500'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us what you liked (clean helmet, safe driving, punctuality)..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold py-2.5 rounded-xl shadow-glow text-sm transition-all"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
