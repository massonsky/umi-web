import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import appBarsStyles from '../styles/LabsAppBars.css';

export type LabsAppBarVariant = 'small' | 'center' | 'medium-flexible' | 'large-flexible';

@customElement('umi-labs-app-bar')
export class LabsAppBar extends LitElement {
    @property({ type: String }) headline = 'Page title';
    @property({ type: String }) subtitle = '';
    @property({ type: String }) variant: LabsAppBarVariant = 'small';

    @property({ type: Boolean, attribute: 'centered-text' }) centeredText = false;
    @property({ type: Boolean }) scrolled = false;
    @property({ type: Boolean, attribute: 'auto-scroll-state' }) autoScrollState = false;

    @state() private _hasLeading = false;
    @state() private _hasTrailing = false;

    private _onWindowScroll = () => {
        if (!this.autoScrollState) return;
        this.scrolled = window.scrollY > 0;
    };

    static styles = [unsafeCSS(appBarsStyles)];

    connectedCallback(): void {
        super.connectedCallback();
        window.addEventListener('scroll', this._onWindowScroll, { passive: true });
    }

    disconnectedCallback(): void {
        window.removeEventListener('scroll', this._onWindowScroll);
        super.disconnectedCallback();
    }

    firstUpdated(): void {
        this._syncSlotState();
        this._onWindowScroll();
    }

    private _syncSlotState(): void {
        const root = this.renderRoot;
        const leadingSlot = root.querySelector<HTMLSlotElement>('slot[name="leading"]');
        const trailingSlot = root.querySelector<HTMLSlotElement>('slot[name="trailing"]');

        this._hasLeading = Boolean(leadingSlot?.assignedElements({ flatten: true }).length);
        this._hasTrailing = Boolean(trailingSlot?.assignedElements({ flatten: true }).length);
    }

    private _onSlotChange = () => {
        this._syncSlotState();
    };

    private get _isCenter(): boolean {
        return this.variant === 'center';
    }

    private get _isFlexible(): boolean {
        return this.variant === 'medium-flexible' || this.variant === 'large-flexible';
    }

    private get _isCenteredText(): boolean {
        return this._isCenter || this.centeredText;
    }

    private get _resolvedHeadline(): string {
        return this.headline?.trim() || 'Page title';
    }

    render() {
        const classes = [
            'bar',
            `variant-${this.variant}`,
            this.scrolled ? 'is-scrolled' : 'is-flat',
            this._isCenteredText ? 'text-centered' : 'text-leading',
            this._hasLeading ? 'has-leading' : 'no-leading',
            this._hasTrailing ? 'has-trailing' : 'no-trailing',
            this.subtitle ? 'has-subtitle' : 'no-subtitle',
            this._isFlexible ? 'is-flexible' : 'is-fixed'
        ].join(' ');

        return html`
            <header class="${classes}" role="banner">
                <div class="main-row">
                    <div class="leading-wrap">
                        <slot name="leading" @slotchange=${this._onSlotChange}></slot>
                    </div>

                    ${this._isFlexible
                        ? html`<div class="spacer"></div>`
                        : html`<div class="headline-wrap">
                            <h1 class="headline">${this._resolvedHeadline}</h1>
                            ${this.subtitle ? html`<div class="subtitle">${this.subtitle}</div>` : null}
                        </div>`}

                    <div class="trailing-wrap">
                        <slot name="trailing" @slotchange=${this._onSlotChange}></slot>
                    </div>
                </div>

                ${this._isFlexible
                    ? html`<div class="flexible-text-wrap">
                        <h1 class="headline">${this._resolvedHeadline}</h1>
                        ${this.subtitle ? html`<div class="subtitle">${this.subtitle}</div>` : null}
                    </div>`
                    : null}
            </header>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-labs-app-bar': LabsAppBar;
    }
}
