import { LitElement, css, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { query } from 'lit/decorators.js';
import slideBarStyles from '../styles/SlideBar.css';

/**
 * umi-slide-bar-wave-track
 *
 * TS/Lit port of SlideBarWaveTrack.qml
 *
 * Анимированный волновой трек (MD3 Expressive 2025).
 * Использует HTML Canvas + requestAnimationFrame для Live Material-анимации.
 *
 * Properties:
 *   waveEnabled     — включить волновой режим
 *   waveAnimated    — анимировать фазу волны
 *   waveAmplitude   — амплитуда (dp), default 3
 *   waveLength      — длина волны (dp), default 40
 *   waveDuration    — длительность цикла (ms), default 2000
 *   waveFadeInLength  — длина fade-in (dp), default 16
 *   waveFadeOutLength — длина fade-out (dp), default 16
 *   thickness       — толщина линии (dp), default 4
 *   color           — CSS color
 *   opacityValue    — прозрачность
 *   leftCorners / rightCorners — радиусы концов (dp)
 */
@customElement('umi-slide-bar-wave-track')
export class SlideBarWaveTrack extends LitElement {
    @property({ type: Number, attribute: 'right-corners' }) rightCorners = 2;
    @property({ type: Number, attribute: 'left-corners' })  leftCorners = 9;

    @property({ type: String })  color = 'var(--md-sys-color-primary, #6750a4)';
    @property({ type: Number, attribute: 'opacity-value' }) opacityValue = 1;

    @property({ type: Boolean, attribute: 'wave-enabled' })      waveEnabled = true;
    @property({ type: Boolean, attribute: 'wave-animated' })     waveAnimated = true;
    @property({ type: Number,  attribute: 'wave-amplitude' })    waveAmplitude = 3;
    @property({ type: Number,  attribute: 'wave-length' })       waveLength = 40;
    @property({ type: Number,  attribute: 'wave-duration' })     waveDuration = 2000;
    @property({ type: Number,  attribute: 'wave-fade-in-length' })  waveFadeInLength = 16;
    @property({ type: Number,  attribute: 'wave-fade-out-length' }) waveFadeOutLength = 16;
    @property({ type: Number })  thickness = 4;

    @state() private _wavePhase = 0;

    @query('canvas') private _canvas?: HTMLCanvasElement;

    private _raf?: number;
    private _lastTime?: number;
    private _resizeObserver?: ResizeObserver;

    static styles = [
        unsafeCSS(slideBarStyles),
        css`:host { display: block; height: 16px; }`,
    ];

    connectedCallback() {
        super.connectedCallback();
        this._setupResize();
        this._tick();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._stop();
        this._resizeObserver?.disconnect();
    }

    private _setupResize() {
        if (typeof ResizeObserver === 'undefined') return;
        this._resizeObserver = new ResizeObserver(() => this._paint());
        this._resizeObserver.observe(this);
    }

    private _tick() {
        if (this.waveEnabled && this.waveAnimated) {
            if (!this._raf) this._startLoop();
        } else {
            this._stop();
            this._paint();
        }
    }

    private _startLoop() {
        this._lastTime = performance.now();
        const loop = (now: number) => {
            const dt = now - (this._lastTime ?? now);
            this._lastTime = now;
            this._wavePhase = (this._wavePhase + dt / this.waveDuration) % 1;
            this._paint();
            this._raf = requestAnimationFrame(loop);
        };
        this._raf = requestAnimationFrame(loop);
    }

    private _stop() {
        if (this._raf != null) {
            cancelAnimationFrame(this._raf);
            this._raf = undefined;
        }
    }

    updated(changed: Map<string, unknown>) {
        const waveKeys = ['waveEnabled', 'waveAnimated', 'waveAmplitude', 'waveLength', 'waveDuration',
            'waveFadeInLength', 'waveFadeOutLength', 'thickness', 'color', 'leftCorners', 'rightCorners'] as const;
        const needsWireUpdate = waveKeys.some(k => changed.has(k));
        if (needsWireUpdate) {
            this._stop();
            this._tick();
        }
    }

    // =========================================================
    // Canvas painting (1:1 port from SlideBarWaveTrack.qml onPaint)
    // =========================================================
    private _paint() {
        const canvas = this._canvas;
        if (!canvas) return;

        const host = this;
        const W = canvas.clientWidth;
        const H = canvas.clientHeight;
        if (W <= 0 || H <= 0) return;

        // sync canvas resolution to display size
        if (canvas.width !== W) canvas.width = W;
        if (canvas.height !== H) canvas.height = H;

        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, W, H);

        const centerY = H / 2;
        const amplitude = host.waveEnabled ? host.waveAmplitude : 0;
        const lineThickness = host.thickness;
        const pad = lineThickness / 2;

        const startX = pad;
        const endX = Math.max(startX, W - pad);
        const availW = Math.max(0, endX - startX);
        if (availW <= 0) return;

        // resolve CSS color
        const computedColor = host.color.startsWith('var(')
            ? getComputedStyle(canvas).getPropertyValue(
                  host.color.slice(4, -1).split(',')[0].trim()
              ).trim() || '#6750a4'
            : host.color;

        ctx.strokeStyle = computedColor;
        ctx.lineWidth = lineThickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();

        if (amplitude <= 0 || !host.waveEnabled) {
            ctx.moveTo(startX, centerY);
            ctx.lineTo(endX, centerY);
        } else {
            const steps = Math.max(80, availW / 1.5);
            const stepX = availW / steps;

            const fadeInLen  = Math.min(host.waveFadeInLength, availW / 3);
            const fadeOutLen = Math.min(host.waveFadeOutLength, availW / 3);

            const initFade  = this._calcFade(0, availW, fadeInLen, fadeOutLen);
            const initPhase = (host._wavePhase * host.waveLength) / host.waveLength * 2 * Math.PI;
            ctx.moveTo(startX, centerY + Math.sin(initPhase) * amplitude * initFade);

            for (let i = 1; i <= steps; i++) {
                const xRel = i * stepX;
                const x = startX + xRel;
                const fade = this._calcFade(xRel, availW, fadeInLen, fadeOutLen);
                const wavePhase = (xRel + host._wavePhase * host.waveLength) / host.waveLength * 2 * Math.PI;
                ctx.lineTo(x, centerY + Math.sin(wavePhase) * amplitude * fade);
            }
        }

        ctx.stroke();
    }

    private _calcFade(xRel: number, totalWidth: number, fadeInLen: number, fadeOutLen: number): number {
        let fade = 1;
        if (xRel < fadeInLen && fadeInLen > 0) fade = this._smoothStep(xRel / fadeInLen);
        const distFromEnd = totalWidth - xRel;
        if (distFromEnd < fadeOutLen && fadeOutLen > 0) {
            fade = Math.min(fade, this._smoothStep(distFromEnd / fadeOutLen));
        }
        return fade;
    }

    private _smoothStep(t: number): number {
        t = Math.max(0, Math.min(1, t));
        return t * t * (3 - 2 * t);
    }

    render() {
        return html`
            <div class="wave-track-root" style="opacity:${this.opacityValue}; width:100%;">
                <canvas class="wave-canvas" style="width:100%;height:16px;"></canvas>
            </div>
        `;
    }

    protected firstUpdated() {
        this._paint();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-slide-bar-wave-track': SlideBarWaveTrack;
    }
}
