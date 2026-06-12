import { useParams, useNavigate } from "react-router-dom";
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useQuery } from "@tanstack/react-query";
import { meetingsApi } from "../api/client";
import { format } from "date-fns";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useMeetingAction } from "../hooks/useMeetings";
import {
  ArrowLeft,
  Clock,
  Users,
  Calendar,
  LogIn,
  StopCircle,
  XCircle,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import toast from "react-hot-toast";
function ExtendButton({ meetingId }) {
  const [open, setOpen] = useState(false)
  const [minutes, setMinutes] = useState(30)
  const qc = useQueryClient()

  const extend = useMutation({
    mutationFn: () => meetingsApi.extend(meetingId, minutes),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['meeting', String(meetingId)] })
      qc.invalidateQueries({ queryKey: ['meetings'] })
      toast.success(`Extended to ${data.data.new_end_time}`)
      if (data.data.conflicts?.length) {
        toast(`⚠️ Conflict email sent to next meeting's organizer`, { icon: '📧' })
      }
      setOpen(false)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Extension failed'),
  })

  if (!open) return (
    <Button icon={Clock} variant="ghost" onClick={() => setOpen(true)}>Extend Time</Button>
  )

  return (
    <div className="flex items-center gap-2">
      {[15, 30, 45, 60].map(m => (
        <button
          key={m}
          onClick={() => setMinutes(m)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
            ${minutes === m ? 'bg-blue-primary border-blue-primary text-white' : 'bg-navy-700 border-white/10 text-white/60 hover:border-blue-primary/40'}`}
        >
          +{m}m
        </button>
      ))}
      <Button size="sm" loading={extend.isPending} onClick={() => extend.mutate()}>Confirm</Button>
      <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white text-xs">✕</button>
    </div>
  )
}

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { start, end, cancel, checkin } = useMeetingAction();

  const { data: m, isLoading } = useQuery({
    queryKey: ["meeting", id],
    queryFn: () => meetingsApi.get(id).then((r) => r.data),
  });

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!m) return <div className="p-6 text-white/40">Meeting not found</div>;

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-navy-700 flex items-center justify-center shrink-0">
        <Icon size={13} className="text-blue-light" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-white/40">{label}</p>
        <p className="text-sm font-medium text-white mt-0.5">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-white/40 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {m.title}
          </h1>
          <p className="text-sm text-white/40 mt-1">{m.team_detail?.name}</p>
        </div>
        <Badge status={m.status} pulse={m.status === "in_progress"} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <InfoRow
            icon={Calendar}
            label="Date"
            value={format(new Date(m.date), "EEEE, dd MMMM yyyy")}
          />
          <InfoRow
            icon={Clock}
            label="Time"
            value={`${format(new Date(`2000-01-01T${m.start_time}`), "h:mm a")} → ${m.end_time ? format(new Date(`2000-01-01T${m.end_time}`), "h:mm a") : "Open-ended"}`}
          />
          <InfoRow
            icon={RefreshCw}
            label="Recurrence"
            value={
              m.recurrence === "none"
                ? "No recurrence"
                : `${m.recurrence.charAt(0).toUpperCase() + m.recurrence.slice(1)}`
            }
          />
        </Card>

        <Card>
          <InfoRow
            icon={Users}
            label="Organizer"
            value={`${m.organizer_detail?.first_name || ""} ${m.organizer_detail?.last_name || m.organizer_detail?.username}`}
          />
          <InfoRow
            icon={LogIn}
            label="Check-in Status"
            value={
              m.checked_in
                ? `Checked in at ${m.checked_in_at ? format(new Date(m.checked_in_at), "h:mm a") : "—"}`
                : "Not checked in"
            }
          />
          <InfoRow
            icon={Clock}
            label="Auto-release"
            value={`${m.auto_release_minutes} min after start`}
          />
          <InfoRow
            icon={Users}
            label="Created By"
            value={`${m.organizer_detail?.first_name || ""} ${m.organizer_detail?.last_name || m.organizer_detail?.username}`}
          />
          {m.conductor_detail && (
            <InfoRow
              icon={UserCheck}
              label="Conductor"
              value={`${m.conductor_detail?.first_name || ""} ${m.conductor_detail?.last_name || m.conductor_detail?.username}`}
            />
          )}
        </Card>
      </div>

      {m.description && (
        <Card className="mb-4">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
            Description
          </h3>
          <p className="text-sm text-white/70 leading-relaxed">
            {m.description}
          </p>
        </Card>
      )}

      {m.participants?.length > 0 && (
        <Card className="mb-4">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            Participants
          </h3>
          <div className="space-y-2">
            {m.participants.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-darker flex items-center justify-center text-xs font-bold text-blue-light">
                  {p.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-white">{p.name}</p>
                  <p className="text-xs text-white/40">{p.email}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {m.status === "scheduled" && (
          <>
            <Button
              icon={LogIn}
              variant="success"
              onClick={() => {
                checkin.mutate(m.id);
                toast.success("Checked in!");
              }}
            >
              Check In
            </Button>
            <Button
              icon={StopCircle}
              onClick={() => {
                start.mutate(m.id);
                toast.success("Meeting started!");
              }}
            >
              Start Meeting
            </Button>
            <Button
              icon={XCircle}
              variant="danger"
              onClick={() => {
                cancel.mutate(m.id);
                navigate("/meetings");
              }}
            >
              Cancel
            </Button>
          </>
        )}
        {m.status === "in_progress" && m.end_time && (
          <>
            <Button
              icon={StopCircle}
              variant="danger"
              onClick={() => {
                end.mutate(m.id);
                toast.success("Meeting ended");
              }}
            >
              End Meeting Early
            </Button>
            <ExtendButton meetingId={m.id} />
          </>
        )}
      </div>
    </div>
  );
}
