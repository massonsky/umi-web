import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './AssistChip.js';
import './FilterChip.js';
import './InputChip.js';
import './SuggestionChip.js';

@customElement('lumina-chips')
export class Chips extends LitElement {
    static readonly chipAssist = 0;
    static readonly chipFilter = 1;
    static readonly chipInput = 2;
    static readonly chipSuggestion = 3;

    @property({ type: String }) text = '';
    @property({ type: String }) icon = '';
    @property({ type: Boolean }) enabled = true;
    @property({ type: Boolean }) selected = false;
    @property({ type: Boolean }) elevated = false;
    @property({ type: Number, attribute: 'chip-type' }) chipType = Chips.chipAssist;

    protected render() {
        switch (this.chipType) {
            case Chips.chipFilter:
                return html`
                    <lumina-filter-chip
                        .text=${this.text}
                        .icon=${this.icon}
                        .enabled=${this.enabled}
                        .selected=${this.selected}
                        @clicked=${() => this.dispatchEvent(new CustomEvent('clicked', { bubbles: true, composed: true }))}
                        @toggled=${(e: CustomEvent) => {
                            this.selected = Boolean(e.detail?.selected);
                            this.dispatchEvent(new CustomEvent('toggled', { detail: e.detail, bubbles: true, composed: true }));
                        }}
                    ></lumina-filter-chip>
                `;
            case Chips.chipInput:
                return html`
                    <lumina-input-chip
                        .text=${this.text}
                        .icon=${this.icon}
                        .enabled=${this.enabled}
                        .selected=${this.selected}
                        @clicked=${() => this.dispatchEvent(new CustomEvent('clicked', { bubbles: true, composed: true }))}
                        @removeClicked=${() => this.dispatchEvent(new CustomEvent('removeClicked', { bubbles: true, composed: true }))}
                    ></lumina-input-chip>
                `;
            case Chips.chipSuggestion:
                return html`
                    <lumina-suggestion-chip
                        .text=${this.text}
                        .icon=${this.icon}
                        .enabled=${this.enabled}
                        .elevated=${this.elevated}
                        @clicked=${() => this.dispatchEvent(new CustomEvent('clicked', { bubbles: true, composed: true }))}
                        @suggestionSelected=${(e: CustomEvent) => this.dispatchEvent(new CustomEvent('suggestionSelected', { detail: e.detail, bubbles: true, composed: true }))}
                    ></lumina-suggestion-chip>
                `;
            case Chips.chipAssist:
            default:
                return html`
                    <lumina-assist-chip
                        .text=${this.text}
                        .icon=${this.icon}
                        .enabled=${this.enabled}
                        .elevated=${this.elevated}
                        @clicked=${() => this.dispatchEvent(new CustomEvent('clicked', { bubbles: true, composed: true }))}
                    ></lumina-assist-chip>
                `;
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'lumina-chips': Chips;
    }
}
