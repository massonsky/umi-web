import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import slideBarStyles from '../styles/SlideBar.css';
import { SlideBarMath, clamp } from './SlideBar.js';

import './SlideBarHandleItem.js';
import './SlideBarTrack.js';
import './SlideBarWaveTrack.js';
import './SlideBarTextContainer.js';

/**
 * umi-range-slide-bar
 *
 * TS/Lit port of RangeSlideBar.qml.
 *
 * Two handles: minValue (left) и maxValue (right).
 * - Click/drag: выбирает ближайшую ручку
 * - Overlap: если ручки в одной точке — направление первого move решает
 * - Всегда: minValue ≤ maxValue
 *
 * Events:
 *   minValueChanged   — {minValue: number}
 *   maxValueChanged   — {maxValue: number}
 *   change            — при завершении interaction
 */
@customElement('umi-range-slide-bar')
export class RangeSlideBar extends LitElement {
    // ── Public API — цвета ──────────────────────────────────
    @property({ type: String, attribute: 'active-track-color' })
    activeTrackColor = 'var(--md-sys-color-primary, #6750a4)';

    @property({ type: String, attribute: 'inactive-track-color' })
    inactiveTrackColor = 'var(--md-sys-color-secondary-container, #e8def8)';

    @property({ type: String, attribute: 'disabled-inactive-track-color' })
    disabledInactiveTrackColor = 'color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 12%, transparent)';

    @property({ type: String, attribute: 'disabled-active-track-color' })
    disabledActiveTrackColor = 'color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent)';

    @property({ type: String, attribute: 'handle-color' })
    handleColor = 'var(--md-sys-color-primary, #6750a4)';

    // ── Public API — значения ───────────────────────────────
    @property({ type: Number }) from = 0;
    @property({ type: Number }) to = 100;
    @property({ type: Number }) minValue = 20;
    @property({ type: Number }) maxValue = 60;
    @property({ type: Number }) divisions = 0;
    @property({ type: Boolean, reflect: true }) enabled = true;

    // ── Public API — wave ───────────────────────────────────
    @property({ type: Boolean, attribute: 'wave-mode' })     waveMode = false;
    @property({ type: Boolean, attribute: 'wave-animated' }) waveAnimated = true;

    // ── Internal state ──────────────────────────────────────
    @state() private _minThumbX = 0;
    @state() private _maxThumbX = 0;

    /** 'min' | 'max' | null — какая ручка захвачена */
    @state() private _dragging: 'min' | 'max' | null = null;
    @state() private _focusedHandle: 'min' | 'max' | null = null;
    @state() private _hoveredHandle: 'min' | 'max' | null = null;

    @state() private _labelMinVisible = false;
    @state() private _labelMaxVisible = false;
    @state() private _labelMinText = '';
    @state() private _labelMaxText = '';

    // Per spec: range slider shows only ONE label at a time (the active handle)
    private get _showMinLabel() { return this._labelMinVisible && this._dragging === 'min'; }
    private get _showMaxLabel() { return this._labelMaxVisible && this._dragging === 'max'; }

    @query('.sb-root') private _rootEl?: HTMLElement;
    @query('canvas.sb-wave-range') private _waveCanvas?: HTMLCanvasElement;

    private _math = new SlideBarMath();

    /** Нет захваченной ручки на mousedown — нужно выбрать по направлению */
    private _ambiguous = false;
    private _lastLocalX = 0;

    // Wave RAF
    private _wavePhase = 0;
    private _raf?: number;
    private _lastRafTime?: number;
    private _ro?: ResizeObserver;

    private _minHideTimer?: number;
    private _maxHideTimer?: number;

    static styles = [
        unsafeCSS(slideBarStyles),
        css`:host { display: block; outline: none; touch-action: none; }`,
    ];

    // ── Lifecycle ───────────────────────────────────────────
    connectedCallback() {
        super.connectedCallback();
        this._setupResize();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._ro?.disconnect();
        this._stopWave();
    }

    protected firstUpdated() {
        this._syncMath();
        this._syncThumbs();
        this._tickWave();
    }

    protected updated(changed: Map<string, unknown>) {
        if (changed.has('minValue') || changed.has('maxValue')) {
            if (!this._dragging) this._syncThumbs();
        }
        if (changed.has('from') || changed.has('to') || changed.has('divisions')) {
            this._math.from = this.from;
            this._math.to   = this.to;
            this._math.divisions = this.divisions;
        }
        if (changed.has('waveMode') || changed.has('waveAnimated') || changed.has('_dragging')) {
            this._tickWave();
        }
        this._paintWave();
    }

    // ── Resize ──────────────────────────────────────────────
    private _setupResize() {
        if (typeof ResizeObserver === 'undefined') return;
        this._ro = new ResizeObserver(() => {
            this._syncMath();
            this._syncThumbs();
            this._paintWave();
        });
        this._ro.observe(this);
    }

    private _syncMath() {
        this._math.init(this.getBoundingClientRect().width || 300);
        this._math.from = this.from;
        this._math.to   = this.to;
        this._math.divisions = this.divisions;
    }

    private _syncThumbs() {
        if (this._math.workWidth <= 0) return;
        const minV = this._math.constrainValue(this.minValue);
        const maxV = this._math.constrainValue(this.maxValue);
        if (this.divisions > 0) {
            const divMin = this._math.getNearDivision(this._math.xFromValue(minV));
            const divMax = this._math.getNearDivision(this._math.xFromValue(maxV));
            this._minThumbX = this._math.xFromDiv(divMin);
            this._maxThumbX = this._math.xFromDiv(divMax);
        } else {
            this._minThumbX = this._math.xFromValue(minV);
            this._maxThumbX = this._math.xFromValue(maxV);
        }
        // guarantee order
        if (this._minThumbX > this._maxThumbX) {
            [this._minThumbX, this._maxThumbX] = [this._maxThumbX, this._minThumbX];
        }
    }

    // ── Pointer ─────────────────────────────────────────────
    private _onPointerDown(e: PointerEvent) {
        if (!this.enabled) return;
        e.preventDefault();
        this._syncMath();

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const localX = e.clientX - rect.left;
        this._lastLocalX = localX;

        const distMin = Math.abs(localX - (this._minThumbX + 2));
        const distMax = Math.abs(localX - (this._maxThumbX + 2));

        if (this._minThumbX === this._maxThumbX) {
            // overlapping — wait for first move
            this._ambiguous = true;
            this._dragging = null;
        } else {
            this._ambiguous = false;
            if (distMin <= distMax) {
                this._dragging = 'min';
            } else {
                this._dragging = 'max';
            }
        }

        if (!this._ambiguous) {
            this._moveHandle(localX);
        }

        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    private _onPointerMove(e: PointerEvent) {
        if (!this._dragging && !this._ambiguous) return;
        if (!this.enabled) return;

        const rect = this._rootEl!.getBoundingClientRect();
        const localX = e.clientX - rect.left;

        if (this._ambiguous) {
            // resolve by direction
            if (Math.abs(localX - this._lastLocalX) > 2) {
                const movingLeft = localX < this._lastLocalX;
                this._dragging = movingLeft ? 'min' : 'max';
                this._ambiguous = false;
            }
        }

        if (!this._ambiguous && this._dragging) {
            this._moveHandle(localX);
        }
    }

    private _onPointerUp(e: PointerEvent) {
        const wasActive = this._dragging != null;
        this._dragging = null;
        this._ambiguous = false;
        if (wasActive) {
            this._hideLabels();
            this._emit('change');
        }
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }

    private _onWheel(e: WheelEvent) {
        if (!this.enabled) return;
        e.preventDefault();
        const handle = this._focusedHandle ?? 'max';
        this._keyMove(handle, e.deltaY < 0);
    }

    private _onKeyDown(e: KeyboardEvent) {
        if (!this.enabled) return;
        const handle = this._focusedHandle ?? 'max';
        if (['ArrowLeft', 'ArrowDown'].includes(e.key)) { this._keyMove(handle, false); e.preventDefault(); }
        if (['ArrowRight', 'ArrowUp'].includes(e.key))  { this._keyMove(handle, true);  e.preventDefault(); }
    }

    // ── Move logic ──────────────────────────────────────────
    /** Перемещает захваченную ручку к localX */
    private _moveHandle(localX: number) {
        const rawX = this._math.constrainX(localX - 2);
        const which = this._dragging!;

        if (which === 'min') {
            const newX = Math.min(rawX, this._maxThumbX);
            this._minThumbX = newX;
            this._updateMinFromThumb();
        } else {
            const newX = Math.max(rawX, this._minThumbX);
            this._maxThumbX = newX;
            this._updateMaxFromThumb();
        }

        this._showLabels();
        this._syncLabelTexts();
    }

    private _updateMinFromThumb() {
        let v: number;
        if (this.divisions > 0) {
            const div = this._math.getNearDivision(this._minThumbX);
            this._minThumbX = this._math.xFromDiv(div);
            v = Math.round(this._math.constrainValue(this.from + div * this._math.divisionStep()));
        } else {
            v = Math.round(this._math.valueFromX(this._minThumbX));
        }
        v = Math.min(this._math.constrainValue(v), this.maxValue);
        if (v !== this.minValue) {
            this.minValue = v;
            this.dispatchEvent(new CustomEvent('minValueChanged', { detail: { minValue: v }, bubbles: true, composed: true }));
            this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        }
    }

    private _updateMaxFromThumb() {
        let v: number;
        if (this.divisions > 0) {
            const div = this._math.getNearDivision(this._maxThumbX);
            this._maxThumbX = this._math.xFromDiv(div);
            v = Math.round(this._math.constrainValue(this.from + div * this._math.divisionStep()));
        } else {
            v = Math.round(this._math.valueFromX(this._maxThumbX));
        }
        v = Math.max(this._math.constrainValue(v), this.minValue);
        if (v !== this.maxValue) {
            this.maxValue = v;
            this.dispatchEvent(new CustomEvent('maxValueChanged', { detail: { maxValue: v }, bubbles: true, composed: true }));
            this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        }
    }

    private _keyMove(handle: 'min' | 'max', up: boolean) {
        if (this.divisions > 0) {
            if (handle === 'min') {
                const div = clamp(
                    this._math.getNearDivision(this._minThumbX) + (up ? 1 : -1),
                    0, this.divisions
                );
                this._minThumbX = this._math.xFromDiv(div);
                this._updateMinFromThumb();
            } else {
                const div = clamp(
                    this._math.getNearDivision(this._maxThumbX) + (up ? 1 : -1),
                    0, this.divisions
                );
                this._maxThumbX = this._math.xFromDiv(div);
                this._updateMaxFromThumb();
            }
        } else {
            if (handle === 'min') {
                const v = this._math.constrainValue(this.minValue + (up ? 1 : -1));
                this.minValue = Math.min(Math.round(v), this.maxValue);
                this.dispatchEvent(new CustomEvent('minValueChanged', { detail: { minValue: this.minValue }, bubbles: true, composed: true }));
            } else {
                const v = this._math.constrainValue(this.maxValue + (up ? 1 : -1));
                this.maxValue = Math.max(Math.round(v), this.minValue);
                this.dispatchEvent(new CustomEvent('maxValueChanged', { detail: { maxValue: this.maxValue }, bubbles: true, composed: true }));
            }
        }
    }

    // ── Labels ──────────────────────────────────────────────
    private _showLabels() { this._labelMinVisible = true; this._labelMaxVisible = true; }
    private _syncLabelTexts() {
        this._labelMinText = String(this.minValue);
        this._labelMaxText = String(this.maxValue);
    }

    private _hideLabels() {
        const t = 250;
        if (this._minHideTimer) clearTimeout(this._minHideTimer);
        if (this._maxHideTimer) clearTimeout(this._maxHideTimer);
        this._minHideTimer = window.setTimeout(() => { this._labelMinVisible = false; }, t);
        this._maxHideTimer = window.setTimeout(() => { this._labelMaxVisible = false; }, t);
    }

    private _emit(name: string) {
        this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
    }

    // ── Wave (same logic as SlideBar) ───────────────────────
    private _tickWave() {
        if (this.waveMode && this.waveAnimated) {
            this._startWave();
        } else {
            this._stopWave();
            this._paintWave();
        }
    }

    private _startWave() {
        if (this._raf != null) return;
        this._lastRafTime = performance.now();
        const loop = (now: number) => {
            const dt = now - (this._lastRafTime ?? now);
            this._lastRafTime = now;
            this._wavePhase = (this._wavePhase + dt / 2000) % 1;
            this._paintWave();
            this._raf = requestAnimationFrame(loop);
        };
        this._raf = requestAnimationFrame(loop);
    }

    private _stopWave() {
        if (this._raf != null) {
            cancelAnimationFrame(this._raf);
            this._raf = undefined;
        }
    }

    private _paintWave() {
        const canvas = this._waveCanvas;
        if (!canvas) return;

        // Width = same as midW in render (maxX-6 - (minX+10))
        const W = Math.max(0, this._maxThumbX - 6 - (this._minThumbX + 10));
        const H = 16;
        if (W <= 0) { canvas.width = 0; return; }
        if (canvas.width !== W)  canvas.width = W;
        if (canvas.height !== H) canvas.height = H;

        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, W, H);

        const amplitude = this.waveMode ? 3 : 0;
        const lineThickness = 4;
        const pad = lineThickness / 2;
        const startX = pad;
        const endX = W - pad;
        const availW = endX - startX;
        const centerY = H / 2;

        const color = this._resolveColor(this.enabled ? this.activeTrackColor : this.disabledActiveTrackColor);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineThickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();

        if (amplitude <= 0 || !this.waveMode) {
            ctx.moveTo(startX, centerY);
            ctx.lineTo(endX, centerY);
        } else {
            const waveLength = 40;
            const fadeInLen  = Math.min(16, availW / 3);
            const fadeOutLen = Math.min(16, availW / 3);
            const steps = Math.max(80, availW / 1.5);
            const stepX = availW / steps;

            ctx.moveTo(startX, centerY);
            for (let i = 1; i <= steps; i++) {
                const xRel = i * stepX;
                const x = startX + xRel;
                const fade = this._smoothFade(xRel, availW, fadeInLen, fadeOutLen);
                const ph = (xRel + this._wavePhase * waveLength) / waveLength * 2 * Math.PI;
                ctx.lineTo(x, centerY + Math.sin(ph) * amplitude * fade);
            }
        }
        ctx.stroke();
    }

    private _smoothFade(xRel: number, total: number, fadeIn: number, fadeOut: number): number {
        let f = 1;
        if (xRel < fadeIn && fadeIn > 0) f = this._smoothStep(xRel / fadeIn);
        const d = total - xRel;
        if (d < fadeOut && fadeOut > 0) f = Math.min(f, this._smoothStep(d / fadeOut));
        return f;
    }

    private _smoothStep(t: number) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

    private _resolveColor(cssColor: string): string {
        if (!cssColor.startsWith('var(')) return cssColor;
        const varName = cssColor.match(/var\((--[^,)]+)/)?.[1] ?? '';
        return getComputedStyle(this).getPropertyValue(varName).trim() || cssColor;
    }

    // ── Render ──────────────────────────────────────────────
    render() {
        const { _minThumbX: minX, _maxThumbX: maxX } = this;
        const activeColor   = this.enabled ? this.activeTrackColor   : this.disabledActiveTrackColor;
        const inactiveColor = this.enabled ? this.inactiveTrackColor : this.disabledInactiveTrackColor;
        const handleClr     = this.enabled ? this.handleColor : this.disabledActiveTrackColor;
        const endDotOpacity = this.enabled ? 1 : 0.38;
        const divisions = this.divisions;

        // Gaps same as single slider: 6px before handle left edge, 6px after handle right edge
        // Handle inner is 4px, centered at minX+2 and maxX+2.
        const leftInactiveW  = Math.max(0, minX - 6);         // left inactive track width
        // Mid active track:   minX+10 → maxX-6
        const midLeft        = minX + 10;
        const midW           = Math.max(0, maxX - 6 - midLeft);
        // Right inactive track: maxX+10 → right edge
        const rightLeft      = maxX + 10;

        const minHandleW = this._dragging === 'min' ? 2 : 4;
        const maxHandleW = this._dragging === 'max' ? 2 : 4;

        // Ticks — color per spec: on-primary on active zone, on-secondary-container on inactive
        const ticks = divisions > 0
            ? Array.from({ length: divisions + 1 }, (_, i) => {
                const tickX = this._math.xFromDiv(i);
                const onActive = tickX >= midLeft && tickX <= midLeft + midW;
                const color = this.enabled
                    ? (onActive
                        ? 'var(--md-sys-color-on-primary, #fff)'
                        : 'var(--md-sys-color-on-secondary-container, #1d192b)')
                    : 'var(--md-sys-color-on-surface, #1d1b20)';
                return html`
                    <div class="sb-tick" style="left:${tickX}px; background:${color}; opacity:${endDotOpacity}; z-index:1;"></div>
                `;
              })
            : nothing;

        return html`
            <div
                class="sb-root ${this.enabled ? '' : 'disabled'}"
                role="group"
                tabindex="${this.enabled ? 0 : -1}"
                aria-label="Range Slider"
                style="overflow:visible;"
                @pointerdown=${this._onPointerDown}
                @pointermove=${this._onPointerMove}
                @pointerup=${this._onPointerUp}
                @pointercancel=${this._onPointerUp}
                @wheel=${this._onWheel}
                @keydown=${this._onKeyDown}
                @focus=${() => {}}
                @blur=${()  => {}}
            >
                <!-- Start indicator dot (only non-division mode) — on-secondary-container per spec -->
                ${divisions === 0 ? html`
                    <div class="sb-start-dot" style="background:${this.enabled ? 'var(--md-sys-color-on-secondary-container, #1d192b)' : 'var(--md-sys-color-on-surface, #1d1b20)'}; opacity:${endDotOpacity};"></div>
                ` : nothing}

                <!-- End indicator dot -->
                <div class="sb-end-dot" style="background:${this.enabled ? 'var(--md-sys-color-on-secondary-container, #1d192b)' : 'var(--md-sys-color-on-surface, #1d1b20)'}; opacity:${endDotOpacity};"></div>

                <!-- Ticks -->
                ${ticks}

                <!-- Left inactive track -->
                <div class="sb-track sb-track-inactive sb-track-both-round"
                     style="left:0; width:${leftInactiveW}px; background:${inactiveColor}; opacity:${this.enabled ? 1 : 0.12};">
                </div>

                <!-- Mid active track (standard) -->
                ${!this.waveMode ? html`
                    <div class="sb-track sb-track-range-mid"
                         style="left:${midLeft}px; width:${midW}px; background:${activeColor}; opacity:${this.enabled ? 1 : 0.38};">
                    </div>
                ` : nothing}

                <!-- Mid active track (wave) -->
                ${this.waveMode ? html`
                    <canvas class="sb-wave-range" style="
                        position:absolute; left:${midLeft}px; top:14px;
                        width:${midW}px; height:16px;
                        opacity:${this.enabled ? 1 : 0.38};
                        pointer-events:none;
                    "></canvas>
                ` : nothing}

                <!-- Right inactive track -->
                <div class="sb-track sb-track-inactive sb-track-both-round"
                     style="left:${rightLeft}px; right:0; background:${inactiveColor}; opacity:${this.enabled ? 1 : 0.12};">
                </div>

                <!-- Min handle -->
                <div class="sb-handle-area" style="left:${minX + 2}px;"
                     @pointerenter=${() => { if (!this._dragging) this._hoveredHandle = 'min'; }}
                     @pointerleave=${() => { if (!this._dragging) this._hoveredHandle = null; }}
                     @focus=${() => { this._focusedHandle = 'min'; }}
                     @blur=${()  => { this._focusedHandle = null; }}>
                    <div class="sb-state-layer" style="
                         background:${handleClr};
                         opacity:${this._dragging === 'min' ? 0.12 : this._hoveredHandle === 'min' ? 0.08 : 0};
                    "></div>
                    <div class="sb-handle-inner"
                         style="width:${minHandleW}px; height:44px; background:${handleClr}; opacity:${endDotOpacity};">
                    </div>
                    ${this._focusedHandle === 'min' && this._dragging !== 'min' ? html`
                        <div class="sb-handle-focus-ring" style="border-color:${handleClr};"></div>
                    ` : nothing}
                </div>

                <!-- Max handle -->
                <div class="sb-handle-area" style="left:${maxX + 2}px;"
                     @pointerenter=${() => { if (!this._dragging) this._hoveredHandle = 'max'; }}
                     @pointerleave=${() => { if (!this._dragging) this._hoveredHandle = null; }}
                     @focus=${() => { this._focusedHandle = 'max'; }}
                     @blur=${()  => { this._focusedHandle = null; }}>
                    <div class="sb-state-layer" style="
                         background:${handleClr};
                         opacity:${this._dragging === 'max' ? 0.12 : this._hoveredHandle === 'max' ? 0.08 : 0};
                    "></div>
                    <div class="sb-handle-inner"
                         style="width:${maxHandleW}px; height:44px; background:${handleClr}; opacity:${endDotOpacity};">
                    </div>
                    ${this._focusedHandle === 'max' && this._dragging !== 'max' ? html`
                        <div class="sb-handle-focus-ring" style="border-color:${handleClr};"></div>
                    ` : nothing}
                </div>

                <!-- Min value label (only when dragging min handle, per MD3 spec) -->
                <div class="sb-label ${this._showMinLabel ? 'visible' : 'hidden'}"
                     style="left:${minX + 2}px; top:-62px;">
                    <div class="sb-label-bubble"
                         style="background:var(--md-sys-color-inverse-surface, #313033); color:var(--md-sys-color-inverse-on-surface, #f4eff4);">
                        ${this._labelMinText}
                    </div>
                    <div class="sb-label-pointer"
                         style="border-top-color:var(--md-sys-color-inverse-surface, #313033);"></div>
                </div>

                <!-- Max value label (only when dragging max handle, per MD3 spec) -->
                <div class="sb-label ${this._showMaxLabel ? 'visible' : 'hidden'}"
                     style="left:${maxX + 2}px; top:-62px;">
                    <div class="sb-label-bubble"
                         style="background:var(--md-sys-color-inverse-surface, #313033); color:var(--md-sys-color-inverse-on-surface, #f4eff4);">
                        ${this._labelMaxText}
                    </div>
                    <div class="sb-label-pointer"
                         style="border-top-color:var(--md-sys-color-inverse-surface, #313033);"></div>
                </div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-range-slide-bar': RangeSlideBar;
    }
}
