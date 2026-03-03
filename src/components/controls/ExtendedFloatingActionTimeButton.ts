import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import timeStyles from '../styles/TimeButtons.css';

@customElement('umi-extended-floating-action-time-button')
export class ExtendedFloatingActionTimeButton extends LitElement {
    @property({ type: String }) text = '';
    @property({ type: String, attribute: 'icon-name' }) iconName = '';
    @property({ type: Number, attribute: 'icon-type' }) iconType = 0;
    @property({ type: Number, attribute: 'icon-fill' }) iconFill = 0;
    @property({ type: Number, attribute: 'icon-grad' }) iconGrad = 0;
    @property({ type: Number, attribute: 'icon-wght' }) iconWght = 400;

    @property({ type: Boolean }) checkable = false;
    @property({ type: Boolean }) checked = false;

    @property({ type: Number, attribute: 'timer-duration' }) timerDuration = 10;
    @property({ type: String, attribute: 'timer-format' }) timerFormat: 'ss' | 'mm:ss' = 'ss';
    @property({ type: Boolean, attribute: 'auto-run-on-click' }) autoRunOnClick = false;

    @state() private _remaining = 0;
    @state() private _locked = false;

    private _timerId: number | null = null;

    static styles = unsafeCSS(timeStyles);

    get timerRunning(): boolean { return this._timerId !== null; }
    get remainingSeconds(): number { return this._remaining; }

    run(durationSec?: number): void {
        const dur = durationSec && durationSec > 0 ? Math.floor(durationSec) : this.timerDuration;
        this._clearTimer();
        this._remaining = Math.max(1, dur);
        this._locked = true;

        this._timerId = window.setInterval(() => {
            this._remaining -= 1;
            if (this._remaining <= 0) {
                this._remaining = 0;
                this._locked = false;
                this._clearTimer();
                this.dispatchEvent(new CustomEvent('timer-finished', { bubbles: true, composed: true }));
            }
        }, 1000);

        this.dispatchEvent(new CustomEvent('timer-started', { bubbles: true, composed: true }));
    }

    stop(): void {
        const wasRunning = this.timerRunning;
        this._clearTimer();
        this._remaining = 0;
        this._locked = false;
        if (wasRunning) {
            this.dispatchEvent(new CustomEvent('timer-stopped', { bubbles: true, composed: true }));
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

    private _formatTimer(value: number): string {
        if (this.timerFormat === 'mm:ss') {
            const min = Math.floor(value / 60);
            const sec = value % 60;
            return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        }
        return String(value);
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

        this.dispatchEvent(new CustomEvent('clicked', { bubbles: true, composed: true }));

        if (this.autoRunOnClick) {
            this.run();
        }
    }

    render() {
        const fontFamily = this.iconType === 1
            ? "'Material Symbols Rounded'"
            : this.iconType === 2
                ? "'Material Symbols Sharp'"
                : "'Material Symbols Outlined'";

        return html`
            <button
                class="container efab ${this._locked ? 'locked' : ''}"
                style="
                    --tb-bg:var(--md-sys-color-primary-container, #eaddff);
                    --tb-fg:var(--md-sys-color-on-primary-container, #21005d);
                    --icon-font-family:${fontFamily};
                    --icon-fill:${this.iconFill};
                    --icon-wght:${this.iconWght};
                    --icon-grad:${this.iconGrad};
                    --icon-opsz:24;
                "
                ?disabled=${this._locked}
                @click=${this._handleClick}
            >
                <span class="state-layer"></span>
                <span class="content">
                    ${this.iconName ? html`<span class="icon">${this.iconName}</span>` : null}
                    ${this.text ? html`<span class="label">${this.text}</span>` : null}
                    ${this._locked ? html`<span class="timer">${this._formatTimer(this._remaining)}</span>` : null}
                </span>
            </button>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-extended-floating-action-time-button': ExtendedFloatingActionTimeButton;
    }
}
