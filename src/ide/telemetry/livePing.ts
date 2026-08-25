/* =====================================================================
 * Operator X02 — live user heartbeat  (v2)
 *
 * 放到:  src/ide/telemetry/livePing.ts   (覆盖旧文件)
 * 接入:  main.ts 已有  ->  import './ide/telemetry/livePing';
 *
 * v2 修了什么:
 *   v1 在 fetch 之前 await 版本号的动态 import。那个 import 会 pending
 *   而不是报错，于是 fetch 永远发不出去，而且不留任何错误。
 *   v2 把版本号挪到后台解析 + 3 秒超时，网络请求路径上没有任何 await。
 *
 * 只发三样：本地随机匿名 ID、版本号、操作系统。
 * 不发代码、不发路径、不发项目名、不发 prompt、不发机器码。
 * ===================================================================== */

const PING_URL = 'https://wzxfxpzztracfowtllqq.supabase.co/functions/v1/ping';
const EVERY_MS = 60_000;          // 每 60 秒一次
const ID_KEY   = 'x02.anonId';
const OPT_KEY  = 'x02.livePing';  // 'off' = 用户关掉了
const VERSION_TIMEOUT_MS = 3000;

// 调试开关: localStorage.setItem('x02.livePing.debug','1') 后重启看日志
function dbg(...a: unknown[]): void {
  if (localStorage.getItem('x02.livePing.debug') === '1') console.log('[livePing]', ...a);
}

/** 本地随机 ID。不是机器码，不含任何身份信息。删掉就换一个新的。 */
function anonId(): string {
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = (crypto as any).randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

function osName(): string {
  const p = navigator.platform || navigator.userAgent || '';
  if (/win/i.test(p)) return 'windows';
  if (/mac/i.test(p)) return 'macos';
  if (/linux|x11/i.test(p)) return 'linux';
  return 'unknown';
}

/* ---------------------------------------------------------------------
 * 版本号：后台尽力解析，永远不出现在请求路径上。
 * 第一次心跳可能是 'unknown'，60 秒后就会是真实版本号。
 * ------------------------------------------------------------------- */
let cachedVersion = 'unknown';

function resolveVersionInBackground(): void {
  const timeout = new Promise<null>((resolve) =>
    window.setTimeout(() => resolve(null), VERSION_TIMEOUT_MS),
  );

  Promise.race([
    import(/* @vite-ignore */ '../../version').catch(() => null),
    timeout,
  ])
    .then((m: any) => {
      if (m && typeof m.APP_VERSION === 'string' && m.APP_VERSION) {
        cachedVersion = m.APP_VERSION;
        dbg('version resolved:', cachedVersion);
      } else {
        dbg('version unavailable, staying "unknown"');
      }
    })
    .catch(() => { /* 忽略 */ });
}

export function isLivePingEnabled(): boolean {
  return localStorage.getItem(OPT_KEY) !== 'off';
}

/** 设置页的开关调这个 */
export function setLivePingEnabled(on: boolean): void {
  localStorage.setItem(OPT_KEY, on ? 'on' : 'off');
  dbg('enabled =', on);
}

/* ---------------------------------------------------------------------
 * 心跳。这个函数里没有任何 await 挡在 fetch 前面。
 * ------------------------------------------------------------------- */
function ping(): void {
  if (!isLivePingEnabled()) return;

  const body = JSON.stringify({
    anon_id: anonId(),
    app_version: cachedVersion,   // 同步读取，绝不阻塞
    os: osName(),
  });

  fetch(PING_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,              // 关窗口时也尽量把最后一次发出去
  })
    .then((r) => dbg('ping ->', r.status))
    .catch(() => {
      /* 离线、断网、公司防火墙拦截 —— 静默忽略，绝不打扰用户 */
      dbg('ping failed (offline?)');
    });
}

let running = false;

export function startLivePing(): void {
  if (running) return;
  running = true;

  resolveVersionInBackground();   // 后台去拿，不等它

  ping();                          // 立刻发一次

  // 递归 setTimeout，不用 setInterval —— X02Perf 会节流 interval
  const loop = () => {
    ping();
    window.setTimeout(loop, EVERY_MS);
  };
  window.setTimeout(loop, EVERY_MS);

  dbg('started, anonId =', anonId());
}

/* ---------------------------------------------------------------------
 * 自启动。延迟 5 秒，避开 X02 启动时最忙的那一段。
 * ------------------------------------------------------------------- */
function boot(): void {
  window.setTimeout(() => startLivePing(), 5000);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
