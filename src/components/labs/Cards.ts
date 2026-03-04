import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import cardStyles from '../styles/LabsCards.css';

export type LabsCardVariant = 'elevated' | 'filled' | 'outlined';

@customElement('umi-labs-card')
export class LabsCard extends LitElement {
    @property({ type: String }) variant: LabsCardVariant = 'elevated';
    @property({ type: String }) headline = '';
    @property({ type: String }) subhead = '';
    @property({ type: String }) supportingText = '';
    @property({ type: String, attribute: 'media-src' }) mediaSrc = '';
    @property({ type: String, attribute: 'media-alt' }) mediaAlt = '';

    @property({ type: Boolean }) interactive = false;
    @property({ type: Boolean }) disabled = false;

    @state() private _hovered = false;
    @state() private _pressed = false;
    @state() private _focused = false;

    static styles = [unsafeCSS(cardStyles)];

    private get _isEnabled(): boolean {
        return !this.disabled;
    }

    private get _stateLayerOpacity(): number {
        if (!this.interactive || !this._isEnabled) return 0;
        if (this._pressed) return 0.12;
        if (this._focused) return 0.12;
        if (this._hovered) return 0.08;
        return 0;
    }

    private _isActionClick(event: Event): boolean {
        const path = event.composedPath();
        for (const node of path) {
            if (!(node instanceof HTMLElement)) continue;

            if (node.classList.contains('actions')) return true;
            if (node.getAttribute('slot') === 'actions') return true;

            const tag = node.tagName;
            if (
                tag === 'BUTTON' ||
                tag === 'A' ||
                tag === 'INPUT' ||
                tag === 'SELECT' ||
                tag === 'TEXTAREA' ||
                tag.startsWith('UMI-') ||
                tag.startsWith('MD-')
            ) {
                // Нативные/кастомные action-элементы не должны триггерить primary click карточки.
                // Исключаем саму карточку.
                if (tag !== 'ARTICLE') return true;
            }
        }

        return false;
    }

    private _onClick = (event: MouseEvent) => {
        if (!this.interactive || !this._isEnabled) return;
        if (this._isActionClick(event)) return;
        this.dispatchEvent(new CustomEvent('clicked', { bubbles: true, composed: true }));
    };

    private _onKeyDown = (e: KeyboardEvent) => {
        if (!this.interactive || !this._isEnabled) return;
        if (e.key === ' ' || e.key === 'Enter') {
            this._pressed = true;
            e.preventDefault();
        }
    };

    private _onKeyUp = (e: KeyboardEvent) => {
        if (!this.interactive || !this._isEnabled) return;
        if (e.key === ' ' || e.key === 'Enter') {
            this._pressed = false;
            this.dispatchEvent(new CustomEvent('clicked', { bubbles: true, composed: true }));
            e.preventDefault();
        }
    };

    render() {
        const classes = [
            'card',
            `variant-${this.variant}`,
            this.interactive ? 'interactive' : 'static',
            this._isEnabled ? 'enabled' : 'disabled'
        ].join(' ');

        const hasHeader = Boolean(this.headline || this.subhead);
        const hasSupporting = Boolean(this.supportingText);

        return html`
            <article
                class="${classes}"
                role=${this.interactive ? 'button' : 'article'}
                tabindex=${this.interactive && this._isEnabled ? 0 : -1}
                aria-disabled=${this._isEnabled ? 'false' : 'true'}
                @click=${this._onClick}
                @mouseenter=${() => { if (this._isEnabled) this._hovered = true; }}
                @mouseleave=${() => { this._hovered = false; this._pressed = false; }}
                @pointerdown=${() => { if (this._isEnabled && this.interactive) this._pressed = true; }}
                @pointerup=${() => { this._pressed = false; }}
                @focus=${() => { if (this._isEnabled && this.interactive) this._focused = true; }}
                @blur=${() => { this._focused = false; this._pressed = false; }}
                @keydown=${this._onKeyDown}
                @keyup=${this._onKeyUp}
                style=${`--labs-card-state-opacity:${this._stateLayerOpacity};`}
            >
                <span class="state-layer"></span>

                ${this.mediaSrc ? html`
                    <div class="media-wrap">
                        <img class="media" src=${this.mediaSrc} alt=${this.mediaAlt || this.headline || 'card media'} loading="lazy" />
                    </div>
                ` : html`<slot name="media"></slot>`}

                ${(hasHeader || hasSupporting) ? html`
                    <div class="content">
                        ${hasHeader ? html`
                            <div class="header">
                                ${this.subhead ? html`<div class="subhead">${this.subhead}</div>` : null}
                                ${this.headline ? html`<h3 class="headline">${this.headline}</h3>` : null}
                            </div>
                        ` : null}

                        ${hasSupporting ? html`<p class="supporting">${this.supportingText}</p>` : null}

                        <slot></slot>
                    </div>
                ` : html`<slot></slot>`}

                <div class="actions">
                    <slot name="actions"></slot>
                </div>
            </article>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-labs-card': LabsCard;
    }
}
