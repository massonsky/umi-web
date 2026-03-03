import { customElement } from 'lit/decorators.js';
import { unsafeCSS } from 'lit';
import * as T from '../templates/Button.js';
import textStyles from '../styles/TextButton.css';

@customElement('umi-text-button')
export class TextButton extends T.Button {
    constructor() {
        super();
        this.buttonType = T.ButtonType.Text;
    }

    static styles = [
        ...(T.Button.styles as any),
        unsafeCSS(textStyles)
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-text-button': TextButton;
    }
}
