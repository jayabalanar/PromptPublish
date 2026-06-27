import { spawn, type ChildProcess } from "child_process";
import net from "net";
import path from "path";
import fs from "fs";
import os from "os";

export type SiteStatus = "idle" | "cloning" | "installing" | "starting" | "running" | "error" | "stopped";

export interface SiteState {
  status: SiteStatus;
  port?: number;
  error?: string;
  logs: string[];
}

interface RunnerEntry {
  child: ChildProcess;
  port: number;
  logs: string[];
}

// Module-level — persists for the lifetime of the Next.js dev server process
const runners = new Map<string, RunnerEntry>();
const states = new Map<string, SiteState>();

const SITES_DIR = path.join(os.tmpdir(), "pp-sites");

// ── helpers ────────────────────────────────────────────────────────────────

function addLog(siteId: string, line: string) {
  const s = states.get(siteId);
  if (!s) return;
  s.logs.push(line);
  if (s.logs.length > 200) s.logs.shift();
}

function setStatus(siteId: string, patch: Partial<SiteState>) {
  const prev = states.get(siteId) ?? { status: "idle", logs: [] };
  states.set(siteId, { ...prev, ...patch });
}

async function freePort(from = 3001): Promise<number> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.listen(from, "127.0.0.1", () => srv.close(() => resolve(from)));
    srv.on("error", () => freePort(from + 1).then(resolve));
  });
}

async function waitForPort(port: number, ms = 45_000): Promise<void> {
  const deadline = Date.now() + ms;
  await new Promise<void>((resolve) => {
    const attempt = () => {
      const s = net.createConnection(port, "127.0.0.1");
      s.on("connect", () => { s.destroy(); resolve(); });
      s.on("error", () => {
        if (Date.now() < deadline) setTimeout(attempt, 800);
        else resolve();
      });
    };
    setTimeout(attempt, 1500);
  });
}

function runStep(
  cmd: string,
  args: string[],
  cwd: string,
  siteId: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      shell: true,
      env: { ...process.env, CI: "false" },
    });
    child.stdout?.on("data", (d: Buffer) => addLog(siteId, d.toString().trimEnd()));
    child.stderr?.on("data", (d: Buffer) => addLog(siteId, d.toString().trimEnd()));
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Exit ${code}`))
    );
  });
}

function detectPM(dir: string): string {
  if (fs.existsSync(path.join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(dir, "yarn.lock"))) return "yarn";
  return "npm";
}

// ── public API ─────────────────────────────────────────────────────────────

export function getSiteDir(siteId: string): string {
  return path.join(SITES_DIR, siteId);
}

export function getState(siteId: string): SiteState {
  return states.get(siteId) ?? { status: "idle", logs: [] };
}

export function stopSite(siteId: string): void {
  const entry = runners.get(siteId);
  if (entry) {
    if (process.platform === "win32" && entry.child.pid) {
      spawn("taskkill", ["/F", "/T", "/PID", String(entry.child.pid)], { shell: true });
    } else {
      entry.child.kill("SIGTERM");
    }
    runners.delete(siteId);
  }
  setStatus(siteId, { status: "stopped" });
  addLog(siteId, "Dev server stopped.");
}

/** Write an AI-edited file into the local clone so the dev server hot-reloads. */
export function patchLocalFile(siteId: string, filePath: string, content: string): void {
  const entry = runners.get(siteId);
  if (!entry) return; // not running — skip
  const full = path.join(getSiteDir(siteId), filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf-8");
}

/** Clone (or pull), install deps, and start the dev server. Runs entirely in background. */
export function launchSite(
  siteId: string,
  githubRepo: string,
  token: string,
  defaultBranch: string,
): void {
  // Kick off but don't await — the caller returns immediately
  void _launch(siteId, githubRepo, token, defaultBranch);
}

async function _launch(
  siteId: string,
  githubRepo: string,
  token: string,
  defaultBranch: string,
) {
  if (!fs.existsSync(SITES_DIR)) fs.mkdirSync(SITES_DIR, { recursive: true });
  const dir = getSiteDir(siteId);

  try {
    // ── 1. Clone or pull ──────────────────────────────────────────────────
    setStatus(siteId, { status: "cloning", logs: [] });

    if (fs.existsSync(path.join(dir, ".git"))) {
      addLog(siteId, "Pulling latest…");
      await runStep("git", ["pull", "--ff-only"], dir, siteId);
    } else {
      addLog(siteId, `Cloning ${githubRepo}…`);
      const url = `https://x-access-token:${token}@github.com/${githubRepo}.git`;
      await runStep(
        "git",
        ["clone", "--depth=1", "--branch", defaultBranch, url, dir],
        SITES_DIR,
        siteId,
      );
    }

    // ── 2. Install ────────────────────────────────────────────────────────
    setStatus(siteId, { status: "installing" });
    const pm = detectPM(dir);
    addLog(siteId, `Running ${pm} install…`);
    await runStep(pm, ["install"], dir, siteId);

    // ── 3. Start dev server ───────────────────────────────────────────────
    const port = await freePort(3001);
    setStatus(siteId, { status: "starting", port });
    addLog(siteId, `Starting dev server on :${port}…`);

    const child = spawn(pm, ["run", "dev"], {
      cwd: dir,
      shell: true,
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: "development",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    });

    const entry: RunnerEntry = { child, port, logs: [] };
    runners.set(siteId, entry);

    child.stdout?.on("data", (d: Buffer) => addLog(siteId, d.toString().trimEnd()));
    child.stderr?.on("data", (d: Buffer) => addLog(siteId, d.toString().trimEnd()));
    child.on("exit", (code) => {
      runners.delete(siteId);
      setStatus(siteId, {
        status: code === 0 || code === null ? "stopped" : "error",
        error: code && code !== 0 ? `Exited with code ${code}` : undefined,
      });
      addLog(siteId, `Process exited (${code ?? "signal"})`);
    });

    await waitForPort(port);
    setStatus(siteId, { status: "running", port });
    addLog(siteId, `Ready — http://localhost:${port}`);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(siteId, { status: "error", error: msg });
    addLog(siteId, `Error: ${msg}`);
  }
}
