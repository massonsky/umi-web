import { LitElement, html, svg, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import progressStyles from '../styles/ProgressBars.css';

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }

@customElement('umi-dl-progress-bar-expressive')
export class DLProgressBarExpressive extends LitElement {
    @property({ type: Number }) progress = 0;
    @property({ type: Number }) thickness = 4;
    @property({ type: Number, attribute: 'gap-size' }) gapSize = 4;
    @property({ type: Number, attribute: 'min-gap-size' }) minGapSize = 2;

    @property({ type: Boolean, attribute: 'stop-indicator-visible' }) stopIndicatorVisible = true;
    @property({ type: Boolean, attribute: 'is-visible' }) isVisible = true;

    @property({ type: String, attribute: 'indicator-color' }) indicatorColor = '';
    @property({ type: String, attribute: 'indicator-stopped-color' }) indicatorStoppedColor = '';
    @property({ type: String, attribute: 'track-color' }) trackColor = '';
    @property({ type: String, attribute: 'stop-color' }) stopColor = '';

    @property({ type: Number, attribute: 'animation-duration' }) animationDuration = 300;
    @property({ type: Number, attribute: 'appear-animation-duration' }) appearAnimationDuration = 250;

    @property({ type: Number, attribute: 'wave-amplitude' }) waveAmplitude = 3;
    @property({ type: Number, attribute: 'wave-length' }) waveLength = 40;
    @property({ type: Number, attribute: 'wave-duration' }) waveDuration = 2000;
    @property({ type: Number, attribute: 'end-wave-continuation' }) endWaveContinuation = 16;

    @property({ type: Number, attribute: 'wave-start-threshold' }) waveStartThreshold = 10;
    @property({ type: Number, attribute: 'wave-end-threshold' }) waveEndThreshold = 95;

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
        if (changed.has('progress')) this._animateProgress();
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
        if (!this.isVisible) {
            if (this._waveRaf) cancelAnimationFrame(this._waveRaf);
            this._waveRaf = 0;
            return;
        }
        if (this._waveRaf) return;

        this._waveLast = performance.now();
        const tick = (t: number) => {
            const dt = t - this._waveLast;
            this._waveLast = t;
            this._wavePhase = (this._wavePhase + dt / Math.max(16, this.waveDuration)) % 1;
            this.requestUpdate();
            this._waveRaf = requestAnimationFrame(tick);
        };
        this._waveRaf = requestAnimationFrame(tick);
    }

    private _dynamicWaveAmplitude(progressPercent: number): number {
        if (progressPercent <= this.waveStartThreshold) return 0;
        if (progressPercent >= this.waveEndThreshold) return 0;

        if (progressPercent <= this.waveStartThreshold + 5) {
            const fade = (progressPercent - this.waveStartThreshold) / 5;
            return this.waveAmplitude * clamp(fade, 0, 1);
        }
        if (progressPercent >= this.waveEndThreshold - 5) {
            const fade = (this.waveEndThreshold - progressPercent) / 5;
            return this.waveAmplitude * clamp(fade, 0, 1);
        }
        return this.waveAmplitude;
    }

    private _wavePath(width: number, height: number, amp: number, phaseNorm: number, waveLength: number, tail: number): string {
        const pad = this.thickness / 2;
        const centerY = height / 2;
        const startX = pad;
        const endX = Math.max(pad, width - pad);
        const availW = Math.max(0, endX - startX);
        if (availW <= 0) return '';

        if (amp <= 0) return `M ${startX} ${centerY} L ${endX} ${centerY}`;

        const steps = Math.max(50, Math.floor(availW / 2));
        const stepX = availW / steps;
        let d = '';
        const startOffset = Math.sin(phaseNorm * 2 * Math.PI) * amp;
        d += `M ${startX} ${centerY + startOffset}`;

        for (let i = 1; i <= steps; i++) {
            const xRel = i * stepX;
            const x = startX + xRel;
            const wavePhase = ((xRel + phaseNorm * waveLength) / Math.max(1, waveLength)) * 2 * Math.PI;
            const y = centerY + Math.sin(wavePhase) * amp;
            d += ` L ${x} ${y}`;
        }

        if (tail > 0) {
            const extraSteps = Math.max(2, Math.round(tail / Math.max(1, stepX)));
            for (let k = 1; k <= extraSteps; k++) {
                const xRel = availW + k * stepX;
                const x = startX + xRel;
                const fade = 1 - k / extraSteps;
                const wavePhase = ((xRel + phaseNorm * waveLength) / Math.max(1, waveLength)) * 2 * Math.PI;
                const y = centerY + Math.sin(wavePhase) * amp * fade;
                d += ` L ${x} ${y}`;
            }
        }

        return d;
    }

    render() {
        const progress = clamp(this._displayProgress, 0, 100);
        const p = progress / 100;

        const thickness = Math.max(1, this.thickness);
        const effectiveGap = p > 0 ? Math.max(this.gapSize, Math.max(this.minGapSize, thickness)) : 0;

        const indicatorColor = this.indicatorColor || 'var(--md-primary)';
        const indicatorStoppedColor = this.indicatorStoppedColor || indicatorColor;
        const trackColor = this.trackColor || 'var(--md-secondary-container)';
        const stopColor = this.stopColor || indicatorColor;

        const indicatorWPercent = p * 100;
        const dynamicAmpRaw = this._dynamicWaveAmplitude(progress);
        const dynamicAmp = Math.min(dynamicAmpRaw, Math.max(0, thickness * 0.95));
        const waveHeight = thickness + dynamicAmp * 2 + thickness;
        const waveTop = -(waveHeight - thickness) / 2;
        const waveTail = Math.max(0, Math.min(this.endWaveContinuation, effectiveGap - thickness / 2));
        const hostW = Math.max(1, this.offsetWidth || 240);
        const waveWidthPx = (hostW * indicatorWPercent) / 100 + Math.max(0, waveTail);

        return html`
            <div
                class="linear-root ${this.isVisible ? 'scale-visible' : 'scale-hidden'}"
                style="--thickness:${thickness}px; width:100%; min-width:240px; transition-duration:${this.appearAnimationDuration}ms"
                role="progressbar"
                aria-label="Экспрессивный линейный индикатор прогресса"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow="${Math.round(progress)}"
            >
                <div
                    class="bar-segment"
                    style="
                        left:calc(${indicatorWPercent.toFixed(4)}% + ${effectiveGap}px);
                        right:0;
                        background:${trackColor};
                        transition:left ${this.animationDuration}ms cubic-bezier(.2,0,0,1);
                    "
                ></div>

                ${p > 0 ? html`
                    <svg
                        style="
                            position:absolute;
                            left:0;
                            top:${waveTop}px;
                            width:${waveWidthPx}px;
                            height:${waveHeight}px;
                            overflow:visible;
                            pointer-events:none;
                        "
                        viewBox="0 0 ${Math.max(1, waveWidthPx)} ${waveHeight}"
                        preserveAspectRatio="none"
                    >
                        <path
                            d="${this._wavePath(Math.max(1, waveWidthPx), waveHeight, dynamicAmp, this._wavePhase, this.waveLength, waveTail)}"
                            fill="none"
                            stroke="${dynamicAmp > 0 ? indicatorColor : indicatorStoppedColor}"
                            stroke-width="${thickness}"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        ></path>
                    </svg>
                ` : null}

                ${this.stopIndicatorVisible && p > 0 && p < 1 ? html`
                    <div
                        class="bar-segment"
                        style="right:0;width:${thickness}px;background:${stopColor};transform:scale(1);transition:transform ${Math.max(100, this.animationDuration / 2)}ms cubic-bezier(.34,1.56,.64,1)"
                    ></div>
                ` : null}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-dl-progress-bar-expressive': DLProgressBarExpressive;
    }
}
