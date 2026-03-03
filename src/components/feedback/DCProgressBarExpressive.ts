import { LitElement, html, svg, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
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

@customElement('umi-dc-progress-bar-expressive')
export class DCProgressBarExpressive extends LitElement {
    @property({ type: Number }) progress = 0;
    @property({ type: Number }) thickness = 4;
    @property({ type: Number }) diameter = 48;
    @property({ type: Number, attribute: 'gap-size' }) gapSize = 4;
    @property({ type: Number, attribute: 'min-gap-size' }) minGapSize = 2;

    @property({ type: String, attribute: 'indicator-color' }) indicatorColor = '';
    @property({ type: String, attribute: 'track-color' }) trackColor = '';

    @property({ type: Number, attribute: 'animation-duration' }) animationDuration = 300;
    @property({ type: Number, attribute: 'appear-animation-duration' }) appearAnimationDuration = 250;

    @property({ type: Number, attribute: 'wave-amplitude' }) waveAmplitude = 3;
    @property({ type: Number, attribute: 'wave-length' }) waveLength = 40;
    @property({ type: Number, attribute: 'wave-duration' }) waveDuration = 2000;
    @property({ type: Number, attribute: 'wave-cycles' }) waveCycles = 6;

    @state() private _displayProgress = 0;
    @state() private _wavePhase = 0;

    private _progressRaf = 0;
    private _waveRaf = 0;
    private _waveLast = 0;

    static styles = unsafeCSS(progressStyles);

    connectedCallback() {
        super.connectedCallback();
        this._displayProgress = clamp(this.progress, 0, 100);
        this._startWave();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._progressRaf) cancelAnimationFrame(this._progressRaf);
        if (this._waveRaf) cancelAnimationFrame(this._waveRaf);
        this._progressRaf = 0;
        this._waveRaf = 0;
    }

    updated(changed: Map<string, unknown>) {
        if (changed.has('progress')) {
            this._animateProgress();
        }
        this._startWave();
    }

    setProgress(value: number) {
        this.progress = clamp(value, 0, 100);
    }

    private _animateProgress() {
        if (this._progressRaf) cancelAnimationFrame(this._progressRaf);
        const from = this._displayProgress;
        const to = clamp(this.progress, 0, 100);
        const duration = Math.max(16, this.animationDuration);
        const start = performance.now();

        const step = (t: number) => {
            const k = Math.min(1, (t - start) / duration);
            const e = 1 - Math.pow(1 - k, 3);
            this._displayProgress = from + (to - from) * e;
            if (k < 1) this._progressRaf = requestAnimationFrame(step);
            else this._progressRaf = 0;
        };

        this._progressRaf = requestAnimationFrame(step);
    }

    private _startWave() {
        const p = this._displayProgress / 100;
        const extreme = p <= 0 || p >= 1;
        if (extreme || this.progress >= 100) {
            if (this._waveRaf) cancelAnimationFrame(this._waveRaf);
            this._waveRaf = 0;
            return;
        }
        if (this._waveRaf) return;

        this._waveLast = performance.now();
        const tick = (t: number) => {
            const dt = t - this._waveLast;
            this._waveLast = t;
            this._wavePhase = (this._wavePhase + (dt / Math.max(16, this.waveDuration)) * Math.PI * 2) % (Math.PI * 2);
            this.requestUpdate();
            this._waveRaf = requestAnimationFrame(tick);
        };
        this._waveRaf = requestAnimationFrame(tick);
    }

    private _waveArcPath(cx: number, cy: number, radius: number, startRad: number, spanRad: number): string {
        if (spanRad <= 0) return '';
        const degreesSpan = Math.abs(spanRad * 180 / Math.PI);
        const steps = Math.max(240, Math.floor(degreesSpan * 3));
        const angleStep = spanRad / steps;

        const arcLength = radius * Math.abs(spanRad);
        const effectiveWaveLength = this.waveCycles > 0 ? arcLength / this.waveCycles : Math.max(1, this.waveLength);
        const waveFrequency = (2 * Math.PI) / Math.max(1e-6, effectiveWaveLength);

        let d = '';
        for (let i = 0; i <= steps; i++) {
            const angle = startRad + angleStep * i;
            const segmentLength = arcLength * (i / steps);
            const phase = segmentLength * waveFrequency + this._wavePhase;
            const waveOffset = Math.sin(phase) * this.waveAmplitude;
            const x = cx + (radius + waveOffset) * Math.cos(angle);
            const y = cy + (radius + waveOffset) * Math.sin(angle);
            d += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
        }
        return d;
    }

    render() {
        const p = clamp(this._displayProgress, 0, 100) / 100;
        const diameter = Math.max(8, this.diameter);
        const thickness = Math.max(1, this.thickness);
        const radius = Math.max(1, (diameter - thickness) / 2);
        const effGap = Math.max(this.gapSize, Math.max(this.minGapSize, thickness));

        const gapRad = (effGap / radius) + (thickness / (2 * radius));
        const isExtreme = p <= 0 || p >= 1;
        const spanRad = isExtreme ? (p <= 0 ? 0 : Math.PI * 2) : p * (Math.PI * 2 - 2 * gapRad);
        const startRad = -Math.PI / 2 + (isExtreme ? 0 : gapRad);
        const endRad = startRad + spanRad;

        const scale = 48 / diameter;
        const pathRadius = radius * scale;
        const strokeScaled = thickness * scale;

        let trackD = '';
        if (p < 1) {
            if (p <= 0) {
                trackD = arcPath(24, 24, pathRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
            } else {
                trackD = arcPath(24, 24, pathRadius, endRad + gapRad, startRad - gapRad + Math.PI * 2);
            }
        }

        const indicatorNormalD = p > 0 ? arcPath(24, 24, pathRadius, startRad, endRad) : '';
        const indicatorWaveD = (!isExtreme && p > 0) ? this._waveArcPath(24, 24, pathRadius, startRad, spanRad) : '';

        const indicatorColor = this.indicatorColor || 'var(--md-primary)';
        const trackColor = this.trackColor || 'var(--md-secondary-container)';
        const visible = this._displayProgress < 100;
        const wavePadPx = Math.max(0, this.waveAmplitude + thickness / 2);
        const wavePadVb = wavePadPx * scale;
        const vbSize = 48 + wavePadVb * 2;
        const svgSize = diameter + wavePadPx * 2;

        return html`
            <div
                class="wrapper ${visible ? 'scale-visible' : 'scale-hidden'}"
                style="width:${diameter}px;height:${diameter}px;transition-duration:${this.appearAnimationDuration}ms"
                role="progressbar"
                aria-label="Экспрессивный индикатор прогресса"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow="${Math.round(this._displayProgress)}"
            >
                <svg
                    width="${svgSize}"
                    height="${svgSize}"
                    viewBox="${-wavePadVb} ${-wavePadVb} ${vbSize} ${vbSize}"
                    style="position:absolute;left:${-wavePadPx}px;top:${-wavePadPx}px;overflow:visible"
                >
                    ${trackD ? svg`<path class="arc" d="${trackD}" stroke="${trackColor}" stroke-width="${strokeScaled}"/>` : null}
                    ${isExtreme
                        ? (indicatorNormalD ? svg`<path class="arc" d="${indicatorNormalD}" stroke="${indicatorColor}" stroke-width="${strokeScaled}"/>` : null)
                        : (indicatorWaveD ? svg`<path class="arc" d="${indicatorWaveD}" stroke="${indicatorColor}" stroke-width="${strokeScaled}"/>` : null)}
                </svg>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-dc-progress-bar-expressive': DCProgressBarExpressive;
    }
}
