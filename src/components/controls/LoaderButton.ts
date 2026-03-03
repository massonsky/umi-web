import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import loadingStyles from '../styles/LoadingButtons.css';

type ButtonSizeSpec = { h: number; w: number; fs: number; i: number; p: number };

@customElement('umi-loader-button')
export class LoaderButton extends LitElement {
    @property({ type: Number, attribute: 'button-type' }) buttonType = 0; // 0 Filled, 1 Tonal, 2 Elevated, 3 Outlined, 4 Text
    @property({ type: Number }) size = 2; // M

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
    @property({ type: Number, attribute: 'progress-type' }) progressType = 1; // 0 Determinate, 1 Indeterminate, 2 Indicator
    @property({ type: Number, attribute: 'progress-style' }) progressStyle = 0; // 0 Legacy, 1 Expressive
    @property({ type: String, attribute: 'progress-indicator-color' }) progressIndicatorColor = '';
    @property({ type: String, attribute: 'progress-track-color' }) progressTrackColor = '';

    static styles = unsafeCSS(loadingStyles);

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

        return { bg, fg, border };
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

    private _renderLoader(sizePx: number) {
        const indicatorColor = this.progressIndicatorColor || 'currentColor';
        const trackColor = this.progressTrackColor || 'rgba(127, 127, 127, 0.25)';

        if (this.progressType === 2) {
            return html`
                <umi-loading-indicator
                    .size=${Math.max(16, Math.floor(sizePx * 0.6))}
                    .color=${indicatorColor}
                    .hasBackground=${false}
                ></umi-loading-indicator>
            `;
        }

        if (this.progressType === 0) {
            return this.progressStyle === 1
                ? html`
                    <umi-dc-progress-bar-expressive
                        .progress=${Math.max(0, Math.min(100, this.progress))}
                        .diameter=${Math.max(16, Math.floor(sizePx * 0.6))}
                        .thickness=${3}
                        .gapSize=${6}
                        .indicatorColor=${indicatorColor}
                        .trackColor=${trackColor}
                    ></umi-dc-progress-bar-expressive>
                `
                : html`
                    <umi-dc-progress-bar
                        .progress=${Math.max(0, Math.min(100, this.progress))}
                        .diameter=${Math.max(16, Math.floor(sizePx * 0.6))}
                        .thickness=${3}
                        .gapSize=${6}
                        .indicatorColor=${indicatorColor}
                        .trackColor=${trackColor}
                    ></umi-dc-progress-bar>
                `;
        }

        return this.progressStyle === 1
            ? html`
                <umi-ic-progress-bar-expressive
                    .running=${true}
                    .diameter=${Math.max(16, Math.floor(sizePx * 0.6))}
                    .thickness=${3}
                    .gapSize=${6}
                    .indicatorColor=${indicatorColor}
                    .trackColor=${trackColor}
                    .showTrack=${true}
                ></umi-ic-progress-bar-expressive>
            `
            : html`
                <umi-ic-progress-bar
                    .running=${true}
                    .diameter=${Math.max(16, Math.floor(sizePx * 0.6))}
                    .strokeWidth=${3}
                    .gapSize=${6}
                    .indicatorColor=${indicatorColor}
                    .trackColor=${trackColor}
                    .showTrack=${true}
                ></umi-ic-progress-bar>
            `;
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
                class="container ${this.loading ? 'locked' : ''}"
                style="
                    --lb-height:${specs.h}px;
                    --lb-min-width:${specs.w}px;
                    --lb-font-size:${specs.fs}px;
                    --lb-icon-size:${specs.i}px;
                    --lb-pad-x:${specs.p}px;
                    --lb-bg:${p.bg};
                    --lb-fg:${p.fg};
                    --lb-border:${p.border};
                    --icon-font-family:${fontFamily};
                    --icon-fill:${this.iconFill};
                    --icon-wght:${this.iconWght};
                    --icon-grad:${this.iconGrad};
                    --icon-opsz:${specs.i};
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
                    ${this.loading ? this._renderLoader(specs.h) : null}
                </span>
            </button>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-loader-button': LoaderButton;
    }
}
