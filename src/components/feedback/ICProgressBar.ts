import { LitElement, html, svg, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import progressStyles from '../styles/ProgressBars.css';

function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
    let delta = end - start;
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

@customElement('umi-ic-progress-bar')
export class ICProgressBar extends LitElement {
    @property({ type: Boolean }) running = true;

    @property({ type: String, attribute: 'indicator-color' }) indicatorColor = '';
    @property({ type: Number, attribute: 'stroke-width' }) strokeWidth = 4;

    @property({ type: Boolean, attribute: 'show-track' }) showTrack = true;
    @property({ type: String, attribute: 'track-color' }) trackColor = '';
    @property({ type: Number, attribute: 'track-width' }) trackWidth = 4;

    @property({ type: Number, attribute: 'gap-angle' }) gapAngle = 12;
    @property({ type: Number, attribute: 'gap-size' }) gapSize = 4;
    @property({ type: Number, attribute: 'min-visible-track-angle' }) minVisibleTrackAngle = 10;

    @property({ type: Number }) diameter = 48;
    @property({ type: Number, attribute: 'rotation-duration' }) rotationDuration = 1100;
    @property({ type: Number, attribute: 'cycle-duration' }) cycleDuration = 1333;

    @state() private _rotationAngle = 0;
    @state() private _startOffset = 0;
    @state() private _sweepAngle = 10;

    private _rafId = 0;
    private _last = 0;
    private _elapsed = 0;

    static styles = unsafeCSS(progressStyles);

    connectedCallback() {
        super.connectedCallback();
        if (this.running) this._start();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._stop();
    }

    updated(changed: Map<string, unknown>) {
        if (changed.has('running')) {
            if (this.running) {
                this._startOffset = 0;
                this._sweepAngle = 10;
                this._elapsed = 0;
                this._start();
            } else {
                this._stop();
            }
        }
    }

    private _start() {
        if (this._rafId) return;
        this._last = performance.now();
        this._rafId = requestAnimationFrame((t) => this._tick(t));
    }

    private _stop() {
        if (!this._rafId) return;
        cancelAnimationFrame(this._rafId);
        this._rafId = 0;
    }

    private _tick(t: number) {
        const dt = t - this._last;
        this._last = t;
        this._elapsed += dt;

        this._rotationAngle = ((this._rotationAngle + (360 / Math.max(1, this.rotationDuration)) * dt) % 360 + 360) % 360;

        const two = this.cycleDuration * 2;
        const loops = Math.floor(this._elapsed / two);
        const within = this._elapsed % two;

        if (within <= this.cycleDuration) {
            const k = easeInOutCubic(within / this.cycleDuration);
            this._sweepAngle = 10 + (300 - 10) * k;
            this._startOffset = loops * 550 + 160 * k;
        } else {
            const s = within - this.cycleDuration;
            const k = easeInOutCubic(s / this.cycleDuration);
            this._sweepAngle = 300 + (10 - 300) * k;
            this._startOffset = loops * 550 + 160 + (550 - 160) * k;
        }

        this.requestUpdate();
        this._rafId = requestAnimationFrame((tt) => this._tick(tt));
    }

    render() {
        const diameter = Math.max(8, this.diameter);
        const strokeW = Math.max(1, this.strokeWidth);
        const trackW = Math.max(1, this.trackWidth);
        const maxStroke = Math.max(strokeW, trackW);

        const radiusPx = Math.max(1, (diameter - maxStroke) * 0.5);
        const radius = (radiusPx * 48) / diameter;

        const gapRadius = Math.max(1, (diameter - maxStroke) * 0.5);
        const minGapFromSize = (this.gapSize / gapRadius) * 180 / Math.PI;
        const capComp = ((maxStroke * 0.5) / gapRadius) * 180 / Math.PI;
        const effectiveGap = Math.max(this.gapAngle, minGapFromSize + capComp);

        const effectiveStart = this._rotationAngle + this._startOffset;
        const indicatorStart = (effectiveStart - 90) * Math.PI / 180;
        const indicatorEnd = (effectiveStart + this._sweepAngle - 90) * Math.PI / 180;

        const indicatorColor = this.indicatorColor || 'var(--md-primary)';
        const trackColor = this.trackColor || 'var(--md-secondary-container)';

        let trackD = '';
        if (this.showTrack) {
            const rawGapRad = effectiveGap * Math.PI / 180;
            const minTrackRad = this.minVisibleTrackAngle * Math.PI / 180;
            const sweepRad = Math.abs(this._sweepAngle) * Math.PI / 180;
            const maxGapRad = Math.max(0, ((Math.PI * 2) - sweepRad - minTrackRad) * 0.5);
            const gapRad = Math.min(rawGapRad, maxGapRad);
            const trackStart = indicatorEnd + gapRad;
            const trackEnd = indicatorStart - gapRad + Math.PI * 2;
            trackD = arcPath(24, 24, radius, trackStart, trackEnd);
        }

        const indicatorD = arcPath(24, 24, radius, indicatorStart, indicatorEnd);

        return html`
            <div class="wrapper ${this.running ? 'scale-visible' : 'scale-hidden'}" style="width:${diameter}px;height:${diameter}px">
                <svg width="${diameter}" height="${diameter}" viewBox="0 0 48 48" role="progressbar" aria-label="Индикатор неопределенного прогресса">
                    ${trackD ? svg`<path class="arc" d="${trackD}" stroke="${trackColor}" stroke-width="${(trackW * 48) / diameter}"/>` : null}
                    <path class="arc" d="${indicatorD}" stroke="${indicatorColor}" stroke-width="${(strokeW * 48) / diameter}"/>
                </svg>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-ic-progress-bar': ICProgressBar;
    }
}
