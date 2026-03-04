import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import switchStyles from '../styles/Switch.css';

@customElement('umi-switch')
export class Switch extends LitElement {
    // Public API (QML parity)
    @property({ type: String }) text = '';
    @property({ type: Boolean }) checked = false;
    @property({ type: Boolean }) enabled = true;
    @property({ type: Boolean }) disabled = false;
    @property({
        attribute: 'interaction',
        converter: {
            fromAttribute: (value: string | null) => {
                if (value === null) return true;
                if (value === 'false' || value === '0') return false;
                return true;
            },
            toAttribute: (value: boolean) => value ? '' : 'false'
        }
    }) interaction = true;
    @property({
        attribute: 'interaction-enabled',
        converter: {
            fromAttribute: (value: string | null) => {
                if (value === null) return true;
                if (value === 'false' || value === '0') return false;
                return true;
            },
            toAttribute: (value: boolean) => value ? '' : 'false'
        }
    }) interactionEnabled = true;

    @property({ type: Boolean, attribute: 'show-on-icon' }) showOnIcon = false;
    @property({ type: Boolean, attribute: 'show-off-icon' }) showOffIcon = false;
    @property({ type: Boolean, attribute: 'show-on-icon-off-icon' }) showOnIconOffIcon = false;

    @property({ type: Number, attribute: 'icon-fill' }) iconFill = 0;
    @property({ type: Number, attribute: 'icon-grad' }) iconGrad = 0;
    @property({ type: Number, attribute: 'icon-wght' }) iconWght = 400;

    @property({ type: Boolean, attribute: 'show-background' }) showBackground = false;
    @property({ type: Number, attribute: 'background-type' }) backgroundType = 1; // 0 filled, 1 tonal, 2 outlined

    @property({ type: Number, attribute: 'inner-layer-width' }) innerLayerWidth = 52;
    @property({ type: Number, attribute: 'inner-layer-height' }) innerLayerHeight = 32;

    // Internal state
    @state() private _hovered = false;
    @state() private _pressed = false;
    @state() private _focused = false;
    @state() private _bounceClass: 'bounce-on' | 'bounce-off' | '' = '';

    private _keyboardMode = false;
    private _bounceTimer: number | null = null;

    static styles = [unsafeCSS(switchStyles)];

    private get _spacing(): number {
        return 16;
    }

    private get _bgPadding(): number {
        return 12;
    }

    private get _stateLayerSize(): number {
        return 40;
    }

    private get _isPressed(): boolean {
        return this._pressed && this._isEnabled;
    }

    private get _isHovered(): boolean {
        return this._hovered && this._isEnabled && !this._isPressed;
    }

    private get _isFocused(): boolean {
        return this._focused && this._isEnabled && !this._isPressed && !this._isHovered;
    }

    private get _isEnabled(): boolean {
        return this.enabled && !this.disabled;
    }

    private _parseBoolAttr(value: string | null): boolean {
        if (value === null) return true;
        const normalized = value.trim().toLowerCase();
        if (normalized === 'false' || normalized === '0') return false;
        return true;
    }

    private _toBoolLike(value: unknown, defaultValue = true): boolean {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (normalized === '' || normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true;
            if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false;
        }
        return Boolean(value);
    }

    private get _isInteractionEnabled(): boolean {
        // Поддерживаем оба варианта:
        // - interaction (основной для совместимости с QML/старыми примерами)
        // - interaction-enabled (алиас)
        // Приоритет: явный атрибут -> явный второй атрибут -> свойства.
        const interactionAlias = this.getAttribute('interaction');
        if (interactionAlias !== null) {
            return this._parseBoolAttr(interactionAlias);
        }

        const interactionEnabledAttr = this.getAttribute('interaction-enabled');
        if (interactionEnabledAttr !== null) {
            return this._parseBoolAttr(interactionEnabledAttr);
        }

        return this._toBoolLike(this.interaction, true) && this._toBoolLike(this.interactionEnabled, true);
    }

    private get _handleWidth(): number {
        // По уточнению: спец-геометрия только в pressed-состоянии
        if (this._isPressed) {
            // OFF: чуть меньше, чтобы не выглядела больше ON визуально
            if (!this.checked) return 26;
            // ON: немного крупнее, с видимым отступом от края
            return 28;
        }

        // Обычное состояние — как было ранее
        if (this.showOffIcon || this.showOnIconOffIcon) return 24;
        return this.checked ? 24 : 16;
    }

    private get _handleHeight(): number {
        return this._handleWidth;
    }

    private get _handleOffset(): number {
        return (this.innerLayerHeight - this._handleHeight) / 2;
    }

    private get _handleX(): number {
        // QML parity:
        // x = checked ? (trackW - handleW - offset - 2) : offset
        const offset = this._handleOffset;
        if (!this.checked) return offset;
        return this.innerLayerWidth - this._handleWidth - offset - 2;
    }

    protected updated(changed: Map<string, unknown>): void {
        if (changed.has('checked')) {
            this._playHandleBounce(this.checked);
        }

        if ((changed.has('enabled') || changed.has('disabled')) && !this._isEnabled) {
            this._hovered = false;
            this._pressed = false;
            this._focused = false;
        }
    }

    disconnectedCallback(): void {
        if (this._bounceTimer !== null) {
            clearTimeout(this._bounceTimer);
            this._bounceTimer = null;
        }
        super.disconnectedCallback();
    }

    private _playHandleBounce(toChecked: boolean): void {
        this._bounceClass = toChecked ? 'bounce-on' : 'bounce-off';

        if (this._bounceTimer !== null) {
            clearTimeout(this._bounceTimer);
            this._bounceTimer = null;
        }

        this._bounceTimer = window.setTimeout(() => {
            this._bounceClass = '';
            this._bounceTimer = null;
        }, 360);
    }

    private _emitToggleEvents(): void {
        this.dispatchEvent(new CustomEvent('clicked', { bubbles: true, composed: true }));
        this.dispatchEvent(new CustomEvent('toggled', {
            detail: { checked: this.checked },
            bubbles: true,
            composed: true
        }));
    }

    private _setChecked(next: boolean): void {
        if (this.checked === next) return;
        this.checked = next;
        this._emitToggleEvents();
    }

    private _toggle(): void {
        if (!this._isEnabled || !this._isInteractionEnabled) return;
        this._setChecked(!this.checked);
    }

    private _onPointerDown = (event: PointerEvent) => {
        if (!this._isEnabled || !this._isInteractionEnabled) return;

        this._pressed = true;
        this._keyboardMode = false;
        this._focused = false;
        (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    };

    private _onPointerUp = () => {
        this._pressed = false;
    };

    private _onKeyDown = (event: KeyboardEvent) => {
        this._keyboardMode = true;
        if (!this._isEnabled || !this._isInteractionEnabled) return;

        if (event.key === ' ' || event.key === 'Enter') {
            this._pressed = true;
            event.preventDefault();
        }
    };

    private _onKeyUp = (event: KeyboardEvent) => {
        this._keyboardMode = true;
        if (!this._isEnabled || !this._isInteractionEnabled) return;

        if (event.key === ' ' || event.key === 'Enter') {
            this._pressed = false;
            this._toggle();
            event.preventDefault();
        }
    };

    private _onRootPointerDown = () => {
        this._keyboardMode = false;
        this._focused = false;
    };

    private _onRootFocus = () => {
        // Аналог focus-visible: показываем фокус только после клавиатурной навигации
        this._focused = this._keyboardMode && this._isEnabled;
    };

    private _onRootBlur = () => {
        this._focused = false;
        this._pressed = false;
    };

    private _onRootClick = () => {
        if (!this._isEnabled || !this._isInteractionEnabled) return;
        this._toggle();
    };

    private _bgContainerColor(): string {
        if (!this.showBackground) return 'transparent';

        switch (this.backgroundType) {
            case 0:
                return this.checked
                    ? 'var(--md-sys-color-primary-container, #eaddff)'
                    : 'var(--md-sys-color-surface-container-highest, #e6e0e9)';
            case 1:
                return this.checked
                    ? 'var(--md-sys-color-secondary-container, #e8def8)'
                    : 'var(--md-sys-color-surface-container-high, #ece6f0)';
            case 2:
                return 'transparent';
            default:
                return 'transparent';
        }
    }

    private _bgBorderColor(): string {
        if (!this.showBackground || this.backgroundType !== 2) return 'transparent';
        return this.checked
            ? 'var(--md-sys-color-primary, #6750a4)'
            : 'var(--md-sys-color-outline-variant, #cac4d0)';
    }

    private _trackColor(): string {
        if (!this.checked) return 'var(--md-sys-color-surface-container-highest, #e6e0e9)';
        if (!this._isEnabled) return 'var(--md-sys-color-on-background, #1d1b20)';
        return 'var(--md-sys-color-primary, #6750a4)';
    }

    private _trackBorderColor(): string {
        if (!this._isEnabled) return 'var(--md-sys-color-on-background, #1d1b20)';
        return 'var(--md-sys-color-outline, #79747e)';
    }

    private _handleColor(): string {
        if (!this._isEnabled) {
            return this.checked
                ? 'var(--md-sys-color-background, #fffbfe)'
                : 'var(--md-sys-color-on-background, #1d1b20)';
        }

        if (this._isPressed || this._isHovered) {
            return this.checked
                ? 'var(--md-sys-color-primary-container, #eaddff)'
                : 'var(--md-sys-color-on-surface-variant, #49454f)';
        }

        if (this._isFocused) {
            return this.checked
                ? 'var(--md-sys-color-outline, #79747e)'
                : 'var(--md-sys-color-primary-container, #eaddff)';
        }

        return this.checked
            ? 'var(--md-sys-color-on-primary, #ffffff)'
            : 'var(--md-sys-color-outline, #79747e)';
    }

    private _stateLayerColor(): string {
        if (this._isPressed || this._isHovered || this._isFocused) {
            return this.checked
                ? 'var(--md-sys-color-primary, #6750a4)'
                : 'var(--md-sys-color-on-surface-variant, #49454f)';
        }
        return 'transparent';
    }

    private _stateLayerOpacity(): number {
        if (this._isPressed || this._isFocused) return 0.12;
        if (this._isHovered) return 0.08;
        return 0;
    }

    private _iconVisible(): boolean {
        if (this.showOnIconOffIcon) return true;
        if (this.showOffIcon) return !this.checked;
        if (this.showOnIcon) return this.checked;
        return false;
    }

    private _iconName(): string {
        if (this.showOnIconOffIcon) return this.checked ? 'check' : 'close';
        if (this.showOffIcon) return 'close';
        if (this.showOnIcon) return 'check';
        return 'check';
    }

    private _iconColor(): string {
        if (!this.checked) return 'var(--md-sys-color-surface-container-highest, #e6e0e9)';
        if (!this._isEnabled) return 'var(--md-sys-color-on-background, #1d1b20)';
        return 'var(--md-sys-color-on-primary-container, #21005d)';
    }

    private _labelColor(): string {
        if (!this._isEnabled) return 'var(--md-sys-color-on-surface-variant, #49454f)';
        return 'var(--md-sys-color-on-surface, #1d1b20)';
    }

    render() {
        const rootStyle = `
            --sw-track-w: ${this.innerLayerWidth}px;
            --sw-track-h: ${this.innerLayerHeight}px;
            --sw-spacing: ${this._spacing}px;
            --sw-bg-padding: ${this._bgPadding}px;
            --sw-state-size: ${this._stateLayerSize}px;
            --sw-track-color: ${this._trackColor()};
            --sw-track-border-color: ${this._trackBorderColor()};
            --sw-track-border-width: ${this.checked ? 0 : 2}px;
            --sw-track-opacity: ${this._isEnabled ? 1 : 0.12};
            --sw-handle-w: ${this._handleWidth}px;
            --sw-handle-h: ${this._handleHeight}px;
            --sw-handle-x: ${this._handleX}px;
            --sw-handle-color: ${this._handleColor()};
            --sw-handle-opacity: ${(this._isEnabled || this.checked) ? 1 : 0.38};
            --sw-state-layer-color: ${this._stateLayerColor()};
            --sw-state-layer-opacity: ${this._stateLayerOpacity()};
            --sw-focus-ring-visible: ${this._isFocused ? 1 : 0};
            --sw-bg-color: ${this._bgContainerColor()};
            --sw-bg-border-color: ${this._bgBorderColor()};
            --sw-bg-border-width: ${(this.showBackground && this.backgroundType === 2) ? 1 : 0}px;
            --sw-icon-color: ${this._iconColor()};
            --sw-icon-opacity: ${this._isEnabled ? 1 : 0.38};
            --sw-label-color: ${this._labelColor()};
            --sw-label-opacity: ${this._isEnabled ? 1 : 0.38};
            --sw-icon-fill: ${this.iconFill};
            --sw-icon-grad: ${this.iconGrad};
            --sw-icon-wght: ${this.iconWght};
        `;

        const rootClasses = [
            'root',
            this._isEnabled ? 'enabled' : 'disabled',
            this._isInteractionEnabled ? 'interaction-enabled' : 'interaction-disabled',
            this._bounceClass,
            this.showBackground ? 'with-background' : ''
        ].filter(Boolean).join(' ');

        return html`
            <div
                class="${rootClasses}"
                style="${rootStyle}"
                role="switch"
                aria-checked=${this.checked ? 'true' : 'false'}
                aria-disabled=${this._isEnabled ? 'false' : 'true'}
                tabindex=${this._isInteractionEnabled && this._isEnabled ? 0 : -1}
                @focus=${this._onRootFocus}
                @blur=${this._onRootBlur}
                @pointerdown=${this._onRootPointerDown}
                @click=${this._onRootClick}
                @mouseenter=${() => { if (this._isEnabled) this._hovered = true; }}
                @mouseleave=${() => { this._hovered = false; this._pressed = false; }}
                @keydown=${this._onKeyDown}
                @keyup=${this._onKeyUp}
            >
                ${this.showBackground ? html`
                    <div class="background-container">
                        <div class="background-state-layer"></div>
                    </div>
                ` : null}

                <div class="content-container">
                    <div class="indicator" @pointerdown=${this._onPointerDown} @pointerup=${this._onPointerUp} @pointercancel=${this._onPointerUp}>
                        <div class="focus-indicator"></div>
                        <div class="track"></div>

                        ${!this.showBackground ? html`<div class="state-layer"></div>` : null}

                        <div class="handle">
                            ${this._iconVisible() ? html`
                                <span class="handle-icon">${this._iconName()}</span>
                            ` : null}
                        </div>
                    </div>

                    ${this.text ? html`<span class="label">${this.text}</span>` : null}
                </div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-switch': Switch;
    }
}
