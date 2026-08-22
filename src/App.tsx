import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tasks as demoTasks, finalResult as demoFinalResult } from "./data/tasks";
import type { Task } from "./data/tasks";
import { TaskGraph } from "./components/TaskGraph";
import { AgentsTaskforcePanel } from "./components/AgentsTaskforcePanel";
import { Login } from "./components/Login";
import {
  ApiError,
  IS_API_CONFIGURED,
  fetchMe,
  getSession,
  getSquad,
  listSquads,
} from "./api";
import { toLogEntries, toTasks } from "./adapters";
import type { LogEntry } from "./adapters";
import type { SquadDetail, SquadSummary, User } from "./types";
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

const TOKEN_KEY = "afo_token";

/** What the main canvas renders — the same shape in demo and API mode. */
interface ActiveSession {
  request: string;
  tasks: Task[];
  finalResult: string | null;
  logs: LogEntry[];
}

const DEMO_USER: User = {
  id: "demo",
  email: "sead12g@gmail.com",
  name: "Sungmin Cho",
  created_at: "",
  updated_at: "",
};

const DEMO_SQUAD_ID = "demo-squad";
const DEMO_EXECUTION_ID = "demo-session";

function demoLogs(): LogEntry[] {
  const entries: (LogEntry & { sortKey: string })[] = [];
  for (const task of demoTasks) {
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

const DEMO_SESSION: ActiveSession = {
  request: "Astropy 리서치",
  tasks: demoTasks,
  finalResult: demoFinalResult,
  logs: demoLogs(),
};

const DEMO_SQUADS: SquadSummary[] = [
  {
    id: DEMO_SQUAD_ID,
    squad_id: DEMO_SQUAD_ID,
    squad_name: "리서치 스쿼드 (샘플)",
    description: null,
    session_count: 1,
    created_at: "",
    updated_at: "",
  },
];

/** Magic-link callback lands here as ?token=... — consume it and tidy the URL. */
function readTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) window.history.replaceState({}, "", window.location.pathname);
  return token;
}

function App() {
  const [token, setToken] = useState<string | null>(
    () => readTokenFromUrl() ?? localStorage.getItem(TOKEN_KEY)
  );
  const [user, setUser] = useState<User | null>(IS_API_CONFIGURED ? null : DEMO_USER);
  const [squads, setSquads] = useState<SquadSummary[]>(
    IS_API_CONFIGURED ? [] : DEMO_SQUADS
  );
  const [squadDetails, setSquadDetails] = useState<Record<string, SquadDetail>>({});
  const [expandedSquadIds, setExpandedSquadIds] = useState<Set<string>>(new Set());
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  // The graph's own reveal animation, not just data availability, gates the
  // final-answer bubble — otherwise it lands while earlier waves are still
  // visibly running.
  const [graphSequenceDone, setGraphSequenceDone] = useState(false);
  const finalResultRef = useRef<HTMLDivElement | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isDemo = !IS_API_CONFIGURED;
  const isAuthenticated = isDemo || Boolean(token);

  useEffect(() => {
    if (isDemo) return;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token, isDemo]);

  // A freshly loaded session hasn't run its reveal yet, whatever the last one did.
  useEffect(() => {
    setGraphSequenceDone(false);
  }, [selectedExecutionId]);

  // Follow the run all the way to its conclusion: once the final answer
  // lands, bring it into view just like each wave did as it opened.
  useEffect(() => {
    if (graphSequenceDone) {
      finalResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [graphSequenceDone]);

  const handleLogout = useCallback(() => {
    setToken(null);
    setUser(null);
    setSquads([]);
    setSquadDetails({});
    setExpandedSquadIds(new Set());
    setSelectedExecutionId(null);
    setSession(null);
  }, []);

  // Current user + squad list, whenever we hold a token.
  useEffect(() => {
    if (isDemo || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const [me, squadList] = await Promise.all([fetchMe(token), listSquads(token)]);
        if (cancelled) return;
        setUser(me);
        setSquads(squadList);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) handleLogout();
        else setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isDemo, handleLogout]);

  const toggleSquad = async (squadId: string) => {
    setExpandedSquadIds((prev) => {
      const next = new Set(prev);
      if (next.has(squadId)) next.delete(squadId);
      else next.add(squadId);
      return next;
    });
    if (isDemo || squadDetails[squadId] || !token) return;
    try {
      const detail = await getSquad(token, squadId);
      setSquadDetails((prev) => ({ ...prev, [squadId]: detail }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const selectSession = async (squadId: string, executionId: string) => {
    setSelectedExecutionId(executionId);
    if (isDemo) {
      setSession(DEMO_SESSION);
      setSelectedTaskId(null);
      return;
    }
    if (!token) return;
    try {
      const detail = await getSession(token, squadId, executionId);
      setSession({
        request: detail.request ?? detail.plan_title ?? "(제목 없음)",
        tasks: toTasks(detail),
        finalResult: detail.final_result,
        logs: toLogEntries(detail.timeline),
      });
      setSelectedTaskId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const goHome = () => {
    setSelectedExecutionId(null);
    setSession(null);
  };

  const startChat = () => {
    if (!draft.trim()) return;
    setDraft("");
  };

  const toggleSearch = () => {
    setSearchOpen((v) => {
      if (v) setSearchQuery("");
      return !v;
    });
  };

  /** Sidebar tree: squads with whatever sessions we've loaded for them. */
  const tree = useMemo(
    () =>
      squads.map((squad) => {
        const sessions = isDemo
          ? [{ id: DEMO_EXECUTION_ID, label: DEMO_SESSION.request }]
          : (squadDetails[squad.id]?.sessions ?? []).map((s) => ({
              id: s.execution_id,
              label: s.request ?? s.execution_id,
            }));
        return {
          id: squad.id,
          name: squad.squad_name ?? squad.squad_id ?? squad.id,
          sessions,
        };
      }),
    [squads, squadDetails, isDemo]
  );

  const query = searchQuery.trim().toLowerCase();
  const filteredTree = query
    ? tree
        .map((squad) => ({
          ...squad,
          sessions: squad.sessions.filter((s) => s.label.toLowerCase().includes(query)),
        }))
        .filter((s) => s.name.toLowerCase().includes(query) || s.sessions.length > 0)
    : tree;

  const graphSelectedId =
    selectedTaskId ??
    session?.tasks.find((t) => t.status === "in_progress")?.id ??
    session?.tasks[0]?.id ??
    null;

  if (!isAuthenticated) {
    return (
      <Login
        onLoggedIn={(newToken, newUser) => {
          setToken(newToken);
          setUser(newUser);
        }}
      />
    );
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
            <button
              type="button"
              className="sidebar__brand"
              onClick={goHome}
              aria-label="메인 화면으로 이동"
            >
              AFO
            </button>
            <div className="sidebar__brand-actions">
              <button
                className={`sidebar__icon-btn${searchOpen ? " is-active" : ""}`}
                onClick={toggleSearch}
                aria-label="검색"
              >
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
          {searchOpen && (
            <input
              className="sidebar__search"
              type="text"
              placeholder="검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          )}
          <button className="new-chat" onClick={goHome}>
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
                className={`sidebar__chevron${projectsOpen ? "" : " is-collapsed"}`}
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
          {projectsOpen && filteredTree.length === 0 && (
            <p className="sidebar__search-empty">
              {query ? "검색 결과가 없습니다." : "스쿼드가 없습니다."}
            </p>
          )}
          {projectsOpen &&
            filteredTree.map((squad) => {
              const isExpanded = query || expandedSquadIds.has(squad.id);
              return (
                <div key={squad.id} className="project-group">
                  <button
                    type="button"
                    className="project-group__header"
                    onClick={() => void toggleSquad(squad.id)}
                  >
                    <img src={folderIcon} alt="" width={14} height={14} />
                    {squad.name}
                    <img
                      src={chevronDownIcon}
                      alt=""
                      width={10}
                      height={10}
                      className={`sidebar__chevron${isExpanded ? "" : " is-collapsed"}`}
                      style={{ marginLeft: "auto" }}
                    />
                  </button>
                  {isExpanded && (
                    <div className="project-group__items">
                      {squad.sessions.map((item) => (
                        <div
                          key={item.id}
                          className={`chat-item${
                            item.id === selectedExecutionId ? " chat-item--active" : ""
                          }`}
                          onClick={() => void selectSession(squad.id, item.id)}
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
            <span className="sidebar__profile-name">{user?.name ?? "-"}</span>
            <span className="sidebar__profile-email">{user?.email ?? ""}</span>
          </div>
          <button
            className="sidebar__icon-btn"
            onClick={handleLogout}
            aria-label="로그아웃"
          >
            <img src={LogoutIcon} alt="" width={18} height={18} />
          </button>
        </div>
      </aside>

      <main className="main">
        {error && <p className="main__error">⚠ {error}</p>}
        {session ? (
          <div className="canvas-scroll">
            <div className="canvas-stack">
              <div className="chat-row chat-row--user">
                <div className="chat-msg chat-msg--user">{session.request}</div>
              </div>

              <TaskGraph
                key={selectedExecutionId}
                tasks={session.tasks}
                selectedId={graphSelectedId}
                onSelect={setSelectedTaskId}
                onSequenceComplete={() => setGraphSequenceDone(true)}
              />

              {session.finalResult && graphSequenceDone && (
                <div className="chat-row chat-row--agent" ref={finalResultRef}>
                  <div className="chat-msg chat-msg--agent">{session.finalResult}</div>
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

      {session && (
        <AgentsTaskforcePanel
          logs={session.logs}
          collapsed={!panelOpen}
          onToggle={() => setPanelOpen((v) => !v)}
        />
      )}
    </div>
  );
}

export default App;
