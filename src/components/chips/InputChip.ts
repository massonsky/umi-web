import { customElement } from 'lit/decorators.js';
import { ChipBase } from './ChipBase.js';

@customElement('umi-input-chip')
export class InputChip extends ChipBase {
    private _removeAnimTimer = 0;

    constructor() {
        super();
        this.hasRemoveButton = true;
        this.outlined = true;
        this.containerColor = 'transparent';
        this.containerColorSelected = 'var(--md-sys-color-secondary-container, #e8def8)';
        this.contentColor = 'var(--md-sys-color-on-surface-variant, #49454f)';
        this.contentColorSelected = 'var(--md-sys-color-on-secondary-container, #1d192b)';
        this.outlineColor = 'var(--md-sys-color-outline-variant, #cac4d0)';
    }

    protected override get additionalRootClasses(): string {
        return this.classList.contains('chip-remove-anim') ? 'chip-remove-anim' : '';
    }

    protected override handleRemoveClick(e: Event): void {
        if (this.expressiveMotion) {
            this.classList.add('chip-remove-anim');
            window.clearTimeout(this._removeAnimTimer);
            this._removeAnimTimer = window.setTimeout(() => {
                this.classList.remove('chip-remove-anim');
                this.requestUpdate();
            }, 260);
            this.requestUpdate();
        }

        super.handleRemoveClick(e);
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        window.clearTimeout(this._removeAnimTimer);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-input-chip': InputChip;
    }
}
