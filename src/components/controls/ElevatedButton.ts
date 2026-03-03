import { customElement } from 'lit/decorators.js';
import { unsafeCSS } from 'lit';
import * as T from '../templates/Button.js';
import elevatedStyles from '../styles/ElevatedButton.css';

@customElement('umi-elevated-button')
export class ElevatedButton extends T.Button {
    constructor() {
        super();
        this.buttonType = T.ButtonType.Elevated;
    }

    static styles = [
        ...(T.Button.styles as any),
        unsafeCSS(elevatedStyles)
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-elevated-button': ElevatedButton;
    }
}
