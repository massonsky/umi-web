import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import carouselStyles from '../styles/LabsCarousel.css';

export type LabsCarouselVariant =
    | 'multi-browse'
    | 'uncontained'
    | 'uncontained-multi'
    | 'hero'
    | 'centered-hero'
    | 'full-screen';

@customElement('umi-labs-carousel')
export class LabsCarousel extends LitElement {
    @property({ type: String }) variant: LabsCarouselVariant = 'multi-browse';
    @property({ type: Boolean }) snap = true;
    @property({ type: String, attribute: 'aria-label' }) ariaLabel = 'Carousel';
    @property({ type: Boolean, attribute: 'show-all' }) showAll = false;
    @property({ type: String, attribute: 'show-all-text' }) showAllText = 'Show all';

    @state() private _items: HTMLElement[] = [];
    @state() private _activeIndex = 0;

    private _rafId = 0;
    private _pointerId: number | null = null;
    private _dragStartX = 0;
    private _dragStartScrollLeft = 0;
    private _dragMoved = false;
    private _suppressClickUntil = 0;
    private _snapClassTimer: ReturnType<typeof setTimeout> | null = null;
    private _wheelRafId = 0;
    private _wheelTargetScrollLeft: number | null = null;
    private _wheelSnapTimer: ReturnType<typeof setTimeout> | null = null;
    private _wheelStepAcc = 0;
    private _isIndexAnimating = false;
    private _indexAnimTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly _widthLerpMap = new WeakMap<HTMLElement, number>();
    private _viewportEl: HTMLElement | null = null;
    private _lastPointerX = 0;
    private _lastPointerT = 0;
    private _dragVelocity = 0;
    private _inertiaRafId = 0;

    static styles = [unsafeCSS(carouselStyles)];

    connectedCallback(): void {
        super.connectedCallback();
        window.addEventListener('resize', this._requestMorphUpdate, { passive: true });
    }

    disconnectedCallback(): void {
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = 0;
        }
        if (this._snapClassTimer) {
            clearTimeout(this._snapClassTimer);
            this._snapClassTimer = null;
        }
        if (this._wheelRafId) {
            cancelAnimationFrame(this._wheelRafId);
            this._wheelRafId = 0;
        }
        if (this._wheelSnapTimer) {
            clearTimeout(this._wheelSnapTimer);
            this._wheelSnapTimer = null;
        }
        if (this._indexAnimTimer) {
            clearTimeout(this._indexAnimTimer);
            this._indexAnimTimer = null;
        }
        if (this._inertiaRafId) {
            cancelAnimationFrame(this._inertiaRafId);
            this._inertiaRafId = 0;
        }
        this._detachViewportListeners();
        this._wheelTargetScrollLeft = null;
        this._wheelStepAcc = 0;
        this._isIndexAnimating = false;
        window.removeEventListener('resize', this._requestMorphUpdate);
        super.disconnectedCallback();
    }

    firstUpdated(): void {
        this._attachViewportListeners();
        this._syncItems();
        this._requestMorphUpdate();
    }

    updated(changed: Map<string, unknown>): void {
        if (changed.has('variant')) {
            this._applyLayoutClasses();
            this._applyA11yState();
            this._requestMorphUpdate();
        }
    }

    private _onSlotChange = () => {
        this._syncItems();
    };

    private _syncItems(): void {
        const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot');
        const assigned = slot?.assignedElements({ flatten: true }) ?? [];

        this._items = assigned.filter((el): el is HTMLElement => el instanceof HTMLElement);
        this._activeIndex = Math.min(this._activeIndex, Math.max(0, this._items.length - 1));

        this._applyLayoutClasses();
        this._applyA11yState();
        this._bindItemHandlers();
        this._requestMorphUpdate();
    }

    private _applyLayoutClasses(): void {
        const itemCount = this._items.length;

        this._items.forEach((item, index) => {
            item.classList.add('umi-labs-carousel-item');
            item.classList.remove(
                'size-large',
                'size-medium',
                'size-small',
                'size-full'
            );

            if (this.variant === 'full-screen') {
                item.classList.add('size-full');
                return;
            }

            if (this.variant === 'uncontained' || this.variant === 'uncontained-multi') {
                item.classList.add('size-large');
                return;
            }

            if (this.variant === 'hero') {
                item.classList.add(index === 0 ? 'size-large' : 'size-small');
                return;
            }

            if (this.variant === 'centered-hero') {
                const first = index === 0;
                const last = index === itemCount - 1;
                item.classList.add(first || last ? 'size-small' : 'size-large');
                return;
            }

            // multi-browse: large + medium + small repeating pattern
            const pattern = index % 3;
            if (pattern === 0) item.classList.add('size-large');
            else if (pattern === 1) item.classList.add('size-medium');
            else item.classList.add('size-small');
        });
    }

    private _applyA11yState(): void {
        const total = this._items.length;

        this._items.forEach((item, index) => {
            item.tabIndex = index === this._activeIndex ? 0 : -1;

            const hasLabel = item.hasAttribute('aria-label');
            if (!hasLabel) {
                item.setAttribute('aria-label', `Item ${index + 1} of ${total}`);
            }

            if (!item.hasAttribute('role')) {
                item.setAttribute('role', 'button');
            }
        });
    }

    private _bindItemHandlers(): void {
        this._items.forEach((item, index) => {
            item.onfocus = () => {
                this._activeIndex = index;
                this._applyA11yState();
            };

            item.onkeydown = (e: KeyboardEvent) => {
                const key = e.key;
                if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'Tab') {
                    if (!e.shiftKey) {
                        e.preventDefault();
                        this._focusIndex(index + 1);
                    }
                    return;
                }

                if (key === 'ArrowLeft' || key === 'ArrowUp') {
                    e.preventDefault();
                    this._focusIndex(index - 1);
                    return;
                }

                if (key === 'Enter' || key === ' ') {
                    e.preventDefault();
                    this._emitActivate(index);
                }
            };
        });
    }

    private _focusIndex(index: number): void {
        if (!this._items.length) return;

        const next = Math.max(0, Math.min(index, this._items.length - 1));
        this._activeIndex = next;
        this._applyA11yState();

        const el = this._items[next];
        el.focus();
        this._scrollToIndex(next, 'smooth');
        this._requestMorphUpdate();
    }

    private _nearestIndex(): number {
        const viewport = this._getViewport();
        if (!viewport || !this._items.length) return 0;

        const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;

        let nearestIndex = 0;
        let nearestDist = Number.POSITIVE_INFINITY;

        this._items.forEach((item, index) => {
            const center = item.offsetLeft + item.offsetWidth / 2;
            const dist = Math.abs(center - viewportCenter);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIndex = index;
            }
        });

        return nearestIndex;
    }

    private _scrollToIndex(index: number, behavior: ScrollBehavior): void {
        const viewport = this._getViewport();
        if (!viewport || !this._items.length) return;

        const clamped = this._clamp(index, 0, this._items.length - 1);
        const item = this._items[clamped];
        if (!item) return;

        this._activeIndex = clamped;
        this._applyA11yState();

        const target = item.offsetLeft - (viewport.clientWidth - item.offsetWidth) / 2;
        viewport.scrollTo({ left: Math.max(0, target), behavior });

        if (behavior === 'smooth') {
            this._isIndexAnimating = true;
            if (this._indexAnimTimer) clearTimeout(this._indexAnimTimer);
            this._indexAnimTimer = setTimeout(() => {
                this._isIndexAnimating = false;
                this._indexAnimTimer = null;
            }, 260);
        }
    }

    private _scrollItemIntoCenter(index: number, behavior: ScrollBehavior): void {
        const viewport = this._getViewport();
        if (!viewport) return;

        const item = this._items[index];
        if (!item) return;

        const target = item.offsetLeft - (viewport.clientWidth - item.offsetWidth) / 2;
        viewport.scrollTo({ left: Math.max(0, target), behavior });
    }

    private _emitActivate(index: number): void {
        this.dispatchEvent(new CustomEvent('item-activated', {
            detail: { index, item: this._items[index] ?? null },
            bubbles: true,
            composed: true
        }));
    }

    private _onShowAllClick = () => {
        this.dispatchEvent(new CustomEvent('show-all-clicked', { bubbles: true, composed: true }));
    };

    private _getViewport(): HTMLElement | null {
        return this.renderRoot.querySelector<HTMLElement>('.viewport');
    }

    private _onViewportScroll = () => {
        this._requestMorphUpdate();
    };

    private _attachViewportListeners(): void {
        const viewport = this._getViewport();
        if (!viewport || this._viewportEl === viewport) return;

        if (this._viewportEl) {
            this._detachViewportListeners();
        }

        this._viewportEl = viewport;
        this._viewportEl.addEventListener('wheel', this._onViewportWheel, { passive: false });
    }

    private _detachViewportListeners(): void {
        if (!this._viewportEl) return;
        this._viewportEl.removeEventListener('wheel', this._onViewportWheel as EventListener);
        this._viewportEl = null;
    }

    private _onViewportClick = (event: MouseEvent) => {
        if (performance.now() < this._suppressClickUntil) return;
        if (this._pointerId !== null) return;

        const path = event.composedPath();
        let index = -1;

        for (const node of path) {
            if (!(node instanceof HTMLElement)) continue;
            const hit = this._items.indexOf(node);
            if (hit >= 0) {
                index = hit;
                break;
            }
        }

        if (index < 0) return;

        this._scrollToIndex(index, 'smooth');
        this._emitActivate(index);
    };

    private _requestMorphUpdate = () => {
        if (this._rafId) return;

        this._rafId = requestAnimationFrame(() => {
            this._rafId = 0;
            this._applyDynamicMorph();
        });
    };

    private _applyDynamicMorph(): void {
        const viewport = this._getViewport();
        if (!viewport || !this._items.length) return;

        const viewportWidth = Math.max(1, viewport.clientWidth);
        const viewportCenter = viewport.scrollLeft + viewportWidth / 2;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const lerpFactor = reducedMotion
            ? 1
            : (this._pointerId !== null ? 0.16 : (this._wheelRafId ? 0.2 : 0.24));

        this._items.forEach((item) => {
            const itemWidthNow = item.offsetWidth;
            const itemCenter = item.offsetLeft + itemWidthNow / 2;
            const signedDistance = (itemCenter - viewportCenter) / Math.max(1, viewportWidth * 0.6);

            const rawDistance = Math.abs(itemCenter - viewportCenter);
            const normalized = Math.min(1, rawDistance / Math.max(1, viewportWidth * 0.58));
            const focus = 1 - normalized;

            // Smoothstep даёт более «живую» непрерывную интерполяцию без резких переломов.
            const smooth = focus * focus * (3 - 2 * focus);

            const scale = reducedMotion ? 1 : 0.94 + smooth * 0.08;
            const radius = this.variant === 'full-screen'
                ? 0
                : (reducedMotion ? 28 : 28 - smooth * 10);
            const lift = reducedMotion ? 0 : smooth * 7;
            const tilt = reducedMotion ? 0 : Math.max(-2.5, Math.min(2.5, -signedDistance * 2.2));
            const parallaxX = reducedMotion ? 0 : Math.max(-4, Math.min(4, -signedDistance * 3.2));

            const sizeType = this._resolveSizeType(item);
            const targetWidth = this._calcDynamicWidthPx(sizeType, viewportWidth, smooth);
            const prevWidth = this._widthLerpMap.get(item) ?? targetWidth;
            const delta = (targetWidth - prevWidth) * lerpFactor;
            const cappedDelta = this._clamp(delta, -10, 10);
            const dynamicWidth = prevWidth + cappedDelta;
            this._widthLerpMap.set(item, dynamicWidth);

            item.style.setProperty('--labs-carousel-focus', focus.toFixed(4));
            item.style.setProperty('--labs-carousel-dynamic-scale', scale.toFixed(4));
            item.style.setProperty('--labs-carousel-dynamic-radius', `${Math.max(12, radius).toFixed(2)}px`);
            item.style.setProperty('--labs-carousel-dynamic-lift', `${lift.toFixed(2)}px`);
            item.style.setProperty('--labs-carousel-tilt', `${tilt.toFixed(2)}deg`);
            item.style.setProperty('--labs-carousel-parallax-x', `${parallaxX.toFixed(2)}px`);
            item.style.setProperty('--labs-carousel-dynamic-width', `${Math.round(dynamicWidth)}px`);
        });
    }

    private _resolveSizeType(item: HTMLElement): 'full' | 'large' | 'medium' | 'small' {
        if (item.classList.contains('size-full')) return 'full';
        if (item.classList.contains('size-small')) return 'small';
        if (item.classList.contains('size-medium')) return 'medium';
        return 'large';
    }

    private _clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    private _calcDynamicWidthPx(sizeType: 'full' | 'large' | 'medium' | 'small', viewportWidth: number, focus: number): number {
        if (sizeType === 'full') return viewportWidth;

        const compact = viewportWidth < 900;

        // Главная идея: ширина зависит от текущей позиции в viewport (focus),
        // поэтому соседние элементы непрерывно «обмениваются» размером при drag.
        if (this.variant === 'multi-browse') {
            const minW = compact ? 56 : 64;
            const maxW = this._clamp(compact ? viewportWidth * 0.72 : viewportWidth * 0.42, 240, compact ? 360 : 420);

            // Базовая интерполяция small -> large по позиции
            let width = minW + (maxW - minW) * focus;

            // Лёгкий bias по типу сохраняет характер layout, но без резких скачков.
            if (sizeType === 'medium') width *= 0.95;
            if (sizeType === 'small') width *= 0.90;

            return this._clamp(width, 48, maxW + 10);
        }

        if (this.variant === 'hero' || this.variant === 'centered-hero') {
            const minW = compact ? 56 : 64;
            const maxW = this._clamp(compact ? viewportWidth * 0.80 : viewportWidth * 0.52, 280, compact ? 420 : 520);
            const width = minW + (maxW - minW) * Math.pow(focus, 1.05);
            return this._clamp(width, 48, maxW + 14);
        }

        if (this.variant === 'uncontained' || this.variant === 'uncontained-multi') {
            const base = this._clamp(compact ? viewportWidth * 0.74 : viewportWidth * 0.42, 220, compact ? 360 : 420);
            // Для uncontained только мягкая «дыхательная» динамика.
            const width = base * (0.96 + focus * 0.08);
            return this._clamp(width, base * 0.9, base * 1.06);
        }

        // Fallback для будущих вариантов.
        const fallback = this._clamp(compact ? viewportWidth * 0.66 : viewportWidth * 0.38, 200, compact ? 340 : 420);
        return fallback;
    }

    private _onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return;

        const viewport = this._getViewport();
        if (!viewport) return;

        this._pointerId = event.pointerId;
        this._dragStartX = event.clientX;
        this._dragStartScrollLeft = viewport.scrollLeft;
        this._dragMoved = false;
        this._lastPointerX = event.clientX;
        this._lastPointerT = performance.now();
        this._dragVelocity = 0;

        if (this._inertiaRafId) {
            cancelAnimationFrame(this._inertiaRafId);
            this._inertiaRafId = 0;
        }

        viewport.classList.add('is-dragging');
        this.style.setProperty('--labs-carousel-item-duration', '80ms');
        this.style.setProperty('--labs-carousel-item-easing', 'linear');
        viewport.setPointerCapture(event.pointerId);
    };

    private _onPointerMove = (event: PointerEvent) => {
        if (this._pointerId === null || event.pointerId !== this._pointerId) return;

        const viewport = this._getViewport();
        if (!viewport) return;

        const dx = event.clientX - this._dragStartX;
        if (Math.abs(dx) > 4) this._dragMoved = true;

        viewport.scrollLeft = this._dragStartScrollLeft - dx;

        const now = performance.now();
        const dt = Math.max(1, now - this._lastPointerT);
        const vx = (event.clientX - this._lastPointerX) / dt;
        // Low-pass filter для стабильной скорости.
        this._dragVelocity = this._dragVelocity * 0.7 + vx * 0.3;
        this._lastPointerX = event.clientX;
        this._lastPointerT = now;

        this._requestMorphUpdate();
    };

    private _onPointerUp = (event: PointerEvent) => {
        if (this._pointerId === null || event.pointerId !== this._pointerId) return;
        this._endDrag(event.pointerId);
    };

    private _onPointerCancel = (event: PointerEvent) => {
        if (this._pointerId === null || event.pointerId !== this._pointerId) return;
        this._endDrag(event.pointerId);
    };

    private _endDrag(pointerId: number): void {
        const viewport = this._getViewport();

        if (viewport?.hasPointerCapture(pointerId)) {
            viewport.releasePointerCapture(pointerId);
        }

        viewport?.classList.remove('is-dragging');
        this.style.removeProperty('--labs-carousel-item-duration');
        this.style.removeProperty('--labs-carousel-item-easing');

        if (this._dragMoved) {
            this._suppressClickUntil = performance.now() + 220;
            this._startInertia();
        }

        this._pointerId = null;
        this._dragStartX = 0;
        this._dragStartScrollLeft = 0;
        this._dragMoved = false;
    }

    private _startInertia(): void {
        const viewport = this._getViewport();
        if (!viewport) return;

        const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        if (maxScroll <= 0) {
            if (this.snap) this._snapToNearest();
            return;
        }

        let velocity = -this._dragVelocity * 28; // px/frame approx
        if (Math.abs(velocity) < 0.4) {
            if (this.snap) this._snapToNearest();
            return;
        }

        if (this._inertiaRafId) {
            cancelAnimationFrame(this._inertiaRafId);
            this._inertiaRafId = 0;
        }

        const step = () => {
            const vp = this._getViewport();
            if (!vp) {
                this._inertiaRafId = 0;
                return;
            }

            const next = this._clamp(vp.scrollLeft + velocity, 0, maxScroll);
            vp.scrollLeft = next;
            this._requestMorphUpdate();

            velocity *= 0.92;

            const atEdge = next <= 0 || next >= maxScroll;
            if (Math.abs(velocity) < 0.35 || atEdge) {
                this._inertiaRafId = 0;
                if (this.snap) this._snapToNearest();
                return;
            }

            this._inertiaRafId = requestAnimationFrame(step);
        };

        this._inertiaRafId = requestAnimationFrame(step);
    }

    private _onViewportWheel = (event: WheelEvent) => {
        const viewport = this._getViewport();
        if (!viewport) return;

        const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        if (maxScroll <= 0) return;

        const deltaX = event.deltaX;
        const deltaY = event.deltaY;
        if (Math.abs(deltaX) < 0.1 && Math.abs(deltaY) < 0.1) return;

        // Переводим вертикальное колесо в горизонтальный скролл для более удобного UX.
        const horizontalIntent = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;

        // Индексная анимация: переключаем строго карта-за-картой.
        if (this._isIndexAnimating) {
            event.preventDefault();
            return;
        }

        const atLeft = viewport.scrollLeft <= 0.5;
        const atRight = viewport.scrollLeft >= (maxScroll - 0.5);
        const wantsLeft = horizontalIntent < 0;
        const wantsRight = horizontalIntent > 0;

        // Не блокируем вертикальный скролл страницы, если карусель уже у края.
        if ((atLeft && wantsLeft) || (atRight && wantsRight)) {
            return;
        }

        event.preventDefault();
        viewport.classList.add('is-wheeling');

        this._wheelStepAcc += horizontalIntent;
        const STEP_THRESHOLD = 60;

        if (Math.abs(this._wheelStepAcc) >= STEP_THRESHOLD) {
            const direction = this._wheelStepAcc > 0 ? 1 : -1;
            this._wheelStepAcc = 0;

            const from = this._nearestIndex();
            const to = this._clamp(from + direction, 0, this._items.length - 1);
            if (to !== from) {
                this._scrollToIndex(to, 'smooth');
            }
        }

        if (this._wheelSnapTimer) clearTimeout(this._wheelSnapTimer);
        this._wheelSnapTimer = setTimeout(() => {
            const vp = this._getViewport();
            vp?.classList.remove('is-wheeling');
            if (this.snap && this._pointerId === null && !this._isIndexAnimating) this._snapToNearest();
            this._wheelStepAcc = 0;
            this._wheelSnapTimer = null;
        }, 180);
    };

    private _snapToNearest(): void {
        const viewport = this._getViewport();
        if (!viewport || !this._items.length) return;

        viewport.classList.add('is-snapping');
        this.style.setProperty('--labs-carousel-item-duration', '300ms');
        this.style.setProperty('--labs-carousel-item-easing', 'cubic-bezier(.18, .9, .2, 1.05)');
        if (this._snapClassTimer) clearTimeout(this._snapClassTimer);
        this._snapClassTimer = setTimeout(() => {
            viewport.classList.remove('is-snapping');
            this.style.removeProperty('--labs-carousel-item-duration');
            this.style.removeProperty('--labs-carousel-item-easing');
            this._snapClassTimer = null;
        }, 340);

        const nearestIndex = this._nearestIndex();
        this._scrollToIndex(nearestIndex, 'smooth');
        this._requestMorphUpdate();
    }

    render() {
        const classes = [
            'carousel',
            `variant-${this.variant}`,
            this.snap ? 'snap' : 'free-scroll'
        ].join(' ');

        return html`
            <section class="${classes}">
                <div
                    class="viewport"
                    role="region"
                    aria-label=${this.ariaLabel}
                    @click=${this._onViewportClick}
                    @scroll=${this._onViewportScroll}
                    @pointerdown=${this._onPointerDown}
                    @pointermove=${this._onPointerMove}
                    @pointerup=${this._onPointerUp}
                    @pointercancel=${this._onPointerCancel}
                >
                    <div class="track">
                        <slot @slotchange=${this._onSlotChange}></slot>
                    </div>
                </div>

                ${this.showAll
                    ? html`<button class="show-all" type="button" @click=${this._onShowAllClick}>${this.showAllText}</button>`
                    : null}
            </section>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-labs-carousel': LabsCarousel;
    }
}
