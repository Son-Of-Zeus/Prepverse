export class FocusMode {
  private violations = 0;
  private maxViolations = 3;
  private started = false;
  private active = true; // ← stops everything after destroy()

  private blurHandler = () => this.maybeViolation("Window lost focus");
  private visHandler = () => {
    if (document.hidden) this.maybeViolation("Tab switched or minimized");
  };
  private ctxHandler = (e: Event) => e.preventDefault();
  private keyHandler = (e: KeyboardEvent) => {
    if (
      e.ctrlKey || e.metaKey || e.altKey ||
      ["F11", "F12", "Escape"].includes(e.key)
    ) {
      e.preventDefault();
      this.maybeViolation(`Blocked key: ${e.key}`);
    }
  };
  private resizeHandler = () =>
    this.maybeViolation("Window resized");

  constructor() {
    this.init();
  }

  private init() {
    document.documentElement.requestFullscreen?.();

    setTimeout(() => (this.started = true), 800);

    window.addEventListener("blur", this.blurHandler);
    document.addEventListener("visibilitychange", this.visHandler);
    document.addEventListener("contextmenu", this.ctxHandler);
    document.addEventListener("keydown", this.keyHandler);
    window.addEventListener("resize", this.resizeHandler);
  }

  // 🧹 Fully stop monitoring
  public destroy() {
    this.active = false;      // ← disables violations
    this.started = false;

    window.removeEventListener("blur", this.blurHandler);
    document.removeEventListener("visibilitychange", this.visHandler);
    document.removeEventListener("contextmenu", this.ctxHandler);
    document.removeEventListener("keydown", this.keyHandler);
    window.removeEventListener("resize", this.resizeHandler);

    document.exitFullscreen?.();
  }

  private maybeViolation(reason: string) {
    if (!this.active || !this.started) return; // ← ignore after destroy()

    this.violations++;

    alert(`⚠️ Focus violation (${this.violations}/3): ${reason}`);

    if (this.violations >= this.maxViolations) {
      this.active = false; // stop further triggers
      alert("❌ Too many violations. Exam locked.");
      window.location.href = "/exam-terminated";
    }
  }
}