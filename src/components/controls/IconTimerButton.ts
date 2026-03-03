import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import timeStyles from '../styles/TimeButtons.css';

@customElement('umi-icon-timer-button')
export class IconTimerButton extends LitElement {
    @property({ type: Number, attribute: 'button-type' }) buttonType = 0; // 0 Standard, 1 Filled, 2 Tonal, 3 Outlined
    @property({ type: Number }) size = 2; // 0..4

    @property({ type: String, attribute: 'icon-name' }) iconName = '';
    @property({ type: String, attribute: 'checked-icon-name' }) checkedIconName = '';
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

    private _sizePx(): number {
        const map: Record<number, number> = { 0: 32, 1: 36, 2: 40, 3: 48, 4: 56 };
        return map[this.size] ?? 40;
    }

    private _iconPx(sizePx: number): number {
        if (sizePx <= 32) return 18;
        if (sizePx <= 36) return 20;
        if (sizePx <= 40) return 24;
        if (sizePx <= 48) return 28;
        return 32;
    }

    private _palette() {
        let bg = 'transparent';
        let fg = 'var(--md-sys-color-on-surface-variant, #49454f)';
        let border = '0px solid transparent';

        switch (this.buttonType) {
            case 1:
                bg = 'var(--md-sys-color-primary, #6750a4)';
                fg = 'var(--md-sys-color-on-primary, #ffffff)';
                break;
            case 2:
                bg = 'var(--md-sys-color-secondary-container, #e8def8)';
                fg = 'var(--md-sys-color-on-secondary-container, #1d192b)';
                break;
            case 3:
                bg = 'transparent';
                fg = 'var(--md-sys-color-on-surface-variant, #49454f)';
                border = '1px solid var(--md-sys-color-outline, #79747e)';
                break;
            default:
                break;
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
        const sizePx = this._sizePx();
        const iconPx = this._iconPx(sizePx);
        const p = this._palette();

        const icon = this.checkable && this.checked && this.checkedIconName
            ? this.checkedIconName
            : this.iconName;

        const fontFamily = this.iconType === 1
            ? "'Material Symbols Rounded'"
            : this.iconType === 2
                ? "'Material Symbols Sharp'"
                : "'Material Symbols Outlined'";

        return html`
            <button
                class="container icon-btn ${this._locked ? 'locked' : ''}"
                style="
                    --tb-icon-btn-size:${sizePx}px;
                    --tb-bg:${p.bg};
                    --tb-fg:${p.fg};
                    --tb-border:${p.border};
                    --tb-icon-size:${iconPx}px;
                    --icon-font-family:${fontFamily};
                    --icon-fill:${this.iconFill};
                    --icon-wght:${this.iconWght};
                    --icon-grad:${this.iconGrad};
                    --icon-opsz:${iconPx};
                "
                ?disabled=${this._locked}
                @click=${this._handleClick}
            >
                <span class="state-layer"></span>
                <span class="content">
                    ${this._locked
                        ? html`<span class="timer" style="font-size:${Math.max(11, Math.floor(iconPx * 0.65))}px">${this._formatTimer(this._remaining)}</span>`
                        : (icon ? html`<span class="icon">${icon}</span>` : null)}
                </span>
            </button>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-icon-timer-button': IconTimerButton;
    }
}
