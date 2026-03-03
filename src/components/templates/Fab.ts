import { LitElement, html, unsafeCSS, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import '@material/web/ripple/ripple.js';
import fabStyles from '../styles/Fab.css';

/**
 * FabBase — общий базовый класс для FAB-кнопок (Fab, ExtendedFab).
 *
 * Инкапсулирует:
 *  - общий API свойств и состояний
 *  - структуру рендера (контейнер → state-layer → ripple → контент)
 *  - обработчики событий мыши и клика с checkable-логикой
 *  - общие стили (из Fab.css)
 *
 * Подклассы переопределяют:
 *  - `getContainerStyle()` — inline-стили контейнера (размер, радиус)
 *  - `renderFabContent()` — содержимое внутри контейнера
 *  - `static styles` — расширение стилей через `[...FabBase.styles, css`...`]`
 */
export class FabBase extends LitElement {
    @property({ type: String, attribute: 'icon-name' }) iconName = '';
    @property({ type: Boolean }) checkable = false;
    @property({ type: Boolean }) checked = false;

    /** 0 = Outlined, 1 = Rounded, 2 = Sharp */
    @property({ type: Number, attribute: 'icon-type' }) iconType: number = 0;
    @property({ type: Number, attribute: 'icon-fill' }) iconFill: number = 0;
    @property({ type: Number, attribute: 'icon-wght' }) iconWght: number = 400;
    @property({ type: Number, attribute: 'icon-grad' }) iconGrad: number = 0;

    @state() protected hovered = false;
    @state() protected pressed = false;

    static styles = [unsafeCSS(fabStyles)];

    /** CSS-классы контейнера на основе текущего состояния. */
    protected get containerClasses(): string {
        return [
            'container',
            this.hovered ? 'hovered' : '',
            this.pressed ? 'pressed' : '',
            this.checkable && this.checked ? 'checked' : '',
        ].filter(Boolean).join(' ');
    }

    /**
     * Inline-стили контейнера.
     * Переопределите в подклассе, если нужны динамические размеры или радиус.
     */
    protected getContainerStyle(): string {
        return '';
    }

    /** Рендер иконки (общая логика). */
    protected renderIcon(): TemplateResult {
        if (!this.iconName) return html``;
        const fontFamilyMap: Record<number, string> = {
            0: "'Material Symbols Outlined'",
            1: "'Material Symbols Rounded'",
            2: "'Material Symbols Sharp'",
        };
        const ff = fontFamilyMap[this.iconType] ?? "'Material Symbols Outlined'";
        return html`<span
            class="icon"
            style="--icon-font-family:${ff};--icon-fill:${this.iconFill};--icon-wght:${this.iconWght};--icon-grad:${this.iconGrad};"
        >${this.iconName}</span>`;
    }

    /**
     * Контент внутри контейнера (после state-layer и ripple).
     * Переопределите в подклассе для кастомной структуры контента.
     */
    protected renderFabContent(): TemplateResult {
        return this.renderIcon();
    }

    render() {
        return html`
            <div
                class="${this.containerClasses}"
                style="${this.getContainerStyle()}"
                @mouseenter="${() => this.hovered = true}"
                @mouseleave="${() => { this.hovered = false; this.pressed = false; }}"
                @mousedown="${() => this.pressed = true}"
                @mouseup="${() => this.pressed = false}"
                @click="${this._handleClick}">

                <div class="state-layer"></div>
                <md-ripple></md-ripple>

                ${this.renderFabContent()}
            </div>
        `;
    }

    protected _handleClick(_e: Event) {
        if (this.checkable) {
            this.checked = !this.checked;
            this.dispatchEvent(new CustomEvent('toggled', { detail: { checked: this.checked } }));
        }
        this.dispatchEvent(new CustomEvent('clicked'));
    }
}
