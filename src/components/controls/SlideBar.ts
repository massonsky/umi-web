import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import slideBarStyles from '../styles/SlideBar.css';

// Ensure sub-elements are registered
import './SlideBarHandleItem.js';
import './SlideBarTrack.js';
import './SlideBarWaveTrack.js';
import './SlideBarTextContainer.js';

const QUICK   = 150; // MD3 Expressive quick
const STANDARD = 300; // MD3 Expressive standard

function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
}

// ─────────────────────────────────────────────────────────────
// SlideBarBase — shared math (inline helper, not an element)
// ─────────────────────────────────────────────────────────────
class SlideBarMath {
    from = 0; to = 100; divisions = 0;

    get workWidth(): number { return this._trackWidth - 12; }
    private _trackWidth = 300;

    init(trackWidth: number) { this._trackWidth = trackWidth; }

    constrainValue(v: number) { return clamp(isNaN(v) ? this.from : v, this.from, this.to); }

    constrainX(x: number) { return clamp(x, 4, this._trackWidth - 8); }

    valueFromX(x: number): number {
        const normX = x - 4;
        if (normX <= 0) return this.from;
        if (normX > this.workWidth) return this.to;
        return this.from + (normX / this.workWidth) * (this.to - this.from);
    }

    xFromValue(v: number): number {
        const coeff = Math.abs((v - this.from) / (this.to - this.from));
        return Math.round(this.workWidth * coeff + 4);
    }

    xFromDiv(div: number): number {
        const d = clamp(div, 0, this.divisions);
        return Math.round(4 + d * (this.workWidth / this.divisions));
    }

    getNearDivision(x: number): number {
        return Math.round((x - 4) / (this.workWidth / this.divisions));
    }

    divisionStep(): number {
        return this.divisions > 0 ? Math.abs(this.to - this.from) / this.divisions : 0;
    }
}

// ─────────────────────────────────────────────────────────────
// umi-slide-bar
// ─────────────────────────────────────────────────────────────
/**
 * umi-slide-bar
 *
 * TS/Lit port of SlideBar.qml (+ SlideBarBase.qml logic).
 *
 * Features (1:1 с QML):
 * - Обычный и волновой (waveMode) трек
 * - Divisions (дискретные значения с анимацией snap)
 * - Плавающий лейбл над ручкой при взаимодействии
 * - Living Material: морфинг ручки, анимация трека
 * - Drag + click-to-seek + mouse wheel + keyboard (Arrow keys)
 * - Accessibility: role="slider", aria-valuemin/max/now
 *
 * Events:
 *   valueChanged   — {value: number}  при изменении значения
 *   input          — при каждом сдвиге (dragging)
 *   change         — при завершении interaction
 */
@customElement('umi-slide-bar')
export class SlideBar extends LitElement {
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

    /** Inset icon — material symbol name, e.g. "volume_up" (optional, MD3 spec §inset icon) */
    @property({ type: String }) icon = '';

    /** Vertical orientation: slider stands upright, value=0 at bottom */
    @property({ type: Boolean, reflect: true }) vertical = false;

    /** Track length in px when vertical (default 200). Ignored in horizontal mode. */
    @property({ type: Number }) length = 200;
    @property({ type: String }) size: 'xs' | 's' | 'm' | 'l' | 'xl' = 'xs';

    // ── Public API — значения ───────────────────────────────
    @property({ type: Number }) from = 0;
    @property({ type: Number }) to = 100;
    @property({ type: Number }) value = 0;
    @property({ type: Number }) divisions = 0;
    @property({ type: Number }) step = 1;
    @property({ type: Boolean, reflect: true }) enabled = true;

    // ── Public API — wave ───────────────────────────────────
    @property({ type: Boolean, attribute: 'wave-mode' })     waveMode = false;
    @property({ type: Boolean, attribute: 'wave-animated' }) waveAnimated = true;

    // ── Internal state ──────────────────────────────────────
    @state() private _thumbX = 0;
    @state() private _dragging = false;
    @state() private _focused = false;
    @state() private _hovered = false;
    @state() private _labelVisible = false;
    @state() private _labelText = '';

    @query('.sb-root') private _rootEl?: HTMLElement;
    @query('canvas') private _waveCanvas?: HTMLCanvasElement;

    private _math = new SlideBarMath();
    private _valueChanges = false;
    private _handleChanges = false;

    // Wave RAF
    private _wavePhase = 0;
    private _raf?: number;
    private _lastRafTime?: number;

    private _ro?: ResizeObserver;

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
        this._syncThumbFromValue();
        this._tickWave();
    }

    protected updated(changed: Map<string, unknown>) {
        if (changed.has('value') && !this._handleChanges) {
            this._setFromValue();
        }
        if (changed.has('from') || changed.has('to') || changed.has('divisions')) {
            this._math.from = this.from;
            this._math.to   = this.to;
            this._math.divisions = this.divisions;
        }
        if (changed.has('waveMode') || changed.has('waveAnimated') || changed.has('_dragging')) {
            this._tickWave();
        }
        const { handleH } = this._sizeTokens();
        // Host sizing
        if (this.vertical) {
            this.style.display   = 'inline-block';
            this.style.position  = 'relative';   // contain the absolutely-positioned sb-root
            this.style.width     = `${handleH}px`;
            this.style.height    = `${this.length}px`;
        } else {
            this.style.display   = 'block';
            this.style.position  = '';
            this.style.width     = '';
            this.style.height    = `${handleH}px`; // lock to MD3 touch-target height
        }
        this._paintWave();
    }

    // ── Resize ──────────────────────────────────────────────
    private _setupResize() {
        if (typeof ResizeObserver === 'undefined') return;
        this._ro = new ResizeObserver(() => {
            this._syncMath();
            this._syncThumbFromValue();
            this._paintWave();
        });
        this._ro.observe(this);
    }

    private _syncMath() {
        const rect = this.getBoundingClientRect();
        // When vertical the host is 44×length; track length = host height
        const trackW = this.vertical ? (rect.height || this.length) : (rect.width || 300);
        this._math.init(trackW);
        this._math.from = this.from;
        this._math.to   = this.to;
        this._math.divisions = this.divisions;
    }

    /** Convert a PointerEvent to the logical X coordinate along the track */
    private _localX(e: PointerEvent, rect: DOMRect): number {
        // Vertical: bottom-anchor, rotate -90° → bottom = value_min, top = value_max
        return this.vertical ? (rect.bottom - e.clientY) : (e.clientX - rect.left);
    }

    private _sizeTokens() {
        switch (this.size) {
            case 's':
                return { trackH: 24, handleH: 44, trackRadius: 8, iconSize: 0 };
            case 'm':
                return { trackH: 40, handleH: 52, trackRadius: 12, iconSize: 24 };
            case 'l':
                return { trackH: 56, handleH: 68, trackRadius: 16, iconSize: 24 };
            case 'xl':
                return { trackH: 96, handleH: 108, trackRadius: 28, iconSize: 32 };
            case 'xs':
            default:
                return { trackH: 16, handleH: 44, trackRadius: 8, iconSize: 0 };
        }
    }

    // ── Value <→ ThumbX ─────────────────────────────────────
    private _setFromValue() {
        if (this._math.workWidth <= 0) return;
        this._syncMath();
        const v = this._math.constrainValue(this.value);
        if (this.divisions > 0) {
            const div = this._math.getNearDivision(this._math.xFromValue(v));
            this._thumbX = this._math.xFromDiv(div);
            const real = this._math.constrainValue(this.from + div * this._math.divisionStep());
            if (real !== this.value) {
                this.value = Math.round(real);
            }
        } else {
            this._thumbX = this._math.xFromValue(v);
        }
    }

    private _syncThumbFromValue() {
        this._setFromValue();
    }

    private _setFromThumb(thumbX: number) {
        this._thumbX = thumbX;
        const rawValue = this._math.valueFromX(thumbX);
        let v: number;
        if (this.divisions > 0) {
            const div = this._math.getNearDivision(thumbX);
            this._thumbX = this._math.xFromDiv(div);
            v = Math.round(this._math.constrainValue(this.from + div * this._math.divisionStep()));
        } else {
            v = Math.round(rawValue);
        }
        v = this._math.constrainValue(v);
        if (v !== this.value) {
            this._handleChanges = true;
            this.value = v;
            this._handleChanges = false;
            this._emitValueChanged();
        }
    }

    // ── Wave ────────────────────────────────────────────────
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
        const { trackH } = this._sizeTokens();

        // Active track ends at thumbX - 6 (same as non-wave track width)
        const W = Math.max(0, this._thumbX - 6);
        const H = trackH;
        if (W <= 0 || H <= 0) {
            canvas.width = 0;
            return;
        }

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

            const f0 = this._smoothFade(0, availW, fadeInLen, fadeOutLen);
            ctx.moveTo(startX, centerY + Math.sin(this._wavePhase * waveLength / waveLength * 2 * Math.PI) * amplitude * f0);

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

    private _smoothStep(t: number) {
        t = clamp(t, 0, 1);
        return t * t * (3 - 2 * t);
    }

    private _resolveColor(cssColor: string): string {
        if (!cssColor.startsWith('var(')) return cssColor;
        const varName = cssColor.match(/var\((--[^,)]+)/)?.[1] ?? '';
        return getComputedStyle(this).getPropertyValue(varName).trim() || cssColor;
    }

    // ── Pointer events ──────────────────────────────────────
    private _onPointerDown(e: PointerEvent) {
        if (!this.enabled) return;
        e.preventDefault();
        this._syncMath();

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const localX = this._localX(e, rect) - 2; // 2 = half of 4px handle
        const newThumbX = this._math.constrainX(localX);

        this._setFromThumb(newThumbX);
        this._dragging = true;
        this._showLabel();

        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    private _onPointerMove(e: PointerEvent) {
        if (!this._dragging || !this.enabled) return;
        const rect = this._rootEl!.getBoundingClientRect();
        const localX = this._localX(e, rect) - 2;
        const newThumbX = this._math.constrainX(localX);
        this._setFromThumb(newThumbX);
        this._updateLabel();
    }

    private _onPointerUp(e: PointerEvent) {
        this._dragging = false;
        this._hideLabel();
        this._emit('change');
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }

    private _onWheel(e: WheelEvent) {
        if (!this.enabled) return;
        e.preventDefault();
        this._controlKeys(e.deltaY < 0);
    }

    // ── Keyboard ────────────────────────────────────────────
    private _onKeyDown(e: KeyboardEvent) {
        if (!this.enabled) return;
        if (['ArrowLeft', 'ArrowDown'].includes(e.key)) {
            this._controlKeys(false);
            e.preventDefault();
        } else if (['ArrowRight', 'ArrowUp'].includes(e.key)) {
            this._controlKeys(true);
            e.preventDefault();
        }
    }

    private _controlKeys(up: boolean) {
        const step = up ? this.step : -this.step;
        let newVal: number;
        if (this.divisions > 0) {
            const div = this._math.getNearDivision(this._thumbX);
            const newDiv = clamp(div + (up ? 1 : -1), 0, this.divisions);
            newVal = this._math.constrainValue(this.from + newDiv * this._math.divisionStep());
        } else {
            newVal = this._math.constrainValue(this.value + step);
        }
        this.value = Math.round(newVal);
        this._emitValueChanged();
    }

    // ── Label ───────────────────────────────────────────────
    private _labelHideTimer?: number;

    private _showLabel() {
        if (this._labelHideTimer) { clearTimeout(this._labelHideTimer); this._labelHideTimer = undefined; }
        this._labelText = String(this.value);
        this._labelVisible = true;
    }

    private _updateLabel() {
        this._labelText = String(this.value);
    }

    private _hideLabel() {
        this._labelHideTimer = window.setTimeout(() => {
            this._labelVisible = false;
            this._labelHideTimer = undefined;
        }, 250);
    }

    // ── Events ──────────────────────────────────────────────
    private _emitValueChanged() {
        this.dispatchEvent(new CustomEvent('valueChanged', { detail: { value: this.value }, bubbles: true, composed: true }));
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }

    private _emit(name: string) {
        this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
    }

    // ── Render ──────────────────────────────────────────────
    render() {
        const thumbX    = this._thumbX;
        const { trackH, handleH, trackRadius, iconSize } = this._sizeTokens();
        const trackTop = (handleH - trackH) / 2;
        const trackCenterY = trackTop + trackH / 2;
        const labelTop = -(handleH + 18);

        // For vertical the host is handleH×length; track length = host height
        const rect = this.getBoundingClientRect();
        const width = this.vertical ? (rect.height || this.length) : (rect.width || 300);
        const divisions = this.divisions;
        this._math.init(width);
        this._math.from      = this.from;
        this._math.to        = this.to;
        this._math.divisions = divisions;

        const activeColor   = this.enabled ? this.activeTrackColor   : this.disabledActiveTrackColor;
        const inactiveColor = this.enabled ? this.inactiveTrackColor : this.disabledInactiveTrackColor;
        const handleClr     = this.enabled ? this.handleColor : this.disabledActiveTrackColor;
        const handleOpacity = this.enabled ? 1 : 0.38;
        const handleWidth   = this._dragging ? 2 : 4;

        const activeTrackW = Math.max(0, thumbX - 6);
        const inactiveLeft = thumbX + 10;
        const endDotOpacity = this.enabled ? 1 : 0.38;

        // Division ticks — color per spec: on-primary on active zone, on-secondary-container on inactive
        const _tickWorkW = width - 12;
        const ticks = divisions > 0
            ? Array.from({ length: divisions }, (_, i) => {
                const tickX = Math.round(4 + i * (_tickWorkW / divisions));
                const onActive = tickX < activeTrackW;
                const color = this.enabled
                    ? (onActive
                        ? 'var(--md-sys-color-on-primary, #fff)'
                        : 'var(--md-sys-color-on-secondary-container, #1d192b)')
                    : 'var(--md-sys-color-on-surface, #1d1b20)';
                return html`
                    <div class="sb-tick" style="left:${tickX}px; top:${trackCenterY}px; background:${color}; opacity:${endDotOpacity}; z-index:1;"></div>
                `;
              })
            : nothing;

        // Inset icon (MD3): available for M/L/XL standard slider.
        const showInsetIcon = !!this.icon && !this.vertical && iconSize > 0;
        const iconPadding = 8;
        const iconTop = trackCenterY;
        const iconOnPrimary = 'var(--md-sys-color-on-primary, #fff)';
        const iconOnInactive = this.enabled
            ? 'var(--md-sys-color-on-secondary-container, #1d192b)'
            : 'var(--md-sys-color-on-surface, #1d1b20)';
        const iconActiveLeft = Math.max(0, activeTrackW - iconSize - iconPadding);
        const iconInactiveLeft = Math.max(inactiveLeft + iconPadding, width - iconSize - 6);
        const iconInActive = showInsetIcon && iconActiveLeft + iconSize <= activeTrackW;
        const iconInInactive = showInsetIcon && !iconInActive;
        const inactiveRight = 0;

        const labelCenterX = thumbX + 2;

        return html`
            <div
                class="sb-root ${this.enabled ? '' : 'disabled'}"
                role="slider"
                tabindex="${this.enabled ? 0 : -1}"
                aria-valuemin="${this.from}"
                aria-valuemax="${this.to}"
                aria-valuenow="${this.value}"
                aria-disabled="${this.enabled ? 'false' : 'true'}"
                aria-label="Slider"
                style="${this.vertical
                    ? `position:absolute; bottom:0; left:0; width:${this.length}px; height:${handleH}px; transform-origin:0 100%; transform:rotate(-90deg); overflow:visible;`
                    : `height:${handleH}px; overflow:visible;`}"
                @pointerdown=${this._onPointerDown}
                @pointermove=${this._onPointerMove}
                @pointerup=${this._onPointerUp}
                @pointercancel=${this._onPointerUp}
                @wheel=${this._onWheel}
                @keydown=${this._onKeyDown}
                @focus=${() => { this._focused = true; }}
                @blur=${()  => { this._focused = false; }}
            >
                ${!showInsetIcon ? html`
                    <div class="sb-end-dot" style="top:${trackCenterY}px; background:${this.enabled ? 'var(--md-sys-color-on-secondary-container, #1d192b)' : 'var(--md-sys-color-on-surface, #1d1b20)'}; opacity:${endDotOpacity};"></div>
                ` : nothing}

                ${ticks}

                ${!this.waveMode ? html`
                    <div class="sb-track sb-track-active"
                         style="top:${trackTop}px; height:${trackH}px; width:${activeTrackW}px; border-top-left-radius:${trackRadius}px; border-bottom-left-radius:${trackRadius}px; border-top-right-radius:${trackRadius}px; border-bottom-right-radius:${trackRadius}px; background:${activeColor}; opacity:${this.enabled ? 1 : 0.38};">
                    </div>
                ` : nothing}

                ${this.waveMode ? html`
                    <canvas style="
                        position:absolute; left:0; top:${trackTop}px;
                        width:${activeTrackW}px; height:${trackH}px;
                        opacity:${this.enabled ? 1 : 0.38};
                        pointer-events:none; z-index:0;
                    "></canvas>
                ` : nothing}

                <div class="sb-track sb-track-inactive"
                     style="top:${trackTop}px; height:${trackH}px; left:${inactiveLeft}px; right:${inactiveRight}px; border-top-left-radius:${trackRadius}px; border-bottom-left-radius:${trackRadius}px; border-top-right-radius:${trackRadius}px; border-bottom-right-radius:${trackRadius}px; background:${inactiveColor}; opacity:${this.enabled ? 1 : 0.12};">
                </div>

                ${showInsetIcon ? html`
                    <span class="sb-icon"
                          style="left:${iconActiveLeft}px; top:${iconTop}px;
                                 font-size:${iconSize}px; width:${iconSize}px; height:${iconSize}px;
                                 color:${iconOnPrimary};
                                 opacity:${iconInActive ? endDotOpacity : 0};"
                    >${this.icon}</span>
                    <span class="sb-icon"
                          style="left:${iconInactiveLeft}px; top:${iconTop}px;
                                 font-size:${iconSize}px; width:${iconSize}px; height:${iconSize}px;
                                 color:${iconOnInactive};
                                 opacity:${iconInInactive ? endDotOpacity : 0};"
                    >${this.icon}</span>
                ` : nothing}

                <div class="sb-handle-area"
                     style="left:${thumbX + 2}px; width:${handleH}px; height:${handleH}px;"
                     @pointerenter=${() => { this._hovered = true; }}
                     @pointerleave=${() => { this._hovered = false; }}>
                    <div class="sb-state-layer" style="
                        border-radius:${handleH / 2}px;
                         background:${handleClr};
                         opacity:${this._dragging ? 0.12 : this._hovered ? 0.08 : 0};
                    "></div>
                    <div class="sb-handle-inner"
                         style="
                             width:${handleWidth}px;
                             height:${handleH}px;
                             background:${handleClr};
                             opacity:${handleOpacity};
                         ">
                    </div>
                    ${this._focused && !this._dragging ? html`
                        <div class="sb-handle-focus-ring"
                             style="border-color:${handleClr};"></div>
                    ` : nothing}
                </div>

                <div class="sb-label ${this._labelVisible ? 'visible' : 'hidden'}"
                     style="left:${labelCenterX}px; top:${labelTop}px;">
                    <div class="sb-label-bubble"
                         style="background:var(--md-sys-color-inverse-surface, #313033); color:var(--md-sys-color-inverse-on-surface, #f4eff4);">
                        ${this._labelText}
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
        'umi-slide-bar': SlideBar;
    }
}

// Re-export math for RangeSlideBar
export { SlideBarMath, clamp };
