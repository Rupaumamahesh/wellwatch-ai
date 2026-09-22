import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, Check } from "lucide-react";

const MOODS = [
  { value: 1, emoji: "😞", label: "Very low" },
  { value: 2, emoji: "🙁", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function CheckIn() {
  const navigate = useNavigate();

  const [mood, setMood] = useState(null);
  const [stress, setStress] = useState(50);
  const [energy, setEnergy] = useState(50);
  const [sleep, setSleep] = useState(50);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

  // Prevent duplicate check-ins on the same day
  useEffect(() => {
    const all = JSON.parse(localStorage.getItem("wellwatch_checkins") || "[]");
    const existing = all.find((c) => c.date === todayKey());
    if (existing) setAlreadyCheckedIn(true);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();

    if (mood === null) {
      setError("Please select how you're feeling today.");
      return;
    }

    setError("");

    const entry = {
      date: todayKey(),
      mood,
      stress,
      energy,
      sleep,
      comment: comment.trim(),
      timestamp: new Date().toISOString(),
    };

    // TODO: replace with a real API call, e.g. POST /api/checkin
    const all = JSON.parse(localStorage.getItem("wellwatch_checkins") || "[]");
    all.push(entry);
    localStorage.setItem("wellwatch_checkins", JSON.stringify(all));

    setSubmitted(true);
    setTimeout(() => navigate("/dashboard"), 1200);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to dashboard
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-slate-800 font-semibold">
            Daily wellness check-in
          </span>
        </div>

        {alreadyCheckedIn && !submitted ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-emerald-600" aria-hidden="true" />
            </div>
            <p className="text-slate-700 font-medium mb-1">
              You've already checked in today
            </p>
            <p className="text-sm text-slate-400 mb-5">
              Come back tomorrow for your next check-in.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-sm text-violet-600 hover:text-violet-700 font-medium"
            >
              Return to dashboard
            </button>
          </div>
        ) : submitted ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-emerald-600" aria-hidden="true" />
            </div>
            <p className="text-slate-700 font-medium">Check-in saved</p>
            <p className="text-sm text-slate-400 mt-1">
              Taking you back to your dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mood */}
            <div>
              <label className="block text-sm text-slate-600 mb-2">
                How are you feeling today?
              </label>
              <div className="flex justify-between">
                {MOODS.map((m) => (
                  <button
                    type="button"
                    key={m.value}
                    onClick={() => setMood(m.value)}
                    aria-label={m.label}
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all ${
                      mood === m.value
                        ? "bg-violet-100 ring-2 ring-violet-500 scale-110"
                        : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    {m.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <SliderField
              label="Stress level"
              value={stress}
              onChange={setStress}
              lowLabel="Low"
              highLabel="High"
            />
            <SliderField
              label="Energy level"
              value={energy}
              onChange={setEnergy}
              lowLabel="Low"
              highLabel="High"
            />
            <SliderField
              label="Sleep quality"
              value={sleep}
              onChange={setSleep}
              lowLabel="Poor"
              highLabel="Great"
            />

            {/* Comment */}
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Anything you'd like to add? (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share how your day's been going..."
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
            >
              Submit check-in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function SliderField({ label, value, onChange, lowLabel, highLabel }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-400">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-violet-600"
      />
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}