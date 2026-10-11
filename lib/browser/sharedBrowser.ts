import type { Browser, BrowserContextOptions, Page } from "playwright";

// Один браузер на все поиски: запуск стоит секунды, а анализ делает десятки запросов.
const BROWSER_IDLE_CLOSE_MS = 60_000;

let sharedBrowser: Promise<Browser> | null = null;
let browserUsers = 0;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

const LAUNCH_ARGS = ["--disable-blink-features=AutomationControlled"];

/**
 * Предпочитаем установленный Google Chrome: антибот-защита (Wildberries, Trendyol)
 * пропускает его, а встроенный в Playwright Chromium — блокирует.
 * Если Chrome не установлен — запасной вариант, встроенный Chromium.
 */
async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import("playwright");
  try {
    const browser = await chromium.launch({
      headless: true,
      channel: "chrome",
      args: LAUNCH_ARGS,
    });
    return browser;
  } catch {
    console.warn(
      "[browser] Google Chrome не найден — используется встроенный Chromium (часть площадок может блокировать)"
    );
    return chromium.launch({ headless: true, args: LAUNCH_ARGS });
  }
}

async function acquireBrowser(): Promise<Browser> {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  browserUsers++;

  const current = sharedBrowser ? await sharedBrowser.catch(() => null) : null;
  if (current?.isConnected()) return current;

  sharedBrowser = launchBrowser();
  try {
    return await sharedBrowser;
  } catch (error) {
    sharedBrowser = null;
    browserUsers--;
    throw error;
  }
}

function releaseBrowser() {
  browserUsers = Math.max(0, browserUsers - 1);
  if (browserUsers > 0 || !sharedBrowser) return;
  idleTimer = setTimeout(() => {
    const closing = sharedBrowser;
    sharedBrowser = null;
    idleTimer = null;
    void closing?.then((b) => b.close()).catch(() => undefined);
  }, BROWSER_IDLE_CLOSE_MS);
}

/**
 * User-agent как у обычного Chrome той же версии и ОС. В headless-режиме Chrome
 * подписывается «HeadlessChrome», и антибот-защита (WB) блокирует по этому слову.
 */
function desktopUserAgent(browser: Browser): string {
  const version = browser.version().replace(/^HeadlessChrome\//, "");
  const platform =
    process.platform === "win32"
      ? "Windows NT 10.0; Win64; x64"
      : process.platform === "darwin"
        ? "Macintosh; Intel Mac OS X 10_15_7"
        : "X11; Linux x86_64";
  return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
}

/** Открывает страницу в изолированном контексте общего браузера и закрывает контекст после работы. */
export async function withBrowserPage<T>(
  options: BrowserContextOptions,
  fn: (page: Page) => Promise<T>
): Promise<T> {
  const browser = await acquireBrowser();

  try {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      timezoneId: "Asia/Almaty",
      userAgent: desktopUserAgent(browser),
      ...options,
    });
    try {
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      });
      const page = await context.newPage();
      return await fn(page);
    } finally {
      await context.close().catch(() => undefined);
    }
  } finally {
    releaseBrowser();
  }
}
