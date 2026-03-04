import { html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { FabBase } from '../templates/Fab.js';

export type FabSize = 'small' | 'medium' | 'large';

@customElement('umi-fab')
export class Fab extends FabBase {
    @property({ type: String, attribute: 'fab-size' }) fabSize: FabSize = 'medium';

    private get sizePx() {
        if (this.fabSize === 'large') return 96;
        if (this.fabSize === 'small') return 40;
        return 56;
    }

    private get iconSizePx() {
        if (this.fabSize === 'large') return 36;
        return 24;
    }

    private get baseRadius() {
        if (this.fabSize === 'large') return 28;
        if (this.fabSize === 'small') return 12;
        return 16;
    }

    protected override getContainerStyle(): string {
        const size = this.sizePx;
        const radius = this.baseRadius;
        const hoverRadius = Math.min(size / 2, radius + 8);
        const pressRadius = Math.max(2, radius - 8);

        let currentRadius = radius;
        if (this.pressed || (this.checkable && this.checked)) {
            currentRadius = pressRadius;
        } else if (this.hovered) {
            currentRadius = hoverRadius;
        }

        return `width: ${size}px; height: ${size}px; border-radius: ${currentRadius}px;`;
    }

    protected override renderFabContent(): TemplateResult {
        if (!this.iconName) return html``;
        const fontFamilyMap: Record<number, string> = {
            0: "'Material Symbols Outlined'",
            1: "'Material Symbols Rounded'",
            2: "'Material Symbols Sharp'",
        };
        const ff = fontFamilyMap[this.iconType] ?? "'Material Symbols Outlined'";
        return html`<span
            class="icon"
            style="font-size:${this.iconSizePx}px;--icon-font-family:${ff};--icon-fill:${this.iconFill};--icon-wght:${this.iconWght};--icon-grad:${this.iconGrad};--icon-opsz:${this.iconSizePx};"
        >${this.iconName}</span>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-fab': Fab;
    }
}
