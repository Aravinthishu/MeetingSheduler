// MeetingForm.jsx
import { useState } from "react";
import {
  useTeams, useCreateMeeting, useUsers, useRooms,
} from "../hooks/useMeetings";
import Button from "./ui/Button";
import Input from "./ui/Input";
import {
  Calendar, Clock, Users, Type, AlignLeft,
  RefreshCw, UserCheck, MapPin, X,
} from "lucide-react";

export default function MeetingForm({ onSuccess }) {
  const { data: teams = [] } = useTeams();
  const { data: users = [] } = useUsers();
  const createMeeting = useCreateMeeting();
  const { data: rooms = [] } = useRooms();
  console.log("Rooms:", rooms);

  const [participants, setParticipants] = useState([]);
  const [pInput, setPInput] = useState({ name: "", email: "", user_id: "" });

  const addParticipant = () => {
    if (!pInput.name.trim() || !pInput.email.trim()) return;
    if (participants.find((p) => p.email === pInput.email)) return;
    setParticipants((prev) => [...prev, { ...pInput }]);
    setPInput({ name: "", email: "", user_id: "" });
  };

  const removeParticipant = (email) => {
    setParticipants((prev) => prev.filter((p) => p.email !== email));
  };

  const handleUserSelect = (userId) => {
    const user = users.find((u) => String(u.id) === String(userId));
    if (user) {
      setPInput({
        name: user.first_name
          ? `${user.first_name} ${user.last_name}`.trim()
          : user.username,
        email: user.email || "",
        user_id: user.id,
      });
    }
  };

  const [form, setForm] = useState({
    title: "",
    description: "",
    team: "",
    conductor: "",
    date: "",
    start_time: "",
    end_time: "",
    recurrence: "none",
    recurrence_end_date: "",
    room: "",
    auto_release_minutes: 15,
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Required";
    if (!form.team) e.team = "Select a team";
    if (!form.date) e.date = "Required";
    if (!form.start_time) e.start_time = "Required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const payload = { ...form, participants_input: participants };
    if (!payload.end_time) delete payload.end_time;
    if (!payload.recurrence_end_date) delete payload.recurrence_end_date;
    if (!payload.conductor) delete payload.conductor;
    await createMeeting.mutateAsync(payload);
    onSuccess?.();
    setForm({
      title: "", description: "", team: "", conductor: "",
      date: "", start_time: "", end_time: "",
      recurrence: "none", recurrence_end_date: "",
      room: "", auto_release_minutes: 15,
    });
    setParticipants([]);
  };

  const getUserLabel = (user) => {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
    return fullName || user.username;
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Title */}
      <Input
        label="Meeting Title"
        icon={Type}
        placeholder="e.g. Sprint Planning"
        value={form.title}
        onChange={(e) => set("title", e.target.value)}
        error={errors.title}
      />

      {/* Team + Room */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] sm:text-xs font-bold text-[#4a5568] uppercase tracking-widest mb-1.5 block dark:text-white/40">
            Team <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <select className="input-base w-full" value={form.team} onChange={(e) => set("team", e.target.value)}>
            <option value="">Select team...</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {errors.team && <p className="text-[10px] sm:text-xs text-red-500 mt-1 dark:text-red-400">{errors.team}</p>}
        </div>

        <div>
          <label className="text-[10px] sm:text-xs font-bold text-[#4a5568] uppercase tracking-widest mb-1.5 block flex items-center gap-1 dark:text-white/40">
            <MapPin size={10} className="text-[#a0aec0] dark:text-white/30" />
            Room
          </label>
          <select className="input-base w-full" value={form.room} onChange={(e) => set("room", e.target.value)}>
            <option value="">Select room...</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}{r.location ? ` · ${r.location}` : ''} (cap. {r.capacity})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Organizer */}
      <div>
        <label className="text-[10px] sm:text-xs font-bold text-[#4a5568] uppercase tracking-widest mb-1.5 flex items-center gap-1.5 dark:text-white/40">
          <UserCheck size={11} className="text-blue-primary dark:text-blue-300" />
          Organizer <span className="text-[#a0aec0] font-normal normal-case tracking-normal dark:text-white/20">(optional)</span>
        </label>
        <select
          className="input-base w-full"
          value={form.conductor}
          onChange={(e) => set("conductor", e.target.value)}
        >
          <option value="">Select organizer...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{getUserLabel(u)}</option>
          ))}
        </select>
        <p className="text-[9px] sm:text-[10px] text-[#a0aec0] mt-1 dark:text-white/20">
          The organizer will be shown on all meeting communications and gets confirmation emails.
        </p>
      </div>

      {/* Date + Start time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Date"
          icon={Calendar}
          type="date"
          value={form.date}
          onChange={(e) => set("date", e.target.value)}
          error={errors.date}
        />
        <Input
          label="Start Time"
          icon={Clock}
          type="time"
          value={form.start_time}
          onChange={(e) => set("start_time", e.target.value)}
          error={errors.start_time}
        />
      </div>

      {/* End time + Recurrence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="End Time (optional)"
          icon={Clock}
          type="time"
          value={form.end_time}
          onChange={(e) => set("end_time", e.target.value)}
        />
        <div>
          <label className="text-[10px] sm:text-xs font-bold text-[#4a5568] uppercase tracking-widest mb-1.5 block flex items-center gap-1 dark:text-white/40">
            <RefreshCw size={10} className="text-[#a0aec0] dark:text-white/30" />
            Recurrence
          </label>
          <select className="input-base w-full" value={form.recurrence} onChange={(e) => set("recurrence", e.target.value)}>
            <option value="none">No recurrence</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>

      {form.recurrence !== "none" && (
        <Input
          label="Recurrence End Date"
          icon={Calendar}
          type="date"
          value={form.recurrence_end_date}
          onChange={(e) => set("recurrence_end_date", e.target.value)}
        />
      )}

      {/* Description */}
      <div>
        <label className="text-[10px] sm:text-xs font-bold text-[#4a5568] uppercase tracking-widest mb-1.5 block flex items-center gap-1 dark:text-white/40">
          <AlignLeft size={10} className="text-[#a0aec0] dark:text-white/30" />
          Description <span className="text-[#a0aec0] font-normal normal-case tracking-normal dark:text-white/20">(optional)</span>
        </label>
        <textarea
          className="input-base w-full min-h-[72px] resize-none"
          placeholder="Meeting agenda or notes..."
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      {/* Participants */}
      <div>
        <label className="text-[10px] sm:text-xs font-bold text-[#4a5568] uppercase tracking-widest mb-1.5 block flex items-center gap-1 dark:text-white/40">
          <Users size={10} className="text-[#a0aec0] dark:text-white/30" />
          Participants
        </label>

        {/* Search existing users */}
        <select
          className="input-base w-full mb-2"
          value=""
          onChange={(e) => handleUserSelect(e.target.value)}
        >
          <option value="">Add from existing users...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.first_name ? `${u.first_name} ${u.last_name}` : u.username} — {u.email}
            </option>
          ))}
        </select>

        {/* Manual add */}
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <input
            className="input-base flex-1"
            placeholder="Name"
            value={pInput.name}
            onChange={(e) => setPInput((p) => ({ ...p, name: e.target.value, user_id: "" }))}
            onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
          />
          <input
            className="input-base flex-1"
            placeholder="Email"
            value={pInput.email}
            onChange={(e) => setPInput((p) => ({ ...p, email: e.target.value, user_id: "" }))}
            onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
          />
          <button
            type="button"
            onClick={addParticipant}
            className="px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all shrink-0 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 dark:text-blue-200 dark:border-blue-500/30 text-xs sm:text-sm font-semibold"
          >
            Add
          </button>
        </div>

        {/* Chips */}
        {participants.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2 max-h-40 overflow-y-auto">
            {participants.map((p) => (
              <div
                key={p.email}
                className="flex items-center gap-2 bg-[#f7fafc] border border-[#e2e8f0] rounded-lg px-2 sm:px-3 py-1.5 group dark:bg-navy-700 dark:border-white/8"
              >
                <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-700 shrink-0 dark:text-blue-200">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs font-medium text-[#1a202c] leading-none truncate dark:text-white">{p.name}</p>
                  <p className="text-[9px] sm:text-[10px] text-[#a0aec0] mt-0.5 truncate dark:text-white/35">{p.email}</p>
                </div>
                <button
                  onClick={() => removeParticipant(p.email)}
                  className="ml-1 text-[#a0aec0] hover:text-red-500 transition-colors shrink-0 dark:text-white/20 dark:hover:text-red-400"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[9px] sm:text-[10px] text-[#a0aec0] mt-1.5 dark:text-white/20">
          Note: Only the organizer receives email notifications — not participants.
        </p>
      </div>

      <Button
        className="w-full justify-center"
        loading={createMeeting.isPending}
        onClick={handleSubmit}
      >
        Book Meeting Room
      </Button>
    </div>
  );
}