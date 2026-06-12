import { useState } from "react";
import {
  useTeams,
  useCreateMeeting,
  useUsers,
  useRooms,
} from "../hooks/useMeetings";
import Button from "./ui/Button";
import Input from "./ui/Input";
import {
  Calendar,
  Clock,
  Users,
  Type,
  AlignLeft,
  RefreshCw,
  UserCheck,
} from "lucide-react";
export default function MeetingForm({ onSuccess }) {
  const { data: teams = [] } = useTeams();
  const { data: users = [] } = useUsers();
  const createMeeting = useCreateMeeting();
  const { data: rooms = [] } = useRooms();

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

  // When a known user is selected, auto-fill name+email
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
    // const payload = { ...form, participants_input: participants }
    await createMeeting.mutateAsync(payload);
    onSuccess?.();
    setForm({
      title: "",
      description: "",
      team: "",
      conductor: "",
      date: "",
      start_time: "",
      end_time: "",
      recurrence: "none",
      recurrence_end_date: "",
      auto_release_minutes: 15,
    });
  };

  // Format user display name for select option
  const getUserLabel = (user) => {
    const fullName = [user.first_name, user.last_name]
      .filter(Boolean)
      .join(" ");
    return fullName || user.username;
  };

  return (
    <div className="space-y-4">
      <Input
        label="Meeting Title"
        icon={Type}
        placeholder="e.g. Sprint Planning"
        value={form.title}
        onChange={(e) => set("title", e.target.value)}
        error={errors.title}
      />

      {/* Team */}
      <div>
        <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">
          Team
        </label>
        <select
          className="input-base"
          value={form.team}
          onChange={(e) => set("team", e.target.value)}
        >
          <option value="">Select team...</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {errors.team && (
          <p className="text-xs text-red-400 mt-1">{errors.team}</p>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">
          Meeting Room
        </label>
        <select
          className="input-base"
          value={form.room}
          onChange={(e) => set("room", e.target.value)}
        >
          <option value="">Select room...</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} {r.location ? `· ${r.location}` : ""} (cap. {r.capacity})
            </option>
          ))}
        </select>
      </div>

      {/* Conductor */}
      <div>
        <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <UserCheck size={11} className="text-blue-light" />
          Conductor <span className="text-white/25">(optional)</span>
        </label>
        <select
          className="input-base"
          value={form.conductor}
          onChange={(e) => set("conductor", e.target.value)}
        >
          <option value="">Select conductor...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {getUserLabel(u)}
            </option>
          ))}
        </select>
        <p className="text-xs text-white/25 mt-1">
          The conductor will be notified by email and shown on all meeting
          communications.
        </p>
      </div>

      {/* Date & Start Time */}
      <div className="grid grid-cols-2 gap-3">
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

      {/* End Time & Recurrence */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="End Time (optional)"
          icon={Clock}
          type="time"
          value={form.end_time}
          onChange={(e) => set("end_time", e.target.value)}
        />
        <div>
          <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">
            Recurrence
          </label>
          <select
            className="input-base"
            value={form.recurrence}
            onChange={(e) => set("recurrence", e.target.value)}
          >
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
        <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">
          Description (optional)
        </label>
        <textarea
          className="input-base min-h-[72px] resize-none"
          placeholder="Meeting agenda..."
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      {/* Participants */}
      <div>
        <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">
          Participants
        </label>

        {/* Search existing users */}
        <select
          className="input-base mb-2"
          value=""
          onChange={(e) => handleUserSelect(e.target.value)}
        >
          <option value="">Search existing user to add...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.first_name ? `${u.first_name} ${u.last_name}` : u.username} —{" "}
              {u.email}
            </option>
          ))}
        </select>

        {/* Or add new */}
        <div className="flex gap-2 mb-2">
          <input
            className="input-base flex-1"
            placeholder="Name"
            value={pInput.name}
            onChange={(e) =>
              setPInput((p) => ({ ...p, name: e.target.value, user_id: "" }))
            }
          />
          <input
            className="input-base flex-1"
            placeholder="Email"
            value={pInput.email}
            onChange={(e) =>
              setPInput((p) => ({ ...p, email: e.target.value, user_id: "" }))
            }
          />
          <button
            type="button"
            onClick={addParticipant}
            className="px-3 py-2 rounded-lg bg-blue-primary/20 hover:bg-blue-primary/30 text-blue-light text-sm font-medium border border-blue-primary/30 transition-all"
          >
            Add
          </button>
        </div>

        {/* Participant chips */}
        {participants.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {participants.map((p) => (
              <div
                key={p.email}
                className="flex items-center gap-1.5 bg-navy-700 border border-white/10 rounded-lg px-3 py-1.5"
              >
                <span className="text-xs text-white">{p.name}</span>
                <span className="text-xs text-white/40">{p.email}</span>
                <button
                  onClick={() => removeParticipant(p.email)}
                  className="text-white/30 hover:text-red-400 ml-1 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-release */}
      <div className="flex items-center gap-3 pt-1">
        <Input
          label="Auto-release if no check-in (mins)"
          type="number"
          min={5}
          max={60}
          value={form.auto_release_minutes}
          onChange={(e) => set("auto_release_minutes", e.target.value)}
          className="flex-1"
        />
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
