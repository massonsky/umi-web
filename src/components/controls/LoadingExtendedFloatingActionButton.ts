import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import loadingStyles from '../styles/LoadingButtons.css';

@customElement('umi-loading-extended-floating-action-button')
export class LoadingExtendedFloatingActionButton extends LitElement {
    @property({ type: String }) text = '';
    @property({ type: String, attribute: 'icon-name' }) iconName = '';
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

    private _renderLoader(sizePx: number) {
        const indicatorColor = this.progressIndicatorColor || 'currentColor';
        const trackColor = this.progressTrackColor || 'rgba(127, 127, 127, 0.25)';
        const indicatorSize = Math.max(16, Math.floor(sizePx * 0.46));

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
        const fontFamily = this.iconType === 1
            ? "'Material Symbols Rounded'"
            : this.iconType === 2
                ? "'Material Symbols Sharp'"
                : "'Material Symbols Outlined'";

        return html`
            <button
                class="container efab ${this.loading ? 'locked' : ''}"
                style="
                    --lb-bg:var(--md-sys-color-primary-container, #eaddff);
                    --lb-fg:var(--md-sys-color-on-primary-container, #21005d);
                    --icon-font-family:${fontFamily};
                    --icon-fill:${this.iconFill};
                    --icon-wght:${this.iconWght};
                    --icon-grad:${this.iconGrad};
                    --icon-opsz:24;
                "
                ?disabled=${this.loading}
                @click=${this._handleClick}
            >
                <span class="state-layer"></span>
                <span class="content ${this.loading ? 'loading' : ''}">
                    ${this.iconName ? html`<span class="icon">${this.iconName}</span>` : null}
                    ${this.text ? html`<span class="label">${this.text}</span>` : null}
                </span>
                <span class="loader-wrap ${this.loading ? 'visible' : ''}">
                    ${this.loading ? this._renderLoader(56) : null}
                </span>
            </button>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-loading-extended-floating-action-button': LoadingExtendedFloatingActionButton;
    }
}
