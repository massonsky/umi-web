import { customElement } from 'lit/decorators.js';
import { unsafeCSS } from 'lit';
import * as T from '../templates/Button.js';
import tonalStyles from '../styles/TonalButton.css';

@customElement('umi-tonal-button')
export class TonalButton extends T.Button {
    constructor() {
        super();
        this.buttonType = T.ButtonType.Tonal;
    }

    static styles = [
        ...(T.Button.styles as any),
        unsafeCSS(tonalStyles)
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-tonal-button': TonalButton;
    }
}
