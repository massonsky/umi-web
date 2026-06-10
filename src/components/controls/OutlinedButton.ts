import { customElement } from 'lit/decorators.js';
import { unsafeCSS } from 'lit';
import * as T from '../templates/Button.js';
import outlinedStyles from '../styles/OutlinedButton.css';

@customElement('lumina-outlined-button')
export class OutlinedButton extends T.Button {
    constructor() {
        super();
        this.buttonType = T.ButtonType.Outlined;
    }

    static styles = [
        ...(T.Button.styles as any),
        unsafeCSS(outlinedStyles)
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        'lumina-outlined-button': OutlinedButton;
    }
}
