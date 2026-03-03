import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import progressStyles from '../styles/ProgressBars.css';

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }

@customElement('umi-dl-progress-bar')
export class DLProgressBar extends LitElement {
    @property({ type: Number }) progress = 0; // 0..100
    @property({ type: Number }) thickness = 4;
    @property({ type: Number, attribute: 'gap-size' }) gapSize = 4;
    @property({ type: Number, attribute: 'min-gap-size' }) minGapSize = 2;

    @property({ type: Boolean, attribute: 'stop-indicator-visible' }) stopIndicatorVisible = true;

    @property({ type: String, attribute: 'indicator-color' }) indicatorColor = '';
    @property({ type: String, attribute: 'track-color' }) trackColor = '';
    @property({ type: String, attribute: 'stop-color' }) stopColor = '';

    @property({ type: Number, attribute: 'animation-duration' }) animationDuration = 300;
    @property({ type: Number, attribute: 'appear-animation-duration' }) appearAnimationDuration = 250;

    static styles = unsafeCSS(progressStyles);

    setProgress(value: number) {
        this.progress = clamp(value, 0, 100);
    }

    private get _p(): number { return clamp(this.progress, 0, 100) / 100; }

    render() {
        const p = this._p;
        const thickness = Math.max(1, this.thickness);
        const effectiveGap = p > 0 ? Math.max(this.gapSize, Math.max(this.minGapSize, thickness)) : 0;
        const indicatorW = `${(p * 100).toFixed(4)}%`;

        const indicatorColor = this.indicatorColor || 'var(--md-primary)';
        const trackColor = this.trackColor || 'var(--md-secondary-container)';
        const stopColor = this.stopColor || indicatorColor;

        const stopVisible = this.stopIndicatorVisible && p > 0 && p < 1;

        return html`
            <div
                class="linear-root scale-visible"
                style="
                    --thickness:${thickness}px;
                    width:100%;
                    min-width:48px;
                    transition-duration:${this.appearAnimationDuration}ms;
                "
                role="progressbar"
                aria-label="Линейный индикатор прогресса"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow="${Math.round(this.progress)}"
            >
                <div
                    class="bar-segment"
                    style="
                        left:0;
                        width:${indicatorW};
                        background:${indicatorColor};
                        transition:width ${this.animationDuration}ms cubic-bezier(.2,0,0,1);
                    "
                ></div>

                <div
                    class="bar-segment"
                    style="
                        left:calc(${indicatorW} + ${effectiveGap}px);
                        right:0;
                        background:${trackColor};
                        transition:left ${this.animationDuration}ms cubic-bezier(.2,0,0,1);
                    "
                ></div>

                ${stopVisible ? html`
                    <div
                        class="bar-segment"
                        style="
                            right:0;
                            width:${thickness}px;
                            background:${stopColor};
                            transform:scale(1);
                            transition:transform ${Math.max(100, this.animationDuration / 2)}ms cubic-bezier(.34,1.56,.64,1);
                        "
                    ></div>
                ` : null}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-dl-progress-bar': DLProgressBar;
    }
}
