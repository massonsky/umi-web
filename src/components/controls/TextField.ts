import { LitElement, html, unsafeCSS, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import textFieldStyles from '../styles/TextField.css';

/**
 * Material Design 3 TextField Component - Expressive Style with Living Material
 *
 * MD3 Specifications (Expressive 2025):
 * - Container height: 56dp
 * - Icon size: 24dp
 * - Corner radius: 4dp (top) for filled, full outline for outlined
 * - Typography: Body Large (16sp), Label Small (12sp) for floating label
 * - State layers: hover (0.08), focus (0.10), pressed (0.10)
 * - Active indicator: 1dp enabled, 2dp focused
 *
 * Living Material Features:
 * - Smooth label floating animation with bounce
 * - State layer breathing effect
 * - Container morphing on focus
 * - Caret pulse animation
 */

export type EchoMode = 'normal' | 'password' | 'no-echo';
export type ValidationType = 'none' | 'email' | 'phone' | 'url' | 'number' | 'custom';

@customElement('umi-text-field')
export class TextField extends LitElement {
    // =========================================================
    // MD3 EXPRESSIVE ANIMATION TIMING
    // =========================================================
    private readonly emphasizedDuration = 500;
    private readonly standardDuration = 150;
    private readonly quickDuration = 150;

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
    // PUBLIC API PROPERTIES
    // =========================================================
    @property({ type: String }) value = '';
    @property({ type: String, attribute: 'placeholder-text' }) placeholderText = '';
    @property({ type: String, attribute: 'label-text' }) labelText = '';
    @property({ type: String, attribute: 'supporting-text' }) supportingText = '';
    @property({ type: String, attribute: 'error-text' }) errorText = '';
    @property({ type: String }) prefix = '';
    @property({ type: String }) suffix = '';

    // Icons
    @property({ type: String, attribute: 'leading-icon-name' }) leadingIconName = '';
    @property({ type: String, attribute: 'trailing-icon-name' }) trailingIconName = '';
    @property({ type: Number, attribute: 'icon-fill' }) iconFill = 0.0;
    @property({ type: Number, attribute: 'icon-grad' }) iconGrad = 0;
    @property({ type: Number, attribute: 'icon-wght' }) iconWght = 400;

    // Input settings
    @property({ type: String }) type: 'text' | 'email' | 'tel' | 'url' | 'number' | 'search' = 'text';
    @property({ type: Boolean }) disabled = false;
    @property({ type: Boolean, attribute: 'read-only' }) readonly = false;
    @property({ type: Number, attribute: 'max-length' }) maxLength = -1;
    @property({ type: String }) pattern = '';
    @property({ type: String }) autocomplete = 'off';

    // Password mode
    @property({ type: Boolean }) password = false;

    // Clear button
    @property({ type: Boolean, attribute: 'clear-button-visible' }) clearButtonVisible = false;

    // Search mode (leading icon)
    @property({ type: Boolean, attribute: 'show-search-icon' }) showSearchIcon = false;

    // Appearance
    @property({
        converter: {
            fromAttribute: (value: string | null) => {
                if (value === null) return true;
                if (value === 'false' || value === '0') return false;
                return true;
            },
            toAttribute: (value: boolean) => value ? '' : null
        }
    }) filled = true;
    @property({ type: Boolean, attribute: 'has-error' }) hasError = false;
    @property({ type: Boolean, attribute: 'show-character-counter' }) showCharacterCounter = false;

    // Leading icon customization
    @property({ type: String, attribute: 'leading-icon-tooltip-text' }) leadingIconTooltipText = '';
    @property({ type: Boolean, attribute: 'leading-icon-enabled' }) leadingIconEnabled = true;

    // Trailing icon customization
    @property({ type: String, attribute: 'trailing-icon-tooltip-text' }) trailingIconTooltipText = '';
    @property({ type: Boolean, attribute: 'trailing-icon-enabled' }) trailingIconEnabled = true;

    // Validation
    @property({ type: String, attribute: 'validation-type' }) validationType: ValidationType = 'none';
    @property({ type: Boolean }) required = false;
    @property({ type: Number, attribute: 'min-length' }) minLength = -1;
    @property({ type: String, attribute: 'custom-pattern' }) customPattern = '';
    @property({ type: String, attribute: 'custom-error-text' }) customErrorText = '';
    @property({ type: Boolean, attribute: 'validate-on-change' }) validateOnChange = true;
    @property({ type: Boolean, attribute: 'validate-on-blur' }) validateOnBlur = true;

    // =========================================================
    // INTERNAL STATE
    // =========================================================
    @state() private isFocused = false;
    @state() private isHovered = false;
    @state() private _passwordVisible = false;
    @state() private _isValid = true;
    @state() private _validationError = '';
    @state() private _notchWidth = 0;

    private _notchAnimationId: number | null = null;
    private _resizeObserver: ResizeObserver | null = null;

    // =========================================================
    // COMPUTED PROPERTIES
    // =========================================================
    private get containerHeight(): number {
        return this._baseContainerHeight;
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
        return !this.disabled;
    }

    private get isPopulated(): boolean {
        return this.value.length > 0 || this.isFocused;
    }

    private get hasLeadingIcon(): boolean {
        return this.leadingIconName !== '' || this.showSearchIcon;
    }

    private get hasTrailingIcon(): boolean {
        return this.trailingIconName !== '' || this.clearButtonVisible || this.password;
    }

    private get _effectiveLeadingIconName(): string {
        if (this.leadingIconName !== '') return this.leadingIconName;
        if (this.showSearchIcon) return 'search';
        return '';
    }

    private get _effectiveTrailingIconName(): string {
        if (this.password) return this._passwordVisible ? 'visibility_off' : 'visibility';
        if (this.clearButtonVisible && this.value.length > 0) return 'close';
        if (this.trailingIconName !== '') return this.trailingIconName;
        return '';
    }

    private get _showClearButton(): boolean {
        return this.clearButtonVisible && this.value.length > 0 && !this.password;
    }

    private get _inputType(): string {
        if (this.password && !this._passwordVisible) return 'password';
        return this.type;
    }

    // =========================================================
    // QUERIES
    // =========================================================
    @query('input') private inputElement!: HTMLInputElement;
    @query('.outline-canvas') private outlineCanvas?: HTMLCanvasElement;
    @query('.label') private labelElement?: HTMLDivElement;

    static styles = [unsafeCSS(textFieldStyles)];

    // =========================================================
    // LIFECYCLE
    // =========================================================
    connectedCallback(): void {
        super.connectedCallback();
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
    }

    protected updated(changedProperties: PropertyValues): void {
        super.updated(changedProperties);

        if (this.filled) {
            return;
        }

        const prevValue = changedProperties.get('value') as string | undefined;
        const prevFocused = changedProperties.get('isFocused') as boolean | undefined;
        const prevFilled = changedProperties.get('filled') as boolean | undefined;
        const prevPopulated = (prevValue ?? this.value).length > 0 || (prevFocused ?? this.isFocused);
        const populatedChanged = prevPopulated !== this.isPopulated || prevFilled === true;

        if (
            changedProperties.has('value') ||
            changedProperties.has('isFocused') ||
            changedProperties.has('hasError') ||
            changedProperties.has('disabled') ||
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
    // VALIDATION
    // =========================================================
    public validate(): boolean {
        if (this.validationType === 'none' && !this.required && this.minLength < 0) {
            this._isValid = true;
            this._validationError = '';
            return true;
        }

        let isValid = true;
        let errorMessage = '';

        // Required check
        if (this.required && this.value.trim() === '') {
            isValid = false;
            errorMessage = 'Это поле обязательно';
        }

        // Min length check
        if (isValid && this.minLength > 0 && this.value.length < this.minLength) {
            isValid = false;
            errorMessage = `Минимум ${this.minLength} символов`;
        }

        // Max length check
        if (isValid && this.maxLength > 0 && this.value.length > this.maxLength) {
            isValid = false;
            errorMessage = `Максимум ${this.maxLength} символов`;
        }

        // Type-specific validation
        if (isValid && this.value.length > 0) {
            switch (this.validationType) {
                case 'email':
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(this.value)) {
                        isValid = false;
                        errorMessage = 'Некорректный email';
                    }
                    break;
                case 'phone':
                    const phoneRegex = /^[\d\s\-+()]{7,}$/;
                    if (!phoneRegex.test(this.value)) {
                        isValid = false;
                        errorMessage = 'Некорректный номер телефона';
                    }
                    break;
                case 'url':
                    // Allow URLs with or without protocol
                    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
                    if (!urlRegex.test(this.value)) {
                        isValid = false;
                        errorMessage = 'Некорректный URL';
                    }
                    break;
                case 'number':
                    if (isNaN(Number(this.value))) {
                        isValid = false;
                        errorMessage = 'Введите число';
                    }
                    break;
                case 'custom':
                    if (this.customPattern) {
                        const regex = new RegExp(this.customPattern);
                        if (!regex.test(this.value)) {
                            isValid = false;
                            errorMessage = this.customErrorText || 'Некорректный формат';
                        }
                    }
                    break;
            }
        }

        this._isValid = isValid;
        this._validationError = errorMessage;
        this.hasError = !isValid;

        if (!isValid && errorMessage) {
            this.errorText = errorMessage;
        }

        this.dispatchEvent(new CustomEvent('validation-changed', {
            detail: { isValid, errorMessage }
        }));

        return isValid;
    }

    public clearValidation(): void {
        this._isValid = true;
        this._validationError = '';
        this.hasError = false;
        this.errorText = '';
        this.dispatchEvent(new CustomEvent('validation-changed', {
            detail: { isValid: true, errorMessage: '' }
        }));
    }

    // =========================================================
    // PUBLIC FUNCTIONS
    // =========================================================
    public clear(): void {
        this.value = '';
        if (this.inputElement) {
            this.inputElement.value = '';
        }
        this.clearValidation();
        this.dispatchEvent(new CustomEvent('input', { detail: { value: '' } }));
    }

    public togglePasswordVisibility(): void {
        if (this.password) {
            this._passwordVisible = !this._passwordVisible;
        }
    }

    public selectAll(): void {
        if (this.inputElement) {
            this.inputElement.select();
        }
    }

    public focus(): void {
        if (this.inputElement) {
            this.inputElement.focus();
        }
    }

    public blur(): void {
        if (this.inputElement) {
            this.inputElement.blur();
        }
    }

    // =========================================================
    // PRIVATE HANDLERS
    // =========================================================
    private _handleInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.value = input.value;

        if (this.validateOnChange && this.validationType !== 'none') {
            this.validate();
        }

        this.dispatchEvent(new CustomEvent('input', { detail: { value: this.value } }));
    }

    private _handleFocus(): void {
        this.isFocused = true;
        if (this.hasError) {
            this.clearValidation();
        }
        this.dispatchEvent(new CustomEvent('focus-changed', { detail: { focused: true } }));
    }

    private _handleBlur(): void {
        this.isFocused = false;
        if (this.validateOnBlur) {
            this.validate();
        }
        this.dispatchEvent(new CustomEvent('focus-changed', { detail: { focused: false } }));
        this.dispatchEvent(new CustomEvent('editing-finished'));
    }

    private _handleKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.validate();
            this.dispatchEvent(new CustomEvent('accepted'));
        }
        if (event.key === 'Escape') {
            this.blur();
        }
    }

    private _handleContainerMouseEnter(): void {
        if (this.isEnabled) {
            this.isHovered = true;
        }
    }

    private _handleContainerMouseLeave(): void {
        this.isHovered = false;
    }

    private _handleContainerClick(): void {
        if (this.isEnabled) {
            this.focus();
        }
    }

    private _handleLeadingIconClick(event: MouseEvent): void {
        event.stopPropagation();
        if (!this.isEnabled || !this.leadingIconEnabled) return;
        this.dispatchEvent(new CustomEvent('leading-icon-clicked'));
    }

    private _handleTrailingIconClick(event: MouseEvent): void {
        event.stopPropagation();
        if (!this.isEnabled) return;

        // Handle password toggle
        if (this.password) {
            this._passwordVisible = !this._passwordVisible;
            return;
        }

        // Handle clear button
        if (this._showClearButton) {
            this.clear();
            this.focus();
            return;
        }

        // Custom trailing icon click
        this.dispatchEvent(new CustomEvent('trailing-icon-clicked'));
    }

    private _getOutlineColor(): string {
        const computedStyle = getComputedStyle(this);

        if (this.hasError) {
            return computedStyle.getPropertyValue('--md-sys-color-error').trim() || '#b3261e';
        }

        if (this.isFocused) {
            return computedStyle.getPropertyValue('--md-sys-color-primary').trim() || '#6750a4';
        }

        if (!this.isEnabled) {
            const onSurface = computedStyle.getPropertyValue('--md-sys-color-on-surface').trim() || '#1d1b20';
            return onSurface;
        }

        return computedStyle.getPropertyValue('--md-sys-color-outline').trim() || '#79747e';
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
        if (!this.isEnabled && !this.hasError && !this.isFocused) {
            ctx.globalAlpha = 0.38;
        } else {
            ctx.globalAlpha = 1;
        }

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
            --field-h: ${this.containerHeight}px;
            --field-icon-sz: ${this.iconSize}px;
            --field-radius: ${this.cornerRadius}px;
            --field-pad-x: ${this.horizontalPadding}px;
            --field-icon-pad: ${this.iconPadding}px;
            --field-indicator-h: ${this.activeIndicatorHeight}px;
            --field-supporting-top: ${this.supportingTextTopMargin}px;
            --field-input-left: ${inputLeftPadding}px;
            --field-input-right: ${inputRightPadding}px;
            --field-label-x: ${this.hasLeadingIcon ? inputLeftPadding : this.horizontalPadding}px;
            --field-icon-fill: ${this.iconFill};
            --field-icon-wght: ${this.iconWght};
            --field-icon-grad: ${this.iconGrad};
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
            this.filled ? 'filled' : 'outlined',
            this.isPopulated ? 'populated' : ''
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

        const _trailingIconTooltip = this.password
            ? (this._passwordVisible ? 'Скрыть пароль' : 'Показать пароль')
            : (this._showClearButton ? 'Очистить' : this.trailingIconTooltipText);

        return html`
            <div class="${rootClasses}" style="${this._getDynamicStyles()}">
                <!-- Transform Container -->
                <div class="transform-container"
                    @click="${this._handleContainerClick}"
                    @mouseenter="${this._handleContainerMouseEnter}"
                    @mouseleave="${this._handleContainerMouseLeave}">

                    <!-- Main Container -->
                    <div class="${containerClasses}">

                        <!-- State Layer (filled variant) -->
                        ${this.filled ? html`<div class="state-layer filled"></div>` : ''}

                        <!-- Canvas outline (outlined variant) -->
                        ${!this.filled ? html`
                            <div class="outline-container">
                                <canvas class="outline-canvas"></canvas>
                            </div>
                        ` : ''}

                        <!-- Active Indicator (filled variant, bottom line) -->
                        ${this.filled ? html`<div class="active-indicator"></div>` : ''}
                    </div>

                    <!-- Leading Icon -->
                    ${this.hasLeadingIcon && this._effectiveLeadingIconName ? html`
                        <div
                            class="leading-icon"
                            @click="${this._handleLeadingIconClick}"
                            title="${this.leadingIconTooltipText}">
                            <span class="icon-text">${this._effectiveLeadingIconName}</span>
                        </div>
                    ` : ''}

                    <!-- Label -->
                    ${this.labelText ? html`
                        <div class="${labelClasses}">${this.labelText}</div>
                    ` : ''}

                    <!-- Input Area -->
                    <div class="${inputAreaClasses}">
                        <div class="input-row">
                            ${this.prefix && (this.value || this.isFocused) ? html`
                                <span class="prefix-text">${this.prefix}</span>
                            ` : ''}
                            <input
                                type="${this._inputType}"
                                .value="${this.value}"
                                placeholder="${this.labelText ? '' : this.placeholderText}"
                                ?readonly="${this.readonly}"
                                ?disabled="${!this.isEnabled}"
                                maxlength="${this.maxLength > 0 ? this.maxLength : ''}"
                                pattern="${this.pattern}"
                                autocomplete="${this.autocomplete}"
                                @input="${this._handleInput}"
                                @focus="${this._handleFocus}"
                                @blur="${this._handleBlur}"
                                @keydown="${this._handleKeyDown}"
                            />
                            ${this.suffix && (this.value || this.isFocused) ? html`
                                <span class="suffix-text">${this.suffix}</span>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Trailing Icon -->
                    ${this.hasTrailingIcon && this._effectiveTrailingIconName ? html`
                        <div
                            class="trailing-icon"
                            @click="${this._handleTrailingIconClick}"
                            title="${_trailingIconTooltip}">
                            <span class="icon-text">${this._effectiveTrailingIconName}</span>
                        </div>
                    ` : ''}
                </div>

                <!-- Supporting Text Row -->
                ${this.supportingText || this.showCharacterCounter || (this.hasError && this.errorText) ? html`
                    <div class="supporting-row">
                        <span class="supporting-text">
                            ${this.hasError && this.errorText ? this.errorText : this.supportingText}
                        </span>
                        ${this.showCharacterCounter && this.maxLength > 0 ? html`
                            <span class="character-counter">${this.value.length}/${this.maxLength}</span>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-text-field': TextField;
    }
}
