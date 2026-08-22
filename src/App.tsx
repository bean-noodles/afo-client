import { useMemo, useState } from "react";
import { tasks, finalResult } from "./data/tasks";
import { TaskGraph } from "./components/TaskGraph";
import { AgentsTaskforcePanel } from "./components/AgentsTaskforcePanel";
import { Login } from "./components/Login";
import writeIcon from "./assets/icons/icon-park-outline_write.svg";
import folderIcon from "./assets/icons/folder.svg";
import panelLeftIcon from "./assets/icons/panel-left.svg";
import searchIcon from "./assets/icons/search.svg";
import chevronDownIcon from "./assets/icons/chevron-down.svg";
import moreHorizontalIcon from "./assets/icons/more-horizontal.svg";
import plusIcon from "./assets/icons/plus.svg";
import LogoutIcon from "./assets/icons/logout.svg";
import uploadBoxIcon from "./assets/icons/upload-box.svg";
import sendArrowIcon from "./assets/icons/send-arrow.svg";
import "./App.css";

interface LogEntry {
  id: string;
  time: string;
  agentName: string;
  text: string;
}

const PROJECTS = [
  {
    id: "squad",
    name: "SquAd",
    items: ["Writewrite", "Writewrite", "Writewrite"],
  },
  {
    id: "squbd",
    name: "SquBd",
    items: ["Writewrite", "Writewrite"],
  },
  {
    id: "squcd",
    name: "SquCd",
    items: ["Writewrite", "Writewrite", "Writewrite"],
  },
].map((project) => ({
  ...project,
  items: project.items.map((label, i) => ({ id: `${project.id}-${i}`, label })),
}));

function buildLogs(): LogEntry[] {
  const entries: (LogEntry & { sortKey: string })[] = [];

  for (const task of tasks) {
    if (task.startedAt) {
      entries.push({
        id: `${task.id}-start`,
        sortKey: task.startedAt,
        time: task.startedAt,
        agentName: task.assignedToName,
        text: `'${task.title}' 작업을 시작했습니다.`,
      });
    }
    if (task.completedAt) {
      entries.push({
        id: `${task.id}-done`,
        sortKey: task.completedAt,
        time: task.completedAt,
        agentName: task.assignedToName,
        text: `'${task.title}' 작업을 완료했습니다.`,
      });
    }
  }

  return entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const defaultSelected =
    tasks.find((t) => t.status === "in_progress")?.id ?? tasks[0].id;
  const [selectedId, setSelectedId] = useState(defaultSelected);
  const [activeChat, setActiveChat] = useState<string | null>("Astropy 리서치");
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [collapsedProjectIds, setCollapsedProjectIds] = useState<Set<string>>(
    new Set()
  );
  const [draft, setDraft] = useState("");
  const logs = useMemo(buildLogs, []);

  const startChat = () => {
    if (!draft.trim()) return;
    setActiveChat(draft.trim());
    setActiveItemId(null);
    setDraft("");
  };

  const selectItem = (id: string, label: string) => {
    setActiveItemId(id);
    setActiveChat(label);
  };

  const toggleProject = (id: string) => {
    setCollapsedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!isAuthenticated) {
    return <Login onSignIn={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className={`app${sidebarOpen ? "" : " is-sidebar-collapsed"}`}>
      {!sidebarOpen && (
        <button
          type="button"
          className="sidebar-reopen"
          onClick={() => setSidebarOpen(true)}
          aria-label="사이드바 펼치기"
        >
          <img src={panelLeftIcon} alt="" width={20} height={20} />
        </button>
      )}

      <aside className="sidebar sidebar--left">
        <div className="sidebar__top">
          <div className="sidebar__brand-row">
            <span className="sidebar__brand">AFO</span>
            <div className="sidebar__brand-actions">
              <button className="sidebar__icon-btn" aria-label="검색">
                <img src={searchIcon} alt="" width={22} height={22} />
              </button>
              <button
                className="sidebar__icon-btn"
                onClick={() => setSidebarOpen(false)}
                aria-label="사이드바 접기"
              >
                <img src={panelLeftIcon} alt="" width={20} height={20} />
              </button>
            </div>
          </div>
          <button
            className="new-chat"
            onClick={() => {
              setActiveChat(null);
              setActiveItemId(null);
            }}
          >
            <img src={writeIcon} alt="" width={16} height={16} />
            New Chat
          </button>
          <button className="new-record">
            <img src={folderIcon} alt="" width={16} height={16} />
            New Squad
          </button>
        </div>
        <div className="sidebar__chats">
          <div className="sidebar__projects-header">
            <button
              type="button"
              className="sidebar__projects-toggle"
              onClick={() => setProjectsOpen((v) => !v)}
            >
              Projects
              <img
                src={chevronDownIcon}
                alt=""
                width={12}
                height={12}
                className={`sidebar__chevron${
                  projectsOpen ? "" : " is-collapsed"
                }`}
              />
            </button>
            <div className="sidebar__projects-actions">
              <button className="sidebar__icon-btn" aria-label="더보기">
                <img src={moreHorizontalIcon} alt="" width={16} height={16} />
              </button>
              <button className="sidebar__icon-btn" aria-label="프로젝트 추가">
                <img src={plusIcon} alt="" width={14} height={14} />
              </button>
            </div>
          </div>
          {projectsOpen &&
            PROJECTS.map((project) => {
              const isCollapsed = collapsedProjectIds.has(project.id);
              return (
                <div key={project.id} className="project-group">
                  <button
                    type="button"
                    className="project-group__header"
                    onClick={() => toggleProject(project.id)}
                  >
                    <img src={folderIcon} alt="" width={14} height={14} />
                    {project.name}
                    <img
                      src={chevronDownIcon}
                      alt=""
                      width={10}
                      height={10}
                      className={`sidebar__chevron${
                        isCollapsed ? " is-collapsed" : ""
                      }`}
                      style={{ marginLeft: "auto" }}
                    />
                  </button>
                  {!isCollapsed && (
                    <div className="project-group__items">
                      {project.items.map((item) => (
                        <div
                          key={item.id}
                          className={`chat-item${
                            item.id === activeItemId ? " chat-item--active" : ""
                          }`}
                          onClick={() => selectItem(item.id, item.label)}
                        >
                          {item.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
        <div className="sidebar__footer">
          <span className="sidebar__avatar" />
          <div className="sidebar__profile-info">
            <span className="sidebar__profile-name">Sungmin Cho</span>
            <span className="sidebar__profile-email">sead12g@gmail.com</span>
          </div>
          <button
            className="sidebar__icon-btn"
            onClick={() => setIsAuthenticated(false)}
            aria-label="로그아웃"
          >
            <img src={LogoutIcon} alt="" width={18} height={18} />
          </button>
        </div>
      </aside>

      <main className="main">
        {activeChat ? (
          <div className="canvas-scroll">
            <div className="canvas-stack">
              <div className="chat-row chat-row--user">
                <div className="chat-msg chat-msg--user">{activeChat}</div>
              </div>

              <TaskGraph
                tasks={tasks}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />

              {finalResult && (
                <div className="chat-row chat-row--agent">
                  <div className="chat-msg chat-msg--agent">{finalResult}</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-chat">
            <div className="empty-chat__input-row">
              <input
                className="empty-chat__input"
                placeholder="Enter your message"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startChat()}
              />
              <button className="empty-chat__attach" aria-label="파일 첨부">
                <img src={uploadBoxIcon} alt="" width={24} height={24} />
              </button>
              <button
                className="empty-chat__send"
                onClick={startChat}
                aria-label="전송"
              >
                <img src={sendArrowIcon} alt="" width={24} height={24} />
              </button>
            </div>
          </div>
        )}
      </main>

      {activeChat && (
        <AgentsTaskforcePanel
          logs={logs}
          collapsed={!panelOpen}
          onToggle={() => setPanelOpen((v) => !v)}
        />
      )}
    </div>
  );
}

export default App;
