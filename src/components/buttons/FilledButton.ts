import { customElement } from 'lit/decorators.js';
import { unsafeCSS } from 'lit';
import * as T from '../templates/Button.js';
import filledStyles from '../styles/FilledButton.css';

@customElement('umi-filled-button')
export class FilledButton extends T.Button {
    constructor() {
        super();
        this.buttonType = T.ButtonType.Filled;
    }

    static styles = [
        ...(T.Button.styles as any),
        unsafeCSS(filledStyles)
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-filled-button': FilledButton;
    }
}
