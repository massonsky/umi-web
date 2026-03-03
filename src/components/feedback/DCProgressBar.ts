import { LitElement, html, svg, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import progressStyles from '../styles/ProgressBars.css';

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }

function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
    const delta = end - start;
    if (delta <= 0) return '';
    if (delta >= Math.PI * 2 - 0.0001) {
        const mid = start + Math.PI;
        const x1 = cx + r * Math.cos(start);
        const y1 = cy + r * Math.sin(start);
        const xm = cx + r * Math.cos(mid);
        const ym = cy + r * Math.sin(mid);
        return `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${xm} ${ym} A ${r} ${r} 0 1 1 ${x1} ${y1}`;
    }

    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const largeArc = delta > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

@customElement('umi-dc-progress-bar')
export class DCProgressBar extends LitElement {
    @property({ type: Number }) progress = 0; // 0..100
    @property({ type: Number }) thickness = 4;
    @property({ type: Number }) diameter = 48;
    @property({ type: Number, attribute: 'gap-size' }) gapSize = 4;
    @property({ type: Number, attribute: 'min-gap-size' }) minGapSize = 2;

    @property({ type: String, attribute: 'indicator-color' }) indicatorColor = '';
    @property({ type: String, attribute: 'track-color' }) trackColor = '';

    @property({ type: Number, attribute: 'animation-duration' }) animationDuration = 300;
    @property({ type: Number, attribute: 'appear-animation-duration' }) appearAnimationDuration = 250;

    static styles = unsafeCSS(progressStyles);

    setProgress(value: number) {
        this.progress = clamp(value, 0, 100);
    }

    private get _p(): number { return clamp(this.progress, 0, 100) / 100; }

    render() {
        const diameter = Math.max(8, this.diameter);
        const thickness = Math.max(1, this.thickness);
        const radius = Math.max(1, (diameter - thickness) / 2);
        const effGap = Math.max(this.gapSize, Math.max(this.minGapSize, thickness));

        const capRad = thickness / (2 * radius);
        const gapRad = (effGap / radius) + capRad;

        const p = this._p;
        const isExtreme = p <= 0 || p >= 1;
        const spanRad = isExtreme ? (p <= 0 ? 0 : Math.PI * 2) : p * (Math.PI * 2 - 2 * gapRad);
        const startRad = -Math.PI / 2 + (isExtreme ? 0 : gapRad);
        const endRad = startRad + spanRad;

        const indicatorD = p > 0 ? arcPath(24, 24, (radius * 48) / diameter, startRad, endRad) : '';

        let trackD = '';
        if (p < 1) {
            if (p <= 0) {
                trackD = arcPath(24, 24, (radius * 48) / diameter, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
            } else {
                const tStart = endRad + gapRad;
                const tEnd = startRad - gapRad + Math.PI * 2;
                trackD = arcPath(24, 24, (radius * 48) / diameter, tStart, tEnd);
            }
        }

        const indicatorColor = this.indicatorColor || 'var(--md-primary)';
        const trackColor = this.trackColor || 'var(--md-secondary-container)';
        const visible = this.progress < 100;

        return html`
            <div
                class="wrapper ${visible ? 'scale-visible' : 'scale-hidden'}"
                style="
                    width:${diameter}px;
                    height:${diameter}px;
                    transition-duration:${this.appearAnimationDuration}ms;
                "
                role="progressbar"
                aria-label="Индикатор прогресса"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow="${Math.round(this.progress)}"
            >
                <svg width="${diameter}" height="${diameter}" viewBox="0 0 48 48">
                    ${trackD ? svg`<path class="arc" d="${trackD}" stroke="${trackColor}" stroke-width="${(thickness * 48) / diameter}" />` : null}
                    ${indicatorD ? svg`<path class="arc" d="${indicatorD}" stroke="${indicatorColor}" stroke-width="${(thickness * 48) / diameter}" />` : null}
                </svg>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-dc-progress-bar': DCProgressBar;
    }
}
