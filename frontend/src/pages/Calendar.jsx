import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
} from "date-fns";
import { useMeetings } from "../hooks/useMeetings";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { ChevronLeft, ChevronRight, UserCheck  } from "lucide-react";
import { useNavigate } from 'react-router-dom'


function MeetingDot({ status }) {
  const colors = {
    scheduled: "bg-blue-primary",
    in_progress: "bg-red-400",
    completed: "bg-green-400",
    cancelled: "bg-white/20",
  };
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${colors[status] || colors.scheduled}`}
    />
  );
}

function DayCell({ day, meetings, currentMonth, onSelect }) {
  const dayMeetings = meetings.filter((m) => isSameDay(new Date(m.date), day));
  const outOfMonth = !isSameMonth(day, currentMonth);

  return (
    <div
      onClick={() => dayMeetings.length > 0 && onSelect(day, dayMeetings)}
      className={`
        min-h-[80px] p-2 border-b border-r border-white/5 transition-colors duration-150
        ${outOfMonth ? "opacity-30" : ""}
        ${dayMeetings.length > 0 ? "cursor-pointer hover:bg-white/3" : ""}
        ${isToday(day) ? "bg-blue-primary/5" : ""}
      `}
    >
      <div
        className={`
        w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1.5
        ${isToday(day) ? "bg-blue-primary text-white" : "text-white/50"}
      `}
      >
        {format(day, "d")}
      </div>
      <div className="space-y-0.5">
        {dayMeetings.slice(0, 3).map((m) => (
          <div key={m.id} className="flex items-center gap-1 truncate">
            <MeetingDot status={m.status} />
            <span className="text-xs text-white/50 truncate leading-tight">
              {m.title}
            </span>
          </div>
        ))}
        {dayMeetings.length > 3 && (
          <p className="text-xs text-blue-light/60 pl-2">
            +{dayMeetings.length - 3} more
          </p>
        )}
      </div>
    </div>
  );
}

export default function Calendar() {
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState(null);
  const [selectedMeetings, setSelectedMeetings] = useState([]);
  const navigate = useNavigate()


  const start = startOfMonth(current);
  const end = endOfMonth(current);
  const calStart = startOfWeek(start, { weekStartsOn: 1 });
  const calEnd = endOfWeek(end, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const { data } = useMeetings({
    start_date: format(calStart, "yyyy-MM-dd"),
    end_date: format(calEnd, "yyyy-MM-dd"),
  });
  const meetings = data?.results || data || [];

  const handleSelect = (day, dayMeetings) => {
    setSelected(day);
    setSelectedMeetings(dayMeetings);
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Calendar
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            {format(current, "MMMM yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={ChevronLeft}
            onClick={() => setCurrent(subMonths(current, 1))}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrent(new Date())}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={ChevronRight}
            onClick={() => setCurrent(addMonths(current, 1))}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-white/10">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div
              key={d}
              className="px-3 py-2.5 text-xs font-semibold text-white/30 uppercase tracking-wider text-center border-r border-white/5 last:border-r-0"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => (
            <DayCell
              key={i}
              day={day}
              meetings={meetings}
              currentMonth={current}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>

      {/* Day detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? format(selected, "EEEE, dd MMMM yyyy") : ""}
        size="md"
      >
        <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
          {selectedMeetings.map((m) => (
            <div
              key={m.id}
              onClick={() => {
                setSelected(null);
                navigate(`/meetings/${m.id}`);
              }}
              className="flex items-center gap-4 bg-navy-700 rounded-xl p-4 border border-white/5 cursor-pointer hover:border-blue-primary/30 hover:bg-navy-600 transition-all"
            >
              {" "}
              <div className="text-center min-w-[52px]">
                <p className="text-sm font-bold text-blue-light font-mono">
                  {format(new Date(`2000-01-01T${m.start_time}`), "HH:mm")}
                </p>
                <p className="text-xs text-white/30">
                  {m.end_time
                    ? format(new Date(`2000-01-01T${m.end_time}`), "HH:mm")
                    : "∞"}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{m.title}</p>
                <p className="text-xs text-white/40 mt-0.5">
                  {m.team_detail?.name}
                </p>
                {m.description && (
                  <p className="text-xs text-white/30 mt-1 truncate">
                    {m.description}
                  </p>
                )}
              </div>
              <Badge status={m.status} pulse={m.status === "in_progress"} />
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
