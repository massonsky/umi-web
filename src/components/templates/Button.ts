import { LitElement, html, unsafeCSS } from 'lit';
import buttonStyles from '../styles/Button.css';
import { property, state } from 'lit/decorators.js';
import '@material/web/ripple/ripple.js';

export enum ButtonType {
    Filled = 0,
    Tonal = 1,
    Elevated = 2,
    Outlined = 3,
    Text = 4
}

export enum ButtonSize {
    XS = 0,
    S = 1,
    M = 2,
    L = 3,
    XL = 4
}

export enum IconType {
    Outlined = 0,
    Rounded = 1,
    Sharp = 2
}

/**
 * Button — Базовый класс кнопки Umi.
 * Обеспечивает API размеров, групп, иконок и морфинг-анимацию радиусов.
 */
export class Button extends LitElement {
    @property({ type: Number, attribute: 'button-type' }) buttonType: ButtonType = ButtonType.Filled;
    @property({ type: Number }) size: ButtonSize = ButtonSize.M;

    @property({ type: String }) text: string = '';
    @property({ type: String, attribute: 'icon-name' }) iconName: string = '';
    @property({ type: Number, attribute: 'icon-fill' }) iconFill: number = 0.0;
    @property({ type: Number, attribute: 'icon-grad' }) iconGrad: number = 0;
    @property({ type: Number, attribute: 'icon-wght' }) iconWght: number = 400;
    @property({ type: Number, attribute: 'icon-type' }) iconType: IconType = IconType.Outlined;

    @property({ type: Boolean, attribute: 'center-text' }) centerText: boolean = false;

    // Group Button API
    @property({ type: Number, attribute: 'group-orientation' }) groupOrientation: number = 0; // 0: Horiz, 1: Vert
    @property({ type: Boolean }) checked: boolean = false;
    @property({ type: Boolean }) checkable: boolean = false;
    @property({ type: Boolean, attribute: 'is-single-item' }) isSingleItem: boolean = true;
    @property({ type: Boolean, attribute: 'is-first-item' }) isFirstItem: boolean = false;
    @property({ type: Boolean, attribute: 'is-last-item' }) isLastItem: boolean = false;
    @property({ type: Boolean, attribute: 'round-first-item' }) roundFirstItem: boolean = true;
    @property({ type: Boolean, attribute: 'round-last-item' }) roundLastItem: boolean = true;

    // Custom Radius API (-1 = auto)
    @property({ type: Number, attribute: 'radius-tl' }) radiusTL: number = -1;
    @property({ type: Number, attribute: 'radius-tr' }) radiusTR: number = -1;
    @property({ type: Number, attribute: 'radius-bl' }) radiusBL: number = -1;
    @property({ type: Number, attribute: 'radius-br' }) radiusBR: number = -1;
    @property({ type: Number, attribute: 'corner-radius' }) cornerRadius: number = -1;

    @property({ type: Boolean, attribute: 'accept-double-click' }) acceptDoubleClick: boolean = true;
    @property({ type: Boolean, attribute: 'enable-custom-hover' }) enableCustomHover: boolean = false;

    // Internal state
    @state() protected hovered: boolean = false;
    @state() protected pressed: boolean = false;

    // Allows subclasses to redefine or extend sizing rules easily
    protected sizeSpecs: Record<number, { h: number; w: number; fs: number; i: number; p: number }> = {
        [ButtonSize.XS]: { h: 32, w: 64,  fs: 11, i: 16, p: 16 },
        [ButtonSize.S]:  { h: 36, w: 72,  fs: 12, i: 20, p: 20 },
        [ButtonSize.M]:  { h: 40, w: 80,  fs: 14, i: 20, p: 24 },
        [ButtonSize.L]:  { h: 48, w: 96,  fs: 16, i: 18, p: 28 },
        [ButtonSize.XL]: { h: 56, w: 112, fs: 18, i: 18, p: 32 }
    };

    protected getSpecs() {
        return this.sizeSpecs[this.size] || this.sizeSpecs[ButtonSize.M];
    }

    static styles = [unsafeCSS(buttonStyles)];

    protected getDynamicStyles() {
        const specs = this.getSpecs();

        const iconFontFamilyMap: Record<number, string> = {
            [IconType.Outlined]: "'Material Symbols Outlined'",
            [IconType.Rounded]:  "'Material Symbols Rounded'",
            [IconType.Sharp]:    "'Material Symbols Sharp'",
        };
        const iconFontFamily = iconFontFamilyMap[this.iconType] ?? "'Material Symbols Outlined'";

        const baseRadius = this.cornerRadius >= 0 ? this.cornerRadius : specs.h / 2;
        const maxRadius = specs.h / 2;
        const minRadius = 2;
        const step = 8;

        const delta = this.pressed ? -step : (this.hovered ? step : 0);
        const dynamicRadius = Math.max(minRadius, Math.min(baseRadius + delta, maxRadius));

        const calcCorner = (override: number, isRoundedClass: boolean) => {
            if (override >= 0) return Math.max(minRadius, Math.min(override + delta, maxRadius));
            if (this.cornerRadius >= 0) return dynamicRadius;
            if (this.isSingleItem) return dynamicRadius;
            return isRoundedClass ? dynamicRadius : 0;
        };

        const isHoriz = this.groupOrientation === 0;
        const tl = calcCorner(this.radiusTL, this.isFirstItem && this.roundFirstItem);
        const br = calcCorner(this.radiusBR, this.isLastItem && this.roundLastItem);
        let tr, bl;
        if (isHoriz) {
            tr = calcCorner(this.radiusTR, this.isLastItem && this.roundLastItem);
            bl = calcCorner(this.radiusBL, this.isFirstItem && this.roundFirstItem);
        } else {
            tr = calcCorner(this.radiusTR, this.isFirstItem && this.roundFirstItem);
            bl = calcCorner(this.radiusBL, this.isLastItem && this.roundLastItem);
        }

        const shadowOffset = this.pressed ? 1 : (this.hovered ? 2 : 1);

        return `
            --btn-height: ${specs.h}px;
            --btn-min-width: ${specs.w}px;
            --btn-pad: ${specs.p}px;
            --btn-font-size: ${specs.fs}px;
            --btn-icon-size: ${specs.i}px;
            --btn-radius: ${tl}px ${tr}px ${br}px ${bl}px;
            --icon-fill: ${this.iconFill};
            --icon-wght: ${this.iconWght};
            --icon-grad: ${this.iconGrad};
            --btn-shadow-offset: ${shadowOffset}px;
            --icon-font-family: ${iconFontFamily};
            --icon-opsz: ${specs.i};
        `;
    }

    render() {
        return html`
            <div
                class="container ${this.hovered ? 'hovered' : ''} ${this.pressed ? 'pressed' : ''} ${this.checkable && this.checked ? 'checked' : ''}"
                style="${this.getDynamicStyles()}"
                @mouseenter="${() => this.hovered = true}"
                @mouseleave="${() => { this.hovered = false; this.pressed = false; }}"
                @mousedown="${() => this.pressed = true}"
                @mouseup="${() => this.pressed = false}"
                @click="${this._handleClick}">

                <md-ripple></md-ripple>

                <div class="content">
                    ${this.iconName ? html`<span class="icon">${this.iconName}</span>` : ''}
                    ${this.text ? html`<span class="label" style="${this.centerText ? 'position:absolute;left:50%;transform:translateX(-50%)' : ''}">${this.text}</span>` : ''}
                </div>
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
