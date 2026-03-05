import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import toolbarStyles from '../styles/LabsToolbars.css';

export type LabsToolbarVariant = 'docked' | 'floating';
export type LabsToolbarColor = 'standard' | 'vibrant';
export type LabsToolbarOrientation = 'horizontal' | 'vertical';

@customElement('umi-labs-toolbar')
export class LabsToolbar extends LitElement {
    @property({ type: String }) variant: LabsToolbarVariant = 'floating';
    @property({ type: String, attribute: 'color-style' }) colorStyle: LabsToolbarColor = 'standard';
    @property({ type: String }) orientation: LabsToolbarOrientation = 'horizontal';

    @property({ type: Boolean }) elevated = true;
    @property({ type: Boolean, attribute: 'with-fab' }) withFab = false;
    @property({ type: String, attribute: 'aria-label' }) ariaLabel = 'Toolbar actions';

    static styles = [unsafeCSS(toolbarStyles)];

    private get _isDocked(): boolean {
        return this.variant === 'docked';
    }

    private get _isVerticalFloating(): boolean {
        return !this._isDocked && this.orientation === 'vertical';
    }

    render() {
        const classes = [
            'toolbar-host',
            `variant-${this.variant}`,
            `style-${this.colorStyle}`,
            this._isVerticalFloating ? 'orientation-vertical' : 'orientation-horizontal',
            this.elevated ? 'is-elevated' : 'is-flat',
            this.withFab ? 'with-fab' : 'no-fab'
        ].join(' ');

        return html`
            <div class="${classes}">
                <div class="toolbar" role="toolbar" aria-label=${this.ariaLabel}>
                    <div class="cluster leading">
                        <slot name="leading"></slot>
                    </div>

                    <div class="cluster middle">
                        <slot></slot>
                    </div>

                    <div class="cluster trailing">
                        <slot name="trailing"></slot>
                    </div>
                </div>

                ${this.withFab ? html`
                    <div class="fab-wrap">
                        <slot name="fab"></slot>
                    </div>
                ` : null}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-labs-toolbar': LabsToolbar;
    }
}
