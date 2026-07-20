"use client";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  BriefcaseBusiness,
  FolderKanban,
  Award,
  Globe2,
  ChartNoAxesCombined,
  Settings,
  Bell,
  Search,
  Plus,
  Upload,
  ArrowUpRight,
  ChevronDown,
  Target,
  CalendarDays,
  CircleCheck,
  Zap,
  Command,
  Menu,
  X,
  Check,
  TrendingUp,
  Clock3,
  WandSparkles,
  Moon,
  Sun,
} from "lucide-react";

const nav = [
  ["Dashboard", LayoutDashboard],
  ["My Resumes", FileText],
  ["AI Tools", Sparkles],
  ["Job Search", BriefcaseBusiness],
  ["Applications", FolderKanban],
  ["Projects", FolderKanban],
  ["Certificates", Award],
  ["Portfolio", Globe2],
  ["Analytics", ChartNoAxesCombined],
] as const;
type Job = {
  company: string;
  role: string;
  stage: string;
  date: string;
  color: string;
  initials: string;
};
type AtsBreakdown = {
  key: string;
  label: string;
  earned: number;
  maximum: number;
  detail: string;
};
type ResumeData = {
  id: string;
  filename: string;
  size_bytes: number;
  storage_url?: string;
  content_preview?: string;
  created_at: string;
  score?: number;
  strengths?: string[];
  improvements?: string[];
  keywords?: string[];
  ats_breakdown?: AtsBreakdown[];
};
type DashboardData = {
  stats: {
    resumes: number;
    applications: number;
    interviews: number;
    average_score: number | null;
  };
  applications: Array<{
    id: string;
    company: string;
    role: string;
    stage: string;
    location?: string;
    applied_at: string;
  }>;
};
const quick = [
  {
    title: "Analyze my resume",
    text: "Get an ATS score and clear fixes",
    icon: Target,
    tone: "violet",
  },
  {
    title: "Tailor for a job",
    text: "Match your resume to any role",
    icon: WandSparkles,
    tone: "blue",
  },
  {
    title: "Write a cover letter",
    text: "Personalized and ready to send",
    icon: FileText,
    tone: "orange",
  },
];
const modules: Record<string, { text: string; action: string }> = {
  "My Resumes": {
    text: "Create, upload, manage, and optimize every version of your resume.",
    action: "Upload resume",
  },
  "AI Tools": {
    text: "Analyze resumes, tailor applications, and generate compelling cover letters.",
    action: "Open AI workspace",
  },
  "Job Search": {
    text: "Discover relevant opportunities matched to your skills and goals.",
    action: "Search jobs",
  },
  Applications: {
    text: "Track every application from submission through offer.",
    action: "Add application",
  },
  Projects: {
    text: "Turn your best work into strong, measurable portfolio stories.",
    action: "Add project",
  },
  Certificates: {
    text: "Store credentials and automatically extract their details.",
    action: "Add certificate",
  },
  Portfolio: {
    text: "Publish a professional portfolio generated from your career profile.",
    action: "Create portfolio",
  },
  Analytics: {
    text: "Understand your applications, ATS performance, and career momentum.",
    action: "Export report",
  },
  Settings: {
    text: "Manage your profile, preferences, connected accounts, and privacy.",
    action: "Save settings",
  },
};

export default function Home() {
  const [active, setActive] = useState("Dashboard"),
    [mobile, setMobile] = useState(false),
    [toast, setToast] = useState(""),
    [modal, setModal] = useState(""),
    [filter, setFilter] = useState("All"),
    [query, setQuery] = useState(""),
    [profileOpen, setProfileOpen] = useState(false);
  const [dashboardPeriod, setDashboardPeriod] = useState<
    "week" | "month" | "all"
  >("week");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState({ name: "User", email: "" });
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [refresh, setRefresh] = useState(0),
    [resumes, setResumes] = useState<ResumeData[]>([]),
    [dashboard, setDashboard] = useState<DashboardData>({
      stats: {
        resumes: 0,
        applications: 0,
        interviews: 0,
        average_score: null,
      },
      applications: [],
    });
  const [jobResumeId, setJobResumeId] = useState("");
  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        setUser(data.user);
        setAuthenticated(true);
      })
      .catch(() => setAuthenticated(false));
  }, []);
  useEffect(() => {
    const saved = localStorage.getItem("clymbra-theme");
    const selected =
      saved === "dark" || saved === "light"
        ? saved
        : matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(selected);
    document.documentElement.dataset.theme = selected;
  }, []);
  useEffect(() => {
    if (!authenticated) return;
    Promise.all([
      fetch(`/api/dashboard?period=${dashboardPeriod}`).then((r) => r.json()),
      fetch("/api/resumes").then((r) => r.json()),
    ])
      .then(([dash, resumeData]) => {
        if (dash.stats) setDashboard(dash);
        if (resumeData.resumes) setResumes(resumeData.resumes);
      })
      .catch(() => act("Could not load dashboard data"));
  }, [authenticated, refresh, dashboardPeriod]);
  const act = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };
  const go = (name: string) => {
    setActive(name);
    setMobile(false);
    setProfileOpen(false);
  };
  const pipeline: Job[] = dashboard.applications.map((item, index) => ({
    company: item.company,
    role: item.role,
    stage: item.stage,
    date: String(item.applied_at).slice(0, 10),
    color: ["#7c3aed", "#2563eb", "#ea580c"][index % 3],
    initials: item.company
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
  }));
  const filtered =
    filter === "All" ? pipeline : pipeline.filter((j) => j.stage === filter);
  const login = (signedInUser: { name: string; email: string }) => {
    setUser(signedInUser);
    setAuthenticated(true);
  };
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setProfileOpen(false);
    setAuthenticated(false);
  };
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("clymbra-theme", next);
    document.documentElement.dataset.theme = next;
  };
  if (authenticated === null)
    return (
      <div className="authLoading">
        <span className="brandmark">
          <TrendingUp />
        </span>
      </div>
    );
  if (!authenticated)
    return (
      <>
        <button
          className="authThemeToggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <Moon /> : <Sun />}
        </button>
        <LoginScreen onLogin={login} />
      </>
    );
  return (
    <main className="shell">
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <div className="brand">
          <span className="brandmark">
            <TrendingUp size={19} />
          </span>
          <span>
            Clymbra <b>AI</b>
          </span>
          <button className="close" onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>
        <div className="navlabel">WORKSPACE</div>
        <nav>
          {nav.slice(0, 4).map(([n, I]) => (
            <button
              key={n}
              className={active === n ? "active" : ""}
              onClick={() => go(n)}
            >
              <I size={18} />
              {n}
              {n === "AI Tools" && <span className="new">NEW</span>}
            </button>
          ))}
        </nav>
        <div className="navlabel">MANAGE</div>
        <nav>
          {nav.slice(4).map(([n, I]) => (
            <button
              key={n}
              className={active === n ? "active" : ""}
              onClick={() => go(n)}
            >
              <I size={18} />
              {n}
            </button>
          ))}
        </nav>
        <div className="sidebarBottom">
          <button onClick={() => go("Settings")}>
            <Settings size={18} />
            Settings
          </button>
          <button
            className="profile"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <div className="avatar">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <b>{user.name}</b>
              <small>{user.email}</small>
            </div>
            <ChevronDown size={16} />
          </button>
          {profileOpen && (
            <div className="profileMenu">
              <button onClick={() => go("Settings")}>Account settings</button>
              <button onClick={logout}>Sign out</button>
            </div>
          )}
        </div>
      </aside>
      {mobile && <div className="overlay" onClick={() => setMobile(false)} />}
      <section className="content">
        <header>
          <button className="menu" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) {
                go("Job Search");
                act(`Searching for “${query}”`);
              }
            }}
          >
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs, resumes, skills..."
            />
            <kbd>
              <Command size={12} /> K
            </kbd>
          </form>
          <div className="headActions">
            <button
              className="iconBtn themeToggle"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              onClick={toggleTheme}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              className="iconBtn"
              aria-label="Notifications"
              onClick={() => setModal("Notifications")}
            >
              <Bell size={19} />
              <i />
            </button>
            <button
              className="primary"
              onClick={() => setModal("Upload resume")}
            >
              <Plus size={17} /> Add resume
            </button>
          </div>
        </header>
        <div className="page">
          {active === "Dashboard" ? (
            <>
              <div className="welcome">
                <div>
                  <p>YOUR CAREER WORKSPACE</p>
                  <h1>
                    Welcome, {user.name.split(" ")[0]} <span>👋</span>
                  </h1>
                  <h2>
                    Your dashboard reflects the selected reporting period.
                  </h2>
                </div>
                <label className="periodSelect">
                  <CalendarDays size={17} />
                  <select
                    value={dashboardPeriod}
                    onChange={(event) =>
                      setDashboardPeriod(
                        event.target.value as "week" | "month" | "all",
                      )
                    }
                  >
                    <option value="week">This week</option>
                    <option value="month">This month</option>
                    <option value="all">All time</option>
                  </select>
                  <ChevronDown size={15} />
                </label>
              </div>
              <div className="hero">
                <div className="heroCopy">
                  <span className="pill">
                    <TrendingUp size={13} /> CLIMB SMARTER. LAND FASTER.
                  </span>
                  <h3>
                    Build a resume that
                    <br />
                    gets you <em>noticed.</em>
                  </h3>
                  <p>
                    Upload your resume to receive an ATS score and personalized
                    feedback.
                  </p>
                  <div>
                    <button
                      className="whiteBtn"
                      onClick={() => setModal("Upload resume")}
                    >
                      <Upload size={17} /> Upload resume
                    </button>
                  </div>
                </div>
                <div className="scoreWrap">
                  <div className="rings">
                    <svg viewBox="0 0 140 140">
                      <circle cx="70" cy="70" r="57" />
                    </svg>
                    <div>
                      <strong>{dashboard.stats.average_score ?? "—"}</strong>
                      <span>
                        {dashboard.stats.average_score === null
                          ? "NO SCORE YET"
                          : "ATS SCORE"}
                      </span>
                    </div>
                  </div>
                  <small>
                    {dashboard.stats.average_score === null
                      ? "Upload a resume to begin"
                      : "Average resume score"}
                  </small>
                </div>
              </div>
              <div className="stats">
                <Stat
                  icon={FileText}
                  tone="violet"
                  label="ACTIVE RESUMES"
                  value={String(dashboard.stats.resumes)}
                  note={
                    dashboard.stats.resumes ? "Saved in Neon" : "No resumes yet"
                  }
                />
                <Stat
                  icon={BriefcaseBusiness}
                  tone="blue"
                  label="APPLICATIONS"
                  value={String(dashboard.stats.applications)}
                  note={
                    dashboard.stats.applications
                      ? "Applications tracked"
                      : "No applications yet"
                  }
                />
                <Stat
                  icon={CalendarDays}
                  tone="orange"
                  label="INTERVIEWS"
                  value={String(dashboard.stats.interviews)}
                  note={
                    dashboard.stats.interviews
                      ? "Interviews scheduled"
                      : "No interviews yet"
                  }
                />
                <Stat
                  icon={Target}
                  tone="green"
                  label="AVG. ATS SCORE"
                  value={
                    dashboard.stats.average_score === null
                      ? "—"
                      : `${dashboard.stats.average_score}%`
                  }
                  note={
                    dashboard.stats.average_score === null
                      ? "Not calculated"
                      : "From saved analyses"
                  }
                />
              </div>
              <div className="grid">
                <section className="card applications">
                  <div className="cardHead">
                    <div>
                      <h3>Application pipeline</h3>
                      <p>Keep track of every opportunity</p>
                    </div>
                    <button onClick={() => go("Applications")}>
                      View all <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <div className="tabs">
                    {["All", "Applied", "Interview", "Offer"].map((n) => (
                      <button
                        key={n}
                        className={filter === n ? "selected" : ""}
                        onClick={() => setFilter(n)}
                      >
                        {n}{" "}
                        <b>
                          {n === "All"
                            ? pipeline.length
                            : pipeline.filter((job) => job.stage === n).length}
                        </b>
                      </button>
                    ))}
                  </div>
                  <div className="jobs">
                    {filtered.length ? (
                      filtered.map((j, i) => (
                        <div className="job" key={`${j.company}-${j.role}`}>
                          <span
                            className="company"
                            style={{ background: j.color }}
                          >
                            {j.initials}
                          </span>
                          <p>
                            <b>{j.role}</b>
                            <small>
                              {j.company} · {i % 2 ? "Remote" : "Bengaluru"}
                            </small>
                          </p>
                          <span className={"stage " + j.stage.toLowerCase()}>
                            <i />
                            {j.stage}
                          </span>
                          <time>
                            <Clock3 size={14} />
                            {j.date}
                          </time>
                          <button onClick={() => go("Applications")}>
                            •••
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="empty">
                        No applications yet. Add your first application to start
                        tracking progress.
                      </div>
                    )}
                  </div>
                </section>
                <section className="card quick">
                  <div className="cardHead">
                    <div>
                      <h3>Quick actions</h3>
                      <p>Powered by Clymbra AI</p>
                    </div>
                    <Sparkles className="spark" size={19} />
                  </div>
                  {quick.map((q) => (
                    <button
                      key={q.title}
                      onClick={() =>
                        go(
                          q.title === "Analyze my resume"
                            ? "My Resumes"
                            : q.title === "Tailor for a job"
                              ? "Job Search"
                              : "AI Tools",
                        )
                      }
                    >
                      <span className={"quickIcon " + q.tone}>
                        <q.icon />
                      </span>
                      <p>
                        <b>{q.title}</b>
                        <small>{q.text}</small>
                      </p>
                      <ArrowUpRight size={17} />
                    </button>
                  ))}
                  <div className="credits">
                    <span>
                      <Zap size={14} /> AI tools connected
                    </span>
                    <button onClick={() => go("AI Tools")}>Open</button>
                  </div>
                </section>
                <section className="card progressCard">
                  <div className="cardHead">
                    <div>
                      <h3>Profile strength</h3>
                      <p>Complete your profile to stand out</p>
                    </div>
                    <strong>0%</strong>
                  </div>
                  <div className="longbar">
                    <i style={{ width: "0%" }} />
                  </div>
                  <div className="checks">
                    <button className="missing" onClick={() => go("Settings")}>
                      <Plus /> Add personal information
                    </button>
                    <button className="missing" onClick={() => go("Settings")}>
                      <Plus /> Add work experience
                    </button>
                    <button className="missing" onClick={() => go("Settings")}>
                      <Plus /> Add skills
                    </button>
                    <button
                      className="missing"
                      onClick={() => go("Certificates")}
                    >
                      <Plus /> Add certifications
                    </button>
                  </div>
                </section>
                <section className="card activity">
                  <div className="cardHead">
                    <div>
                      <h3>Career activity</h3>
                      <p>Your progress will appear here</p>
                    </div>
                    <button onClick={() => go("Analytics")}>
                      Analytics <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <div className="empty activityEmpty">
                    <ChartNoAxesCombined />
                    <span>
                      <b>No activity yet</b>
                      <small>
                        Resume analyses and applications will build your chart.
                      </small>
                    </span>
                  </div>
                </section>
              </div>
            </>
          ) : active === "My Resumes" ? (
            <ResumesPage
              resumes={resumes}
              upload={() => setModal("Upload resume")}
              changed={() => setRefresh((value) => value + 1)}
              suggest={(id) => {
                setJobResumeId(id);
                go("Job Search");
              }}
            />
          ) : active === "Job Search" ? (
            <JobSearch
              initialQuery={query}
              resumes={resumes}
              initialResumeId={jobResumeId}
              applicationSaved={() => setRefresh((value) => value + 1)}
            />
          ) : active === "AI Tools" ? (
            <CoverLetterWorkspace resumes={resumes} />
          ) : active === "Applications" ? (
            <ApplicationsPage
              changed={() => setRefresh((value) => value + 1)}
            />
          ) : active === "Projects" ? (
            <WorkspaceItems kind="projects" />
          ) : active === "Certificates" ? (
            <WorkspaceItems kind="certificates" />
          ) : active === "Portfolio" ? (
            <PortfolioPage />
          ) : active === "Analytics" ? (
            <AnalyticsPage />
          ) : active === "Settings" ? (
            <SettingsPage />
          ) : (
            <ModulePage
              name={active}
              info={modules[active]}
              onAction={() => setModal(modules[active]?.action || active)}
            />
          )}
        </div>
      </section>
      {toast && (
        <div className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
      {modal &&
        (modal === "Upload resume" ? (
          <UploadResumeModal
            close={() => setModal("")}
            done={(message) => {
              setModal("");
              setRefresh((value) => value + 1);
              act(message);
            }}
          />
        ) : (
          <ActionModal
            title={modal}
            close={() => setModal("")}
            done={(m) => {
              setModal("");
              act(m);
            }}
          />
        ))}
    </main>
  );
}

function LoginScreen({
  onLogin,
}: {
  onLogin: (user: { name: string; email: string }) => void;
}) {
  const [showPassword, setShowPassword] = useState(false),
    [mode, setMode] = useState<"login" | "signup">("login"),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const submit = async (form: HTMLFormElement) => {
    const data = new FormData(form),
      email = String(data.get("email")).trim().toLowerCase(),
      password = String(data.get("password")),
      name = String(data.get("name") || "");
    setError("");
    setSuccess("");
    try {
      const response = await fetch(
        mode === "signup" ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Unable to continue.");
        return;
      }
      onLogin(result.user);
    } catch {
      setError("The server is unavailable. Please try again.");
    }
  };
  return (
    <main className="authPage">
      <section className="authStory">
        <div className="authBrand">
          <span className="brandmark">
            <TrendingUp size={19} />
          </span>
          <span>
            Clymbra <b>AI</b>
          </span>
        </div>
        <div className="storyCopy">
          <span className="pill">
            <Sparkles size={13} /> YOUR AI CAREER COPILOT
          </span>
          <h1>
            Climb smarter.
            <br />
            <em>Land faster.</em>
          </h1>
          <p>
            Build stronger resumes, find better opportunities, and take control
            of every step in your career journey.
          </p>
          <div className="proof">
            <span>
              <Check /> ATS-ready resumes
            </span>
            <span>
              <Check /> Personalized job matches
            </span>
            <span>
              <Check /> AI-powered career insights
            </span>
          </div>
        </div>
        <small>© 2026 Clymbra AI. Your career, elevated.</small>
      </section>
      <section className="authPanel">
        <div className="authBox">
          <div className="mobileAuthBrand">
            <span className="brandmark">
              <TrendingUp size={19} />
            </span>
            Clymbra <b>AI</b>
          </div>
          <p className="eyebrow">WELCOME TO CLYMBRA</p>
          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p>
            {mode === "login"
              ? "Sign in to continue building your career."
              : "Start climbing toward your next opportunity."}
          </p>
          {error && <div className="authMessage error">{error}</div>}
          {success && <div className="authMessage success">{success}</div>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(e.currentTarget);
            }}
          >
            {mode === "signup" && (
              <label>
                Full name
                <input
                  name="name"
                  type="text"
                  placeholder="Arjun Sharma"
                  required
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <div className="passwordField">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            {mode === "login" && (
              <div className="authOptions">
                <label>
                  <input type="checkbox" /> Remember me
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setError(
                      "Password recovery is unavailable in local demo mode.",
                    )
                  }
                >
                  Forgot password?
                </button>
              </div>
            )}
            <button className="authSubmit" type="submit">
              {mode === "login" ? "Sign in to Clymbra" : "Create account"}{" "}
              <ArrowUpRight size={17} />
            </button>
          </form>
          <p className="switchAuth">
            {mode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
                setSuccess("");
              }}
            >
              {mode === "login" ? "Create one" : "Sign in"}
            </button>
          </p>
          <small className="terms">
            This local demo stores the account only in this browser.
          </small>
        </div>
      </section>
    </main>
  );
}

function Stat({
  icon: Icon,
  tone,
  label,
  value,
  note,
}: {
  icon: typeof FileText;
  tone: string;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div>
      <span className={"statIcon " + tone}>
        <Icon />
      </span>
      <p>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>
          <TrendingUp /> {note}
        </em>
      </p>
    </div>
  );
}
function ModulePage({
  name,
  info,
  onAction,
}: {
  name: string;
  info?: { text: string; action: string };
  onAction: () => void;
}) {
  const Icon = nav.find(([n]) => n === name)?.[1] || Settings;
  return (
    <section className="modulePage">
      <div className="moduleHero">
        <span>
          <Icon />
        </span>
        <div>
          <p>CLYMBRA WORKSPACE</p>
          <h1>{name}</h1>
          <h2>{info?.text}</h2>
        </div>
        <button className="primary" onClick={onAction}>
          <Plus size={17} />
          {info?.action}
        </button>
      </div>
      <div className="moduleEmpty">
        <Icon />
        <h3>Your {name.toLowerCase()} workspace is ready</h3>
        <p>
          Use the button above to add your first item. Your saved content will
          appear here.
        </p>
        <button onClick={onAction}>{info?.action}</button>
      </div>
    </section>
  );
}

function UploadResumeModal({
  close,
  done,
}: {
  close: () => void;
  done: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (form: HTMLFormElement) => {
    const file = new FormData(form).get("file");
    if (file instanceof File && file.size > 4 * 1024 * 1024) {
      setError("Resume must be 4 MB or smaller for web upload.");
      return;
    }
    setBusy(true);
    setError("");
    const data = new FormData(form);
    try {
      const response = await fetch("/api/resumes", {
        method: "POST",
        body: data,
      });
      const raw = await response.text();
      let result: { error?: string; analysis?: { score: number }; warning?: string } = {};
      try {
        result = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(
          `Upload server returned an invalid response (${response.status}).`,
        );
      }
      if (!response.ok)
        throw new Error(result.error || `Upload failed (${response.status})`);
      if (!result.analysis)
        throw new Error(
          "The resume was uploaded but no analysis was returned.",
        );
      done(result.warning || `Resume analyzed — ATS score ${result.analysis.score}%`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload failed");
      setBusy(false);
    }
  };
  return (
    <div className="modalBack">
      <section className="modal">
        <button className="modalClose" onClick={close}>
          <X />
        </button>
        <span className="modalIcon">
          <Upload />
        </span>
        <h2>Upload and analyze resume</h2>
        <p>
          PDF, DOCX, or TXT. Text is extracted, analyzed, and saved
          automatically.
        </p>
        {error && <div className="authMessage error">{error}</div>}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit(event.currentTarget);
          }}
        >
          <label className="dropzone">
            <Upload />
            <b>Choose your resume</b>
            <small>PDF, DOCX, or TXT · up to 4 MB</small>
            <input name="file" type="file" accept=".pdf,.docx,.txt" required />
          </label>
          <button className="submit" disabled={busy}>
            {busy ? "Uploading and analyzing…" : "Upload and analyze"}{" "}
            <ArrowUpRight size={16} />
          </button>
        </form>
      </section>
    </div>
  );
}

function ResumesPage({
  resumes,
  upload,
  changed,
  suggest,
}: {
  resumes: ResumeData[];
  upload: () => void;
  changed: () => void;
  suggest: (id: string) => void;
}) {
  const viewUrl = (resume: ResumeData) =>
    resume.filename.toLowerCase().endsWith(".docx") && resume.storage_url
      ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(resume.storage_url)}`
      : `/api/resumes/${resume.id}/view`;
  const [pendingDelete, setPendingDelete] = useState<ResumeData | null>(null),
    [deleting, setDeleting] = useState(false),
    [deleteError, setDeleteError] = useState("");
  const remove = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/resumes/${pendingDelete.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Delete failed");
      setPendingDelete(null);
      changed();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };
  return (
    <section className="modulePage">
      <div className="moduleHero">
        <span>
          <FileText />
        </span>
        <div>
          <p>CLYMBRA WORKSPACE</p>
          <h1>My Resumes</h1>
          <h2>Upload a CV, then find jobs ranked by job-specific ATS match.</h2>
        </div>
        <button className="primary" onClick={upload}>
          <Plus size={17} />
          Upload resume
        </button>
      </div>
      {resumes.length === 0 ? (
        <div className="moduleEmpty">
          <FileText />
          <h3>No resumes uploaded</h3>
          <p>Upload a PDF, DOCX, or TXT resume to find matching jobs.</p>
          <button onClick={upload}>Upload resume</button>
        </div>
      ) : (
        <div className="resultGrid">
          {resumes.map((resume) => (
            <article className="resultCard" key={resume.id}>
              <div className="resultTitle">
                <FileText />
                <div>
                  <h3>{resume.filename}</h3>
                  <small>
                    {new Date(resume.created_at).toLocaleDateString()} ·{" "}
                    {Math.ceil(resume.size_bytes / 1024)} KB
                  </small>
                </div>
              </div>
              {Boolean(resume.keywords?.length) && (
                <div className="keywordList">
                  {resume.keywords!.map((keyword) => (
                    <span key={keyword}>{keyword}</span>
                  ))}
                </div>
              )}
              <button
                className="suggestJobs"
                onClick={() => suggest(resume.id)}
              >
                <Sparkles size={15} />
                Find suggested jobs for this CV
              </button>
              <h4>Resume quality feedback</h4>
              <ul>
                {[
                  ...(resume.strengths || []),
                  ...(resume.improvements || []),
                ].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {resume.content_preview && (
                <details className="resumePreview">
                  <summary>Preview extracted CV text</summary>
                  <p>{resume.content_preview}</p>
                </details>
              )}
              <div className="resumeLinks">
                {resume.storage_url && (
                  <>
                    <a href={viewUrl(resume)} target="_blank" rel="noreferrer">
                      View resume <ArrowUpRight size={14} />
                    </a>
                    <a href={`/api/resumes/${resume.id}/download`}>
                      Download original
                    </a>
                  </>
                )}
                <button
                  className="deleteResume"
                  onClick={() => {
                    setDeleteError("");
                    setPendingDelete(resume);
                  }}
                >
                  Delete resume
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {pendingDelete && (
        <DeleteResumeModal
          filename={pendingDelete.filename}
          busy={deleting}
          error={deleteError}
          cancel={() => setPendingDelete(null)}
          confirm={() => void remove()}
        />
      )}
    </section>
  );
}

function DeleteResumeModal({
  filename,
  busy,
  error,
  cancel,
  confirm,
}: {
  filename: string;
  busy: boolean;
  error: string;
  cancel: () => void;
  confirm: () => void;
}) {
  return (
    <div
      className="modalBack"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) cancel();
      }}
    >
      <section className="confirmModal">
        <span className="dangerIcon">
          <FileText />
        </span>
        <h2>Delete this resume?</h2>
        <p>
          <b>{filename}</b> and its ATS analyses, tailored versions, and stored
          file will be permanently removed.
        </p>
        {error && <div className="authMessage error">{error}</div>}
        <div>
          <button onClick={cancel} disabled={busy}>
            Keep resume
          </button>
          <button className="dangerButton" onClick={confirm} disabled={busy}>
            {busy ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </section>
    </div>
  );
}

type SearchJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: string;
  createdAt?: string;
  matchScore?: number;
  matchedKeywords?: string[];
};
function JobSearch({
  initialQuery,
  resumes,
  initialResumeId,
  applicationSaved,
}: {
  initialQuery: string;
  resumes: ResumeData[];
  initialResumeId: string;
  applicationSaved: () => void;
}) {
  const [query, setQuery] = useState(initialQuery || "software engineer"),
    [location, setLocation] = useState("India"),
    [resumeId, setResumeId] = useState(initialResumeId || resumes[0]?.id || ""),
    [jobs, setJobs] = useState<SearchJob[]>([]),
    [resumeKeywords, setResumeKeywords] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [tailoring, setTailoring] = useState(""),
    [tailored, setTailored] = useState<{
      id: string;
      content: string;
      filename: string;
    } | null>(null);
  const search = async () => {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({ q: query, location });
      if (resumeId) params.set("resumeId", resumeId);
      const response = await fetch(`/api/jobs?${params}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Search failed");
      setJobs(result.jobs);
      setResumeKeywords(result.resumeKeywords || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void search();
  }, []);
  const apply = async (job: SearchJob) => {
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        company: job.company,
        role: job.title,
        stage: "Applied",
        location: job.location,
        jobUrl: job.url,
      }),
    });
    if (response.ok) {
      applicationSaved();
      window.open(job.url, "_blank", "noopener,noreferrer");
    } else {
      const result = await response.json();
      setError(result.error || "Could not track this application");
    }
  };
  const tailor = async (job: SearchJob) => {
    if (!resumeId) {
      setError("Select a resume before creating a tailored CV.");
      return;
    }
    setTailoring(job.id);
    setError("");
    try {
      const response = await fetch(`/api/resumes/${resumeId}/tailor`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: job.title,
          company: job.company,
          description: job.description,
          jobUrl: job.url,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Tailoring failed");
      setTailored(result.tailoredResume);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Tailoring failed");
    } finally {
      setTailoring("");
    }
  };
  return (
    <section className="modulePage">
      <div className="moduleHero">
        <span>
          <BriefcaseBusiness />
        </span>
        <div>
          <p>RESUME-MATCHED JOB SEARCH</p>
          <h1>Find suitable jobs</h1>
          <h2>Each percentage is this CV's ATS match against that job.</h2>
        </div>
      </div>
      <form
        className="jobSearchForm"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <select
          value={resumeId}
          onChange={(event) => setResumeId(event.target.value)}
        >
          <option value="">Search without a resume</option>
          {resumes.map((resume) => (
            <option value={resume.id} key={resume.id}>
              {resume.filename}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Role or keywords"
        />
        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Location"
        />
        <button className="primary" disabled={busy}>
          <Search size={17} />
          {busy ? "Matching…" : "Find matching jobs"}
        </button>
      </form>
      {resumeKeywords.length > 0 && (
        <div className="matchedSkills">
          <b>Resume keywords:</b>
          {resumeKeywords.map((keyword) => (
            <span key={keyword}>{keyword}</span>
          ))}
        </div>
      )}
      {error && <div className="authMessage error">{error}</div>}
      <div className="resultGrid">
        {jobs.map((job) => (
          <article className="resultCard" key={job.id}>
            <div className="resultTitle">
              <BriefcaseBusiness />
              <div>
                <h3>{job.title}</h3>
                <small>
                  {job.company} · {job.location}
                </small>
              </div>
              {job.matchScore !== undefined ? (
                <strong>{job.matchScore}%</strong>
              ) : (
                <em>{job.source}</em>
              )}
            </div>
            {Boolean(job.matchedKeywords?.length) && (
              <div className="keywordList">
                {job.matchedKeywords!.map((keyword) => (
                  <span key={keyword}>{keyword}</span>
                ))}
              </div>
            )}
            <p>
              {job.description.replace(/<[^>]*>/g, "").slice(0, 300)}
              {job.description.length > 300 ? "…" : ""}
            </p>
            <div className="jobActions">
              <button onClick={() => void apply(job)}>Apply and track</button>
              <button
                className="tailorBtn"
                disabled={tailoring === job.id}
                onClick={() => void tailor(job)}
              >
                <Sparkles size={13} />
                {tailoring === job.id ? "Creating…" : "Create tailored CV"}
              </button>
              <a href={job.url} target="_blank" rel="noreferrer">
                Details <ArrowUpRight size={13} />
              </a>
            </div>
          </article>
        ))}
      </div>
      {!busy && !error && jobs.length === 0 && (
        <div className="moduleEmpty">
          <Search />
          <h3>No jobs found</h3>
          <p>Try a broader role or location.</p>
        </div>
      )}
      {tailored && (
        <TailoredResumeModal data={tailored} close={() => setTailored(null)} />
      )}
    </section>
  );
}

function TailoredResumeModal({
  data,
  close,
}: {
  data: { id: string; content: string; filename: string };
  close: () => void;
}) {
  return (
    <div className="modalBack">
      <section className="modal tailoredModal">
        <button className="modalClose" onClick={close}>
          <X />
        </button>
        <span className="modalIcon">
          <Sparkles />
        </span>
        <h2>AI-tailored resume</h2>
        <p>
          This version is saved in Generated document history. Review every line
          before applying.
        </p>
        <textarea readOnly value={data.content} />
        <div className="tailoredActions">
          <button
            onClick={() => void navigator.clipboard.writeText(data.content)}
          >
            Copy text
          </button>
          <a href={`/api/tailored-resumes/${data.id}/download`}>
            Download DOCX
          </a>
        </div>
      </section>
    </div>
  );
}

type CoverLetterResult = {
  id: string;
  coverLetter: string;
  emailSubject: string;
  emailBody: string;
  hrEmail: string;
  filename: string;
  company: string;
  jobTitle: string;
};
type GeneratedDocument = {
  id: string;
  type: "cover-letter" | "tailored-resume";
  company: string;
  title: string;
  content: string;
  email_subject?: string;
  email_body?: string;
  created_at: string;
};
function CoverLetterWorkspace({ resumes }: { resumes: ResumeData[] }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<CoverLetterResult | null>(null),
    [historyRefresh, setHistoryRefresh] = useState(0);
  const generate = async (form: HTMLFormElement) => {
    const values = Object.fromEntries(new FormData(form));
    const resumeId = String(values.resumeId || "");
    if (!resumeId) {
      setError("Select a resume.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/resumes/${resumeId}/cover-letter`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed");
      setResult(data.coverLetter);
      setHistoryRefresh((value) => value + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };
  const copy = (text: string) => void navigator.clipboard.writeText(text);
  return (
    <section className="modulePage">
      <div className="moduleHero">
        <span>
          <Sparkles />
        </span>
        <div>
          <p>AI APPLICATION WRITER</p>
          <h1>Cover letter and HR email</h1>
          <h2>
            Generate a professional application package grounded in your
            uploaded resume.
          </h2>
        </div>
      </div>
      <div className="coverWorkspace">
        <form
          className="coverForm"
          onSubmit={(event) => {
            event.preventDefault();
            void generate(event.currentTarget);
          }}
        >
          <label>
            Resume
            <select name="resumeId" required defaultValue="">
              <option value="" disabled>
                Select an uploaded resume
              </option>
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.filename}
                </option>
              ))}
            </select>
          </label>
          <div>
            <label>
              Target role
              <input
                name="jobTitle"
                placeholder="e.g. Product Designer"
                required
              />
            </label>
            <label>
              Company
              <input
                name="company"
                placeholder="e.g. Acme Technologies"
                required
              />
            </label>
          </div>
          <div>
            <label>
              HR or recruiter name
              <input name="hrName" placeholder="Optional" />
            </label>
            <label>
              HR email
              <input name="hrEmail" type="email" placeholder="Optional" />
            </label>
          </div>
          <label>
            Job description
            <textarea
              name="jobDescription"
              placeholder="Paste the complete job description here"
              required
            />
          </label>
          {error && <div className="authMessage error">{error}</div>}
          <button className="primary" disabled={busy || resumes.length === 0}>
            <Sparkles size={16} />
            {busy
              ? "Generating application package…"
              : "Generate cover letter and email"}
          </button>
        </form>
        {result ? (
          <div className="coverResult">
            <div className="coverResultHead">
              <div>
                <p>GENERATED APPLICATION</p>
                <h2>
                  {result.jobTitle} · {result.company}
                </h2>
              </div>
              <a href={`/api/cover-letters/${result.id}/download`}>
                Download DOCX
              </a>
            </div>
            <h3>Professional cover letter</h3>
            <pre>{result.coverLetter}</pre>
            <button onClick={() => copy(result.coverLetter)}>
              Copy cover letter
            </button>
            <h3>HR email subject</h3>
            <div className="copyField">
              <span>{result.emailSubject}</span>
              <button onClick={() => copy(result.emailSubject)}>Copy</button>
            </div>
            <h3>HR email body</h3>
            <pre>{result.emailBody}</pre>
            <div className="coverActions">
              <button onClick={() => copy(result.emailBody)}>Copy email</button>
              {result.hrEmail && (
                <a
                  href={`mailto:${result.hrEmail}?subject=${encodeURIComponent(result.emailSubject)}&body=${encodeURIComponent(result.emailBody)}`}
                >
                  Open in email app
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="coverPlaceholder">
            <FileText />
            <h3>Your generated package will appear here</h3>
            <p>
              It will include a formatted cover letter, HR email subject, and
              email body.
            </p>
          </div>
        )}
      </div>
      <GeneratedDocumentsHistory refresh={historyRefresh} />
    </section>
  );
}

function GeneratedDocumentsHistory({ refresh }: { refresh: number }) {
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [selected, setSelected] = useState<GeneratedDocument | null>(null);
  useEffect(() => {
    fetch("/api/generated-documents")
      .then((response) => response.json())
      .then((data) => setDocuments(data.documents || []));
  }, [refresh]);
  const download = (item: GeneratedDocument) =>
    item.type === "cover-letter"
      ? `/api/cover-letters/${item.id}/download`
      : `/api/tailored-resumes/${item.id}/download`;
  return (
    <section className="documentHistory">
      <div className="historyHead">
        <div><p>SAVED FOR REUSE</p><h2>Generated document history</h2></div>
        <span>{documents.length} document{documents.length === 1 ? "" : "s"}</span>
      </div>
      {documents.length === 0 ? <p className="historyEmpty">Your generated cover letters and tailored resumes will be saved here.</p> : (
        <div className="historyGrid">{documents.map((item) => (
          <article key={`${item.type}-${item.id}`}>
            <div><em>{item.type === "cover-letter" ? "Cover letter" : "Tailored resume"}</em><h3>{item.title}</h3><p>{item.company} · {new Date(item.created_at).toLocaleDateString()}</p></div>
            <div><button onClick={() => setSelected(item)}>Preview</button><button onClick={() => void navigator.clipboard.writeText(item.content)}>Copy</button><a href={download(item)}>DOCX</a></div>
          </article>
        ))}</div>
      )}
      {selected && <div className="modalBack"><section className="modal tailoredModal"><button className="modalClose" onClick={() => setSelected(null)}><X /></button><span className="modalIcon"><FileText /></span><h2>{selected.title}</h2><p>{selected.company} · {selected.type === "cover-letter" ? "Cover letter" : "Tailored resume"}</p><textarea readOnly value={selected.content} /><div className="tailoredActions"><button onClick={() => void navigator.clipboard.writeText(selected.content)}>Copy text</button><a href={download(selected)}>Download DOCX</a></div></section></div>}
    </section>
  );
}

type ApplicationItem = {
  id: string;
  company: string;
  role: string;
  stage: string;
  location?: string;
  job_url?: string;
  applied_at: string;
};
function ApplicationsPage({ changed }: { changed: () => void }) {
  const [items, setItems] = useState<ApplicationItem[]>([]),
    [error, setError] = useState("");
  const load = () =>
    fetch("/api/applications")
      .then((r) => r.json())
      .then((data) => setItems(data.applications || []));
  useEffect(() => {
    void load();
  }, []);
  const add = async (form: HTMLFormElement) => {
    const values = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    form.reset();
    await load();
    changed();
  };
  const stage = async (id: string, value: string) => {
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage: value }),
    });
    await load();
    changed();
  };
  const remove = async (id: string) => {
    await fetch(`/api/applications/${id}`, { method: "DELETE" });
    await load();
    changed();
  };
  return (
    <section className="modulePage">
      <div className="moduleHero">
        <span>
          <FolderKanban />
        </span>
        <div>
          <p>APPLICATION TRACKER</p>
          <h1>Applications</h1>
          <h2>Track every role from application to offer.</h2>
        </div>
      </div>
      <form
        className="inlineCreate"
        onSubmit={(e) => {
          e.preventDefault();
          void add(e.currentTarget);
        }}
      >
        <input name="company" placeholder="Company" required />
        <input name="role" placeholder="Role" required />
        <input name="location" placeholder="Location" />
        <input name="jobUrl" type="url" placeholder="Job URL" />
        <button>Add application</button>
      </form>
      {error && <div className="authMessage error">{error}</div>}
      <div className="workspaceList">
        {items.map((item) => (
          <article key={item.id}>
            <div>
              <h3>{item.role}</h3>
              <p>
                {item.company} · {item.location || "Location not set"} ·{" "}
                {String(item.applied_at).slice(0, 10)}
              </p>
            </div>
            <select
              value={item.stage}
              onChange={(e) => void stage(item.id, e.target.value)}
            >
              {["Applied", "Interview", "Offer", "Rejected"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            {item.job_url && (
              <a href={item.job_url} target="_blank" rel="noreferrer">
                Open job
              </a>
            )}
            <button className="rowDelete" onClick={() => void remove(item.id)}>
              Delete
            </button>
          </article>
        ))}
        {items.length === 0 && (
          <div className="moduleEmpty">
            <FolderKanban />
            <h3>No applications yet</h3>
            <p>Add one above or use “Apply and track” from Job Search.</p>
          </div>
        )}
      </div>
    </section>
  );
}

type GenericItem = {
  id: string;
  title?: string;
  description?: string;
  technologies?: string;
  project_url?: string;
  name?: string;
  issuer?: string;
  issued_at?: string;
  credential_url?: string;
};
function WorkspaceItems({ kind }: { kind: "projects" | "certificates" }) {
  const [items, setItems] = useState<GenericItem[]>([]),
    [error, setError] = useState("");
  const certificate = kind === "certificates";
  const load = () =>
    fetch(`/api/${kind}`)
      .then((r) => r.json())
      .then((data) => setItems(data.items || []));
  useEffect(() => {
    void load();
  }, [kind]);
  const add = async (form: HTMLFormElement) => {
    const values = Object.fromEntries(new FormData(form));
    const response = await fetch(`/api/${kind}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    form.reset();
    await load();
  };
  const remove = async (id: string) => {
    await fetch(`/api/${kind}/${id}`, { method: "DELETE" });
    await load();
  };
  const Icon = certificate ? Award : FolderKanban;
  return (
    <section className="modulePage">
      <div className="moduleHero">
        <span>
          <Icon />
        </span>
        <div>
          <p>CAREER EVIDENCE</p>
          <h1>{certificate ? "Certificates" : "Projects"}</h1>
          <h2>
            {certificate
              ? "Store credentials and verification links."
              : "Showcase your strongest work and technologies."}
          </h2>
        </div>
      </div>
      <form
        className="inlineCreate"
        onSubmit={(e) => {
          e.preventDefault();
          void add(e.currentTarget);
        }}
      >
        {certificate ? (
          <>
            <input name="name" placeholder="Certificate name" required />
            <input name="issuer" placeholder="Issuer" required />
            <input name="issuedAt" type="date" />
            <input name="url" type="url" placeholder="Credential URL" />
          </>
        ) : (
          <>
            <input name="title" placeholder="Project title" required />
            <input name="description" placeholder="Description" required />
            <input name="technologies" placeholder="Technologies" />
            <input name="url" type="url" placeholder="Project URL" />
          </>
        )}
        <button>Add {certificate ? "certificate" : "project"}</button>
      </form>
      {error && <div className="authMessage error">{error}</div>}
      <div className="workspaceList">
        {items.map((item) => (
          <article key={item.id}>
            <div>
              <h3>{certificate ? item.name : item.title}</h3>
              <p>
                {certificate
                  ? `${item.issuer}${item.issued_at ? ` · ${item.issued_at}` : ""}`
                  : `${item.description}${item.technologies ? ` · ${item.technologies}` : ""}`}
              </p>
            </div>
            {(certificate ? item.credential_url : item.project_url) && (
              <a
                href={(certificate ? item.credential_url : item.project_url)!}
                target="_blank"
                rel="noreferrer"
              >
                Open link
              </a>
            )}
            <button className="rowDelete" onClick={() => void remove(item.id)}>
              Delete
            </button>
          </article>
        ))}
        {items.length === 0 && (
          <div className="moduleEmpty">
            <Icon />
            <h3>No {kind} yet</h3>
            <p>Add your first item using the form above.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function SettingsPage() {
  const [profile, setProfile] = useState<Record<string, string> | null>(null),
    [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => setProfile(data.profile));
  }, []);
  if (!profile) return <div className="moduleEmpty">Loading settings…</div>;
  const save = async (form: HTMLFormElement) => {
    const body = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setMessage(response.ok ? "Settings saved." : "Could not save settings.");
  };
  return (
    <section className="modulePage">
      <div className="moduleHero">
        <span>
          <Settings />
        </span>
        <div>
          <p>ACCOUNT</p>
          <h1>Settings</h1>
          <h2>Manage the profile used by your portfolio.</h2>
        </div>
      </div>
      <form
        className="settingsForm"
        onSubmit={(e) => {
          e.preventDefault();
          void save(e.currentTarget);
        }}
      >
        {[
          ["headline", "Professional headline"],
          ["location", "Location"],
          ["phone", "Phone"],
          ["skills", "Skills"],
          ["linkedinUrl", "LinkedIn URL"],
          ["githubUrl", "GitHub URL"],
          ["portfolioUrl", "Portfolio URL"],
        ].map(([name, label]) => (
          <label key={name}>
            {label}
            <input
              name={name}
              defaultValue={
                profile[name] ||
                profile[name.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)] ||
                ""
              }
            />
          </label>
        ))}
        <label className="wide">
          Professional bio
          <textarea name="bio" defaultValue={profile.bio || ""} />
        </label>
        <button>Save settings</button>
        {message && <span>{message}</span>}
      </form>
    </section>
  );
}

function PortfolioPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then(setData);
  }, []);
  if (!data) return <div className="moduleEmpty">Loading portfolio…</div>;
  return (
    <section className="modulePage">
      <div className="portfolioHero">
        <p>PROFESSIONAL PORTFOLIO</p>
        <h1>{data.user.name}</h1>
        <h2>
          {data.profile.headline || "Add a professional headline in Settings"}
        </h2>
        <span>{data.profile.location}</span>
        <p>{data.profile.bio}</p>
      </div>
      <div className="portfolioGrid">
        <div className="resultCard">
          <h2>Projects</h2>
          {data.projects.map((item: any) => (
            <article key={item.id}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <small>{item.technologies}</small>
            </article>
          ))}
          {!data.projects.length && (
            <p>Add projects to populate this section.</p>
          )}
        </div>
        <div className="resultCard">
          <h2>Certificates</h2>
          {data.certificates.map((item: any) => (
            <article key={item.id}>
              <h3>{item.name}</h3>
              <p>{item.issuer}</p>
            </article>
          ))}
          {!data.certificates.length && (
            <p>Add certificates to populate this section.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData);
  }, []);
  if (!data) return <div className="moduleEmpty">Loading analytics…</div>;
  return (
    <section className="modulePage">
      <div className="moduleHero">
        <span>
          <ChartNoAxesCombined />
        </span>
        <div>
          <p>CAREER INSIGHTS</p>
          <h1>Analytics</h1>
          <h2>Live metrics from your saved workspace.</h2>
        </div>
      </div>
      <div className="analyticsGrid">
        <div className="resultCard">
          <h3>Application stages</h3>
          {data.stages.map((item: any) => (
            <div className="metricRow" key={item.stage}>
              <span>{item.stage}</span>
              <b>{item.count}</b>
            </div>
          ))}
        </div>
        <div className="resultCard">
          <h3>Resume scores</h3>
          {data.scores.map((item: any) => (
            <div
              className="metricRow"
              key={`${item.filename}${item.created_at}`}
            >
              <span>{item.filename}</span>
              <b>{item.score}%</b>
            </div>
          ))}
        </div>
        <div className="resultCard">
          <h3>Career evidence</h3>
          <div className="metricRow">
            <span>Projects</span>
            <b>{data.totals.projects}</b>
          </div>
          <div className="metricRow">
            <span>Certificates</span>
            <b>{data.totals.certificates}</b>
          </div>
          <div className="metricRow">
            <span>Cover letters</span>
            <b>{data.totals.cover_letters}</b>
          </div>
        </div>
      </div>
    </section>
  );
}

function ActionModal({
  title,
  close,
  done,
}: {
  title: string;
  close: () => void;
  done: (message: string) => void;
}) {
  const report = title === "ATS report",
    notice = title === "Notifications",
    upload = /upload resume/i.test(title),
    ai = /analyze|tailor|cover|AI workspace/i.test(title);
  return (
    <div
      className="modalBack"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section className="modal">
        <button className="modalClose" onClick={close}>
          <X />
        </button>
        <span className="modalIcon">
          {notice ? (
            <Bell />
          ) : report ? (
            <ChartNoAxesCombined />
          ) : ai ? (
            <Sparkles />
          ) : (
            <Upload />
          )}
        </span>
        <h2>{title}</h2>
        <p>
          {report
            ? "No ATS report yet. Upload and analyze a resume to create your first report."
            : notice
              ? "You have no notifications yet."
              : "Complete the details below to continue."}
        </p>
        {report || notice ? (
          <div className="empty modalEmpty">Nothing to show yet.</div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              done(`${title} saved successfully`);
            }}
          >
            {upload && (
              <label className="dropzone">
                <Upload />
                <b>Choose a resume</b>
                <small>PDF or DOCX, up to 10 MB</small>
                <input type="file" accept=".pdf,.doc,.docx" required />
              </label>
            )}
            {ai && (
              <>
                <label>
                  Target role
                  <input placeholder="e.g. Frontend Engineer" required />
                </label>
                <label>
                  Job description
                  <textarea
                    placeholder="Paste the job description here..."
                    required
                  />
                </label>
              </>
            )}
            {!upload && !ai && (
              <label>
                Details
                <input
                  placeholder={`Enter ${title.toLowerCase()} details`}
                  required
                />
              </label>
            )}
            <button className="submit" type="submit">
              Continue <ArrowUpRight size={16} />
            </button>
          </form>
        )}
        {(report || notice) && (
          <button className="submit" onClick={() => done(`${title} closed`)}>
            Done
          </button>
        )}
      </section>
    </div>
  );
}
