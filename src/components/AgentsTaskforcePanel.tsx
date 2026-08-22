import peopleIcon from "../assets/icons/ic_baseline-people.svg";
import fullscreenExitIcon from "../assets/icons/fullscreen-exit.svg";

interface LogEntry {
  id: string;
  time: string;
  agentName: string;
  icon: string;
  text: string;
}

interface AgentsTaskforcePanelProps {
  logs: LogEntry[];
  memberCount: number;
  collapsed: boolean;
  onToggle: () => void;
}

function formatTime(iso: string) {
  return iso.slice(11, 19);
}

export function AgentsTaskforcePanel({
  logs,
  memberCount,
  collapsed,
  onToggle,
}: AgentsTaskforcePanelProps) {
  return (
    <div className={`taskforce-panel${collapsed ? " is-collapsed" : ""}`}>
      <div className="taskforce-panel__header">
        <div className="taskforce-panel__heading">
          <span className="taskforce-panel__title">Agents Taskforce</span>
          <span className="taskforce-panel__count">
            <img src={peopleIcon} alt="" width={16} height={16} />
            {memberCount}
          </span>
        </div>
        <button
          type="button"
          className="taskforce-panel__toggle"
          onClick={onToggle}
          aria-label={collapsed ? "패널 펼치기" : "패널 접기"}
        >
          <img src={fullscreenExitIcon} alt="" width={16} height={16} />
        </button>
      </div>
      {!collapsed && (
        <div className="taskforce-panel__body">
          {logs.map((log) => (
            <div key={log.id} className="chat-bubble">
              <span className="chat-bubble__icon">{log.icon}</span>
              <div className="chat-bubble__content">
                <span className="chat-bubble__name">
                  {log.agentName} · {formatTime(log.time)}
                </span>
                <span className="chat-bubble__text">{log.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
