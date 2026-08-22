import { useMemo, useState } from "react";
import { tasks, finalResult } from "./data/tasks";
import { TaskGraph } from "./components/TaskGraph";
import { AgentsTaskforcePanel } from "./components/AgentsTaskforcePanel";
import writeIcon from "./assets/icons/icon-park-outline_write.svg";
import menuOpenIcon from "./assets/icons/menu_open.svg";
import searchIcon from "./assets/icons/search.svg";
import "./App.css";

interface LogEntry {
  id: string;
  time: string;
  agentName: string;
  icon: string;
  text: string;
}

const PAST_CHATS = [
  "Astropy 리서치",
  "Syeongming",
  "Hellop",
  "Faker vs Chovy",
  "Dimigo",
  "asdfasdfasdfasdf",
  "WP",
  "Iron Mayce",
  "Italy",
  "스토카토",
  "한화 이글스",
  "일본 여행 계획",
  "슈퍼 디미고 어드벤처",
  "뿹",
  "히히",
  "성밍싱밍쉥밍",
  "와샌즈 PPAP아시는구나",
  "오예",
];

function buildLogs(): LogEntry[] {
  const entries: (LogEntry & { sortKey: string })[] = [];

  for (const task of tasks) {
    if (task.startedAt) {
      entries.push({
        id: `${task.id}-start`,
        sortKey: task.startedAt,
        time: task.startedAt,
        agentName: task.assignedToName,
        icon: task.assignedToIcon,
        text: `'${task.title}' 작업을 시작했습니다.`,
      });
    }
    if (task.completedAt) {
      entries.push({
        id: `${task.id}-done`,
        sortKey: task.completedAt,
        time: task.completedAt,
        agentName: task.assignedToName,
        icon: task.assignedToIcon,
        text: `'${task.title}' 작업을 완료했습니다.`,
      });
    }
  }

  return entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

function App() {
  const defaultSelected = tasks.find((t) => t.status === "in_progress")?.id ?? tasks[0].id;
  const [selectedId, setSelectedId] = useState(defaultSelected);
  const [activeChat, setActiveChat] = useState<string | null>("Astropy 리서치");
  const [panelOpen, setPanelOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const logs = useMemo(buildLogs, []);
  const memberCount = new Set(tasks.map((t) => t.assignedToName)).size + 1;

  const startChat = () => {
    if (!draft.trim()) return;
    setActiveChat(draft.trim());
    setDraft("");
  };

  return (
    <div className={`app${sidebarOpen ? "" : " is-sidebar-collapsed"}`}>
      {!sidebarOpen && (
        <button
          type="button"
          className="sidebar-reopen"
          onClick={() => setSidebarOpen(true)}
          aria-label="사이드바 펼치기"
        >
          <img src={menuOpenIcon} alt="" width={20} height={20} />
        </button>
      )}

      <aside className="sidebar sidebar--left">
        <div className="sidebar__top">
          <div className="sidebar__brand-row">
            <span className="sidebar__brand">AFO</span>
            <div className="sidebar__brand-actions">
              <button className="sidebar__icon-btn" aria-label="검색">
                <img src={searchIcon} alt="" width={20} height={20} />
              </button>
              <button
                className="sidebar__icon-btn"
                onClick={() => setSidebarOpen(false)}
                aria-label="사이드바 접기"
              >
                <img src={menuOpenIcon} alt="" width={20} height={20} />
              </button>
            </div>
          </div>
          <button className="new-chat" onClick={() => setActiveChat(null)}>
            <img src={writeIcon} alt="" width={16} height={16} />
            New Chat
          </button>
          <div className="sidebar__section">Chats</div>
        </div>
        <div className="sidebar__chats">
          {PAST_CHATS.map((title) => (
            <div
              key={title}
              className={`chat-item${title === activeChat ? " chat-item--active" : ""}`}
              onClick={() => setActiveChat(title)}
            >
              {title}
            </div>
          ))}
        </div>
        <div className="sidebar__footer">
          <span className="sidebar__profile-dot" />
          Sungmin Cho
        </div>
      </aside>

      <main className="main">
        {activeChat ? (
          <div className="canvas-scroll">
            <div className="canvas-stack">
              <div className="chat-row chat-row--user">
                <div className="chat-msg chat-msg--user">{activeChat}</div>
              </div>

              <TaskGraph tasks={tasks} selectedId={selectedId} onSelect={setSelectedId} />

              {finalResult && (
                <div className="chat-row chat-row--agent">
                  <div className="chat-msg chat-msg--agent">{finalResult}</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-chat">
            <p className="empty-chat__hint">무엇을 조사해 드릴까요?</p>
            <div className="empty-chat__input-row">
              <input
                className="empty-chat__input"
                placeholder="Enter your message"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startChat()}
              />
              <button className="empty-chat__send" onClick={startChat} aria-label="전송">
                ↑
              </button>
            </div>
          </div>
        )}
      </main>

      {activeChat && (
        <AgentsTaskforcePanel
          logs={logs}
          memberCount={memberCount}
          collapsed={!panelOpen}
          onToggle={() => setPanelOpen((v) => !v)}
        />
      )}
    </div>
  );
}

export default App;
