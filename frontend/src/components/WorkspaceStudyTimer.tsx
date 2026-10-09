"use client";
import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Clock } from "lucide-react";
import { authFetch } from "@/lib/api";

export default function WorkspaceStudyTimer({ workspaceId, onHoursLogged }: { workspaceId: string; onHoursLogged?: () => void }) {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const toggleTimer = () => setIsActive(!isActive);

  const saveAndReset = async () => {
    if (seconds >= 60) {
      const hoursAdded = Number((seconds / 3600).toFixed(2));
      try {
        await authFetch(`/api/workspaces/${workspaceId}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studied_hours_add: hoursAdded }),
        });
        if (onHoursLogged) onHoursLogged();
      } catch (err) {
        console.error("Failed to log study session:", err);
      }
    }
    setIsActive(false);
    setSeconds(0);
  };

  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs > 0 ? `${hrs}:` : ""}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs">
      <Clock size={15} className="text-brandBlue" />
      <span className="font-mono text-slate-200 font-medium">{formatTime(seconds)}</span>
      <button
        onClick={toggleTimer}
        className={`p-1 rounded-lg transition ${isActive ? "text-amber-400 hover:bg-amber-400/10" : "text-successGreen hover:bg-successGreen/10"}`}
        title={isActive ? "Pause Session" : "Start Session"}
      >
        {isActive ? <Pause size={14} /> : <Play size={14} />}
      </button>
      {seconds > 0 && (
        <button
          onClick={saveAndReset}
          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          title="Save & Reset"
        >
          <RotateCcw size={14} />
        </button>
      )}
    </div>
  );
}