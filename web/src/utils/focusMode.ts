export class FocusMode {
  private violations = 0;
  private maxViolations = 3;
  private started = false;
  private active = true;
  private isShowingModal = false;
  private modalId = "focus-violation-modal";

  private blurHandler = () => this.maybeViolation("Window lost focus");
  private visHandler = () => {
    if (document.hidden) this.maybeViolation("Tab switched or minimized");
  };
  private ctxHandler = (e: Event) => e.preventDefault();
  private keyHandler = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || ["F11", "F12", "Escape"].includes(e.key)) {
      e.preventDefault();
      this.maybeViolation(`System shortcut detected: ${e.key}`);
    }
  };
  private resizeHandler = () => this.maybeViolation("Browser window resized");

  constructor() {
    this.init();
  }

  private init() {
    this.injectStyles();
    this.showRulesIntro();
    
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
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');

      #${this.modalId} {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(15, 23, 42, 0.65); /* Semi-transparent Slate */
        display: flex; align-items: center; justify-content: center;
        z-index: 100000; font-family: 'Plus Jakarta Sans', sans-serif;
        backdrop-filter: blur(12px); /* Glassmorphism effect */
        -webkit-backdrop-filter: blur(12px);
      }
      .fm-content {
        background: rgba(255, 255, 255, 0.9); /* Transparent White */
        padding: 40px; border-radius: 32px; text-align: center;
        max-width: 440px; width: 90%;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.3);
        animation: fmScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes fmScale {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      .fm-icon { font-size: 56px; margin-bottom: 20px; display: block; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); }
      .fm-title { color: #0f172a; font-size: 24px; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.02em; }
      .fm-msg { color: #475569; margin-bottom: 24px; line-height: 1.6; font-size: 15px; font-weight: 500; }
      .fm-btn {
        background: #0f172a; color: white; border: none; padding: 16px 28px;
        border-radius: 16px; cursor: pointer; font-weight: 700; font-size: 15px;
        transition: all 0.2s ease; width: 100%;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
      }
      .fm-btn:hover { background: #1e293b; transform: translateY(-2px); box-shadow: 0 8px 16px rgba(15, 23, 42, 0.3); }
      .fm-btn-danger { background: #e11d48; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.2); }
      .fm-btn-danger:hover { background: #be123c; box-shadow: 0 8px 16px rgba(225, 29, 72, 0.3); }
      
      .fm-warning-box {
        margin-top: 20px; padding: 14px; background: rgba(225, 29, 72, 0.05);
        border-radius: 14px; color: #e11d48; font-weight: 700; font-size: 13px;
        border: 1px solid rgba(225, 29, 72, 0.1); display: flex; align-items: center; justify-content: center; gap: 8px;
        text-transform: uppercase; letter-spacing: 0.05em;
      }
      .fm-rules-list { text-align: left; background: rgba(15, 23, 42, 0.03); padding: 20px; border-radius: 18px; margin-bottom: 24px; }
      .fm-rule-item { color: #334155; font-size: 14px; margin-bottom: 10px; display: flex; gap: 12px; font-weight: 500; }
      .fm-rule-bullet { color: #0f172a; font-weight: 800; }
    `;
    document.head.appendChild(style);
  }

  private showRulesIntro() {
    this.isShowingModal = true;
    const modal = document.createElement('div');
    modal.id = this.modalId;
    modal.innerHTML = `
      <div class="fm-content">
        <div class="fm-icon">🛡️</div>
        <div class="fm-title">Secure Exam Mode</div>
        <p class="fm-msg">To ensure a fair testing environment, the following rules are active:</p>
        <div class="fm-rules-list">
          <div class="fm-rule-item"><span class="fm-rule-bullet">01</span> <span>Switching tabs or minimizing window is prohibited.</span></div>
          <div class="fm-rule-item"><span class="fm-rule-bullet">02</span> <span>System shortcuts & right-clicks are disabled.</span></div>
          <div class="fm-rule-item"><span class="fm-rule-bullet">03</span> <span>Maximum of 3 violations allowed before exit.</span></div>
        </div>
        <button class="fm-btn" id="fm-start">Authorize & Start</button>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('fm-start')?.addEventListener('click', () => {
      this.removeModal();
      this.enterFullscreen();
      setTimeout(() => { 
        this.started = true;
        this.isShowingModal = false; 
      }, 1000);
    });
  }

  private showModal(reason: string, isFinal: boolean) {
    this.isShowingModal = true;
    this.removeModal();

    const modal = document.createElement('div');
    modal.id = this.modalId;
    const remaining = this.maxViolations - this.violations;
    
    modal.innerHTML = `
      <div class="fm-content">
        <div class="fm-icon">${isFinal ? '🔄' : '🚩'}</div>
        <div class="fm-title">${isFinal ? 'Assessment Terminated' : 'Focus Violation'}</div>
        <p class="fm-msg">${reason}</p>
        ${!isFinal ? `
          <div class="fm-warning-box">
             Attempt ${this.violations} of ${this.maxViolations}
          </div>
          <button class="fm-btn fm-btn-danger" id="fm-continue" style="margin-top: 24px;">I acknowledge & Return</button>
        ` : `<div class="fm-warning-box">Returning to Dashboard...</div>`}
      </div>
    `;

    document.body.appendChild(modal);

    if (!isFinal) {
      document.getElementById('fm-continue')?.addEventListener('click', () => {
        this.removeModal();
        this.enterFullscreen();
        setTimeout(() => { this.isShowingModal = false; }, 1200);
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
      this.showModal("Critical violation limit reached. Access to this assessment has been revoked.", true);
      setTimeout(() => {
        window.location.href = "/dashboard"; 
      }, 3500);
    } else {
      this.showModal(`Security Alert: ${reason}. Please maintain focus on the exam window.`, false);
    }
  }
}