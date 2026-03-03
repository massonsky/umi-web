import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import radioStyles from '../styles/RadioButton.css';

@customElement('umi-radio-button')
export class RadioButton extends LitElement {
    @property({ type: Boolean }) enabled = true;
    @property({ type: Boolean, reflect: true }) checked = false;
    @property({ type: Boolean }) error = false;

    @property({ type: String }) text = '';

    @property({ type: Boolean, attribute: 'show-background' }) showBackground = false;
    @property({ type: Number, attribute: 'background-type' }) backgroundType = 1; // 0 filled, 1 tonal, 2 outlined

    @property({ type: Number }) size = 1; // 0 S, 1 M, 2 L
    get sizeS() { return 0; }
    get sizeM() { return 1; }
    get sizeL() { return 2; }

    @property({ type: Boolean, attribute: 'enable-living-material' }) enableLivingMaterial = true;
    @property({ type: Number, attribute: 'living-material-scale' }) livingMaterialScale = 1;
    @property({ type: Boolean, attribute: 'interaction-enabled' }) interactionEnabled = true;

    @property({ type: String }) name = '';
    @property({ type: Boolean, attribute: 'auto-exclusive' }) autoExclusive = true;

    @state() private _hovered = false;
    @state() private _pressed = false;

    static styles = unsafeCSS(radioStyles);

    get showText(): boolean {
        return this.text.trim().length > 0;
    }

    private _sizeSpec() {
        switch (this.size) {
            case 0: return { box: 16, dot: 8, state: 36, gap: 6, p: 6, bgP: 8 };
            case 2: return { box: 24, dot: 12, state: 44, gap: 12, p: 8, bgP: 16 };
            case 1:
            default:
                return { box: 20, dot: 10, state: 40, gap: 8, p: 8, bgP: 12 };
        }
    }

    private _palette() {
        const disabled = !this.enabled;

        const onSurface = 'var(--md-sys-color-on-surface, #1d1b20)';
        const onSurfaceVariant = 'var(--md-sys-color-on-surface-variant, #49454f)';
        const primary = 'var(--md-sys-color-primary, #6750a4)';
        const error = 'var(--md-sys-color-error, #b3261e)';

        const boxBorder = disabled
            ? 'color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent)'
            : (this.checked ? (this.error ? error : primary) : (this.error ? error : onSurfaceVariant));

        const dotColor = disabled
            ? 'color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent)'
            : (this.error ? error : primary);

        const stateLayer = this.error ? error : (this.checked ? primary : onSurface);

        let bgContainer = 'transparent';
        let bgBorder = 'transparent';

        if (this.showBackground) {
            if (this.backgroundType === 0) {
                bgContainer = this.checked
                    ? 'var(--md-sys-color-primary-container, #eaddff)'
                    : 'var(--md-sys-color-surface-container-highest, #e6e0e9)';
            } else if (this.backgroundType === 1) {
                bgContainer = this.checked
                    ? 'var(--md-sys-color-secondary-container, #e8def8)'
                    : 'var(--md-sys-color-surface-container-high, #ece6f0)';
            } else {
                bgContainer = 'transparent';
                bgBorder = this.checked
                    ? 'var(--md-sys-color-primary, #6750a4)'
                    : 'var(--md-sys-color-outline-variant, #cac4d0)';
            }
        }

        const textColor = disabled
            ? 'color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent)'
            : (this.error ? error : onSurface);

        return { boxBorder, dotColor, stateLayer, bgContainer, bgBorder, textColor };
    }

    private _scale() {
        if (!this.enableLivingMaterial) return this.livingMaterialScale;
        if (this._pressed) return 0.95;
        if (this._hovered) return 1.02;
        return this.livingMaterialScale;
    }

    private _bgRadius() {
        if (!this.showBackground) return 0;
        const base = 12;
        const step = 4;
        if (this._pressed) return Math.max(4, base - step);
        if (this._hovered) return base + step;
        return base;
    }

    private _enforceExclusive() {
        if (!this.autoExclusive || !this.checked) return;

        const root = this.getRootNode() as Document | ShadowRoot;
        const all = Array.from(root.querySelectorAll('umi-radio-button')) as RadioButton[];

        all.forEach((el) => {
            if (el === this) return;
            if (!el.autoExclusive) return;

            if (this.name) {
                if (el.name === this.name) {
                    el.checked = false;
                }
            } else if (el.parentElement === this.parentElement && !el.name) {
                el.checked = false;
            }
        });
    }

    protected updated(changed: Map<string, unknown>): void {
        if (changed.has('checked') && this.checked) {
            this._enforceExclusive();
        }
    }

    private _select() {
        if (!this.enabled || !this.interactionEnabled) return;

        const prev = this.checked;
        this.checked = true;
        this._enforceExclusive();

        this.dispatchEvent(new CustomEvent('clicked', { bubbles: true, composed: true }));
        if (prev !== this.checked) {
            this.dispatchEvent(new CustomEvent('toggled', {
                detail: { checked: this.checked },
                bubbles: true,
                composed: true,
            }));
        }
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
            this._select();
            e.preventDefault();
        }
    }

    render() {
        const s = this._sizeSpec();
        const p = this._palette();
        const scale = this._scale();

        const bgMinPaddingV = (s.state - s.box) / 2 + 4;
        const bgMinPaddingH = (s.state - s.box) / 2 + 4;

        const rootClasses = [
            'root',
            this.enabled ? 'enabled' : 'disabled',
            this.checked ? 'checked' : 'unchecked',
            this._hovered ? 'hovered' : '',
            this._pressed ? 'pressed' : '',
            this.showBackground ? 'has-bg' : '',
        ].filter(Boolean).join(' ');

        return html`
            <div
                class="${rootClasses}"
                role="radio"
                aria-checked=${this.checked ? 'true' : 'false'}
                aria-disabled=${this.enabled ? 'false' : 'true'}
                tabindex=${this.interactionEnabled ? 0 : -1}
                style="
                    --rb-box:${s.box}px;
                    --rb-dot:${s.dot}px;
                    --rb-state:${s.state}px;
                    --rb-gap:${s.gap}px;
                    --rb-pad-x:${this.showBackground ? Math.max(s.bgP, bgMinPaddingH) : s.p}px;
                    --rb-pad-y:${this.showBackground ? Math.max(s.bgP, bgMinPaddingV) : s.p}px;
                    --rb-min-w:${(this.showBackground ? s.state + Math.max(s.bgP, bgMinPaddingH) * 2 : s.state + s.p * 2) + (this.showText ? s.gap + Math.max(24, this.text.length * 7) : 0)}px;
                    --rb-min-h:${this.showBackground ? Math.max(s.state + Math.max(s.bgP, bgMinPaddingV) * 2, s.state) : s.state}px;
                    --rb-bg-radius:${this._bgRadius()}px;
                    --rb-bg:${p.bgContainer};
                    --rb-bg-border:${p.bgBorder};
                    --rb-bg-border-w:${this.showBackground && this.backgroundType === 2 ? 1 : 0}px;
                    --rb-border:${p.boxBorder};
                    --rb-dot-color:${p.dotColor};
                    --rb-state-layer:${p.stateLayer};
                    --rb-text:${p.textColor};
                    --rb-scale:${scale};
                    --rb-focus:${this.error ? 'var(--md-sys-color-error, #b3261e)' : 'var(--md-sys-color-secondary, #625b71)'};
                "
                @mouseenter=${() => { this._hovered = true; }}
                @mouseleave=${() => { this._hovered = false; this._pressed = false; }}
                @mousedown=${() => { if (this.enabled && this.interactionEnabled) this._pressed = true; }}
                @mouseup=${() => { this._pressed = false; }}
                @click=${() => this._select()}
                @keydown=${this._onKeyDown}
                @keyup=${this._onKeyUp}
                @blur=${() => { this._pressed = false; }}
            >
                <span class="bg-state-layer"></span>

                <span class="content">
                    <span class="radio-area">
                        <span class="state-layer"></span>
                        <span class="ring">
                            <span class="dot ${this.checked ? 'visible' : ''}"></span>
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
        'umi-radio-button': RadioButton;
    }
}
