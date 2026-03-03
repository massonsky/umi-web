import { LitElement, css, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import scrollBarStyles from '../styles/ScrollBar.css';

const ORIENTATION_HORIZONTAL = 0;
const ORIENTATION_VERTICAL = 1;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * umi-scroll-bar
 *
 * TS/Lit port of ScrollBarM3.qml.
 *
 * Особенности:
 * - vertical/horizontal ориентация
 * - auto-hide
 * - living material (hover/press thickness + morph)
 * - drag thumb + click on track
 * - sync с target scroll container (target-selector)
 */
@customElement('umi-scroll-bar')
export class ScrollBar extends LitElement {
    @property({ type: Number }) orientation = ORIENTATION_VERTICAL;

    @property({ type: Number, attribute: 'min-thickness' }) minThickness = 4;
    @property({ type: Number, attribute: 'max-thickness' }) maxThickness = 8;

    @property({ type: Boolean, attribute: 'auto-hide' }) autoHide = true;
    @property({ type: Number, attribute: 'auto-hide-delay' }) autoHideDelay = 1500;

    @property({ type: Boolean, attribute: 'living-material-enabled' }) livingMaterialEnabled = true;
    @property({ type: Boolean }) enabled = true;
    @property({ type: Boolean }) active = false;

    @property({ type: Number }) size = 0.2;
    @property({ type: Number, reflect: true }) value = 0;
    @property({ type: Number, attribute: 'minimum-size' }) minimumSize = 0.1;

    @property({ type: String, attribute: 'target-selector' }) targetSelector = '';

    @property({ type: String, attribute: 'handle-color' }) handleColor = 'var(--md-sys-color-on-surface-variant, #49454f)';
    @property({ type: String, attribute: 'handle-hover-color' }) handleHoverColor = 'var(--md-sys-color-on-surface, #1d1b20)';
    @property({ type: String, attribute: 'handle-pressed-color' }) handlePressedColor = 'var(--md-sys-color-primary, #6750a4)';
    @property({ type: String, attribute: 'track-color' }) trackColor = 'color-mix(in srgb, var(--md-sys-color-surface-container-highest, #e6e0e9) 55%, transparent)';
    @property({ type: String, attribute: 'track-hover-color' }) trackHoverColor = 'var(--md-sys-color-surface-container-highest, #e6e0e9)';
    @property({ type: String, attribute: 'disabled-color' }) disabledColor = 'color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent)';

    @state() protected _hovered = false;
    @state() protected _pressed = false;
    @state() protected _dragging = false;
    @state() protected _hideReady = false;

    protected _trackEl?: HTMLElement;
    protected _hideTimer?: number;
    protected _targetEl?: HTMLElement;
    protected _lastPointerPos = 0;
    protected _valueAtDragStart = 0;
    protected _onPointerMoveBound = (e: PointerEvent) => this._onPointerMove(e);
    protected _onPointerUpBound = () => this._onPointerUp();
    protected _onTargetScrollBound = () => this._syncFromTarget();
    protected _resizeObserver?: ResizeObserver;

    static styles = [
        css`
            :host {
                display: inline-flex;
                touch-action: none;
                user-select: none;
            }
        `,
        unsafeCSS(scrollBarStyles),
    ];

    get isVertical() {
        return this.orientation === ORIENTATION_VERTICAL;
    }

    get isHorizontal() {
        return this.orientation === ORIENTATION_HORIZONTAL;
    }

    protected get _isActive() {
        return this.active || this._hovered || this._pressed || this._dragging;
    }

    protected get _thickness() {
        if (this._pressed) return this.maxThickness + 2;
        if (this._hovered || this._isActive) return this.maxThickness;
        return this.minThickness;
    }

    protected get _radius() {
        return this._thickness / 2;
    }

    protected get _handleColor() {
        if (!this.enabled) return this.disabledColor;
        if (this._pressed) return this.handlePressedColor;
        if (this._hovered) return this.handleHoverColor;
        return this.handleColor;
    }

    protected get _opacity() {
        if (!this.enabled) return 0.38;
        if (this.autoHide && !this._isActive && this._hideReady) return 0;
        return 1;
    }

    protected get _effectiveSize() {
        return clamp(this.size, clamp(this.minimumSize, 0.02, 1), 1);
    }

    connectedCallback(): void {
        super.connectedCallback();
        this._setupTarget();
        this._setupResizeObserver();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this._clearHideTimer();
        this._detachTarget();
        this._teardownDragListeners();
        this._resizeObserver?.disconnect();
    }

    protected firstUpdated(): void {
        this._trackEl = this.renderRoot.querySelector('.track') as HTMLElement | undefined;
        this._syncFromTarget();
    }

    protected updated(changed: Map<string, unknown>): void {
        if (changed.has('targetSelector')) {
            this._setupTarget();
            this._syncFromTarget();
        }

        if (changed.has('value')) {
            this.value = clamp(this.value, 0, 1);
            this._applyToTarget();
        }

        if (changed.has('size') || changed.has('minimumSize')) {
            this.size = this._effectiveSize;
        }

        if (
            changed.has('active') ||
            changed.has('_hovered') ||
            changed.has('_pressed') ||
            changed.has('_dragging') ||
            changed.has('autoHide') ||
            changed.has('autoHideDelay')
        ) {
            this._updateAutoHide();
        }
    }

    protected _setupResizeObserver() {
        if (typeof ResizeObserver === 'undefined') return;
        this._resizeObserver = new ResizeObserver(() => {
            this.requestUpdate();
            this._syncFromTarget();
        });
        this._resizeObserver.observe(this);
    }

    protected _setupTarget() {
        this._detachTarget();

        if (!this.targetSelector) return;
        const el = document.querySelector(this.targetSelector);
        if (!(el instanceof HTMLElement)) return;

        this._targetEl = el;
        this._targetEl.addEventListener('scroll', this._onTargetScrollBound, { passive: true });
        this._syncFromTarget();
    }

    protected _detachTarget() {
        if (!this._targetEl) return;
        this._targetEl.removeEventListener('scroll', this._onTargetScrollBound);
        this._targetEl = undefined;
    }

    protected _updateAutoHide() {
        this._clearHideTimer();

        if (!this.autoHide) {
            this._hideReady = false;
            return;
        }

        if (this._isActive) {
            this._hideReady = false;
            return;
        }

        this._hideTimer = window.setTimeout(() => {
            this._hideReady = true;
        }, Math.max(0, this.autoHideDelay));
    }

    protected _clearHideTimer() {
        if (this._hideTimer != null) {
            window.clearTimeout(this._hideTimer);
            this._hideTimer = undefined;
        }
    }

    protected _trackLength() {
        const track = this._trackEl;
        if (!track) return 0;
        return this.isVertical ? track.clientHeight : track.clientWidth;
    }

    protected _thumbLength() {
        const len = this._trackLength();
        return clamp(len * this._effectiveSize, 16, len);
    }

    protected _travelLength() {
        return Math.max(0, this._trackLength() - this._thumbLength());
    }

    protected _valueFromPointer(pointerPos: number) {
        const track = this._trackEl;
        if (!track) return this.value;

        const rect = track.getBoundingClientRect();
        const local = this.isVertical ? pointerPos - rect.top : pointerPos - rect.left;
        const centered = local - this._thumbLength() / 2;
        const travel = this._travelLength();
        if (travel <= 0) return 0;
        return clamp(centered / travel, 0, 1);
    }

    protected _emitValueChanged() {
        this.dispatchEvent(new CustomEvent('valueChanged', {
            detail: { value: this.value },
            bubbles: true,
            composed: true,
        }));
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }

    protected _applyToTarget() {
        if (!this._targetEl) return;

        if (this.isVertical) {
            const maxScroll = Math.max(0, this._targetEl.scrollHeight - this._targetEl.clientHeight);
            this._targetEl.scrollTop = maxScroll * this.value;
        } else {
            const maxScroll = Math.max(0, this._targetEl.scrollWidth - this._targetEl.clientWidth);
            this._targetEl.scrollLeft = maxScroll * this.value;
        }
    }

    protected _syncFromTarget() {
        if (!this._targetEl) return;

        if (this.isVertical) {
            const maxScroll = Math.max(0, this._targetEl.scrollHeight - this._targetEl.clientHeight);
            const visibleRatio = this._targetEl.clientHeight / Math.max(1, this._targetEl.scrollHeight);
            this.size = clamp(Math.max(this.minimumSize, visibleRatio), this.minimumSize, 1);
            this.value = maxScroll > 0 ? clamp(this._targetEl.scrollTop / maxScroll, 0, 1) : 0;
        } else {
            const maxScroll = Math.max(0, this._targetEl.scrollWidth - this._targetEl.clientWidth);
            const visibleRatio = this._targetEl.clientWidth / Math.max(1, this._targetEl.scrollWidth);
            this.size = clamp(Math.max(this.minimumSize, visibleRatio), this.minimumSize, 1);
            this.value = maxScroll > 0 ? clamp(this._targetEl.scrollLeft / maxScroll, 0, 1) : 0;
        }
    }

    protected _onPointerDown(e: PointerEvent) {
        if (!this.enabled) return;

        this._pressed = true;
        this._dragging = true;
        this._hideReady = false;

        const pointerPos = this.isVertical ? e.clientY : e.clientX;
        this._lastPointerPos = pointerPos;
        this._valueAtDragStart = this.value;

        this.value = this._valueFromPointer(pointerPos);
        this._emitValueChanged();

        this.setPointerCapture?.(e.pointerId);
        window.addEventListener('pointermove', this._onPointerMoveBound, { passive: true });
        window.addEventListener('pointerup', this._onPointerUpBound, { passive: true });
    }

    protected _onPointerMove(e: PointerEvent) {
        if (!this._dragging || !this.enabled) return;

        const pointerPos = this.isVertical ? e.clientY : e.clientX;
        const delta = pointerPos - this._lastPointerPos;

        const travel = this._travelLength();
        if (travel > 0) {
            const next = this._valueAtDragStart + delta / travel;
            const clamped = clamp(next, 0, 1);
            if (clamped !== this.value) {
                this.value = clamped;
                this._emitValueChanged();
            }
        }
    }

    protected _onPointerUp() {
        this._pressed = false;
        this._dragging = false;
        this._teardownDragListeners();
        this._updateAutoHide();
    }

    protected _teardownDragListeners() {
        window.removeEventListener('pointermove', this._onPointerMoveBound);
        window.removeEventListener('pointerup', this._onPointerUpBound);
    }

    render() {
        const thumbLength = this._thumbLength();
        const travel = this._travelLength();
        const thumbOffset = travel * this.value;

        const hostClasses = [
            'root',
            this.isVertical ? 'vertical' : 'horizontal',
            this._isActive ? 'active' : '',
            this.enabled ? 'enabled' : 'disabled',
            this.livingMaterialEnabled ? 'living' : '',
        ].filter(Boolean).join(' ');

        return html`
            <div
                class="${hostClasses}"
                role="scrollbar"
                aria-orientation=${this.isVertical ? 'vertical' : 'horizontal'}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow=${Math.round(this.value * 100)}
                aria-disabled=${this.enabled ? 'false' : 'true'}
                @mouseenter=${() => { this._hovered = true; this._hideReady = false; }}
                @mouseleave=${() => { this._hovered = false; this._pressed = false; }}
                style="
                    --sb-thickness:${this._thickness}px;
                    --sb-radius:${this._radius}px;
                    --sb-opacity:${this._opacity};
                    --sb-handle:${this._handleColor};
                    --sb-track:${this._isActive ? this.trackHoverColor : this.trackColor};
                    --sb-thumb-len:${thumbLength}px;
                    --sb-thumb-offset:${thumbOffset}px;
                "
            >
                <div class="track" @pointerdown=${this._onPointerDown}></div>
                <div class="thumb" @pointerdown=${this._onPointerDown}>
                    <div class="state-layer"></div>
                </div>
            </div>
        `;
    }
}

@customElement('umi-scroll-bar-expressive')
export class ScrollBarExpressive extends ScrollBar {
    @property({ type: Boolean, attribute: 'breathing-animation' }) breathingAnimation = false;
    @property({ type: Boolean, attribute: 'show-shadow' }) showShadow = true;
    @property({ type: Boolean, attribute: 'gradient-track' }) gradientTrack = false;
    @property({ type: String, attribute: 'handle-active-color' }) handleActiveColor = 'var(--md-sys-color-primary-container, #eaddff)';

    constructor() {
        super();
        this.maxThickness = 10;
        this.autoHideDelay = 2000;
    }

    protected get _handleColor() {
        if (!this.enabled) return this.disabledColor;
        if (this._pressed) return this.handlePressedColor;
        if (this._hovered) return this.handleHoverColor;
        if (this._isActive) return this.handleActiveColor;
        return this.handleColor;
    }

    protected get _thickness() {
        let base = this.minThickness;
        if (this._pressed) base = this.maxThickness + 3;
        else if (this._hovered) base = this.maxThickness;
        else if (this._isActive) base = this.minThickness + 2;
        return base;
    }

    render() {
        const base = super.render();
        const cls = [
            'expressive',
            this.gradientTrack ? 'gradient-track' : '',
            this.showShadow ? 'show-shadow' : '',
            this.breathingAnimation ? 'breathing' : '',
        ].filter(Boolean).join(' ');
        return html`<div class="${cls}">${base}</div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-scroll-bar': ScrollBar;
        'umi-scroll-bar-expressive': ScrollBarExpressive;
    }
}
