import { LitElement, html, svg, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import progressStyles from '../styles/ProgressBars.css';

function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

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

@customElement('umi-ic-progress-bar-expressive')
export class ICProgressBarExpressive extends LitElement {
    @property({ type: Boolean }) running = true;

    @property({ type: String, attribute: 'indicator-color' }) indicatorColor = '';
    @property({ type: String, attribute: 'track-color' }) trackColor = '';

    @property({ type: Number }) thickness = 4;
    @property({ type: Number, attribute: 'stroke-width' }) strokeWidth = 4;
    @property({ type: Number, attribute: 'track-width' }) trackWidth = 4;

    @property({ type: Boolean, attribute: 'show-track' }) showTrack = true;
    @property({ type: Number, attribute: 'gap-angle' }) gapAngle = 12;
    @property({ type: Number, attribute: 'gap-size' }) gapSize = 4;
    @property({ type: Number, attribute: 'min-visible-track-angle' }) minVisibleTrackAngle = 10;

    @property({ type: Number }) diameter = 48;
    @property({ type: Number, attribute: 'rotation-duration' }) rotationDuration = 1100;
    @property({ type: Number, attribute: 'cycle-duration' }) cycleDuration = 1333;

    @property({ type: Number, attribute: 'wave-amplitude' }) waveAmplitude = 1.2;
    @property({ type: Number, attribute: 'wave-length' }) waveLength = 32;
    @property({ type: Number, attribute: 'wave-duration' }) waveDuration = 1600;
    @property({ type: Number, attribute: 'wave-cycles' }) waveCycles = 6;

    @state() private _rotationAngle = 0;
    @state() private _startOffset = 0;
    @state() private _sweepAngle = 10;
    @state() private _wavePhase = 0;

    private _raf = 0;
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
        if (this._raf) return;
        this._last = performance.now();
        this._raf = requestAnimationFrame((t) => this._tick(t));
    }

    private _stop() {
        if (!this._raf) return;
        cancelAnimationFrame(this._raf);
        this._raf = 0;
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

        this._wavePhase = (this._wavePhase + (dt / Math.max(16, this.waveDuration)) * Math.PI * 2) % (Math.PI * 2);

        this.requestUpdate();
        this._raf = requestAnimationFrame((tt) => this._tick(tt));
    }

    private _waveArcPath(cx: number, cy: number, radius: number, startDeg: number, sweepDeg: number): string {
        const steps = Math.max(240, Math.floor(Math.abs(sweepDeg) * 3));
        const angleStep = sweepDeg / Math.max(1, steps);

        const arcLength = radius * (Math.abs(sweepDeg) * Math.PI / 180);
        const effectiveWaveLength = this.waveCycles > 0 ? arcLength / this.waveCycles : Math.max(1, this.waveLength);
        const waveFrequency = (2 * Math.PI) / Math.max(1e-6, effectiveWaveLength);

        let d = '';
        for (let i = 0; i <= steps; i++) {
            const segDeg = startDeg + angleStep * i;
            const segRad = (segDeg - 90) * Math.PI / 180;
            const segLen = arcLength * (i / steps);
            const phase = segLen * waveFrequency + this._wavePhase;
            const waveOffset = Math.sin(phase) * this.waveAmplitude;
            const cosA = Math.cos(segRad);
            const sinA = Math.sin(segRad);
            const x = cx + radius * cosA + waveOffset * cosA;
            const y = cy + radius * sinA + waveOffset * sinA;
            d += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
        }
        return d;
    }

    render() {
        const diameter = Math.max(8, this.diameter);
        const indicatorStroke = Math.max(1, this.strokeWidth || this.thickness);
        const trackStroke = Math.max(1, this.trackWidth || this.thickness);
        const maxStroke = Math.max(indicatorStroke, trackStroke);

        const radiusPx = Math.max(1, (diameter - maxStroke) * 0.5);
        const radius = (radiusPx * 48) / diameter;

        const gapRadius = Math.max(1, (diameter - maxStroke) * 0.5);
        const minGapFromSize = (this.gapSize / gapRadius) * 180 / Math.PI;
        const capComp = ((maxStroke * 0.5) / gapRadius) * 180 / Math.PI;
        const effectiveGap = Math.max(this.gapAngle, minGapFromSize + capComp);

        const effectiveStart = this._rotationAngle + this._startOffset;
        const indicatorStartRad = (effectiveStart - 90) * Math.PI / 180;
        const indicatorEndRad = (effectiveStart + this._sweepAngle - 90) * Math.PI / 180;

        const indicatorColor = this.indicatorColor || 'var(--md-primary)';
        const trackColor = this.trackColor || 'var(--md-secondary-container)';
        const scale = 48 / diameter;
        const wavePadPx = Math.max(0, this.waveAmplitude + indicatorStroke / 2);
        const wavePadVb = wavePadPx * scale;
        const vbSize = 48 + wavePadVb * 2;
        const svgSize = diameter + wavePadPx * 2;

        let trackD = '';
        if (this.showTrack) {
            const rawGapRad = effectiveGap * Math.PI / 180;
            const minTrackRad = this.minVisibleTrackAngle * Math.PI / 180;
            const sweepRad = Math.abs(this._sweepAngle) * Math.PI / 180;
            const maxGapRad = Math.max(0, ((Math.PI * 2) - sweepRad - minTrackRad) * 0.5);
            const gapRad = Math.min(rawGapRad, maxGapRad);
            const trackStart = indicatorEndRad + gapRad;
            const trackEnd = indicatorStartRad - gapRad + Math.PI * 2;
            trackD = arcPath(24, 24, radius, trackStart, trackEnd);
        }

        const waveD = this._waveArcPath(24, 24, radius, effectiveStart, this._sweepAngle);

        return html`
            <div class="wrapper ${this.running ? 'scale-visible' : 'scale-hidden'}" style="width:${diameter}px;height:${diameter}px" role="progressbar" aria-label="Экспрессивный круговой индикатор загрузки">
                <svg
                    width="${svgSize}"
                    height="${svgSize}"
                    viewBox="${-wavePadVb} ${-wavePadVb} ${vbSize} ${vbSize}"
                    style="position:absolute;left:${-wavePadPx}px;top:${-wavePadPx}px;overflow:visible"
                >
                    ${trackD ? svg`<path class="arc" d="${trackD}" stroke="${trackColor}" stroke-width="${(trackStroke * 48) / diameter}"/>` : null}
                    <path class="arc" d="${waveD}" stroke="${indicatorColor}" stroke-width="${(indicatorStroke * 48) / diameter}"/>
                </svg>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-ic-progress-bar-expressive': ICProgressBarExpressive;
    }
}
