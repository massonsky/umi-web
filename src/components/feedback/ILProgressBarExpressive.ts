import { LitElement, html, svg, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import progressStyles from '../styles/ProgressBars.css';

function easeInQuint(t: number): number { return t * t * t * t * t; }

@customElement('umi-il-progress-bar-expressive')
export class ILProgressBarExpressive extends LitElement {
    @property({ type: Number }) thickness = 4;
    @property({ type: Number, attribute: 'gap-size' }) gapSize = 4;
    @property({ type: Number, attribute: 'min-gap-size' }) minGapSize = 2;
    @property({ type: Boolean }) running = true;
    @property({ type: Number, attribute: 'appear-duration' }) appearDuration = 250;

    @property({ type: String, attribute: 'track-color' }) trackColor = '';
    @property({ type: String, attribute: 'indicator-color' }) indicatorColor = '';
    @property({ type: Boolean, attribute: 'stop-indicator-visible' }) stopIndicatorVisible = false;
    @property({ type: String, attribute: 'stop-color' }) stopColor = '';

    @property({ type: Number, attribute: 'end-wave-continuation' }) endWaveContinuation = 16;
    @property({ type: Number, attribute: 'wave-amplitude' }) waveAmplitude = 3;
    @property({ type: Number, attribute: 'wave-length' }) waveLength = 40;
    @property({ type: Number, attribute: 'wave-duration' }) waveDuration = 2000;

    @property({ type: Number, attribute: 'animation-duration' }) animationDuration = 1200;
    @property({ type: Number, attribute: 'inter-bar-delay' }) interBarDelay = 550;

    @state() private _pos1 = 0;
    @state() private _pos2 = 0;
    @state() private _wavePhase1 = 0;
    @state() private _wavePhase2 = 0;
    @state() private _widthPx = 240;

    private _raf = 0;
    private _startTs = 0;
    private _waveLast = 0;
    private _ro?: ResizeObserver;

    static styles = unsafeCSS(progressStyles);

    connectedCallback() {
        super.connectedCallback();
        this._ro = new ResizeObserver(() => {
            this._widthPx = Math.max(1, this.getBoundingClientRect().width || 240);
        });
        this._ro.observe(this);
        this._widthPx = Math.max(1, this.getBoundingClientRect().width || 240);
        if (this.running) this._start();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._ro?.disconnect();
        this._stop();
    }

    updated(changed: Map<string, unknown>) {
        if (changed.has('running')) {
            this.running ? this._start(true) : this._stop();
        }
    }

    private _start(reset = false) {
        if (this._raf && !reset) return;
        if (reset) this._stop();
        this._startTs = performance.now();
        this._waveLast = this._startTs;
        this._raf = requestAnimationFrame((t) => this._tick(t));
    }

    private _stop() {
        if (!this._raf) return;
        cancelAnimationFrame(this._raf);
        this._raf = 0;
    }

    private _calcMove(ts: number, cycle: number, delay = 0): number {
        const minW = Math.max(1, this.thickness);
        const from = -minW;
        const to = this._widthPx + 10;
        const local = ts % cycle;
        if (local < delay) return from;
        if (local >= delay + this.animationDuration) return to;
        const t = (local - delay) / this.animationDuration;
        const k = easeInQuint(Math.max(0, Math.min(1, t)));
        return from + (to - from) * k;
    }

    private _indicatorWidth(position: number): number {
        const minW = Math.max(1, this.thickness);
        const maxW = this._widthPx;
        const normalized = position / Math.max(1, this._widthPx);
        if (normalized < 0.6) return minW + (maxW - minW) * (normalized / 0.6);
        const shrink = (normalized - 0.6) / 0.4;
        return maxW * (1 - shrink);
    }

    private _wavePath(width: number, height: number, phaseNorm: number): string {
        if (width <= 0) return '';
        const amp = Math.min(this.waveAmplitude, Math.max(0, this.thickness * 0.95));
        const pad = this.thickness / 2;
        const startX = pad;
        const endX = Math.max(pad, width - pad);
        const availW = Math.max(0, endX - startX);
        if (availW <= 0) return '';

        const centerY = height / 2;
        const steps = Math.max(20, Math.floor(availW / 3));
        const stepX = availW / steps;

        let d = '';
        const firstY = centerY + Math.sin(phaseNorm * 2 * Math.PI) * amp;
        d += `M ${startX} ${firstY}`;

        for (let i = 1; i <= steps; i++) {
            const xRel = i * stepX;
            const x = startX + xRel;
            const wavePhase = ((xRel + phaseNorm * this.waveLength) / Math.max(1, this.waveLength)) * 2 * Math.PI;
            const y = centerY + Math.sin(wavePhase) * amp;
            d += ` L ${x} ${y}`;
        }

        return d;
    }

    private _tick(t: number) {
        const elapsed = t - this._startTs;
        const dt = t - this._waveLast;
        this._waveLast = t;

        const cycle = this.animationDuration + this.interBarDelay;
        this._pos1 = this._calcMove(elapsed, cycle, 0);
        this._pos2 = this._calcMove(elapsed, cycle, this.interBarDelay);

        const phaseInc = dt / Math.max(16, this.waveDuration);
        this._wavePhase1 = (this._wavePhase1 + phaseInc) % 1;
        this._wavePhase2 = (this._wavePhase2 + phaseInc * (this.waveDuration / (this.waveDuration + 300))) % 1;

        this.requestUpdate();
        this._raf = requestAnimationFrame((tt) => this._tick(tt));
    }

    render() {
        const thickness = Math.max(1, this.thickness);
        const indicatorColor = this.indicatorColor || 'var(--md-primary)';
        const trackColor = this.trackColor || 'var(--md-secondary-container)';
        const stopColor = this.stopColor || indicatorColor;
        const effectiveGap = Math.max(this.gapSize, Math.max(this.minGapSize, thickness));

        const w1 = Math.max(0, this._indicatorWidth(this._pos1));
        const w2 = Math.max(0, this._indicatorWidth(this._pos2));

        const i1Start = Math.min(this._pos1 + effectiveGap, this._widthPx);
        const i2Start = Math.min(this._pos2 + effectiveGap, this._widthPx);

        const i1W = Math.max(0, Math.min(Math.max(0, w1 - effectiveGap), this._widthPx - Math.max(0, i1Start)));
        const i2W = Math.max(0, Math.min(Math.max(0, w2 - effectiveGap), this._widthPx - Math.max(0, i2Start)));

        const i1End = i1Start + i1W + Math.max(0, Math.min(this.endWaveContinuation, effectiveGap - thickness / 2));
        const i2End = i2Start + i2W + Math.max(0, Math.min(this.endWaveContinuation, effectiveGap - thickness / 2));

        const leftEnd = Math.max(0, Math.min(i1Start, i2Start) - effectiveGap);

        const midStartRaw = Math.min(i1End, i2End) + effectiveGap;
        const midEndRaw = Math.max(i1Start, i2Start) - effectiveGap;
        const midX = Math.max(0, Math.min(this._widthPx, Math.min(midStartRaw, midEndRaw)));
        const midW = Math.max(0, Math.min(this._widthPx, Math.max(midStartRaw, midEndRaw)) - midX);

        const rightX = Math.min(this._widthPx, Math.max(i1End, i2End) + effectiveGap);
        const rightW = Math.max(thickness, this._widthPx - rightX);

        const waveAmp = Math.min(this.waveAmplitude, Math.max(0, thickness * 0.95));
        const waveH = thickness + waveAmp * 2 + thickness;
        const waveTop = -(waveH - thickness) / 2;

        return html`
            <div class="linear-root ${this.running ? 'scale-visible' : 'scale-hidden'}" style="--thickness:${thickness}px; width:100%; min-width:240px; transition-duration:${this.appearDuration}ms" role="progressbar" aria-label="Экспрессивный индикатор неопределённого прогресса">
                ${leftEnd > 0 ? html`<div class="bar-segment" style="left:0;width:${leftEnd}px;background:${trackColor}"></div>` : null}

                ${i1W > 0 ? html`
                    <svg style="position:absolute;left:${Math.max(0, i1Start)}px;top:${waveTop}px;width:${i1W}px;height:${waveH}px;overflow:visible;pointer-events:none" viewBox="0 0 ${Math.max(1, i1W)} ${waveH}" preserveAspectRatio="none">
                        <path d="${this._wavePath(Math.max(1, i1W), waveH, this._wavePhase1)}" fill="none" stroke="${indicatorColor}" stroke-width="${thickness}" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                ` : null}

                ${midW > 0 ? html`<div class="bar-segment" style="left:${midX}px;width:${midW}px;background:${trackColor}"></div>` : null}

                ${i2W > 0 ? html`
                    <svg style="position:absolute;left:${Math.max(0, i2Start)}px;top:${waveTop}px;width:${i2W}px;height:${waveH}px;overflow:visible;pointer-events:none" viewBox="0 0 ${Math.max(1, i2W)} ${waveH}" preserveAspectRatio="none">
                        <path d="${this._wavePath(Math.max(1, i2W), waveH, this._wavePhase2)}" fill="none" stroke="${indicatorColor}" stroke-width="${thickness}" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                ` : null}

                ${rightX < this._widthPx ? html`<div class="bar-segment" style="left:${rightX}px;width:${rightW}px;background:${trackColor}"></div>` : null}

                ${this.stopIndicatorVisible ? html`
                    <div class="bar-segment" style="right:0;width:3px;height:${thickness + 2}px;top:${-(2)/2}px;background:${stopColor}"></div>
                ` : null}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-il-progress-bar-expressive': ILProgressBarExpressive;
    }
}
