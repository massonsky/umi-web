import { customElement } from 'lit/decorators.js';
import { ChipBase } from './ChipBase.js';

@customElement('umi-assist-chip')
export class AssistChip extends ChipBase {
    constructor() {
        super();
        this.outlined = true;
        this.selected = false;
        this.hasRemoveButton = false;
        this.avatarSource = '';
        this.contentColor = 'var(--md-sys-color-on-surface-variant, #49454f)';
        this.outlineColor = 'var(--md-sys-color-outline, #79747e)';
    }

    protected override handleMainClick() {
        this.selected = false;
        super.handleMainClick();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-assist-chip': AssistChip;
    }
}
