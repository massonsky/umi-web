import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import groupStyles from '../styles/ButtonGroup.css';

type GroupItem = HTMLElement & {
    checked?: boolean;
    checkable?: boolean;
    size?: number;
    groupOrientation?: number;
    isSingleItem?: boolean;
    isFirstItem?: boolean;
    isLastItem?: boolean;
    roundFirstItem?: boolean;
    roundLastItem?: boolean;
    livingMaterialScale?: number;
    cornerRadius?: number;
    radiusTL?: number;
    radiusTR?: number;
    radiusBL?: number;
    radiusBR?: number;
};

type ItemVisualState = {
    cornerRadius: number | undefined;
    radiusTL: number | undefined;
    radiusTR: number | undefined;
    radiusBL: number | undefined;
    radiusBR: number | undefined;
};

@customElement('umi-button-group')
export class ButtonGroup extends LitElement {
    @property({ type: Number, attribute: 'group-type', reflect: true }) groupType = 0; // 0 Standard | 1 Connected
    @property({ type: Number, reflect: true }) size = 2; // XS..XL
    @property({ type: Number, reflect: true }) shape = 0; // 0 Round | 1 Square (connected)
    @property({ type: Boolean, attribute: 'multi-select' }) multiSelect = false;
    @property({ type: Number, reflect: true }) orientation = 0; // 0 Horizontal | 1 Vertical
    @property({ type: Number }) spacing = -1;

    @property({ type: Boolean, attribute: 'expressive-motion' }) expressiveMotion = true;

    @property({ type: Boolean, attribute: 'colorization-checked-event' }) colorizationCheckedEvent = false;
    @property({ type: Boolean, attribute: 'set-icon-checked-event' }) setIconCheckedEvent = false;
    @property({ type: String, attribute: 'checked-icon' }) checkedIcon = 'check';

    @query('slot') private _slotEl!: HTMLSlotElement;

    private _items: GroupItem[] = [];
    private _boundMap = new WeakMap<GroupItem, EventListener>();
    private _visualState = new WeakMap<GroupItem, ItemVisualState>();
    private _waapiMap = new WeakMap<GroupItem, Animation>();
    private _layoutAnimMap = new WeakMap<GroupItem, Animation>();

    // MD3 Expressive timing/amounts
    private readonly _emphasizedDuration = 500;
    private readonly _standardDuration = 300;
    private readonly _checkedExpandFactor = 1.08;
    private readonly _checkedSqueezeFactor = 0.96;
    private readonly _uncheckedShrinkFactor = 0.94;
    private readonly _selectedCornerBoostPx = 8;

    static styles = unsafeCSS(groupStyles);

    connectedCallback(): void {
        super.connectedCallback();
        queueMicrotask(() => this.recalculate());
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this._items.forEach((item) => {
            const h = this._boundMap.get(item);
            if (h) item.removeEventListener('toggled', h);
        });
        this._items = [];
    }

    updated(changed: Map<string, unknown>): void {
        if (
            changed.has('groupType') ||
            changed.has('size') ||
            changed.has('shape') ||
            changed.has('multiSelect') ||
            changed.has('orientation') ||
            changed.has('spacing')
        ) {
            this.recalculate();
        }
    }

    get gap(): number {
        if (this.spacing >= 0) return this.spacing;
        if (this.groupType === 1) return 0;
        const values: Record<number, number> = { 0: 16, 1: 12, 2: 8, 3: 8, 4: 8 };
        return values[this.size] ?? 8;
    }

    get innerRadius(): number {
        return 8;
    }

    recalculate(): void {
        const newItems = this._collectItems();

        this._items.forEach((item) => {
            if (!newItems.includes(item)) {
                const h = this._boundMap.get(item);
                if (h) item.removeEventListener('toggled', h);
                this._boundMap.delete(item);
            }
        });

        this._items = newItems;
        this._items.forEach((item, idx) => this._wireItem(item, idx));
        this._applyLayoutAndState();
        this._applySelectedCorners();
    }

    analyzeButtonContent(): Record<string, unknown> {
        let hasIconOnly = false;
        let hasTextOnly = false;
        let hasIconTextCombos = false;
        let maxTextLength = 0;
        let minTextLength = Number.POSITIVE_INFINITY;
        let textSum = 0;
        let textCount = 0;

        this._items.forEach((el) => {
            const iconName = this._readProp<string>(el, 'iconName') ?? this._readAttr(el, 'icon-name');
            const text = this._readProp<string>(el, 'text') ?? this._readAttr(el, 'text');
            const hasIcon = Boolean(iconName);
            const hasText = Boolean(text);

            if (hasIcon && hasText) hasIconTextCombos = true;
            else if (hasIcon) hasIconOnly = true;
            else if (hasText) hasTextOnly = true;

            if (hasText) {
                const len = String(text).length;
                maxTextLength = Math.max(maxTextLength, len);
                minTextLength = Math.min(minTextLength, len);
                textSum += len;
                textCount += 1;
            }
        });

        const hasMixedTypes = (hasIconOnly && hasTextOnly) || hasIconTextCombos;
        const avg = textCount > 0 ? textSum / textCount : 0;

        return {
            hasIconOnly,
            hasTextOnly,
            hasIconTextCombos,
            hasMixedTypes,
            hasVariedTextLengths: Number.isFinite(minTextLength) ? (maxTextLength - minTextLength) > 3 : false,
            maxTextLength,
            minTextLength: Number.isFinite(minTextLength) ? minTextLength : 0,
            averageTextLength: avg,
            dominantContentType: hasIconOnly && !hasTextOnly && !hasIconTextCombos ? 'icon' : hasTextOnly && !hasIconOnly && !hasIconTextCombos ? 'text' : 'mixed',
            contentComplexity: hasMixedTypes ? 'moderate' : 'simple',
            recommendedSpacing: this.gap,
            visualEmphasisLevel: 'balanced',
            hasDestructiveActions: false,
            hasToggleStates: this._items.some((el) => this._readBool(el, 'checkable')),
            requiresUniformSizing: this.groupType === 1,
            primaryActionCount: 0,
            secondaryActionCount: 0,
        };
    }

    buttonAt(index: number): HTMLElement | null {
        return this._items[index] ?? null;
    }

    buttonCount(): number {
        return this._items.length;
    }

    checkedIndices(): number[] {
        const out: number[] = [];
        this._items.forEach((el, i) => {
            if (this._readBool(el, 'checked')) out.push(i);
        });
        return out;
    }

    setButtonChecked(index: number, checked: boolean): void {
        const item = this.buttonAt(index) as GroupItem | null;
        if (!item) return;
        this._setBool(item, 'checked', checked);
        this._handleToggle(item, checked);
    }

    clearSelection(): void {
        this._items.forEach((item) => this._setBool(item, 'checked', false));
        this._applySelectedCorners();
        this.dispatchEvent(new CustomEvent('selection-changed', { bubbles: true, composed: true }));
    }

    private _collectItems(): GroupItem[] {
        const assigned = this._slotEl?.assignedElements({ flatten: true }) ?? [];
        return assigned.filter((el): el is GroupItem => el instanceof HTMLElement);
    }

    private _wireItem(item: GroupItem, index: number): void {
        const old = this._boundMap.get(item);
        if (old) item.removeEventListener('toggled', old);

        const h: EventListener = (ev: Event) => {
            const checked = Boolean((ev as CustomEvent).detail?.checked ?? this._readBool(item, 'checked'));
            this._handleToggle(item, checked);
        };

        this._boundMap.set(item, h);
        item.addEventListener('toggled', h);

        this._setBool(item, 'checkable', true);
        this._setNum(item, 'size', this.size);
        this._setNum(item, 'groupOrientation', this.orientation);
        this._setBool(item, 'isSingleItem', this._items.length <= 1);
        this._setBool(item, 'isFirstItem', index === 0);
        this._setBool(item, 'isLastItem', index === this._items.length - 1);

        const round = this.shape === 0;
        this._setBool(item, 'roundFirstItem', round);
        this._setBool(item, 'roundLastItem', round);

        if (!this._visualState.has(item)) {
            this._visualState.set(item, {
                cornerRadius: this._readNumber(item, 'cornerRadius'),
                radiusTL: this._readNumber(item, 'radiusTL'),
                radiusTR: this._readNumber(item, 'radiusTR'),
                radiusBL: this._readNumber(item, 'radiusBL'),
                radiusBR: this._readNumber(item, 'radiusBR'),
            });
        }
    }

    private _applyLayoutAndState(): void {
        this.style.setProperty('--umi-group-gap', `${this.gap}px`);
        this.requestUpdate();
    }

    private _handleToggle(source: GroupItem, checked: boolean): void {
        if (!this.multiSelect && checked) {
            this._items.forEach((item) => {
                if (item !== source) this._setBool(item, 'checked', false);
            });
        }

        if (this.expressiveMotion) {
            this._triggerLivingMaterial(source, checked);
        }

        this._applySelectedCorners();

        const idx = this._items.indexOf(source);
        this.dispatchEvent(new CustomEvent('button-toggled', {
            detail: { index: idx, checked },
            bubbles: true,
            composed: true,
        }));

        this.dispatchEvent(new CustomEvent('selection-changed', { bubbles: true, composed: true }));
    }

    private _triggerLivingMaterial(item: GroupItem, checked: boolean): void {
        const canLayoutMorph = this.groupType === 1 && this.orientation === 0 && this._readBool(item, 'checkable');

        // MD3 group behavior: expansion that pushes siblings applies to connected horizontal groups.
        if (canLayoutMorph) {
            this._animateLayoutLivingMaterial(item, checked);
            return;
        }

        const prev = this._waapiMap.get(item);
        prev?.cancel();

        if (typeof item.livingMaterialScale === 'number') {
            // Приоритет: нативный livingMaterialScale в компоненте кнопки
            item.livingMaterialScale = checked ? this._checkedExpandFactor : this._uncheckedShrinkFactor;
            window.setTimeout(() => {
                if (typeof item.livingMaterialScale !== 'number') return;
                if (checked) {
                    item.livingMaterialScale = this._checkedSqueezeFactor;
                    window.setTimeout(() => {
                        if (typeof item.livingMaterialScale === 'number') {
                            item.livingMaterialScale = 1.0;
                        }
                    }, Math.floor(this._emphasizedDuration * 0.42));
                } else {
                    item.livingMaterialScale = 1.0;
                }
            }, checked ? Math.floor(this._emphasizedDuration * 0.58) : Math.floor(this._standardDuration * 0.66));
            return;
        }

        // Fallback: плавная WAAPI анимация в стиле MD3 Living Material
        const anim = item.animate(
            checked
                ? [
                    { transform: 'scale3d(1,1,1)', offset: 0, easing: 'cubic-bezier(0.2,0,0,1)' },
                    { transform: `scale3d(${this._checkedExpandFactor},1.03,1)`, offset: 0.58, easing: 'cubic-bezier(0.2,0,0,1)' },
                    { transform: `scale3d(${this._checkedSqueezeFactor},0.98,1)`, offset: 0.82, easing: 'cubic-bezier(0.34,1.56,0.64,1)' },
                    { transform: 'scale3d(1,1,1)', offset: 1 },
                ]
                : [
                    { transform: 'scale3d(1,1,1)', offset: 0, easing: 'cubic-bezier(0.2,0,0,1)' },
                    { transform: `scale3d(${this._uncheckedShrinkFactor},0.98,1)`, offset: 0.52, easing: 'cubic-bezier(0.34,1.56,0.64,1)' },
                    { transform: 'scale3d(1,1,1)', offset: 1 },
                ],
            {
                duration: checked ? this._emphasizedDuration : this._standardDuration,
                fill: 'none',
            },
        );

        this._waapiMap.set(item, anim);
    }

    private _animateLayoutLivingMaterial(item: GroupItem, checked: boolean): void {
        const prev = this._layoutAnimMap.get(item);
        prev?.cancel();

        const rect = item.getBoundingClientRect();
        const baseW = Math.max(1, rect.width);
        const baseH = Math.max(1, rect.height);

        // Фиксируем стартовый размер, чтобы WAAPI мог анимировать по пикселям.
        item.style.width = `${baseW}px`;
        item.style.height = `${baseH}px`;
        item.style.willChange = 'width, height';

        const keyframes = checked
            ? [
                { width: `${baseW}px`, height: `${baseH}px`, offset: 0, easing: 'cubic-bezier(0.2,0,0,1)' },
                { width: `${baseW * this._checkedExpandFactor}px`, height: `${baseH * 1.02}px`, offset: 0.58, easing: 'cubic-bezier(0.2,0,0,1)' },
                { width: `${baseW * this._checkedSqueezeFactor}px`, height: `${baseH * 0.99}px`, offset: 0.82, easing: 'cubic-bezier(0.34,1.56,0.64,1)' },
                { width: `${baseW}px`, height: `${baseH}px`, offset: 1 },
            ]
            : [
                { width: `${baseW}px`, height: `${baseH}px`, offset: 0, easing: 'cubic-bezier(0.2,0,0,1)' },
                { width: `${baseW * this._uncheckedShrinkFactor}px`, height: `${baseH * 0.99}px`, offset: 0.52, easing: 'cubic-bezier(0.34,1.56,0.64,1)' },
                { width: `${baseW}px`, height: `${baseH}px`, offset: 1 },
            ];

        const anim = item.animate(keyframes, {
            duration: checked ? this._emphasizedDuration : this._standardDuration,
            fill: 'forwards',
        });

        this._layoutAnimMap.set(item, anim);

        const clearInlineSize = () => {
            item.style.width = '';
            item.style.height = '';
            item.style.willChange = '';
        };

        anim.addEventListener('finish', clearInlineSize, { once: true });
        anim.addEventListener('cancel', clearInlineSize, { once: true });
    }

    private _applySelectedCorners(): void {
        this._items.forEach((item) => {
            const selected = this._readBool(item, 'checked');
            const original = this._visualState.get(item) ?? {
                cornerRadius: this._readNumber(item, 'cornerRadius'),
                radiusTL: this._readNumber(item, 'radiusTL'),
                radiusTR: this._readNumber(item, 'radiusTR'),
                radiusBL: this._readNumber(item, 'radiusBL'),
                radiusBR: this._readNumber(item, 'radiusBR'),
            };

            this._visualState.set(item, original);

            if (!selected) {
                this._restoreCorners(item, original);
                return;
            }

            // Selected: слегка закругляем углы (+8px) в духе MD3
            const fallbackBase = this._estimateBaseRadius(item);
            const resolvedBase = (original.cornerRadius ?? fallbackBase);
            const target = Math.max(8, resolvedBase) + this._selectedCornerBoostPx;

            if (this._hasWritable(item, 'radiusTL') || this._hasWritable(item, 'radiusTR') || this._hasWritable(item, 'radiusBL') || this._hasWritable(item, 'radiusBR')) {
                this._setNum(item, 'radiusTL', target);
                this._setNum(item, 'radiusTR', target);
                this._setNum(item, 'radiusBL', target);
                this._setNum(item, 'radiusBR', target);
            } else if (this._hasWritable(item, 'cornerRadius')) {
                this._setNum(item, 'cornerRadius', target);
            }
        });
    }

    private _restoreCorners(item: GroupItem, original: ItemVisualState): void {
        if (this._hasWritable(item, 'radiusTL') && original.radiusTL !== undefined) this._setNum(item, 'radiusTL', original.radiusTL);
        if (this._hasWritable(item, 'radiusTR') && original.radiusTR !== undefined) this._setNum(item, 'radiusTR', original.radiusTR);
        if (this._hasWritable(item, 'radiusBL') && original.radiusBL !== undefined) this._setNum(item, 'radiusBL', original.radiusBL);
        if (this._hasWritable(item, 'radiusBR') && original.radiusBR !== undefined) this._setNum(item, 'radiusBR', original.radiusBR);
        if (this._hasWritable(item, 'cornerRadius') && original.cornerRadius !== undefined) this._setNum(item, 'cornerRadius', original.cornerRadius);
    }

    private _estimateBaseRadius(item: GroupItem): number {
        const h = item.offsetHeight || Number(item.getAttribute('height')) || 40;
        const isRoundShape = this.shape === 0;
        if (isRoundShape) return Math.floor(h / 2);
        return this.innerRadius;
    }

    private _readAttr(el: HTMLElement, name: string): string {
        return el.getAttribute(name) ?? '';
    }

    private _readProp<T>(el: GroupItem, key: keyof GroupItem | string): T | undefined {
        return (el as unknown as Record<string, unknown>)[String(key)] as T | undefined;
    }

    private _readBool(el: GroupItem, key: keyof GroupItem | string): boolean {
        return Boolean((el as unknown as Record<string, unknown>)[String(key)]);
    }

    private _readNumber(el: GroupItem, key: keyof GroupItem | string): number | undefined {
        const raw = (el as unknown as Record<string, unknown>)[String(key)];
        if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
        return undefined;
    }

    private _hasWritable(el: GroupItem, key: keyof GroupItem | string): boolean {
        const k = String(key);
        return k in (el as unknown as Record<string, unknown>);
    }

    private _setBool(el: GroupItem, key: keyof GroupItem | string, value: boolean): void {
        (el as unknown as Record<string, unknown>)[String(key)] = value;
    }

    private _setNum(el: GroupItem, key: keyof GroupItem | string, value: number): void {
        (el as unknown as Record<string, unknown>)[String(key)] = value;
    }

    private _onSlotChange(): void {
        this.recalculate();
    }

    render() {
        const isConnected = this.groupType === 1;
        const gap = this.gap;
        const gridStyle = this.orientation === 0
            ? `column-gap:${gap}px;row-gap:0;`
            : `row-gap:${gap}px;column-gap:0;`;

        return html`
            <div class="group ${isConnected ? 'connected' : ''}" style="${gridStyle}" role="group">
                <slot @slotchange=${this._onSlotChange}></slot>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-button-group': ButtonGroup;
    }
}
