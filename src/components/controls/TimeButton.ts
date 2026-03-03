import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import timeStyles from '../styles/TimeButtons.css';

type ButtonSizeSpec = { h: number; w: number; fs: number; i: number; p: number };

@customElement('umi-time-button')
export class TimeButton extends LitElement {
    @property({ type: Number }) buttonType = 0; // 0 Filled, 1 Tonal, 2 Elevated, 3 Outlined, 4 Text
    @property({ type: Number }) size = 2; // M

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

    private _sizeSpecs(): ButtonSizeSpec {
        const specs: Record<number, ButtonSizeSpec> = {
            0: { h: 32, w: 64, fs: 11, i: 16, p: 16 },
            1: { h: 36, w: 72, fs: 12, i: 20, p: 20 },
            2: { h: 40, w: 80, fs: 14, i: 20, p: 24 },
            3: { h: 48, w: 96, fs: 16, i: 18, p: 28 },
            4: { h: 56, w: 112, fs: 18, i: 18, p: 32 },
        };
        return specs[this.size] ?? specs[2];
    }

    private _palette() {
        const disabled = this._locked;
        let bg = 'var(--md-sys-color-primary, #6750a4)';
        let fg = 'var(--md-sys-color-on-primary, #ffffff)';
        let border = '0px solid transparent';

        switch (this.buttonType) {
            case 1:
                bg = 'var(--md-sys-color-secondary-container, #e8def8)';
                fg = 'var(--md-sys-color-on-secondary-container, #1d192b)';
                break;
            case 2:
                bg = 'var(--md-sys-color-surface-container-low, #f3edf7)';
                fg = 'var(--md-sys-color-primary, #6750a4)';
                break;
            case 3:
                bg = 'transparent';
                fg = 'var(--md-sys-color-primary, #6750a4)';
                border = '1px solid var(--md-sys-color-outline, #79747e)';
                break;
            case 4:
                bg = 'transparent';
                fg = 'var(--md-sys-color-primary, #6750a4)';
                break;
            default:
                break;
        }

        if (disabled) {
            fg = 'var(--md-sys-color-on-surface, #1d1b20)';
        }

        return { bg, fg, border };
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
        const specs = this._sizeSpecs();
        const p = this._palette();
        const fontFamily = this.iconType === 1
            ? "'Material Symbols Rounded'"
            : this.iconType === 2
                ? "'Material Symbols Sharp'"
                : "'Material Symbols Outlined'";

        return html`
            <button
                class="container ${this._locked ? 'locked' : ''}"
                style="
                    --tb-height:${specs.h}px;
                    --tb-min-width:${specs.w}px;
                    --tb-font-size:${specs.fs}px;
                    --tb-icon-size:${specs.i}px;
                    --tb-pad-x:${specs.p}px;
                    --tb-bg:${p.bg};
                    --tb-fg:${p.fg};
                    --tb-border:${p.border};
                    --icon-font-family:${fontFamily};
                    --icon-fill:${this.iconFill};
                    --icon-wght:${this.iconWght};
                    --icon-grad:${this.iconGrad};
                    --icon-opsz:${specs.i};
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
        'umi-time-button': TimeButton;
    }
}
