import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import progressStyles from '../styles/ProgressButtons.css';

@customElement('umi-progress-bar-fab')
export class ProgressBarFAButton extends LitElement {
    @property({ type: String, attribute: 'icon-name' }) iconName = '';
    @property({ type: Number, attribute: 'icon-type' }) iconType = 0;
    @property({ type: Number, attribute: 'icon-fill' }) iconFill = 0;
    @property({ type: Number, attribute: 'icon-grad' }) iconGrad = 0;
    @property({ type: Number, attribute: 'icon-wght' }) iconWght = 400;

    @property({ type: Boolean }) checkable = false;
    @property({ type: Boolean }) checked = false;
    @property({ type: Number, attribute: 'fab-size' }) fabSize = 56;

    @property({ type: Number, attribute: 'timer-duration' }) timerDuration = 10;
    @property({ type: Boolean, attribute: 'auto-run-on-click' }) autoRunOnClick = false;

    @state() private _progress = 0;
    @state() private _remaining = 0;
    @state() private _locked = false;

    private _totalDuration = 10;
    private _timerId: number | null = null;

    static styles = unsafeCSS(progressStyles);

    get progressRunning(): boolean { return this._timerId !== null; }
    get progress(): number { return this._progress; }
    get remainingSeconds(): number { return Math.ceil(this._remaining); }

    run(durationSec?: number): void {
        const dur = durationSec && durationSec > 0 ? durationSec : this.timerDuration;
        this._clearTimer();
        this._totalDuration = dur;
        this._remaining = dur;
        this._progress = 0;
        this._locked = true;

        this._timerId = window.setInterval(() => {
            this._remaining -= 0.05;
            if (this._remaining <= 0) {
                this._remaining = 0;
                this._progress = 1;
                this._locked = false;
                this._clearTimer();
                this.dispatchEvent(new CustomEvent('progress-finished', { bubbles: true, composed: true }));
                return;
            }
            const elapsed = this._totalDuration - this._remaining;
            this._progress = Math.min(1, elapsed / this._totalDuration);
        }, 50);

        this.dispatchEvent(new CustomEvent('progress-started', { bubbles: true, composed: true }));
    }

    stop(): void {
        const wasRunning = this.progressRunning;
        this._clearTimer();
        this._progress = 0;
        this._remaining = 0;
        this._locked = false;
        if (wasRunning) {
            this.dispatchEvent(new CustomEvent('progress-stopped', { bubbles: true, composed: true }));
        }
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this._clearTimer();
    }

    private _clearTimer(): void {
        if (this._timerId !== null) {
            clearInterval(this._timerId);
            this._timerId = null;
        }
    }

    private _handleClick(): void {
        if (this._locked) return;

        if (this.checkable) {
            this.checked = !this.checked;
            this.dispatchEvent(new CustomEvent('toggled', {
                detail: { checked: this.checked },
                bubbles: true,
                composed: true,
            }));
        }

        if (this.autoRunOnClick) {
            this.run();
        }

        this.dispatchEvent(new CustomEvent('clicked', { bubbles: true, composed: true }));
    }

    render() {
        const iconSize = this.fabSize >= 96 ? 36 : 24;
        const radius = this.fabSize >= 96 ? 28 : 16;
        const fontFamily = this.iconType === 1
            ? "'Material Symbols Rounded'"
            : this.iconType === 2
                ? "'Material Symbols Sharp'"
                : "'Material Symbols Outlined'";

        return html`
            <button
                class="container fab ${this._locked ? 'locked' : ''}"
                style="
                    --pb-fab-size:${this.fabSize}px;
                    --pb-fab-radius:${radius}px;
                    --pb-bg:var(--md-sys-color-primary-container, #eaddff);
                    --pb-fg:var(--md-sys-color-on-primary-container, #21005d);
                    --pb-progress:var(--md-sys-color-primary, #6750a4);
                    --pb-icon-size:${iconSize}px;
                    --icon-font-family:${fontFamily};
                    --icon-fill:${this.iconFill};
                    --icon-wght:${this.iconWght};
                    --icon-grad:${this.iconGrad};
                    --icon-opsz:${iconSize};
                "
                ?disabled=${this._locked}
                @click=${this._handleClick}
            >
                <span class="progress-layer" style="width:${(this._progress * 100).toFixed(2)}%"></span>
                <span class="state-layer"></span>
                <span class="content">
                    ${this.iconName ? html`<span class="icon">${this.iconName}</span>` : null}
                </span>
            </button>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-progress-bar-fab': ProgressBarFAButton;
    }
}
