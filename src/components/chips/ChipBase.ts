import { LitElement, html, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import chipsStyles from '../styles/Chips.css';

export class ChipBase extends LitElement {
    @property({ type: Boolean }) enabled = true;
    @property({ type: String }) text = '';
    @property({ type: String }) icon = '';
    @property({ type: Number, attribute: 'icon-fill' }) iconFill = 0;
    @property({ type: Number, attribute: 'icon-grad' }) iconGrad = 0;
    @property({ type: Number, attribute: 'icon-wght' }) iconWght = 400;

    @property({ type: Boolean, reflect: true }) selected = false;
    @property({ type: Boolean, reflect: true }) checked = false;
    @property({ type: Boolean }) elevated = false;
    @property({ type: Boolean }) hasRemoveButton = false;
    @property({ type: Boolean }) outlined = true;

    @property({ type: String, attribute: 'avatar-source' }) avatarSource = '';
    @property({ type: String, attribute: 'avatar-color' }) avatarColor = 'var(--md-sys-color-primary, #6750a4)';

    @property({ type: String, attribute: 'container-color' }) containerColor = 'transparent';
    @property({ type: String, attribute: 'container-color-selected' }) containerColorSelected = 'var(--md-sys-color-secondary-container, #e8def8)';
    @property({ type: String, attribute: 'content-color' }) contentColor = 'var(--md-sys-color-on-surface-variant, #49454f)';
    @property({ type: String, attribute: 'content-color-selected' }) contentColorSelected = 'var(--md-sys-color-on-secondary-container, #1d192b)';
    @property({ type: String, attribute: 'outline-color' }) outlineColor = 'var(--md-sys-color-outline, #79747e)';

    @property({ type: Boolean, attribute: 'expressive-motion' }) expressiveMotion = true;
    @property({ type: Number, attribute: 'living-material-scale' }) livingMaterialScale = 1;

    @state() protected _hovered = false;
    @state() protected _pressed = false;
    @state() protected _dragged = false;
    @state() protected _focused = false;
    @state() protected _clickBump = false;

    static styles = unsafeCSS(chipsStyles);

    protected get _isEnabled() {
        return this.enabled;
    }

    protected get _currentFg() {
        return this.selected ? this.contentColorSelected : this.contentColor;
    }

    protected get _currentBg() {
        return this.selected ? this.containerColorSelected : this.containerColor;
    }

    protected get _stateOpacity() {
        if (!this._isEnabled) return 0;
        if (this._dragged) return 0.16;
        if (this._pressed) return 0.10;
        if (this._focused) return 0.10;
        if (this._hovered) return 0.08;
        return 0;
    }

    protected get _baseRadius() {
        return 8;
    }

    protected get _dynamicRadius() {
        const base = this._baseRadius;
        if (this._pressed) return 4;
        if (this._hovered) return 12;
        if (this.selected) return 10;
        return base;
    }

    protected get _dynamicScale() {
        if (!this.expressiveMotion) return 1;
        if (this._pressed) return 0.96;
        return 1;
    }

    protected get _leftPad() {
        if (this.avatarSource) return 4;
        if (this.effectiveIcon) return 8;
        return 16;
    }

    protected get _rightPad() {
        return this.hasRemoveButton ? 8 : this._leftPad;
    }

    protected get effectiveIcon(): string {
        return this.icon;
    }

    protected get additionalRootClasses(): string {
        return '';
    }

    protected updated(changed: Map<string, unknown>): void {
        if (changed.has('checked') && this.checked !== this.selected) {
            this.selected = this.checked;
        }
        if (changed.has('selected') && this.selected !== this.checked) {
            this.checked = this.selected;
        }
    }

    protected handleMainClick() {
        if (this.expressiveMotion) {
            this._clickBump = true;
            window.setTimeout(() => {
                this._clickBump = false;
            }, 220);
        }
        this.dispatchEvent(new CustomEvent('clicked', { bubbles: true, composed: true }));
    }

    protected handleRemoveClick(e: Event) {
        e.stopPropagation();
        if (!this._isEnabled) return;
        this.dispatchEvent(new CustomEvent('removeClicked', { bubbles: true, composed: true }));
    }

    protected onKeyDown(e: KeyboardEvent) {
        if (!this._isEnabled) return;
        if (e.key === ' ' || e.key === 'Enter') {
            this._pressed = true;
            e.preventDefault();
        }
    }

    protected onKeyUp(e: KeyboardEvent) {
        if (!this._isEnabled) return;
        if (e.key === ' ' || e.key === 'Enter') {
            this._pressed = false;
            this.handleMainClick();
            e.preventDefault();
        }
    }

    render() {
        const classes = [
            'root',
            this._isEnabled ? 'enabled' : 'disabled',
            this.selected ? 'selected' : 'unselected',
            this.elevated ? 'elevated' : '',
            this._hovered ? 'hovered' : '',
            this._pressed ? 'pressed' : '',
            this.additionalRootClasses,
            this._focused ? 'focused' : '',
            this._clickBump ? 'click-bump' : '',
        ].filter(Boolean).join(' ');

        return html`
            <div
                class="${classes}"
                role="button"
                tabindex=${this._isEnabled ? 0 : -1}
                aria-disabled=${this._isEnabled ? 'false' : 'true'}
                aria-pressed=${this.selected ? 'true' : 'false'}
                style="
                    --chip-bg:${this._currentBg};
                    --chip-fg:${this._currentFg};
                    --chip-outline:${this.outlineColor};
                    --chip-outline-w:${this.outlined && !this.selected ? 1 : 0}px;
                    --chip-radius:${this._dynamicRadius}px;
                    --chip-scale:${this._dynamicScale};
                    --chip-lm-scale:${this.livingMaterialScale};
                    --chip-pad-left:${this._leftPad}px;
                    --chip-pad-right:${this._rightPad}px;
                    --chip-state-op:${this._stateOpacity};
                    --chip-avatar-bg:${this.avatarColor};
                    --chip-icon-fill:${this.iconFill};
                    --chip-icon-grad:${this.iconGrad};
                    --chip-icon-wght:${this.iconWght};
                "
                @mouseenter=${() => { this._hovered = true; }}
                @mouseleave=${() => { this._hovered = false; this._pressed = false; }}
                @mousedown=${() => { if (this._isEnabled) this._pressed = true; }}
                @mouseup=${() => { this._pressed = false; }}
                @focusin=${() => { this._focused = true; }}
                @focusout=${() => { this._focused = false; this._pressed = false; }}
                @click=${() => { if (this._isEnabled) this.handleMainClick(); }}
                @keydown=${this.onKeyDown}
                @keyup=${this.onKeyUp}
            >
                <span class="state-layer"></span>
                <span class="focus-ring"></span>

                <span class="content">
                    ${this.avatarSource ? html`<span class="avatar">${this.avatarSource}</span>` : null}
                    ${this.effectiveIcon && !this.avatarSource ? html`<span class="icon">${this.effectiveIcon}</span>` : null}
                    <span class="label">${this.text}</span>
                    ${this.hasRemoveButton ? html`<span class="remove" @click=${this.handleRemoveClick}>close</span>` : null}
                </span>
            </div>
        `;
    }
}
