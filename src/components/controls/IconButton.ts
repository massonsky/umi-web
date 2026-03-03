import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@material/web/ripple/ripple.js';
import iconButtonStyles from '../styles/IconButton.css';

export enum IconButtonType {
    Standard = 0,
    Filled = 1,
    Tonal = 2,
    Outlined = 3
}

export enum IconButtonSize {
    XS = 0, // 32px
    S  = 1, // 36px
    M  = 2, // 40px
    L  = 3, // 48px
    XL = 4  // 56px
}

@customElement('umi-icon-button')
export class IconButton extends LitElement {
    @property({ type: Number }) buttonType: IconButtonType = IconButtonType.Standard;
    @property({ type: Number }) size: IconButtonSize = IconButtonSize.M;

    @property({ type: String }) iconName = '';
    @property({ type: String }) checkedIconName = '';

    /** 0 = Outlined, 1 = Rounded, 2 = Sharp */
    @property({ type: Number }) iconType: number = 0;
    @property({ type: Number }) iconFill: number = 0;
    @property({ type: Number }) iconWght: number = 400;
    @property({ type: Number }) iconGrad: number = 0;

    @property({ type: Boolean }) checkable = false;
    @property({ type: Boolean }) checked = false;

    @state() protected hovered = false;
    @state() protected pressed = false;

    protected getSpecs() {
        const specs = {
            [IconButtonSize.XS]: { s: 32, i: 18 },
            [IconButtonSize.S]:  { s: 36, i: 20 },
            [IconButtonSize.M]:  { s: 40, i: 24 },
            [IconButtonSize.L]:  { s: 48, i: 28 },
            [IconButtonSize.XL]: { s: 56, i: 32 }
        };
        return specs[this.size] || specs[IconButtonSize.M];
    }

    protected getDynamicStyles() {
        const spec = this.getSpecs();

        let bg = 'transparent';
        let color = 'inherit';
        let border = '0px solid transparent';
        let checkedBg = 'var(--md-sys-color-primary, #6200ee)';
        let checkedColor = 'var(--md-sys-color-on-primary, #ffffff)';

        switch (this.buttonType) {
            case IconButtonType.Filled:
                bg = 'var(--md-sys-color-primary, #6200ee)';
                color = 'var(--md-sys-color-on-primary, #ffffff)';
                checkedBg = 'var(--md-sys-color-surface-variant, #e7e0ec)';
                checkedColor = 'var(--md-sys-color-primary, #6200ee)';
                break;
            case IconButtonType.Tonal:
                bg = 'var(--md-sys-color-secondary-container, #e8def8)';
                color = 'var(--md-sys-color-on-secondary-container, #1d192b)';
                checkedBg = 'var(--md-sys-color-secondary, #625b71)';
                checkedColor = 'var(--md-sys-color-on-secondary, #ffffff)';
                break;
            case IconButtonType.Outlined:
                border = '1px solid var(--md-sys-color-outline, #79747e)';
                color = 'var(--md-sys-color-on-surface-variant, #49454f)';
                checkedBg = 'var(--md-sys-color-inverse-surface, #313033)';
                checkedColor = 'var(--md-sys-color-inverse-on-surface, #f4eff4)';
                break;
            case IconButtonType.Standard:
            default:
                color = 'var(--md-sys-color-on-surface-variant, #49454f)';
                checkedBg = 'transparent';
                checkedColor = 'var(--md-sys-color-primary, #6200ee)';
                break;
        }

        const currentBg = (this.checkable && this.checked && this.buttonType !== IconButtonType.Standard) ? checkedBg : bg;
        const currentColor = (this.checkable && this.checked) ? checkedColor : color;
        const fontFamilyMap: Record<number, string> = {
            0: "'Material Symbols Outlined'",
            1: "'Material Symbols Rounded'",
            2: "'Material Symbols Sharp'",
        };

        return `
            --icon-btn-size: ${spec.s}px;
            --icon-size: ${spec.i}px;
            --icon-btn-bg: ${currentBg};
            --icon-btn-color: ${currentColor};
            --icon-btn-border: ${border};
            --icon-font-family: ${fontFamilyMap[this.iconType] ?? "'Material Symbols Outlined'"};
            --icon-fill: ${this.iconFill};
            --icon-wght: ${this.iconWght};
            --icon-grad: ${this.iconGrad};
            --icon-opsz: ${spec.i};
        `;
    }

    static styles = [unsafeCSS(iconButtonStyles)];

    render() {
        const displayIcon = (this.checkable && this.checked && this.checkedIconName)
            ? this.checkedIconName
            : this.iconName;

        return html`
            <div
                class="container ${this.hovered ? 'hovered' : ''} ${this.pressed ? 'pressed' : ''} ${this.checkable && this.checked ? 'checked' : ''}"
                style="${this.getDynamicStyles()}"
                @mouseenter="${() => this.hovered = true}"
                @mouseleave="${() => { this.hovered = false; this.pressed = false; }}"
                @mousedown="${() => this.pressed = true}"
                @mouseup="${() => this.pressed = false}"
                @click="${this._handleClick}">

                <div class="state-layer"></div>
                <md-ripple></md-ripple>

                ${displayIcon ? html`<span class="icon">${displayIcon}</span>` : ''}
            </div>
        `;
    }

    private _handleClick(_e: Event) {
        if (this.checkable) {
            this.checked = !this.checked;
            this.dispatchEvent(new CustomEvent('toggled', { detail: { checked: this.checked } }));
        }
        this.dispatchEvent(new CustomEvent('clicked'));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-icon-button': IconButton;
    }
}
