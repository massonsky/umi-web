import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import loadingStyles from '../styles/LoadingButtons.css';

@customElement('umi-loading-floating-action-button')
export class LoadingFloatingActionButton extends LitElement {
    @property({ type: String, attribute: 'icon-name' }) iconName = '';
    @property({ type: Number, attribute: 'icon-type' }) iconType = 0;
    @property({ type: Number, attribute: 'icon-fill' }) iconFill = 0;
    @property({ type: Number, attribute: 'icon-grad' }) iconGrad = 0;
    @property({ type: Number, attribute: 'icon-wght' }) iconWght = 400;
    @property({ type: Boolean }) checkable = false;
    @property({ type: Boolean }) checked = false;
    @property({ type: Number, attribute: 'fab-size' }) fabSize = 56;

    @property({ type: Boolean }) loading = false;
    @property({ type: Number }) progress = 0;
    @property({ type: Number, attribute: 'progress-type' }) progressType = 1;
    @property({ type: Number, attribute: 'progress-style' }) progressStyle = 0;
    @property({ type: String, attribute: 'progress-indicator-color' }) progressIndicatorColor = '';
    @property({ type: String, attribute: 'progress-track-color' }) progressTrackColor = '';

    static styles = unsafeCSS(loadingStyles);

    private _renderLoader(sizePx: number) {
        const indicatorColor = this.progressIndicatorColor || 'currentColor';
        const trackColor = this.progressTrackColor || 'rgba(127, 127, 127, 0.25)';
        const indicatorSize = Math.max(16, Math.floor(sizePx * 0.48));

        if (this.progressType === 2) {
            return html`<umi-loading-indicator .size=${indicatorSize} .color=${indicatorColor}></umi-loading-indicator>`;
        }

        if (this.progressType === 0) {
            return this.progressStyle === 1
                ? html`<umi-dc-progress-bar-expressive .progress=${Math.max(0, Math.min(100, this.progress))} .diameter=${indicatorSize} .thickness=${3} .gapSize=${6} .indicatorColor=${indicatorColor} .trackColor=${trackColor}></umi-dc-progress-bar-expressive>`
                : html`<umi-dc-progress-bar .progress=${Math.max(0, Math.min(100, this.progress))} .diameter=${indicatorSize} .thickness=${3} .gapSize=${6} .indicatorColor=${indicatorColor} .trackColor=${trackColor}></umi-dc-progress-bar>`;
        }

        return this.progressStyle === 1
            ? html`<umi-ic-progress-bar-expressive .running=${true} .diameter=${indicatorSize} .thickness=${3} .gapSize=${6} .indicatorColor=${indicatorColor} .trackColor=${trackColor} .showTrack=${true}></umi-ic-progress-bar-expressive>`
            : html`<umi-ic-progress-bar .running=${true} .diameter=${indicatorSize} .strokeWidth=${3} .gapSize=${6} .indicatorColor=${indicatorColor} .trackColor=${trackColor} .showTrack=${true}></umi-ic-progress-bar>`;
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
        const iconSize = this.fabSize >= 96 ? 36 : 24;
        const radius = this.fabSize >= 96 ? 28 : 16;
        const fontFamily = this.iconType === 1
            ? "'Material Symbols Rounded'"
            : this.iconType === 2
                ? "'Material Symbols Sharp'"
                : "'Material Symbols Outlined'";

        return html`
            <button
                class="container fab ${this.loading ? 'locked' : ''}"
                style="
                    --lb-fab-size:${this.fabSize}px;
                    --lb-fab-radius:${radius}px;
                    --lb-bg:var(--md-sys-color-primary-container, #eaddff);
                    --lb-fg:var(--md-sys-color-on-primary-container, #21005d);
                    --lb-icon-size:${iconSize}px;
                    --icon-font-family:${fontFamily};
                    --icon-fill:${this.iconFill};
                    --icon-wght:${this.iconWght};
                    --icon-grad:${this.iconGrad};
                    --icon-opsz:${iconSize};
                "
                ?disabled=${this.loading}
                @click=${this._handleClick}
            >
                <span class="state-layer"></span>
                <span class="content ${this.loading ? 'loading' : ''}">
                    ${this.iconName ? html`<span class="icon">${this.iconName}</span>` : null}
                </span>
                <span class="loader-wrap ${this.loading ? 'visible' : ''}">
                    ${this.loading ? this._renderLoader(this.fabSize) : null}
                </span>
            </button>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-loading-floating-action-button': LoadingFloatingActionButton;
    }
}
