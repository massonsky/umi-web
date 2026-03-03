import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import checkboxStyles from '../styles/Checkbox.css';

const UNCHECKED = 0;
const PARTIALLY_CHECKED = 1;
const CHECKED = 2;

@customElement('umi-checkbox')
export class Checkbox extends LitElement {
    @property({ type: Boolean }) enabled = true;
    @property({ type: Boolean }) checked = false;
    @property({ type: Number, attribute: 'check-state' }) checkState = UNCHECKED;
    @property({ type: Boolean }) tristate = false;
    @property({ type: Boolean }) error = false;

    @property({ type: String }) text = '';

    @property({ type: String, attribute: 'check-icon-name' }) checkIconName = 'check';
    @property({ type: String, attribute: 'indeterminate-icon-name' }) indeterminateIconName = 'remove';
    @property({ type: Number, attribute: 'icon-fill' }) iconFill = 0;
    @property({ type: Number, attribute: 'icon-grad' }) iconGrad = 0;
    @property({ type: Number, attribute: 'icon-wght' }) iconWght = 400;

    @property({ type: Boolean, attribute: 'show-background' }) showBackground = false;
    @property({ type: Number, attribute: 'background-type' }) backgroundType = 1; // 0 filled, 1 tonal, 2 outlined

    @property({ type: Number }) size = 1; // 0 S, 1 M, 2 L
    @property({ type: Boolean, attribute: 'enable-living-material' }) enableLivingMaterial = true;
    @property({ type: Number, attribute: 'living-material-scale' }) livingMaterialScale = 1;
    @property({ type: Boolean, attribute: 'interaction-enabled' }) interactionEnabled = true;

    @state() private _hovered = false;
    @state() private _pressed = false;

    static styles = unsafeCSS(checkboxStyles);

    get showText(): boolean {
        return this.text.trim().length > 0;
    }

    get isIndeterminate(): boolean {
        return this.checkState === PARTIALLY_CHECKED;
    }

    get isCheckedOrIndeterminate(): boolean {
        return this.checked || this.isIndeterminate;
    }

    updated(changed: Map<string, unknown>): void {
        if (changed.has('checkState')) {
            if (this.checkState === CHECKED) this.checked = true;
            else if (this.checkState === UNCHECKED) this.checked = false;
        }

        if (changed.has('checked')) {
            if (!this.tristate || this.checkState !== PARTIALLY_CHECKED) {
                this.checkState = this.checked ? CHECKED : UNCHECKED;
            }
        }
    }

    private _sizeSpec() {
        // MD3 specs for checkbox:
        // container = 18dp, icon = 18dp, state-layer = 40dp, target = 48dp
        // size оставлен в API для обратной совместимости, но не влияет на размеры.
        return { box: 18, icon: 18, state: 40, target: 48, gap: 8, p: 4, bgP: 8 };
    }

    private _dynamicScale(): number {
        // По требованию: контейнер чекбокса всегда статичен по размеру
        // и не меняется ни при hover, ни при press, ни при focus.
        return 1;
    }

    private _palette() {
        const isSelected = this.isCheckedOrIndeterminate;
        const disabled = !this.enabled;

        const onSurface = 'var(--md-sys-color-on-surface, #1d1b20)';
        const onSurfaceVariant = 'var(--md-sys-color-on-surface-variant, #49454f)';
        const primary = 'var(--md-sys-color-primary, #6750a4)';
        const onPrimary = 'var(--md-sys-color-on-primary, #ffffff)';
        const error = 'var(--md-sys-color-error, #b3261e)';
        const onError = 'var(--md-sys-color-on-error, #ffffff)';

        let boxBg = 'transparent';
        let boxBorder = onSurfaceVariant;
        let outlineWidth = 2;
        let outlineActive = this.error ? error : onSurface;
        let iconColor = onPrimary;

        if (disabled) {
            boxBg = isSelected ? 'color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent)' : 'transparent';
            boxBorder = isSelected ? 'transparent' : 'color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent)';
            outlineWidth = isSelected ? 0 : 2;
            outlineActive = boxBorder;
            iconColor = 'var(--md-sys-color-surface, #fef7ff)';
        } else if (isSelected) {
            boxBg = this.error ? error : primary;
            boxBorder = 'transparent';
            outlineWidth = 0;
            iconColor = this.error ? onError : onPrimary;
        } else {
            boxBg = 'transparent';
            boxBorder = this.error ? error : onSurfaceVariant;
            outlineWidth = 2;
            outlineActive = this.error ? error : onSurface;
        }

        let bgContainer = 'transparent';
        let bgBorder = 'transparent';

        if (this.showBackground) {
            if (this.backgroundType === 0) {
                bgContainer = isSelected
                    ? 'var(--md-sys-color-primary-container, #eaddff)'
                    : 'var(--md-sys-color-surface-container-highest, #e6e0e9)';
            } else if (this.backgroundType === 1) {
                bgContainer = isSelected
                    ? 'var(--md-sys-color-secondary-container, #e8def8)'
                    : 'var(--md-sys-color-surface-container-high, #ece6f0)';
            } else {
                bgContainer = 'transparent';
                bgBorder = isSelected
                    ? 'var(--md-sys-color-primary, #6750a4)'
                    : 'var(--md-sys-color-outline-variant, #cac4d0)';
            }
        }

        const stateLayer = this.error ? error : (isSelected ? primary : onSurface);
        const textColor = disabled
            ? 'color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent)'
            : (this.error ? error : onSurface);

        return { boxBg, boxBorder, outlineWidth, outlineActive, iconColor, stateLayer, bgContainer, bgBorder, textColor };
    }

    private _toggle(): void {
        if (!this.enabled || !this.interactionEnabled) return;

        if (this.tristate) {
            if (this.checkState === UNCHECKED) this.checkState = CHECKED;
            else if (this.checkState === CHECKED) this.checkState = PARTIALLY_CHECKED;
            else this.checkState = UNCHECKED;
        } else {
            this.checked = !this.checked;
            this.checkState = this.checked ? CHECKED : UNCHECKED;
        }

        this.dispatchEvent(new CustomEvent('clicked', { bubbles: true, composed: true }));
        this.dispatchEvent(new CustomEvent('toggled', {
            detail: { checked: this.checked, checkState: this.checkState },
            bubbles: true,
            composed: true,
        }));
    }

    private _onKeyDown(e: KeyboardEvent): void {
        if (!this.enabled || !this.interactionEnabled) return;
        if (e.key === ' ' || e.key === 'Enter') {
            this._pressed = true;
            e.preventDefault();
        }
    }

    private _onKeyUp(e: KeyboardEvent): void {
        if (!this.enabled || !this.interactionEnabled) return;
        if (e.key === ' ' || e.key === 'Enter') {
            this._pressed = false;
            this._toggle();
            e.preventDefault();
        }
    }

    render() {
        const s = this._sizeSpec();
        const p = this._palette();
        const selectedIcon = this.isIndeterminate ? this.indeterminateIconName : this.checkIconName;

        const bgMinPaddingV = (s.target - s.state) / 2;
        const bgMinPaddingH = (s.target - s.state) / 2;

        const rootClasses = [
            'root',
            this.enabled ? 'enabled' : 'disabled',
            this.isCheckedOrIndeterminate ? 'selected' : 'unselected',
            this._hovered ? 'hovered' : '',
            this._pressed ? 'pressed' : '',
            this.showBackground ? 'has-bg' : '',
        ].filter(Boolean).join(' ');

        return html`
            <div
                class="${rootClasses}"
                role="checkbox"
                aria-checked=${this.isIndeterminate ? 'mixed' : (this.checked ? 'true' : 'false')}
                aria-disabled=${this.enabled ? 'false' : 'true'}
                tabindex=${this.interactionEnabled ? 0 : -1}
                style="
                    --cb-box:${s.box}px;
                    --cb-icon:${s.icon}px;
                    --icon-fill:${this.iconFill};
                    --icon-wght:${this.iconWght};
                    --icon-grad:${this.iconGrad};
                    --icon-opsz:${s.icon};
                    --cb-state-size:${s.state}px;
                    --cb-gap:${s.gap}px;
                    --cb-pad-x:${this.showBackground ? Math.max(s.bgP, bgMinPaddingH) : s.p}px;
                    --cb-pad-y:${this.showBackground ? Math.max(s.bgP, bgMinPaddingV) : s.p}px;
                    --cb-min-w:${s.target + (this.showText ? s.gap + Math.max(24, this.text.length * 7) : 0) + (this.showBackground ? Math.max(s.bgP, bgMinPaddingH) * 2 : s.p * 2)}px;
                    --cb-min-h:${this.showBackground ? Math.max(s.target + Math.max(s.bgP, bgMinPaddingV) * 2, s.target) : s.target}px;
                    --cb-box-scale:${this._dynamicScale()};
                    --cb-bg-radius:${this.showBackground ? (this._pressed ? 8 : (this._hovered ? 16 : 12)) : 12}px;
                    --cb-bg-container:${p.bgContainer};
                    --cb-bg-border:${p.bgBorder};
                    --cb-bg-border-w:${this.showBackground && this.backgroundType === 2 ? 1 : 0}px;
                    --cb-box-bg:${p.boxBg};
                    --cb-outline:${p.boxBorder};
                    --cb-outline-active:${p.outlineActive};
                    --cb-outline-w:${p.outlineWidth}px;
                    --cb-icon-color:${p.iconColor};
                    --cb-state-layer:${p.stateLayer};
                    --cb-focus:${this.error ? 'var(--md-sys-color-error, #b3261e)' : 'var(--md-sys-color-secondary, #625b71)'};
                    --cb-text:${p.textColor};
                "
                @mouseenter=${() => { this._hovered = true; }}
                @mouseleave=${() => { this._hovered = false; this._pressed = false; }}
                @mousedown=${() => { if (this.enabled && this.interactionEnabled) this._pressed = true; }}
                @mouseup=${() => { this._pressed = false; }}
                @click=${() => this._toggle()}
                @keydown=${this._onKeyDown}
                @keyup=${this._onKeyUp}
                @blur=${() => { this._pressed = false; }}
            >
                <span class="bg-state-layer"></span>

                <span class="content">
                    <span class="checkbox-area">
                        <span class="state-layer"></span>
                        <span class="box">
                            <span class="outline"></span>
                            <span class="background"></span>
                            <span class="icon ${this.isCheckedOrIndeterminate ? 'visible' : ''}">${selectedIcon}</span>
                        </span>
                        <span class="focus-ring"></span>
                    </span>

                    ${this.showText ? html`<span class="label">${this.text}</span>` : null}
                </span>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-checkbox': Checkbox;
    }
}
