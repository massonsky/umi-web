import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import loadingStyles from '../styles/LoadingButtons.css';

@customElement('umi-loading-icon-button')
export class LoadingIconButton extends LitElement {
    @property({ type: Number, attribute: 'button-type' }) buttonType = 0; // 0 Standard, 1 Filled, 2 Tonal, 3 Outlined
    @property({ type: Number }) size = 2;

    @property({ type: String, attribute: 'icon-name' }) iconName = '';
    @property({ type: String, attribute: 'checked-icon-name' }) checkedIconName = '';
    @property({ type: Number, attribute: 'icon-type' }) iconType = 0;
    @property({ type: Number, attribute: 'icon-fill' }) iconFill = 0;
    @property({ type: Number, attribute: 'icon-grad' }) iconGrad = 0;
    @property({ type: Number, attribute: 'icon-wght' }) iconWght = 400;

    @property({ type: Boolean }) checkable = false;
    @property({ type: Boolean }) checked = false;

    @property({ type: Boolean }) loading = false;
    @property({ type: Number }) progress = 0;
    @property({ type: Number, attribute: 'progress-type' }) progressType = 1;
    @property({ type: Number, attribute: 'progress-style' }) progressStyle = 0;
    @property({ type: String, attribute: 'progress-indicator-color' }) progressIndicatorColor = '';
    @property({ type: String, attribute: 'progress-track-color' }) progressTrackColor = '';

    static styles = unsafeCSS(loadingStyles);

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

    private _renderLoader(sizePx: number) {
        const indicatorColor = this.progressIndicatorColor || 'currentColor';
        const trackColor = this.progressTrackColor || 'rgba(127, 127, 127, 0.25)';
        const indicatorSize = Math.max(14, Math.floor(sizePx * 0.52));

        if (this.progressType === 2) {
            return html`<umi-loading-indicator .size=${indicatorSize} .color=${indicatorColor}></umi-loading-indicator>`;
        }

        if (this.progressType === 0) {
            return this.progressStyle === 1
                ? html`<umi-dc-progress-bar-expressive .progress=${Math.max(0, Math.min(100, this.progress))} .diameter=${indicatorSize} .thickness=${2} .gapSize=${4} .indicatorColor=${indicatorColor} .trackColor=${trackColor}></umi-dc-progress-bar-expressive>`
                : html`<umi-dc-progress-bar .progress=${Math.max(0, Math.min(100, this.progress))} .diameter=${indicatorSize} .thickness=${2} .gapSize=${4} .indicatorColor=${indicatorColor} .trackColor=${trackColor}></umi-dc-progress-bar>`;
        }

        return this.progressStyle === 1
            ? html`<umi-ic-progress-bar-expressive .running=${true} .diameter=${indicatorSize} .thickness=${2} .gapSize=${4} .indicatorColor=${indicatorColor} .trackColor=${trackColor} .showTrack=${true}></umi-ic-progress-bar-expressive>`
            : html`<umi-ic-progress-bar .running=${true} .diameter=${indicatorSize} .strokeWidth=${2} .gapSize=${4} .indicatorColor=${indicatorColor} .trackColor=${trackColor} .showTrack=${true}></umi-ic-progress-bar>`;
    }

    private _handleClick(): void {
        if (this.loading) return;

        if (this.checkable) {
            this.checked = !this.checked;
            this.dispatchEvent(new CustomEvent('toggled', {
                detail: { checked: this.checked },
                bubbles: true,
                composed: true,
            }));
        }

        this.dispatchEvent(new CustomEvent('clicked', { bubbles: true, composed: true }));
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
                class="container icon-btn ${this.loading ? 'locked' : ''}"
                style="
                    --lb-icon-btn-size:${sizePx}px;
                    --lb-bg:${p.bg};
                    --lb-fg:${p.fg};
                    --lb-border:${p.border};
                    --lb-icon-size:${iconPx}px;
                    --icon-font-family:${fontFamily};
                    --icon-fill:${this.iconFill};
                    --icon-wght:${this.iconWght};
                    --icon-grad:${this.iconGrad};
                    --icon-opsz:${iconPx};
                "
                ?disabled=${this.loading}
                @click=${this._handleClick}
            >
                <span class="state-layer"></span>
                <span class="content ${this.loading ? 'loading' : ''}">
                    ${icon ? html`<span class="icon">${icon}</span>` : null}
                </span>
                <span class="loader-wrap ${this.loading ? 'visible' : ''}">
                    ${this.loading ? this._renderLoader(sizePx) : null}
                </span>
            </button>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-loading-icon-button': LoadingIconButton;
    }
}
