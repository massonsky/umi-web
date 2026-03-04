import { LitElement, html, unsafeCSS, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import comboStyles from '../styles/ComboBox.css';

/**
 * Material Design 3 ComboBox Component - Expressive Style with Living Material
 *
 * MD3 Specifications (Expressive 2025):
 * - Container height: 56dp
 * - Icon size: 24dp
 * - Corner radius: 4dp (top) for filled, 0dp for outlined
 * - Typography: Body Large (16sp), Label Small (12sp) for floating label
 * - State layers: hover (0.08), focus (0.10), pressed (0.10)
 *
 * Living Material Features:
 * - Scale transform with spring animation on interaction
 * - Smooth dropdown arrow rotation with bounce
 * - State layer breathing effect
 * - Container morphing on focus
 */

export interface ComboBoxItem {
    text?: string;
    name?: string;
    title?: string;
    value?: unknown;
    code?: unknown;
    id?: unknown;
    [key: string]: unknown;
}

export interface OptionWithSelection {
    text: string;
    value: unknown;
    selected: boolean;
    originalItem: ComboBoxItem | string;
}

@customElement('umi-combo-box')
export class ComboBox extends LitElement {
    // =========================================================
    // MD3 EXPRESSIVE ANIMATION TIMING
    // =========================================================
    private readonly emphasizedDuration = 500;     // Dramatic effects (OutElastic/OutBack)
    private readonly standardDuration = 150;       // Standard transitions (OutQuint)
    private readonly quickDuration = 150;          // Quick feedback (OutQuad)

    // =========================================================
    // SIZE & SPACING (MD3 specs)
    // =========================================================
    private readonly _baseContainerHeight = 56;
    private readonly _baseIconSize = 24;
    private readonly _baseCornerRadius = 4;
    private readonly _baseHorizontalPadding = 16;
    private readonly _baseIconPadding = 12;
    private readonly _baseActiveIndicatorHeight = 2;
    private readonly _baseSupportingTextTopMargin = 4;

    // =========================================================
    // USER SCALING PROPERTIES
    // =========================================================
    @property({ type: Number, attribute: 'custom-width' }) customWidth = -1;
    @property({ type: Number, attribute: 'custom-height' }) customHeight = -1;
    @property({ type: Number, attribute: 'scale-ratio' }) scaleRatio = 1.0;

    // =========================================================
    // PUBLIC API PROPERTIES
    // =========================================================
    @property({ type: Array }) model: (ComboBoxItem | string)[] = [];
    @property({ type: String, attribute: 'text-role' }) textRole = '';
    @property({ type: String, attribute: 'value-role' }) valueRole = '';
    @property({ type: String, attribute: 'label-text' }) labelText = '';
    @property({ type: String, attribute: 'supporting-text' }) supportingText = '';
    @property({ type: String }) prefix = '';
    @property({ type: String }) suffix = '';
    @property({ type: String, attribute: 'error-text' }) errorText = '';

    @property({ type: String, attribute: 'trailing-icon-name' }) trailingIconName = 'arrow_drop_down';
    @property({ type: String, attribute: 'leading-icon-name' }) leadingIconName = 'search';
    @property({ type: Boolean, attribute: 'has-leading-icon' }) hasLeadingIcon = false;
    @property({ type: Boolean, attribute: 'has-trailing-icon' }) hasTrailingIcon = true;
    @property({ type: Number, attribute: 'icon-fill' }) iconFill = 0.0;
    @property({ type: Number, attribute: 'icon-grad' }) iconGrad = 0;
    @property({ type: Number, attribute: 'icon-wght' }) iconWght = 400;

    @property({ type: Boolean }) filled = true;
    @property({ type: Boolean, attribute: 'has-error' }) hasError = false;
    @property({ type: Number, attribute: 'scale-font' }) scaleFont = 1.0;
    @property({ type: Boolean, attribute: 'auto-select-first-element' }) autoSelectFirstElement = false;

    // Leading icon customization
    @property({ type: Boolean, attribute: 'enable-leading-icon-custom-click' }) enableLeadingIconCustomClick = false;
    @property({ type: String, attribute: 'leading-icon-tooltip-text' }) leadingIconTooltipText = 'Поиск';
    @property({ type: Boolean, attribute: 'leading-icon-enabled' }) leadingIconEnabled = true;

    // =========================================================
    // INTERNAL STATE
    // =========================================================
    @state() private isFocused = false;
    @state() private isHovered = false;
    @state() private _isPressed = false;
    @state() private _isOpen = false;
    @state() private currentIndex = -1;
    @state() private currentText = '';
    @state() private optionsWithSelection: OptionWithSelection[] = [];
    @state() private _notchWidth = 0;

    private _notchAnimationId: number | null = null;
    private _resizeObserver: ResizeObserver | null = null;

    // =========================================================
    // COMPUTED PROPERTIES
    // =========================================================
    private get containerHeight(): number {
        return this.customHeight > 0
            ? this.customHeight
            : Math.max(40, this._baseContainerHeight);
    }

    private get _containerScale(): number {
        return Math.max(0.75, this.containerHeight / this._baseContainerHeight);
    }

    private get iconSize(): number {
        return Math.max(16, this._baseIconSize * this._containerScale);
    }

    private get cornerRadius(): number {
        return Math.min(this.containerHeight / 2, Math.max(2, this._baseCornerRadius * this._containerScale));
    }

    private get horizontalPadding(): number {
        return Math.max(8, this._baseHorizontalPadding * this._containerScale);
    }

    private get iconPadding(): number {
        return Math.max(6, this._baseIconPadding * this._containerScale);
    }

    private get activeIndicatorHeight(): number {
        return Math.max(1, this._baseActiveIndicatorHeight * this._containerScale);
    }

    private get supportingTextTopMargin(): number {
        return Math.max(1, this._baseSupportingTextTopMargin * this._containerScale);
    }

    private get isEnabled(): boolean {
        return !(this as any).disabled;
    }

    private get isPopulated(): boolean {
        return this.currentText.length > 0 || this.isFocused;
    }

    // =========================================================
    // QUERIES
    // =========================================================
    @query('.combo-popup') private popupElement!: HTMLDivElement;
    @query('.outline-canvas') private outlineCanvas?: HTMLCanvasElement;
    @query('.label') private labelElement?: HTMLDivElement;

    static styles = [unsafeCSS(comboStyles)];

    // =========================================================
    // LIFECYCLE
    // =========================================================
    connectedCallback(): void {
        super.connectedCallback();
        if (this.autoSelectFirstElement) {
            this.selectFirstElement();
        }
        this._handleOutsideClick = this._handleOutsideClick.bind(this);
        document.addEventListener('click', this._handleOutsideClick);
        document.addEventListener('keydown', this._handleKeyDown.bind(this));
    }

    disconnectedCallback(): void {
        if (this._notchAnimationId !== null) {
            cancelAnimationFrame(this._notchAnimationId);
            this._notchAnimationId = null;
        }
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        super.disconnectedCallback();
        document.removeEventListener('click', this._handleOutsideClick);
    }

    protected updated(changedProperties: PropertyValues): void {
        super.updated(changedProperties);

        if (changedProperties.has('model') && this.autoSelectFirstElement) {
            this.selectFirstElement();
        }

        if (this.filled) {
            return;
        }

        const prevCurrentText = changedProperties.get('currentText') as string | undefined;
        const prevFocused = changedProperties.get('isFocused') as boolean | undefined;
        const prevFilled = changedProperties.get('filled') as boolean | undefined;
        const prevPopulated = (prevCurrentText ?? this.currentText).length > 0 || (prevFocused ?? this.isFocused);
        const populatedChanged = prevPopulated !== this.isPopulated || prevFilled === true;

        if (
            changedProperties.has('currentText') ||
            changedProperties.has('isFocused') ||
            changedProperties.has('hasError') ||
            changedProperties.has('labelText') ||
            changedProperties.has('filled')
        ) {
            this._updateOutlineCanvas(populatedChanged);
        }
    }

    protected firstUpdated(): void {
        this._resizeObserver = new ResizeObserver(() => {
            if (!this.filled) {
                this._updateOutlineCanvas(false);
            }
        });

        this._resizeObserver.observe(this);
        this._updateOutlineCanvas(false);
    }

    // =========================================================
    // PUBLIC FUNCTIONS
    // =========================================================
    public clearFocus(): void {
        this.isFocused = false;
        this.dispatchEvent(new CustomEvent('combo-focus-changed', { detail: { focus: false } }));
        this.dispatchEvent(new CustomEvent('reset-focus'));
    }

    public setElement(index: number): void {
        if (!this.model) return;

        const itemCount = this.model.length;

        if (index >= 0 && index < itemCount) {
            const item = this.model[index];
            this.currentIndex = index;
            this.currentText = this.getItemText(item, index);
        } else {
            this.currentIndex = -1;
            this.currentText = '';
        }
    }

    public selectFirstElement(): void {
        this.setElement(0);
    }

    public getItemText(item: ComboBoxItem | string, _index: number): string {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
            if (this.textRole !== '' && item[this.textRole] !== undefined) return String(item[this.textRole]);
            if (item.text !== undefined) return String(item.text);
            if (item.name !== undefined) return String(item.name);
            if (item.title !== undefined) return String(item.title);
        }
        return String(item);
    }

    public getItemValue(item: ComboBoxItem | string, _index: number): unknown {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
            if (this.valueRole !== '' && item[this.valueRole] !== undefined) return item[this.valueRole];
            if (item.value !== undefined) return item.value;
            if (item.code !== undefined) return item.code;
            if (item.id !== undefined) return item.id;
        }
        return item;
    }

    public createOptionsWithSelection(): OptionWithSelection[] {
        if (!this.model) return [];

        const result: OptionWithSelection[] = [];
        const itemCount = this.model.length;

        for (let i = 0; i < itemCount; i++) {
            const item = this.model[i];
            result.push({
                text: this.getItemText(item, i),
                value: this.getItemValue(item, i),
                selected: i === this.currentIndex,
                originalItem: item
            });
        }
        return result;
    }

    public getCurrentSelectedItem(): {
        index: number;
        originalItem: ComboBoxItem | string;
        text: string;
        value: unknown;
        modelType: string;
        totalItems: number;
    } | null {
        if (this.currentIndex < 0 || !this.model) return null;

        const itemCount = this.model.length;

        if (this.currentIndex >= itemCount) return null;

        const item = this.model[this.currentIndex];

        return {
            index: this.currentIndex,
            originalItem: item,
            text: this.getItemText(item, this.currentIndex),
            value: this.getItemValue(item, this.currentIndex),
            modelType: 'Array',
            totalItems: itemCount
        };
    }

    public hasSelectedItem(): boolean {
        const itemCount = this.model ? this.model.length : 0;
        return this.currentIndex >= 0 && this.currentIndex < itemCount;
    }

    public getItemByIndex(index: number): {
        index: number;
        originalItem: ComboBoxItem | string;
        text: string;
        value: unknown;
    } | null {
        if (index < 0 || !this.model) return null;

        const itemCount = this.model.length;

        if (index >= itemCount) return null;

        const item = this.model[index];

        return {
            index: index,
            originalItem: item,
            text: this.getItemText(item, index),
            value: this.getItemValue(item, index)
        };
    }

    // Leading icon control functions
    public setLeadingIconEnabled(enabled: boolean): void {
        this.leadingIconEnabled = enabled;
    }

    public setLeadingIconSource(source: string): void {
        this.leadingIconName = source;
    }

    public setLeadingIconTooltip(tooltip: string): void {
        this.leadingIconTooltipText = tooltip;
    }

    public enableCustomLeadingIconClick(enable: boolean): void {
        this.enableLeadingIconCustomClick = enable;
    }

    public toggleLeadingIcon(): void {
        this.hasLeadingIcon = !this.hasLeadingIcon;
    }

    public simulateLeadingIconClick(): void {
        if (this.hasLeadingIcon && this.leadingIconEnabled && this.isEnabled) {
            this.dispatchEvent(new CustomEvent('leading-icon-clicked'));
            if (!this.enableLeadingIconCustomClick) {
                this.dispatchEvent(new CustomEvent('search-clicked'));
            }
        }
    }

    // =========================================================
    // PRIVATE HANDLERS
    // =========================================================
    private _handleOutsideClick(event: MouseEvent): void {
        if (!this._isOpen) return;
        const path = event.composedPath();
        if (!path.includes(this)) {
            this._closePopup();
        }
    }

    private _handleKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Escape' && this._isOpen) {
            this._closePopup();
            event.preventDefault();
        }
    }

    private _handleContainerClick(): void {
        if (!this.isEnabled) return;
        this.isFocused = true;
        this.dispatchEvent(new CustomEvent('combo-focus-changed', { detail: { focus: true } }));
        this._isOpen = true;
        this.optionsWithSelection = this.createOptionsWithSelection();
        this.requestUpdate();
    }

    private _handleContainerMouseEnter(): void {
        if (this.isEnabled) {
            this.isHovered = true;
        }
    }

    private _handleContainerMouseLeave(): void {
        if (!this._isPressed) {
            this.isHovered = false;
        }
    }

    private _handleContainerMouseDown(): void {
        if (this.isEnabled) {
            this._isPressed = true;
        }
    }

    private _handleContainerMouseUp(): void {
        this._isPressed = false;
    }

    private _handleTrailingIconClick(event: MouseEvent): void {
        event.stopPropagation();
        if (!this.isEnabled) return;

        if (this._isOpen) {
            this._closePopup();
        } else {
            this._isOpen = true;
            this.optionsWithSelection = this.createOptionsWithSelection();
            this.requestUpdate();
        }
    }

    private _handleLeadingIconClick(event: MouseEvent): void {
        event.stopPropagation();
        if (!this.isEnabled || !this.leadingIconEnabled) return;

        this.dispatchEvent(new CustomEvent('leading-icon-clicked'));
        if (!this.enableLeadingIconCustomClick) {
            this.dispatchEvent(new CustomEvent('search-clicked'));
        }
    }

    private _handleOptionClick(index: number, text: string, _item: ComboBoxItem | string): void {
        this.currentIndex = index;
        const item = this.model[index];
        this.currentText = this.getItemText(item, index);

        this.dispatchEvent(new CustomEvent('option-selected', {
            detail: { index, text: this.getItemText(item, index) }
        }));
        this.dispatchEvent(new CustomEvent('item-selected', {
            detail: { index, item }
        }));

        this._closePopup();
    }

    private _closePopup(): void {
        if (this.popupElement) {
            this.popupElement.classList.add('closing');
            setTimeout(() => {
                this._isOpen = false;
                this.clearFocus();
                this.requestUpdate();
            }, this.quickDuration);
        } else {
            this._isOpen = false;
            this.clearFocus();
        }
    }

    private _getOutlineColor(): string {
        const computedStyle = getComputedStyle(this);

        if (this.hasError) {
            return computedStyle.getPropertyValue('--md-sys-color-error').trim() || '#b3261e';
        }

        if (this.isFocused) {
            return computedStyle.getPropertyValue('--md-sys-color-primary').trim() || '#6750a4';
        }

        return computedStyle.getPropertyValue('--combo-outline-color').trim() ||
            computedStyle.getPropertyValue('--md-sys-color-outline').trim() || '#79747e';
    }

    private _getNotchTargetWidth(): number {
        if (this.filled || !this.labelText || !this.isPopulated || !this.labelElement) {
            return 0;
        }

        return Math.max(0, this.labelElement.offsetWidth + 8);
    }

    private _drawOutline(): void {
        if (this.filled || !this.outlineCanvas) return;

        const canvas = this.outlineCanvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const width = rect.width;
        const height = rect.height;
        const borderWidth = this.isFocused ? 2 : 1;
        const r = this.cornerRadius;
        const halfStroke = borderWidth / 2;

        let labelCenterX = width / 2;
        if (this.labelElement) {
            const labelRect = this.labelElement.getBoundingClientRect();
            labelCenterX = (labelRect.left - rect.left) + (labelRect.width / 2);
        }

        labelCenterX = Math.max(r + 8, Math.min(width - r - 8, labelCenterX));

        const gapWidth = Math.max(0, Math.min(this._notchWidth, width - (r + 8) * 2));
        const gapStart = Math.max(r + halfStroke, labelCenterX - gapWidth / 2);
        const gapEnd = Math.min(width - r - halfStroke, labelCenterX + gapWidth / 2);

        const color = this._getOutlineColor();

        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = color;
        ctx.lineWidth = borderWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = this.isEnabled ? 1 : 0.38;

        // Top line split around notch
        ctx.beginPath();
        ctx.moveTo(r + halfStroke, halfStroke);
        ctx.lineTo(gapStart, halfStroke);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(gapEnd, halfStroke);
        ctx.lineTo(width - r - halfStroke, halfStroke);
        ctx.stroke();

        // Top-left corner
        ctx.beginPath();
        ctx.arc(r + halfStroke, r + halfStroke, r, Math.PI, Math.PI * 1.5);
        ctx.stroke();

        // Top-right corner
        ctx.beginPath();
        ctx.arc(width - r - halfStroke, r + halfStroke, r, Math.PI * 1.5, Math.PI * 2);
        ctx.stroke();

        // Left edge
        ctx.beginPath();
        ctx.moveTo(halfStroke, r + halfStroke);
        ctx.lineTo(halfStroke, height - r - halfStroke);
        ctx.stroke();

        // Right edge
        ctx.beginPath();
        ctx.moveTo(width - halfStroke, r + halfStroke);
        ctx.lineTo(width - halfStroke, height - r - halfStroke);
        ctx.stroke();

        // Bottom line
        ctx.beginPath();
        ctx.moveTo(r + halfStroke, height - halfStroke);
        ctx.lineTo(width - r - halfStroke, height - halfStroke);
        ctx.stroke();

        // Bottom-left corner
        ctx.beginPath();
        ctx.arc(r + halfStroke, height - r - halfStroke, r, Math.PI * 0.5, Math.PI);
        ctx.stroke();

        // Bottom-right corner
        ctx.beginPath();
        ctx.arc(width - r - halfStroke, height - r - halfStroke, r, 0, Math.PI * 0.5);
        ctx.stroke();
    }

    private _animateNotch(targetWidth: number): void {
        if (this._notchAnimationId !== null) {
            cancelAnimationFrame(this._notchAnimationId);
            this._notchAnimationId = null;
        }

        const startWidth = this._notchWidth;
        const delta = targetWidth - startWidth;

        if (Math.abs(delta) < 0.5) {
            this._notchWidth = targetWidth;
            this._drawOutline();
            return;
        }

        const duration = this.standardDuration;
        const start = performance.now();

        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            this._notchWidth = startWidth + delta * eased;
            this._drawOutline();

            if (t < 1) {
                this._notchAnimationId = requestAnimationFrame(tick);
            } else {
                this._notchWidth = targetWidth;
                this._notchAnimationId = null;
                this._drawOutline();
            }
        };

        this._notchAnimationId = requestAnimationFrame(tick);
    }

    private _updateOutlineCanvas(animate: boolean): void {
        if (this.filled || !this.outlineCanvas) return;

        const targetWidth = this._getNotchTargetWidth();
        if (animate) {
            this._animateNotch(targetWidth);
        } else {
            this._notchWidth = targetWidth;
            this._drawOutline();
        }
    }

    // =========================================================
    // DYNAMIC STYLES
    // =========================================================
    private _getDynamicStyles(): string {
        const inputLeftPadding = this.hasLeadingIcon
            ? this.horizontalPadding + this.iconSize + this.iconPadding
            : this.horizontalPadding;
        const inputRightPadding = this.hasTrailingIcon
            ? this.horizontalPadding + this.iconSize + this.iconPadding
            : this.horizontalPadding;

        return `
            --combo-h: ${this.containerHeight}px;
            --combo-icon-sz: ${this.iconSize}px;
            --combo-radius: ${this.cornerRadius}px;
            --combo-pad-x: ${this.horizontalPadding}px;
            --combo-icon-pad: ${this.iconPadding}px;
            --combo-indicator-h: ${this.activeIndicatorHeight}px;
            --combo-supporting-top: ${this.supportingTextTopMargin}px;
            --combo-input-left: ${inputLeftPadding}px;
            --combo-input-right: ${inputRightPadding}px;
            --combo-label-x: ${this.hasLeadingIcon ? inputLeftPadding : this.horizontalPadding}px;
            --combo-width: ${this.customWidth > 0 ? `${this.customWidth}px` : '300px'};
            --combo-icon-fill: ${this.iconFill};
            --combo-icon-wght: ${this.iconWght};
            --combo-icon-grad: ${this.iconGrad};
        `;
    }

    // =========================================================
    // RENDER
    // =========================================================
    render() {
        const rootClasses = [
            'root',
            this.isHovered ? 'hovered' : '',
            this.isFocused ? 'focused' : '',
            !this.isEnabled ? 'disabled' : '',
            this.hasError ? 'has-error' : ''
        ].filter(Boolean).join(' ');

        const containerClasses = [
            'container',
            this.filled ? 'filled' : 'outlined'
        ].filter(Boolean).join(' ');

        const labelClasses = [
            'label',
            this.isPopulated ? 'populated' : '',
            this.filled ? 'filled' : 'outlined'
        ].filter(Boolean).join(' ');

        const inputAreaClasses = [
            'input-area',
            this.labelText ? 'has-label' : '',
            this.isPopulated ? 'populated' : '',
            this.filled ? 'filled' : ''
        ].filter(Boolean).join(' ');

        return html`
            <div class="${rootClasses}" style="${this._getDynamicStyles()}">
                <!-- Transform Container -->
                <div class="transform-container"
                    @click="${this._handleContainerClick}"
                    @mouseenter="${this._handleContainerMouseEnter}"
                    @mouseleave="${this._handleContainerMouseLeave}"
                    @mousedown="${this._handleContainerMouseDown}"
                    @mouseup="${this._handleContainerMouseUp}">
                    <!-- Main Container -->
                    <div class="${containerClasses}">

                        <!-- State Layer (filled variant) -->
                        ${this.filled ? html`<div class="state-layer filled"></div>` : ''}

                        <!-- Outline (outlined variant) -->
                        ${!this.filled ? html`
                            <div class="outline-container">
                                <canvas class="outline-canvas"></canvas>
                            </div>
                        ` : ''}

                        <!-- Active Indicator (filled variant, bottom line) -->
                        ${this.filled ? html`<div class="active-indicator"></div>` : ''}
                    </div>

                    <!-- Leading Icon -->
                    ${this.hasLeadingIcon && this.leadingIconName ? html`
                        <div
                            class="leading-icon"
                            @click="${this._handleLeadingIconClick}"
                            title="${this.leadingIconTooltipText}">
                            <span class="icon-text">${this.leadingIconName}</span>
                        </div>
                    ` : ''}

                    <!-- Label -->
                    ${this.labelText ? html`
                        <div class="${labelClasses}">${this.labelText}</div>
                    ` : ''}

                    <!-- Input Area (selected text display) -->
                    <div class="${inputAreaClasses}">
                        <div class="input-row">
                            ${this.prefix && this.currentText ? html`
                                <span class="prefix-text">${this.prefix}</span>
                            ` : ''}
                            ${this.currentText ? html`
                                <span class="selected-text">${this.currentText}</span>
                            ` : html`<span class="selected-text"></span>`}
                            ${this.suffix && this.currentText ? html`
                                <span class="suffix-text">${this.suffix}</span>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Trailing Icon (dropdown arrow) -->
                    ${this.hasTrailingIcon && this.trailingIconName ? html`
                        <div
                            class="trailing-icon ${this._isOpen ? 'open' : ''}"
                            @click="${this._handleTrailingIconClick}"
                            title="${this._isOpen ? 'Закрыть список' : 'Открыть список'}">
                            <span class="icon-text">${this.trailingIconName}</span>
                        </div>
                    ` : ''}
                </div>

                <!-- Supporting Text -->
                ${this.supportingText ? html`
                    <div class="supporting-text">${this.supportingText}</div>
                ` : ''}

                <!-- Popup -->
                ${this._isOpen ? html`
                    <div class="combo-popup ${this._isOpen ? 'open' : ''}">
                        ${this.optionsWithSelection.length === 0 ? html`
                            <div class="popup-empty">Нет доступных опций</div>
                        ` : html`
                            ${this.optionsWithSelection.map((option, index) => html`
                                <div
                                    class="option-item ${option.selected ? 'selected' : ''}"
                                    @click="${() => this._handleOptionClick(index, option.text, option.originalItem)}"
                                    @mousedown="${(e: MouseEvent) => (e.currentTarget as HTMLElement).classList.add('pressed')}"
                                    @mouseup="${(e: MouseEvent) => (e.currentTarget as HTMLElement).classList.remove('pressed')}"
                                    @mouseleave="${(e: MouseEvent) => (e.currentTarget as HTMLElement).classList.remove('pressed')}">
                                    <span class="option-text">${option.text}</span>
                                    <span class="option-check ${option.selected ? 'visible' : ''}">check</span>
                                </div>
                            `)}
                        `}
                    </div>
                ` : ''}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-combo-box': ComboBox;
    }
}
