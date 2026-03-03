import { customElement, property } from 'lit/decorators.js';
import { ChipBase } from './ChipBase.js';

@customElement('umi-filter-chip')
export class FilterChip extends ChipBase {
    @property({ type: Boolean }) toggleable = true;
    @property({ type: String, attribute: 'checkmark-icon' }) checkmarkIcon = 'check';
    @property({ type: Boolean, attribute: 'show-checkmark' }) showCheckmark = true;
    @property({ type: String, attribute: 'user-icon' }) userIcon = '';

    constructor() {
        super();
        this.outlined = true;
        this.containerColor = 'transparent';
        this.containerColorSelected = 'var(--md-sys-color-secondary-container, #e8def8)';
        this.contentColor = 'var(--md-sys-color-on-surface-variant, #49454f)';
        this.contentColorSelected = 'var(--md-sys-color-on-secondary-container, #1d192b)';
    }

    protected override updated(changed: Map<string, unknown>): void {
        super.updated(changed);
        if (changed.has('icon')) {
            const prev = changed.get('icon') as string | undefined;
            if (this.icon && this.icon !== this.checkmarkIcon) {
                this.userIcon = this.icon;
            } else if (prev && prev !== this.checkmarkIcon && !this.userIcon) {
                this.userIcon = prev;
            }
        }
    }

    protected override get effectiveIcon(): string {
        if (this.selected && this.showCheckmark) return this.checkmarkIcon;
        return this.userIcon || this.icon;
    }

    protected override handleMainClick() {
        if (this.toggleable) {
            this.selected = !this.selected;
            this.checked = this.selected;
        }
        this.dispatchEvent(new CustomEvent('toggled', {
            detail: { selected: this.selected, checked: this.checked },
            bubbles: true,
            composed: true,
        }));
        super.handleMainClick();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-filter-chip': FilterChip;
    }
}
