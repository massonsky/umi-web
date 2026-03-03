import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import progressStyles from '../styles/ProgressButtons.css';

type ButtonSizeSpec = { h: number; w: number; fs: number; i: number; p: number };

@customElement('umi-progress-bar-button')
export class ProgressBarButton extends LitElement {
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
        let progress = 'var(--md-sys-color-on-primary, #ffffff)';

        switch (this.buttonType) {
            case 1:
                bg = 'var(--md-sys-color-secondary-container, #e8def8)';
                fg = 'var(--md-sys-color-on-secondary-container, #1d192b)';
                progress = 'var(--md-sys-color-primary, #6750a4)';
                break;
            case 2:
                bg = 'var(--md-sys-color-surface-container-low, #f3edf7)';
                fg = 'var(--md-sys-color-primary, #6750a4)';
                progress = 'var(--md-sys-color-primary, #6750a4)';
                break;
            case 3:
                bg = 'transparent';
                fg = 'var(--md-sys-color-primary, #6750a4)';
                border = '1px solid var(--md-sys-color-outline, #79747e)';
                progress = 'var(--md-sys-color-primary, #6750a4)';
                break;
            case 4:
                bg = 'transparent';
                fg = 'var(--md-sys-color-primary, #6750a4)';
                progress = 'var(--md-sys-color-primary, #6750a4)';
                break;
            default:
                break;
        }

        if (disabled) {
            fg = 'var(--md-sys-color-on-surface, #1d1b20)';
        }

        return { bg, fg, border, progress };
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
                    --pb-height:${specs.h}px;
                    --pb-min-width:${specs.w}px;
                    --pb-font-size:${specs.fs}px;
                    --pb-icon-size:${specs.i}px;
                    --pb-pad-x:${specs.p}px;
                    --pb-bg:${p.bg};
                    --pb-fg:${p.fg};
                    --pb-border:${p.border};
                    --pb-progress:${p.progress};
                    --icon-font-family:${fontFamily};
                    --icon-fill:${this.iconFill};
                    --icon-wght:${this.iconWght};
                    --icon-grad:${this.iconGrad};
                    --icon-opsz:${specs.i};
                "
                ?disabled=${this._locked}
                @click=${this._handleClick}
            >
                <span class="progress-layer" style="width:${(this._progress * 100).toFixed(2)}%"></span>
                <span class="state-layer"></span>
                <span class="content">
                    ${this.iconName ? html`<span class="icon">${this.iconName}</span>` : null}
                    ${this.text ? html`<span class="label">${this.text}</span>` : null}
                </span>
            </button>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-progress-bar-button': ProgressBarButton;
    }
}
