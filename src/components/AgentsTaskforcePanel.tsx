import { motion } from "framer-motion";

interface LogEntry {
  id: string;
  time: string;
  agentName: string;
  text: string;
}

interface AgentsTaskforcePanelProps {
  logs: LogEntry[];
  collapsed: boolean;
  onToggle: () => void;
}

// Matches TaskGraph's node/wave collapse transition, so every collapse
// animation in the app rises and settles at the same pace.
const COLLAPSE_TRANSITION = { duration: 0.45, ease: [0.4, 0, 0.2, 1] as const };

// Only the wave-level system lines — e.g. "Starting wave 1/4 with 2 task(s)"
// and "Wave 1/4 completed" — not the per-task assigned/completed lines.
const WAVE_TRANSITION_RE = /^(starting wave \d+\/\d+ with \d+ task\(s\)|wave \d+\/\d+ completed)$/i;

function isWaveTransition(text: string) {
  return WAVE_TRANSITION_RE.test(text.trim());
}

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function AgentsTaskforcePanel({
  logs,
  collapsed,
  onToggle,
}: AgentsTaskforcePanelProps) {
  return (
    <motion.div
      className={`taskforce-panel${collapsed ? " is-collapsed" : ""}`}
      layout
      transition={{ layout: COLLAPSE_TRANSITION }}
    >
      <motion.div layout className="taskforce-panel__header">
        <span className="taskforce-panel__title">System Log</span>
        <button
          type="button"
          className="taskforce-panel__toggle"
          onClick={onToggle}
          aria-label={collapsed ? "패널 펼치기" : "패널 접기"}
        >
          {collapsed ? "+" : "−"}
        </button>
      </motion.div>
      {!collapsed && (
        <div className="taskforce-panel__body">
          {logs.map((log) => (
            <div key={log.id} className="log-entry">
              <div className="log-entry__meta">
                <span className="log-entry__time">{formatTime(log.time)}</span>
                <span className="log-entry__name">{log.agentName}</span>
              </div>
              <p
                className={`log-entry__text${
                  isWaveTransition(log.text) ? " log-entry__text--wave" : ""
                }`}
              >
                {log.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
