import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  tasks as demoTasks,
  finalResult as demoFinalResult,
} from "./data/tasks";
import type { Task } from "./data/tasks";
import { TaskGraph } from "./components/TaskGraph";
import { AgentsTaskforcePanel } from "./components/AgentsTaskforcePanel";
import { Login } from "./components/Login";
import { SessionListSkeleton, TaskGraphSkeleton } from "./components/Skeleton";
import { TypewriterText } from "./components/TypewriterText";
import {
  ApiError,
  IS_API_CONFIGURED,
  fetchMe,
  getSession,
  getSquad,
  listSquads,
  uploadSquad,
} from "./api";
import { toLogEntries, toTasks } from "./adapters";
import type { LogEntry } from "./adapters";
import type { SquadSummary, User } from "./types";
import writeIcon from "./assets/icons/icon-park-outline_write.svg";
import folderIcon from "./assets/icons/folder.svg";
import panelLeftIcon from "./assets/icons/panel-left.svg";
import searchIcon from "./assets/icons/search.svg";
import chevronDownIcon from "./assets/icons/chevron-down.svg";
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

const EMPTY_SQUADS: SquadSummary[] = [];

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
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(
    () => readTokenFromUrl() ?? localStorage.getItem(TOKEN_KEY)
  );
  const [expandedSquadIds, setExpandedSquadIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(
    null
  );
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
  // Set the moment the user sends a message from the empty "New Chat" state.
  // There's no real backend call behind it — it always plays the same demo
  // run (DEMO_SESSION), with only the request bubble reflecting what they
  // typed. Takes priority over any selected squad/session below.
  const [mockRequest, setMockRequest] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const squadFileInputRef = useRef<HTMLInputElement | null>(null);

  // The search field stays mounted for its collapse animation, so autoFocus
  // would only fire on the very first open.
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const isDemo = !IS_API_CONFIGURED;
  // Login is mandatory even in demo mode — the main screen never renders
  // without a token.
  const isAuthenticated = Boolean(token);

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
      finalResultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [graphSequenceDone]);

  const handleLogout = useCallback(() => {
    setToken(null);
    setExpandedSquadIds(new Set());
    setSelectedSquadId(null);
    setSelectedExecutionId(null);
    queryClient.clear();
  }, [queryClient]);

  const meQuery = useQuery({
    queryKey: ["me"] as const,
    queryFn: () => fetchMe(token!),
    enabled: !isDemo && !!token,
  });
  const squadsQuery = useQuery({
    queryKey: ["squads"] as const,
    queryFn: () => listSquads(token!),
    enabled: !isDemo && !!token,
  });
  const user: User | null = isDemo ? DEMO_USER : (meQuery.data ?? null);
  // A stable fallback reference — `?? []` would otherwise be a fresh array
  // every render, defeating the `useMemo`/`useQueries` below that key off it.
  const squads: SquadSummary[] = isDemo ? DEMO_SQUADS : (squadsQuery.data ?? EMPTY_SQUADS);

  const searchActive = searchQuery.trim().length > 0;

  // One query per squad, fetched once it's expanded (manually, or forced
  // open by an active search) — cached by squad id, so re-collapsing and
  // re-expanding doesn't refetch.
  const squadDetailQueries = useQueries({
    queries: squads.map((squad) => ({
      queryKey: ["squad", squad.id] as const,
      queryFn: () => getSquad(token!, squad.id),
      enabled: !isDemo && !!token && (expandedSquadIds.has(squad.id) || searchActive),
    })),
  });

  const sessionQuery = useQuery({
    queryKey: ["session", selectedSquadId, selectedExecutionId] as const,
    queryFn: () => getSession(token!, selectedSquadId!, selectedExecutionId!),
    enabled: !isDemo && !!token && !!selectedSquadId && !!selectedExecutionId,
  });

  const session: ActiveSession | null = useMemo(() => {
    if (mockRequest !== null) return { ...DEMO_SESSION, request: mockRequest };
    if (isDemo) return selectedExecutionId ? DEMO_SESSION : null;
    const detail = sessionQuery.data;
    if (!detail) return null;
    return {
      request: detail.request ?? detail.plan_title ?? "(제목 없음)",
      tasks: toTasks(detail),
      finalResult: detail.final_result,
      logs: toLogEntries(detail.timeline),
    };
  }, [mockRequest, isDemo, selectedExecutionId, sessionQuery.data]);

  const isSessionLoading =
    !isDemo && !!selectedExecutionId && !session && sessionQuery.isLoading;

  // Surface the first error across every in-flight query; an expired/invalid
  // token bounces straight to logout instead of showing an error banner.
  useEffect(() => {
    if (isDemo) return;
    const errors = [
      meQuery.error,
      squadsQuery.error,
      sessionQuery.error,
      ...squadDetailQueries.map((q) => q.error),
    ].filter((e): e is Error => e != null);
    const authError = errors.find((e) => e instanceof ApiError && e.status === 401);
    if (authError) {
      handleLogout();
      return;
    }
    if (errors[0]) setError(errors[0].message);
    // squadDetailQueries is a fresh array each render; its *contents*
    // (each query's .error) are what matter, and those are covered by the
    // other deps changing whenever an error actually appears/disappears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, meQuery.error, squadsQuery.error, sessionQuery.error, handleLogout]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadSquad(token!, file),
    onSuccess: ({ squad, warnings }) => {
      void queryClient.invalidateQueries({ queryKey: ["squads"] });
      setExpandedSquadIds((prev) => new Set(prev).add(squad.id));
      if (warnings.length > 0) {
        setError(
          `'${squad.squad_name ?? squad.id}' 업로드 완료 (경고 ${
            warnings.length
          }건): ${warnings.join(", ")}`
        );
      }
    },
    onError: (err) => setError(err instanceof Error ? err.message : String(err)),
  });

  const toggleSquad = (squadId: string) => {
    setExpandedSquadIds((prev) => {
      const next = new Set(prev);
      if (next.has(squadId)) next.delete(squadId);
      else next.add(squadId);
      return next;
    });
  };

  const selectSession = (squadId: string, executionId: string) => {
    setMockRequest(null);
    setSelectedSquadId(squadId);
    setSelectedExecutionId(executionId);
    setSelectedTaskId(null);
  };

  const handleNewSquadClick = () => {
    if (isDemo) {
      setError(
        "데모 모드에서는 스쿼드를 업로드할 수 없습니다. 백엔드 연결이 필요합니다."
      );
      return;
    }
    squadFileInputRef.current?.click();
  };

  const handleSquadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file || !token) return;
    setError(null);
    uploadMutation.mutate(file);
  };

  const goHome = () => {
    setMockRequest(null);
    setSelectedSquadId(null);
    setSelectedExecutionId(null);
  };

  const startChat = () => {
    const text = draft.trim();
    if (!text) return;
    setMockRequest(text);
    setSelectedTaskId(null);
    setGraphSequenceDone(false);
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
      squads.map((squad, i) => {
        const detailQuery = squadDetailQueries[i];
        const sessions = isDemo
          ? [{ id: DEMO_EXECUTION_ID, label: DEMO_SESSION.request }]
          : (detailQuery?.data?.sessions ?? []).map((s) => ({
              id: s.execution_id,
              label: s.request ?? s.execution_id,
            }));
        return {
          id: squad.id,
          name: squad.squad_name ?? squad.squad_id ?? squad.id,
          sessions,
          isLoading: detailQuery?.isLoading ?? false,
        };
      }),
    [squads, squadDetailQueries, isDemo]
  );

  const query = searchQuery.trim().toLowerCase();
  const filteredTree = query
    ? tree
        .map((squad) => ({
          ...squad,
          sessions: squad.sessions.filter((s) =>
            s.label.toLowerCase().includes(query)
          ),
        }))
        .filter(
          (s) => s.name.toLowerCase().includes(query) || s.sessions.length > 0
        )
    : tree;

  if (!isAuthenticated) {
    return (
      <Login
        onLoggedIn={(newToken, newUser) => {
          queryClient.setQueryData(["me"], newUser);
          setToken(newToken);
        }}
      />
    );
  }

  // A stored token isn't proof of login — hold the main screen until the
  // server confirms who it belongs to (a 401 bounces to logout above).
  if (!isDemo && !user) {
    return (
      <div className="auth-gate">
        {meQuery.isError ? (
          <>
            <p className="auth-gate__error">
              로그인 확인에 실패했습니다: {meQuery.error.message}
            </p>
            <button
              type="button"
              className="auth-gate__retry"
              onClick={handleLogout}
            >
              다시 로그인
            </button>
          </>
        ) : (
          <span className="auth-gate__spinner" aria-label="로그인 확인 중" />
        )}
      </div>
    );
  }

  return (
    <div className={`app${sidebarOpen ? "" : " is-sidebar-collapsed"}`}>
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.button
            type="button"
            className="sidebar-reopen"
            onClick={() => setSidebarOpen(true)}
            aria-label="사이드바 펼치기"
            initial={{ opacity: 0, x: -8 }}
            animate={{
              opacity: 1,
              x: 0,
              transition: { delay: 0.15, duration: 0.2 },
            }}
            exit={{ opacity: 0, x: -8, transition: { duration: 0.15 } }}
          >
            <img src={panelLeftIcon} alt="" width={20} height={20} />
          </motion.button>
        )}
      </AnimatePresence>

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
                <img src={searchIcon} alt="" width={16} height={16} />
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
          <div className={`reveal${searchOpen ? " reveal--open" : ""}`}>
            <div className="reveal__inner">
              <input
                ref={searchInputRef}
                className="sidebar__search"
                type="text"
                placeholder="검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <button className="new-chat" onClick={goHome}>
            <img src={writeIcon} alt="" width={16} height={16} />
            New Chat
          </button>
          <button
            className="new-record"
            onClick={handleNewSquadClick}
            disabled={uploadMutation.isPending}
          >
            <img src={folderIcon} alt="" width={16} height={16} />
            {uploadMutation.isPending ? "업로드 중..." : "New Squad"}
          </button>
          <input
            ref={squadFileInputRef}
            type="file"
            accept=".zip"
            onChange={handleSquadFileChange}
            style={{ display: "none" }}
          />
        </div>
        <div className="sidebar__chats">
          <div className="sidebar__projects-header">
            <span className="sidebar__projects-label">Projects</span>
            <button
              type="button"
              className="sidebar__icon-btn"
              onClick={() => setProjectsOpen((v) => !v)}
              aria-label={projectsOpen ? "프로젝트 목록 접기" : "프로젝트 목록 펼치기"}
            >
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
          </div>
          <div className={`reveal${projectsOpen ? " reveal--open" : ""}`}>
            <div className="reveal__inner">
              {filteredTree.length === 0 && (
                <p className="sidebar__search-empty">
                  {query ? "검색 결과가 없습니다." : "스쿼드가 없습니다."}
                </p>
              )}
              {filteredTree.map((squad) => {
                const isExpanded = query || expandedSquadIds.has(squad.id);
                return (
                  <div key={squad.id} className="project-group">
                    <button
                      type="button"
                      className="project-group__header"
                      onClick={() => toggleSquad(squad.id)}
                    >
                      <img src={folderIcon} alt="" width={14} height={14} />
                      {squad.name}
                      <img
                        src={chevronDownIcon}
                        alt=""
                        width={10}
                        height={10}
                        className={`sidebar__chevron${
                          isExpanded ? "" : " is-collapsed"
                        }`}
                        style={{ marginLeft: "auto" }}
                      />
                    </button>
                    <div
                      className={`reveal${isExpanded ? " reveal--open" : ""}`}
                    >
                      <div className="reveal__inner">
                        {squad.isLoading && squad.sessions.length === 0 ? (
                          <SessionListSkeleton />
                        ) : (
                          <div className="project-group__items">
                            {squad.sessions.map((item, i) => (
                              <motion.div
                                key={item.id}
                                className={`chat-item${
                                  item.id === selectedExecutionId
                                    ? " chat-item--active"
                                    : ""
                                }`}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  duration: 0.18,
                                  delay: Math.min(i, 6) * 0.03,
                                }}
                                onClick={() =>
                                  selectSession(squad.id, item.id)
                                }
                              >
                                {item.label}
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
                <div className="chat-msg chat-msg--user">
                  <TypewriterText text={session.request} />
                </div>
              </div>

              <TaskGraph
                key={
                  mockRequest !== null
                    ? `mock:${mockRequest}`
                    : selectedExecutionId
                }
                tasks={session.tasks}
                selectedId={selectedTaskId}
                onSelect={setSelectedTaskId}
                onSequenceComplete={() => setGraphSequenceDone(true)}
              />

              <AnimatePresence>
                {session.finalResult && graphSequenceDone && (
                  <motion.div
                    className="chat-row chat-row--agent"
                    ref={finalResultRef}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <div className="chat-msg chat-msg--agent">
                      <TypewriterText text={session.finalResult} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : isSessionLoading ? (
          <div className="canvas-scroll">
            <div className="canvas-stack">
              <TaskGraphSkeleton />
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
