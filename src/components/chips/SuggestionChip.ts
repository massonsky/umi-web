import { customElement, property, state } from 'lit/decorators.js';
import { ChipBase } from './ChipBase.js';

@customElement('umi-suggestion-chip')
export class SuggestionChip extends ChipBase {
    @property({ type: Boolean, attribute: 'fade-after-click' }) fadeAfterClick = false;
    @property({ type: Number, attribute: 'fade-out-duration' }) fadeOutDuration = 170;

    @state() private _fading = false;

    constructor() {
        super();
        this.outlined = true;
        this.selected = false;
        this.hasRemoveButton = false;
        this.avatarSource = '';
        this.contentColor = 'var(--md-sys-color-on-surface-variant, #49454f)';
        this.outlineColor = 'var(--md-sys-color-outline, #79747e)';
    }

    protected override updated(changed: Map<string, unknown>): void {
        super.updated(changed);
        if (changed.has('text') && this._fading) {
            this._fading = false;
        }
    }

    protected override get additionalRootClasses(): string {
        return this._fading ? 'fading' : '';
    }

    protected override handleMainClick() {
        this.selected = false;
        this.dispatchEvent(new CustomEvent('suggestionSelected', {
            detail: { suggestionText: this.text },
            bubbles: true,
            composed: true,
        }));

        if (this.fadeAfterClick) {
            this._fading = true;
        }

        super.handleMainClick();
    }

    override render() {
        this.style.setProperty('--chip-fade-ms', `${this.fadeOutDuration}ms`);
        return super.render();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-suggestion-chip': SuggestionChip;
    }
}
