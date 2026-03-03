import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import slideBarStyles from '../styles/SlideBar.css';

/**
 * umi-slide-bar-label
 *
 * TS/Lit port of SlideBarTextContainer.qml
 *
 * Всплывающий контейнер значения над ручкой слайдера.
 * Living Material: плавное появление/скрытие + scale.
 *
 * Methods:
 *   setValue(v: number | string)  — установить отображаемое значение
 *   show()                        — показать лейбл
 *   hide()                        — запустить таймер скрытия (250ms)
 */
@customElement('umi-slide-bar-label')
export class SlideBarTextContainer extends LitElement {
    @property({ type: String, attribute: 'container-color' })
    containerColor = 'var(--md-sys-color-inverse-surface, #313033)';

    @property({ type: String, attribute: 'content-color' })
    contentColor = 'var(--md-sys-color-inverse-on-surface, #f4eff4)';

    @state() private _text = '';
    @state() private _visible = false;

    private _hideTimer?: number;

    static styles = [
        unsafeCSS(slideBarStyles),
        css`:host { display: inline-flex; }`,
    ];

    // =========================================================
    // Public API (mirror QML interface)
    // =========================================================

    setValue(v: number | string) {
        this._text = String(v);
    }

    show() {
        if (this._hideTimer != null) {
            clearTimeout(this._hideTimer);
            this._hideTimer = undefined;
        }
        this._visible = true;
    }

    hide() {
        this._hideTimer = window.setTimeout(() => {
            this._visible = false;
            this._hideTimer = undefined;
        }, 250);
    }

    render() {
        return html`
            <div
                class="label-root ${this._visible ? 'visible' : 'hidden'}"
                style="
                    background:${this.containerColor};
                    color:${this.contentColor};
                "
                role="status"
                aria-label="${this._text}"
            >${this._text}</div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-slide-bar-label': SlideBarTextContainer;
    }
}
