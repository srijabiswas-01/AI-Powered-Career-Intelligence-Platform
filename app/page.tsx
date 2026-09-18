"use client";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  BriefcaseBusiness,
  ApplicationFile,
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
  UserRound,
  Mail,
  MapPin,
  Phone,
  Link,
  Code2,
  Save,
  Eye,
  EyeSlash,
} from "./bootstrap-icons";
import { APPLICATION_STAGES } from "@/lib/applications";
import ProfessionalProfileSettings from "./profile-settings";

const nav = [
  ["Dashboard", LayoutDashboard],
  ["My Resumes", FileText],
  ["AI CV Builder", FileText],
  ["AI Cover Letter", Sparkles],
  ["Job Search", BriefcaseBusiness],
  ["Applications", ApplicationFile],
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
  content_preview?: string;
  created_at: string;
  score?: number;
  strengths?: string[];
  improvements?: string[];
  keywords?: string[];
  provider?: string;
  extraction_status?: "ready" | "failed";
  ats_breakdown?: AtsBreakdown[];
  source_type?: "uploaded" | "ai_cv_builder";
  builder_snapshot?: Record<string, unknown>;
  target_role?: string;
  job_description?: string;
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
    text: "Get a readiness score and clear fixes",
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

const loadingMessages = [
  "Securing your session",
  "Reading your career signals",
  "Organizing your opportunities",
  "Polishing your workspace",
];
const modules: Record<string, { text: string; action: string }> = {
  "My Resumes": {
    text: "Create, upload, manage, and optimize every version of your resume.",
    action: "Upload resume",
  },
  "AI Cover Letter": {
    text: "Analyze resumes, tailor applications, and generate compelling cover letters.",
    action: "Open AI workspace",
  },
  "AI CV Builder": {
    text: "Build, review, save, and download ATS-friendly CV variants.",
    action: "Open CV Builder",
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
  const [loadingStep, setLoadingStep] = useState(0);
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
  const [builderResume, setBuilderResume] = useState<ResumeData | null>(null);
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
    const saved = localStorage.getItem("careerpilot-theme");
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
    document.body.style.overflow = mobile ? "hidden" : "";
    const closeDrawer = (event: KeyboardEvent) => { if (event.key === "Escape") setMobile(false); };
    window.addEventListener("keydown", closeDrawer);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", closeDrawer); };
  }, [mobile]);
  useEffect(() => {
    if (authenticated !== null) return;
    const timer = window.setInterval(
      () => setLoadingStep((step) => (step + 1) % loadingMessages.length),
      900,
    );
    return () => window.clearInterval(timer);
  }, [authenticated]);
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
    color: ["#2554E0", "#2563eb", "#ea580c"][index % 3],
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
    localStorage.setItem("careerpilot-theme", next);
    document.documentElement.dataset.theme = next;
  };
  if (authenticated === null)
    return (
      <div className="authLoading">
        <div className="loadingGlow loadingGlowOne" />
        <div className="loadingGlow loadingGlowTwo" />
        <section className="loadingCard" aria-live="polite" aria-busy="true">
          <div className="loadingVisual" aria-hidden="true">
            <div className="loadingOrbit orbitOne">
              <span className="orbitBadge orbitResume"><FileText /></span>
            </div>
            <div className="loadingOrbit orbitTwo">
              <span className="orbitBadge orbitJob"><BriefcaseBusiness /></span>
            </div>
            <div className="loadingLogo">
              <TrendingUp />
              <i className="logoSpark"><Sparkles /></i>
            </div>
            <span className="floatingSkill skillAi">AI</span>
            <span className="floatingSkill skillAts">ATS</span>
            <span className="floatingSkill skillMatch"><Target /> Match</span>
          </div>
          <div className="loadingBrand">CareerPilot <b>AI</b></div>
          <h1>Your next move is taking shape</h1>
          <p>A tiny career copilot is arranging everything just for you.</p>
          <div className="loadingTrack"><i /></div>
          <span className="loadingStatus" key={loadingStep}>
            <i /> {loadingMessages[loadingStep]}
          </span>
          <div className="loadingSteps" aria-hidden="true">
            {loadingMessages.map((_, index) => (
              <i key={index} className={index <= loadingStep ? "done" : ""} />
            ))}
          </div>
        </section>
        <small className="loadingFooter"><Sparkles /> Dream it · Match it · Clymb it</small>
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
      <aside id="primary-sidebar" aria-label="Primary navigation" className={"sidebar " + (mobile ? "open" : "")}>
        <div className="brand">
          <span className="brandmark">
            <TrendingUp size={19} />
          </span>
          <span>
            CareerPilot <b>AI</b>
          </span>
          <button className="close" aria-label="Close navigation" title="Close navigation" onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>
        <div className="navlabel">WORKSPACE</div>
        <nav>
          {nav.slice(0, 5).map(([n, I]) => (
            <button
              key={n}
              className={active === n ? "active" : ""}
              onClick={() => go(n)}
            >
              <I size={18} />
              {n}
              {n === "AI Cover Letter" && <span className="new">NEW</span>}
            </button>
          ))}
        </nav>
        <div className="navlabel">MANAGE</div>
        <nav>
          {nav.slice(5).map(([n, I]) => (
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
              <button onClick={() => go("AI CV Builder")}>AI CV Builder</button>
              <button onClick={logout}>Sign out</button>
            </div>
          )}
        </div>
      </aside>
      {mobile && <button className="overlay" aria-label="Close navigation" onClick={() => setMobile(false)} />}
      <section className="content">
        <header>
          <button className="menu" aria-label="Open navigation" title="Open navigation" aria-controls="primary-sidebar" aria-expanded={mobile} onClick={() => setMobile(true)}>
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
              title="Notifications"
              onClick={() => setModal("Notifications")}
            >
              <Bell size={19} />
              <span className="notificationDot" aria-hidden="true" />
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
                    {["All", ...APPLICATION_STAGES].map((n) => (
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
                      <p>Powered by CareerPilot AI</p>
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
                              : "AI Cover Letter",
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
                      <Zap size={14} /> AI cover letter connected
                    </span>
                    <button onClick={() => go("AI Cover Letter")}>Open</button>
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
                    <button className="missing" onClick={() => go("AI CV Builder")}>
                      <Plus /> Add personal information
                    </button>
                    <button className="missing" onClick={() => go("AI CV Builder")}>
                      <Plus /> Add work experience
                    </button>
                    <button className="missing" onClick={() => go("AI CV Builder")}>
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
              editBuilder={(resume) => { setBuilderResume(resume); go("AI CV Builder"); }}
            />
          ) : active === "Job Search" ? (
            <JobSearch
              initialQuery={query}
              resumes={resumes}
              initialResumeId={jobResumeId}
              applicationSaved={() => setRefresh((value) => value + 1)}
            />
          ) : active === "AI Cover Letter" ? (
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
          ) : active === "AI CV Builder" ? (
            <ProfessionalProfileSettings initialVariant={builderResume?.builder_snapshot as any} />
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
            CareerPilot <b>AI</b>
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
        <small>© 2026 CareerPilot AI. Your career, elevated.</small>
      </section>
      <section className="authPanel">
        <div className="authBox">
          <div className="mobileAuthBrand">
            <span className="brandmark">
              <TrendingUp size={19} />
            </span>
            CareerPilot <b>AI</b>
          </div>
          <p className="eyebrow">WELCOME TO CAREERPILOT</p>
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
                  className="passwordToggle"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            {mode === "login" && (
              <div className="authOptions">
                <label>
                  <input type="checkbox" /> Remember me
                </label>
              </div>
            )}
            <button className="authSubmit" type="submit">
              {mode === "login" ? "Sign in to CareerPilot" : "Create account"}{" "}
              <ArrowUpRight size={17} />
            </button>
          </form>
          <p className="switchAuth">
            {mode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              className="switchAuthButton"
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
                setSuccess("");
              }}
            >
              {mode === "login" ? "Create an account" : "Back to sign in"}
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
          <p>CAREERPILOT WORKSPACE</p>
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
      let result: { error?: string; analysis?: { score: number }; analysisMode?: "ai" | "fallback" } = {};
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
      done(`Resume analyzed — readiness score ${result.analysis.score}%${result.analysisMode === "fallback" ? " (AI unavailable; checklist fallback used)" : " (AI review completed)"}`);
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
          <h2>Upload and review resume</h2>
        <p>
          PDF, DOCX, or TXT. The file is saved only after readable text is
          extracted. AI feedback uses a checklist fallback if the provider is unavailable.
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
            {busy ? "Uploading and reviewing…" : "Upload and review"}{" "}
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
  editBuilder,
}: {
  resumes: ResumeData[];
  upload: () => void;
  changed: () => void;
  suggest: (id: string) => void;
  editBuilder: (resume: ResumeData) => void;
}) {
  const viewUrl = (resume: ResumeData) => `/api/resumes/${resume.id}/view`;
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
          <p>CAREERPILOT WORKSPACE</p>
          <h1>My Resumes</h1>
          <h2>Upload a CV, then compare it with jobs using explainable keyword similarity.</h2>
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
                  <span className={`resumeSourceTag ${resume.source_type === "ai_cv_builder" ? "builder" : "uploaded"}`}>{resume.source_type === "ai_cv_builder" ? "AI CV Builder" : "Uploaded CV"}</span>
                </div>
                <div className="resumeAtsScore" title="Internal ATS readiness estimate" aria-label={`ATS readiness ${typeof resume.score === "number" ? `${resume.score} percent` : "not available"}`}>
                  <strong>{typeof resume.score === "number" ? resume.score : "—"}{typeof resume.score === "number" && <em>%</em>}</strong>
                  <span><b>ATS readiness</b><small>{typeof resume.score === "number" ? (resume.score >= 85 ? "Excellent" : resume.score >= 70 ? "Strong" : resume.score >= 55 ? "Developing" : "Needs work") : "Not analyzed"}</small></span>
                  <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={typeof resume.score === "number" ? resume.score : 0}><i style={{ width: `${typeof resume.score === "number" ? Math.max(0, Math.min(100, resume.score)) : 0}%` }} /></div>
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
              <small>{resume.provider && resume.provider !== "heuristic" && resume.provider !== "statistical" ? `AI feedback: ${resume.provider}` : "Checklist feedback (AI fallback)"}. The readiness score is an internal estimate, not an employer ATS result.</small>
              <ul>
                {[
                  ...(resume.strengths || []),
                  ...(resume.improvements || []),
                ].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {Boolean(resume.ats_breakdown?.length) && (
                <details className="atsExplanation">
                  <summary>How this readiness score is calculated</summary>
                  <p className="atsNotice">This is CareerPilot&apos;s document-readiness estimate based on extracted text and standard resume checks. It is not a score returned by an employer&apos;s ATS.</p>
                  {resume.ats_breakdown!.map((item) => (
                    <div className="atsRow" key={item.key}>
                      <div><b>{item.label}</b><small>{item.detail}</small></div>
                      <strong>{item.earned}/{item.maximum}</strong>
                    </div>
                  ))}
                </details>
              )}
              {resume.content_preview && (
                <details className="resumePreview">
                  <summary>Preview extracted CV text</summary>
                  <p>{resume.content_preview}</p>
                </details>
              )}
              <div className="resumeLinks">
                <>
                  {resume.source_type === "ai_cv_builder" && resume.builder_snapshot && <button className="editResume" onClick={() => editBuilder(resume)}><i className="bi bi-pencil" /> Edit in AI CV Builder</button>}
                  <a href={viewUrl(resume)} target="_blank" rel="noreferrer">
                    View resume <ArrowUpRight size={14} />
                  </a>
                  <a href={`/api/resumes/${resume.id}/download`}>
                    Download original
                  </a>
                </>
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
          <h2>Each percentage estimates keyword similarity between this CV and the available job text.</h2>
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
  source?: string;
  recruiter?: string;
  follow_up_at?: string;
  notes?: string;
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
          <ApplicationFile />
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
        <input name="source" placeholder="Source (e.g. LinkedIn)" />
        <input name="recruiter" placeholder="Recruiter / contact" />
        <input name="followUpAt" type="date" aria-label="Follow-up date" />
        <input name="notes" placeholder="Notes or next step" />
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
              {APPLICATION_STAGES.map((value) => (
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
            <ApplicationFile />
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
  role?: string;
  start_date?: string;
  end_date?: string;
  outcomes?: string;
  name?: string;
  issuer?: string;
  issued_at?: string;
  credential_url?: string;
  credential_id?: string;
  expires_at?: string;
  skills?: string;
  include_in_cv?: boolean;
};

function WorkspaceCvToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="cvToggle" title={checked ? "Included in generated CV" : "Saved in workspace but hidden from CV"}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span /><b>{checked ? "In CV" : "Hidden"}</b></label>;
}

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
  const toggleCv = async (item: GenericItem, includeInCv: boolean) => {
    const response = await fetch(`/api/${kind}/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ includeInCv }) });
    if (!response.ok) { setError("Could not update CV visibility."); return; }
    setItems(items.map(value => value.id === item.id ? { ...value, include_in_cv: includeInCv } : value));
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
            <input name="expiresAt" type="date" aria-label="Expiry date" />
            <input name="credentialId" placeholder="Credential ID" />
            <input name="skills" placeholder="Skills covered (Python, SQL, ... )" />
            <input name="url" type="url" placeholder="Credential URL" />
          </>
        ) : (
          <>
            <input name="title" placeholder="Project title" required />
            <input name="role" placeholder="Your role (e.g. Data Analyst)" />
            <input name="startDate" type="date" aria-label="Start date" />
            <input name="endDate" type="date" aria-label="End date" />
            <input name="technologies" placeholder="Technologies" />
            <input name="description" placeholder="What you built or analyzed" required />
            <input name="outcomes" placeholder="Outcomes (metrics, scale, time saved)" />
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
                  ? `${item.issuer}${item.issued_at ? ` · Issued ${item.issued_at}` : ""}${item.expires_at ? ` · Expires ${item.expires_at}` : ""}${item.skills ? ` · ${item.skills}` : ""}`
                  : `${item.role ? `${item.role} · ` : ""}${item.description}${item.technologies ? ` · ${item.technologies}` : ""}${item.outcomes ? ` · ${item.outcomes}` : ""}`}
              </p>
            </div>
            <WorkspaceCvToggle checked={item.include_in_cv !== false} onChange={(checked) => void toggleCv(item, checked)} />
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

function PortfolioPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then(setData);
  }, []);
  if (!data) return <div className="moduleEmpty">Loading portfolio…</div>;
  const profile = data.profile || {};
  const skills = Array.isArray(profile.skills_json) ? profile.skills_json.filter((item: any) => item?.includeInCv !== false) : [];
  const experience = Array.isArray(profile.experience_json) ? profile.experience_json.filter((item: any) => item?.includeInCv !== false) : [];
  const education = Array.isArray(profile.education_json) ? profile.education_json.filter((item: any) => item?.includeInCv !== false) : [];
  const languages = Array.isArray(profile.languages_json) ? profile.languages_json.filter((item: any) => item?.includeInCv !== false) : [];
  const links = Array.isArray(profile.links_json) ? profile.links_json.filter((item: any) => item?.includeInCv !== false) : [];
  const publications = Array.isArray(profile.publications_json) ? profile.publications_json.filter((item: any) => item?.includeInCv !== false) : [];
  const achievements = Array.isArray(profile.achievements_json) ? profile.achievements_json.filter((item: any) => item?.includeInCv !== false) : [];
  const skillGroups = skills.reduce((groups: Record<string, string[]>, skill: any) => { const category = skill.category || "Other"; groups[category] = [...(groups[category] || []), skill.name]; return groups; }, {});
  const skillEntries = Object.entries(skillGroups) as [string, string[]][];
  const maxSkillCount = Math.max(1, ...skillEntries.map(([, items]) => items.length));
  return (
    <section className="modulePage professionalPortfolio">
      <div className="portfolioHero">
        <div className="portfolioHeroTop"><div className="portfolioIdentityBlock">{profile.avatar_data_url ? <img className="portfolioAvatar" src={profile.avatar_data_url} alt={`${data.user.name} profile`} /> : <div className="portfolioAvatar portfolioInitials">{data.user.name.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase()}</div>}<div><p>PROFESSIONAL PORTFOLIO</p><h1>{data.user.name}</h1><h2>{profile.headline || profile.job_title || "Build your professional identity"}</h2><span>{[profile.location, profile.phone, data.user.email].filter(Boolean).join(" · ")}</span></div></div><div className="portfolioHeroActions">{links.slice(0, 3).map((link: any) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.platform === "Other" ? link.label || "Profile" : link.platform}<ArrowUpRight size={13} /></a>)}</div></div>
        <p>{profile.summary || profile.bio || "Add a professional summary in AI CV Builder to introduce your experience, strengths, and direction."}</p>
      </div>
      <div className="portfolioMetrics"><div><strong>{experience.length}</strong><span>Experience records</span></div><div><strong>{skills.length}</strong><span>Curated skills</span></div><div><strong>{data.projects.length}</strong><span>Featured projects</span></div><div><strong>{data.certificates.length}</strong><span>Credentials</span></div></div>
      <div className="portfolioDashboard">
        <main className="portfolioMain">
          <section className="portfolioSection"><div className="portfolioSectionHead"><span>CAREER STORY</span><h2>About me</h2></div><p>{profile.summary || profile.bio || "Your professional summary will appear here."}</p></section>
          <section className="portfolioSection"><div className="portfolioSectionHead"><span>CAREER PATH</span><h2>Experience</h2></div>{experience.length ? <div className="portfolioTimeline">{experience.map((item: any) => <article key={`${item.title}-${item.company}`}><i /><div><div className="portfolioEntryHead"><h3>{item.title}</h3><time>{item.startDate || item.start_date || ""} {item.current ? "– Present" : item.endDate || item.end_date ? `– ${item.endDate || item.end_date}` : ""}</time></div><p>{item.company}{item.location ? ` · ${item.location}` : ""}</p>{String(item.description || "").split(/\r?\n/).filter(Boolean).map((line: string, index: number) => <small key={index}>• {line.replace(/^[-•]\s*/, "")}</small>)}</div></article>)}</div> : <p className="portfolioMuted">Add work experience in AI CV Builder.</p>}</section>
          <section className="portfolioSection"><div className="portfolioSectionHead"><span>SELECTED WORK</span><h2>Projects</h2></div>{data.projects.length ? <div className="portfolioProjectGrid">{data.projects.map((item: any) => <article key={item.id}><div className="portfolioProjectTop"><h3>{item.title}</h3>{item.project_url && <a href={item.project_url} target="_blank" rel="noreferrer" aria-label={`Open ${item.title}`}><ArrowUpRight size={15} /></a>}</div><small>{[item.role, item.technologies].filter(Boolean).join(" · ")}</small><p>{item.description}</p>{item.outcomes && <b>Outcome: {item.outcomes}</b>}</article>)}</div> : <p className="portfolioMuted">Add projects to populate this section.</p>}</section>
          <section className="portfolioSection"><div className="portfolioSectionHead"><span>ACADEMIC FOUNDATION</span><h2>Education</h2></div>{education.length ? <div className="portfolioEducationGrid">{education.map((item: any) => <article key={`${item.degree}-${item.institution}`}><h3>{item.degree}{item.field ? ` in ${item.field}` : ""}</h3><p>{item.institution}{item.location ? ` · ${item.location}` : ""}</p><small>{item.grade || ""}{item.startDate || item.start_date ? ` · ${item.startDate || item.start_date}` : ""}{item.endDate || item.end_date ? ` – ${item.endDate || item.end_date}` : ""}</small></article>)}</div> : <p className="portfolioMuted">Add education in AI CV Builder.</p>}</section>
        </main>
        <aside className="portfolioAside">
          <section className="portfolioSection portfolioSkillSection"><div className="portfolioSectionHead"><span>CAPABILITY MAP</span><h2>Skills by focus</h2></div>{skillEntries.length ? <div className="portfolioSkillBars">{skillEntries.map(([category, items]) => <div key={category}><div><b>{category}</b><span>{items.length}</span></div><i><em style={{ width: `${Math.max(18, items.length / maxSkillCount * 100)}%` }} /></i><small>{items.join(" · ")}</small></div>)}</div> : <p className="portfolioMuted">Add categorized skills in AI CV Builder.</p>}</section>
          <section className="portfolioSection"><div className="portfolioSectionHead"><span>VERIFIED LEARNING</span><h2>Certifications</h2></div>{data.certificates.length ? <div className="portfolioCredentials">{data.certificates.map((item: any) => <article key={item.id}><Award size={17} /><div><h3>{item.name}</h3><p>{item.issuer}{item.issued_at ? ` · ${String(item.issued_at).slice(0, 10)}` : ""}</p>{item.skills && <small>{item.skills}</small>}</div>{item.credential_url && <a href={item.credential_url} target="_blank" rel="noreferrer" aria-label={`View ${item.name}`}><ArrowUpRight size={13} /></a>}</article>)}</div> : <p className="portfolioMuted">Add certificates to show verified learning.</p>}</section>
          {languages.length > 0 && <section className="portfolioSection"><div className="portfolioSectionHead"><span>COMMUNICATION</span><h2>Languages</h2></div><div className="portfolioPills">{languages.map((item: any) => <span key={item.name}>{item.name}{item.level ? ` · ${item.level}` : ""}</span>)}</div></section>}
          {(publications.length > 0 || achievements.length > 0) && <section className="portfolioSection"><div className="portfolioSectionHead"><span>RECOGNITION</span><h2>Highlights</h2></div><div className="portfolioHighlights">{[...achievements.map((item: any) => item.name), ...publications.map((item: any) => item.title)].map((item: string, index: number) => <p key={`${item}-${index}`}><CircleCheck size={14} />{item}</p>)}</div></section>}
        </aside>
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
          <h3>Conversion funnel</h3>
          <div className="metricRow"><span>Applications</span><b>{data.funnel.applications}</b></div>
          <div className="metricRow"><span>Moved forward</span><b>{data.funnel.progressed} ({data.funnel.interview_rate}%)</b></div>
          <div className="metricRow"><span>Offers</span><b>{data.funnel.offers} ({data.funnel.offer_rate}%)</b></div>
          <div className="metricRow"><span>Follow-ups due</span><b>{data.funnel.follow_ups_due}</b></div>
        </div>
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
        <div className="resultCard">
          <h3>Applications by month</h3>
          {data.activity.length ? data.activity.map((item: any) => (
            <div className="metricRow" key={item.month}><span>{item.month}</span><b>{item.count}</b></div>
          )) : <p>No application activity in the last six months.</p>}
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
