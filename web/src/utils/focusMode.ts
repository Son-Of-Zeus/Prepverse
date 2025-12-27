export class FocusMode {
  private violations = 0;
  private maxViolations = 3;
  private started = false;
  private active = true;
  private isShowingModal = false; // Prevents violation loops
  private modalId = "focus-violation-modal";

  private blurHandler = () => this.maybeViolation("Window lost focus");
  private visHandler = () => {
    if (document.hidden) this.maybeViolation("Tab switched or minimized");
  };
  private ctxHandler = (e: Event) => e.preventDefault();
  private keyHandler = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || ["F11", "F12", "Escape"].includes(e.key)) {
      e.preventDefault();
      this.maybeViolation(`Blocked key: ${e.key}`);
    }
  };
  private resizeHandler = () => this.maybeViolation("Window resized");

  constructor() {
    this.init();
  }

  private init() {
    // Inject Styles once
    this.injectStyles();
    
    // Slight delay before monitoring starts to allow page stabilization
    setTimeout(() => {
      this.started = true;
      this.enterFullscreen();
    }, 1500);

    window.addEventListener("blur", this.blurHandler);
    document.addEventListener("visibilitychange", this.visHandler);
    document.addEventListener("contextmenu", this.ctxHandler);
    document.addEventListener("keydown", this.keyHandler);
    window.addEventListener("resize", this.resizeHandler);
  }

  private enterFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }

  private injectStyles() {
    if (document.getElementById('focus-mode-styles')) return;
    const style = document.createElement('style');
    style.id = 'focus-mode-styles';
    style.innerHTML = `
      #${this.modalId} {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(15, 23, 42, 0.9); display: flex; align-items: center;
        justify-content: center; z-index: 100000; font-family: 'Inter', sans-serif;
        backdrop-filter: blur(8px);
      }
      .fm-content {
        background: white; padding: 40px; border-radius: 24px;
        text-align: center; max-width: 450px; width: 90%;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      }
      .fm-icon { font-size: 60px; margin-bottom: 20px; }
      .fm-title { color: #1e293b; font-size: 24px; font-weight: 800; margin-bottom: 12px; }
      .fm-msg { color: #64748b; margin-bottom: 24px; line-height: 1.6; font-size: 16px; }
      .fm-btn {
        background: #ef4444; color: white; border: none; padding: 14px 32px;
        border-radius: 12px; cursor: pointer; font-weight: 700; font-size: 16px;
        transition: all 0.2s; width: 100%;
      }
      .fm-btn:hover { background: #dc2626; transform: translateY(-2px); }
      .fm-warning-box {
        margin-top: 20px; padding: 12px; background: #fee2e2;
        border-radius: 8px; color: #991b1b; font-weight: 600;
      }
    `;
    document.head.appendChild(style);
  }

  private showModal(reason: string, isFinal: boolean) {
    this.isShowingModal = true; // Lock monitoring
    this.removeModal();

    const modal = document.createElement('div');
    modal.id = this.modalId;
    
    const remaining = this.maxViolations - this.violations;
    
    modal.innerHTML = `
      <div class="fm-content">
        <div class="fm-icon">${isFinal ? '💀' : '🚫'}</div>
        <div class="fm-title">${isFinal ? 'Exam Terminated' : 'Security Violation'}</div>
        <p class="fm-msg">${reason}</p>
        ${!isFinal ? `
          <div class="fm-warning-box">Warnings remaining: ${remaining}</div>
          <button class="fm-btn" id="fm-continue" style="margin-top: 20px;">Return to Exam</button>
        ` : `<div class="fm-warning-box">Exiting...</div>`}
      </div>
    `;

    document.body.appendChild(modal);

    if (!isFinal) {
      document.getElementById('fm-continue')?.addEventListener('click', () => {
        this.removeModal();
        this.enterFullscreen();
        // Delay unlocking violations to prevent immediate re-trigger
        setTimeout(() => { this.isShowingModal = false; }, 1000);
      });
    }
  }

  private removeModal() {
    document.getElementById(this.modalId)?.remove();
  }

  public destroy() {
    this.active = false;
    this.started = false;
    this.removeModal();
    window.removeEventListener("blur", this.blurHandler);
    document.removeEventListener("visibilitychange", this.visHandler);
    document.removeEventListener("contextmenu", this.ctxHandler);
    document.removeEventListener("keydown", this.keyHandler);
    window.removeEventListener("resize", this.resizeHandler);
  }

  private maybeViolation(reason: string) {
    if (!this.active || !this.started || this.isShowingModal) return;

    this.violations++;

    if (this.violations >= this.maxViolations) {
      this.active = false;
      this.showModal("Maximum security violations reached. You have been disqualified from this session.", true);
      setTimeout(() => {
        window.location.href = "/dashboard"; 
      }, 3500);
    } else {
      this.showModal(reason, false);
    }
  }
}