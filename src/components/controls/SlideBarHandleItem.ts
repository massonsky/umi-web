import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import slideBarStyles from '../styles/SlideBar.css';

/**
 * umi-slide-bar-handle
 *
 * TS/Lit port of SlideBarHandleItem.qml
 *
 * Living Material морфинг ручки при нажатии/драге.
 * Поддерживается: target (активное взаимодействие), tabTarget (фокус клавиатуры).
 *
 * @fires - нет публичных событий; используется как вложенный элемент
 */
@customElement('umi-slide-bar-handle')
export class SlideBarHandleItem extends LitElement {
    /** Цвет ручки */
    @property({ type: String, attribute: 'handle-color' })
    handleColor = 'var(--md-sys-color-primary, #6750a4)';

    /** Цвет в отключённом состоянии */
    @property({ type: String, attribute: 'disable-color' })
    disableColor = 'var(--md-sys-color-on-surface, #1d1b20)';

    /** Активное взаимодействие (drag/press) — морфит ручку в 2px */
    @property({ type: Boolean }) target = false;

    /** Клавиатурный фокус — показывает focus ring */
    @property({ type: Boolean, attribute: 'tab-target' }) tabTarget = false;

    @property({ type: Boolean, reflect: true }) enabled = true;

    static styles = unsafeCSS(slideBarStyles);

    render() {
        const width = this.target ? 2 : 4;
        const color = this.enabled ? this.handleColor : this.disableColor;
        const opacity = this.enabled ? 1 : 0.38;

        return html`
            <div
                class="handle-root ${this.tabTarget ? 'focus-visible' : ''}"
                style="--sb-handle-color:${this.handleColor}"
            >
                <div
                    class="handle-rect"
                    style="
                        width:${width}px;
                        height:44px;
                        background:${color};
                        opacity:${opacity};
                    "
                ></div>
                <div class="handle-focus-ring"></div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-slide-bar-handle': SlideBarHandleItem;
    }
}
