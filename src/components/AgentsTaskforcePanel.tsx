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

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AgentsTaskforcePanel({
  logs,
  collapsed,
  onToggle,
}: AgentsTaskforcePanelProps) {
  return (
    <div className={`taskforce-panel${collapsed ? " is-collapsed" : ""}`}>
      <div className="taskforce-panel__header">
        <span className="taskforce-panel__title">System Log</span>
        <button
          type="button"
          className="taskforce-panel__toggle"
          onClick={onToggle}
          aria-label={collapsed ? "패널 펼치기" : "패널 접기"}
        >
          −
        </button>
      </div>
      {!collapsed && (
        <div className="taskforce-panel__body">
          {logs.map((log) => (
            <div key={log.id} className="log-entry">
              <div className="log-entry__meta">
                <span className="log-entry__time">{formatTime(log.time)}</span>
                <span className="log-entry__name">{log.agentName}</span>
              </div>
              <p className="log-entry__text">{log.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
