import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { type SymbolsStyle } from '../types.js';

/**
 * `<umi-icon name="home">`
 *
 * Отрисовывает одну иконку Material Symbols с поддержкой
 * variable font axes (FILL, wght, GRAD, opsz).
 *
 * Свойства:
 *   name          — лигатурное имя иконки ("home", "star", "search", …)
 *   icon-style    — "Outlined" | "Rounded" | "Sharp"   (по умолч. "Outlined")
 *   fill          — 0 (пустая) … 1 (залитая)           (по умолч. 0)
 *   weight        — 100 … 700                           (по умолч. 400)
 *   grade         — -50 … 200                           (по умолч. 0)
 *   optical-size  — 20 | 24 | 40 | 48                  (по умолч. 24)
 *   size          — размер шрифта в px                  (по умолч. 24)
 *   color         — цвет (CSS-значение)                 (по умолч. currentColor)
 *
 * CSS-переменные (можно переопределять снаружи):
 *   --umi-icon-fill         : 0
 *   --umi-icon-weight       : 400
 *   --umi-icon-grade        : 0
 *   --umi-icon-optical-size : 24
 *   --umi-icon-size         : 24px
 *   --umi-icon-color        : currentColor
 *
 * Пример:
 *   <umi-icon name="home" fill="1" weight="600" size="32"></umi-icon>
 *   <umi-icon name="favorite" icon-style="Rounded" color="red"></umi-icon>
 *   <umi-icon name="delete" style="--umi-icon-fill:1;--umi-icon-size:48px"></umi-icon>
 */
@customElement('umi-icon')
export class MaterialSymbols extends LitElement {
    /** Имя иконки (лигатура) */
    @property({ type: String }) name: string = '';

    /** Стиль шрифта символов */
    @property({ type: String, attribute: 'icon-style' })
    iconStyle: SymbolsStyle = 'Outlined';

    /** FILL axis: 0 = unfilled, 1 = filled */
    @property({ type: Number }) fill: number = 0;

    /** wght axis: 100–700 */
    @property({ type: Number }) weight: number = 400;

    /** GRAD axis: -50–200 */
    @property({ type: Number }) grade: number = 0;

    /** opsz axis: 20, 24, 40, 48 */
    @property({ type: Number, attribute: 'optical-size' })
    opticalSize: number = 24;

    /** Размер шрифта в px */
    @property({ type: Number }) size: number = 24;

    /** CSS-цвет */
    @property({ type: String }) color: string = '';

    static styles = css`
        :host {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            --umi-icon-fill:         0;
            --umi-icon-weight:       400;
            --umi-icon-grade:        0;
            --umi-icon-optical-size: 24;
            --umi-icon-size:         24px;
            --umi-icon-color:        currentColor;
        }

        .symbol {
            font-style:      normal;
            font-weight:     normal;
            line-height:     1;
            letter-spacing:  normal;
            text-transform:  none;
            white-space:     nowrap;
            word-wrap:       normal;
            direction:       ltr;
            display:         inline-block;

            -webkit-font-smoothing:    antialiased;
            -moz-osx-font-smoothing:   grayscale;
            text-rendering:            optimizeLegibility;
            font-feature-settings:     'liga';

            user-select:     none;
            pointer-events:  none;

            font-size:       var(--umi-icon-size, 24px);
            color:           var(--umi-icon-color, currentColor);

            font-variation-settings:
                'FILL' var(--umi-icon-fill,         0),
                'wght' var(--umi-icon-weight,       400),
                'GRAD' var(--umi-icon-grade,        0),
                'opsz' var(--umi-icon-optical-size, 24);

            transition:
                font-size             200ms cubic-bezier(0.2, 0, 0, 1),
                color                 200ms cubic-bezier(0.2, 0, 0, 1),
                font-variation-settings 200ms cubic-bezier(0.2, 0, 0, 1);
        }
    `;

    protected override render() {
        const fontFamily = `'Material Symbols ${this.iconStyle}'`;

        const style = [
            `font-family: ${fontFamily}`,
            `--umi-icon-size: ${this.size}px`,
            `--umi-icon-fill: ${this.fill}`,
            `--umi-icon-weight: ${this.weight}`,
            `--umi-icon-grade: ${this.grade}`,
            `--umi-icon-optical-size: ${this.opticalSize}`,
            this.color ? `--umi-icon-color: ${this.color}` : '',
        ].filter(Boolean).join('; ');

        return html`<span class="symbol" style="${style}">${this.name}</span>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-icon': MaterialSymbols;
    }
}
