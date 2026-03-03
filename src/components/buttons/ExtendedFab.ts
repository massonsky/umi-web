import { unsafeCSS, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { FabBase } from '../templates/Fab.js';
import fabStyles from '../styles/Fab.css';
import extendedFabStyles from '../styles/ExtendedFab.css';

@customElement('umi-extended-fab')
export class ExtendedFab extends FabBase {
    @property({ type: String }) text = '';

    static styles = [
        unsafeCSS(fabStyles),
        unsafeCSS(extendedFabStyles)
    ];

    protected override renderFabContent(): TemplateResult {
        return html`
            <div class="content">
                ${this.renderIcon()}
                ${this.text ? html`<span class="label">${this.text}</span>` : ''}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-extended-fab': ExtendedFab;
    }
}
