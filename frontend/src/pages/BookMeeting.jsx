import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MeetingForm from "../components/MeetingForm";
import Card from "../components/ui/Card";
// import { useRoomStatus, useMeetings } from '../hooks/useMeetings'
import { useRoomStatus, useMeetings, useTeams, useRooms  } from "../hooks/useMeetings";
import { format, isToday } from "date-fns";
import { CheckCircle2, XCircle, Clock, Zap } from "lucide-react";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";
import { meetingsApi } from "../api/client";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

function QuickBookPanel() {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const { data: rooms = [] } = useRooms();
  const [room, setRoom] = useState("");
  //   const { data: teams = [] } = require('../hooks/useMeetings').useTeams()
  const { data: teams = [] } = useTeams();
  const [team, setTeam] = useState("");
  const qc = useQueryClient();

  const handleQuickBook = async () => {
    setLoading(true);
    try {
      await meetingsApi.quickBook({
        duration,
        title: `Quick Meeting (${duration}m)`,
        team,
        room,
      });
      toast.success(`Room booked for ${duration} minutes!`);
      qc.invalidateQueries({ queryKey: ["meetings"] });
      qc.invalidateQueries({ queryKey: ["room-status"] });
      setOpen(false);
    } catch (e) {
      toast.error(
        e.response?.data?.non_field_errors?.[0] || "Room unavailable right now",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="card p-5 border-blue-primary/20 bg-gradient-to-br from-navy-700 to-navy-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-primary/20 flex items-center justify-center">
            <Zap size={16} className="text-blue-light" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Quick Book</h3>
            <p className="text-xs text-white/40">Grab the room right now</p>
          </div>
        </div>
        <div className="flex gap-2">
          {[15, 30, 60, 90].map((m) => (
            <button
              key={m}
              onClick={() => {
                setDuration(m);
                setOpen(true);
              }}
              className="flex-1 py-2.5 rounded-lg bg-navy-600 hover:bg-blue-dark border border-white/10 hover:border-blue-primary/30 text-xs font-semibold text-white/70 hover:text-white transition-all duration-200"
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Quick Book — ${duration} min`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-navy-700 rounded-xl p-4 border border-white/5 text-center">
            <p className="text-3xl font-bold text-blue-light">{duration} min</p>
            <p className="text-xs text-white/40 mt-1">Starting now</p>
          </div>
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">
              Your Team
            </label>
            <select
              className="input-base"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            >
              <option value="">Select team...</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">
              Room
            </label>
            <select
              className="input-base"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            >
              <option value="">Select room...</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            className="w-full justify-center"
            loading={loading}
            onClick={handleQuickBook}
          >
            Confirm — Book Now
          </Button>
        </div>
      </Modal>
    </>
  );
}

function TodayTimeline() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data } = useMeetings({ date: today });
  const meetings = data?.results || data || [];

  const hours = Array.from({ length: 10 }, (_, i) => i + 8); // 8am–5pm

  return (
    <Card className="p-5">
      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
        Today's Timeline
      </h3>
      <div className="space-y-1">
        {hours.map((h) => {
          const meeting = meetings.find((m) => {
            const mh = parseInt(m.start_time.split(":")[0]);
            const eh = m.end_time ? parseInt(m.end_time.split(":")[0]) : mh + 1;
            return h >= mh && h < eh;
          });
          return (
            <div key={h} className="flex items-center gap-3">
              <span className="text-xs text-white/25 w-12 text-right font-mono">
                {h}:00
              </span>
              <div
                className={`flex-1 h-8 rounded-lg flex items-center px-3 text-xs font-medium transition-all
                ${
                  meeting
                    ? meeting.status === "in_progress"
                      ? "bg-red-500/20 border border-red-500/30 text-red-300"
                      : meeting.status === "completed"
                        ? "bg-green-500/10 border border-green-500/20 text-green-400"
                        : "bg-blue-primary/15 border border-blue-primary/25 text-blue-light"
                    : "bg-navy-700 border border-white/5 text-white/20"
                }`}
              >
                {meeting ? meeting.title : "Free"}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function BookMeeting() {
  const { data: rooms = [] } = useRoomStatus();
  const navigate = useNavigate();

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Book Meeting Room
        </h1>
        <p className="text-sm text-white/40 mt-0.5">
          Schedule or instantly grab the room
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          {/* Room Status Banner */}
          <div className="space-y-2">
            {(rooms.length > 0 ? rooms : []).map((room) => (
              <div
                key={room.id}
                className={`rounded-xl px-5 py-3.5 flex items-center gap-4 border ${
                  room.current_meeting
                    ? "bg-red-500/8 border-red-500/20"
                    : "bg-green-500/8 border-green-500/20"
                }`}
              >
                {room.current_meeting ? (
                  <XCircle size={18} className="text-red-400 shrink-0" />
                ) : (
                  <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold ${room.current_meeting ? "text-red-300" : "text-green-300"}`}
                  >
                    {room.name} —{" "}
                    {room.current_meeting
                      ? `In use: ${room.current_meeting.title}`
                      : "Available"}
                  </p>
                  {room.current_meeting?.end_time && (
                    <p className="text-xs text-white/40 mt-0.5">
                      <Clock size={10} className="inline mr-1" />
                      Free at {room.current_meeting.end_time}
                    </p>
                  )}
                  {!room.current_meeting && room.next_meeting && (
                    <p className="text-xs text-white/40 mt-0.5">
                      <Clock size={10} className="inline mr-1" />
                      Next booking at {room.next_meeting.start_time}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {rooms.length === 0 && (
              <div className="rounded-xl px-5 py-3.5 border border-white/10 bg-white/5 text-sm text-white/40">
                No rooms configured yet
              </div>
            )}
          </div>

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-white mb-5">
              Schedule a Meeting
            </h2>
            <MeetingForm onSuccess={() => navigate("/meetings")} />
          </Card>
        </div>

        <div className="space-y-4">
          <QuickBookPanel />
          <TodayTimeline />
        </div>
      </div>
    </div>
  );
}
