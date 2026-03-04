import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import badgeStyles from '../styles/LabsBadges.css';

export type LabsBadgeVariant = 'auto' | 'small' | 'large';

@customElement('umi-labs-badge')
export class LabsBadge extends LitElement {
    @property({ type: String }) variant: LabsBadgeVariant = 'auto';
    @property({ type: Number }) count = -1;
    @property({ type: String }) label = '';
    @property({ type: Number }) max = 999;
    @property({ type: Boolean, attribute: 'hide-zero' }) hideZero = true;
    @property({ type: Boolean }) visible = true;

    static styles = [unsafeCSS(badgeStyles)];

    private get _resolvedLabel(): string {
        if (this.count >= 0) {
            if (this.hideZero && this.count === 0) return '';
            if (this.count > this.max) return `${this.max}+`;
            return String(this.count);
        }

        const text = (this.label ?? '').trim();
        if (!text) return '';

        if (text.length <= 4) return text;
        return `${text.slice(0, 3)}+`;
    }

    private get _isSmall(): boolean {
        if (!this.visible) return false;
        if (this.variant === 'small') return true;
        if (this.variant === 'large') return false;
        return this._resolvedLabel.length === 0;
    }

    private get _isLarge(): boolean {
        if (!this.visible) return false;
        if (this.variant === 'large') return true;
        if (this.variant === 'small') return false;
        return this._resolvedLabel.length > 0;
    }

    render() {
        const label = this._resolvedLabel;

        return html`
            <span class="anchor" part="anchor">
                <slot></slot>

                ${this._isSmall ? html`
                    <span class="badge badge-small" aria-hidden="true"></span>
                ` : null}

                ${this._isLarge ? html`
                    <span class="badge badge-large" aria-label=${`Badge ${label}`}>
                        <span class="badge-label">${label}</span>
                    </span>
                ` : null}
            </span>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-labs-badge': LabsBadge;
    }
}
