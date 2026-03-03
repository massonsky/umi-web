import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import itemStyles from '../styles/FabMenuItem.css';

export enum FabMenuItemType {
    EFAB = 0,
    IconButton = 1,
    Switch = 2,
    Checkbox = 3,
    ToggleIcon = 4,
}

@customElement('umi-fab-menu-item')
export class FloatingActionButtonMenuItem extends LitElement {
    @property({ type: String }) text = '';
    @property({ type: String, attribute: 'icon-name' }) iconName = '';
    @property({ type: Boolean }) checked = false;
    @property({ type: Boolean }) enabled = true;
    @property({ type: Number, attribute: 'button-type' }) buttonType: FabMenuItemType = FabMenuItemType.EFAB;
    @property({ type: Number, attribute: 'item-width' }) itemWidth = 0;

    static styles = unsafeCSS(itemStyles);

    get checkable(): boolean {
        return this.buttonType === FabMenuItemType.Switch
            || this.buttonType === FabMenuItemType.Checkbox
            || this.buttonType === FabMenuItemType.ToggleIcon;
    }

    private _emitClicked() {
        this.dispatchEvent(new CustomEvent('clicked', { bubbles: true, composed: true }));
    }

    private _emitToggled(checked: boolean) {
        this.checked = checked;
        this.dispatchEvent(new CustomEvent('toggled', {
            detail: { checked },
            bubbles: true,
            composed: true,
        }));
    }

    private _renderControl() {
        switch (this.buttonType) {
            case FabMenuItemType.IconButton:
                return html`
                    <umi-icon-button
                        .iconName=${this.iconName}
                        .buttonType=${1}
                        .size=${4}
                        .checkable=${false}
                        @clicked=${this._emitClicked}
                    ></umi-icon-button>
                `;

            case FabMenuItemType.ToggleIcon:
                return html`
                    <umi-icon-button
                        .iconName=${this.iconName}
                        .buttonType=${1}
                        .size=${4}
                        .checkable=${true}
                        .checked=${this.checked}
                        @toggled=${(e: CustomEvent) => this._emitToggled(Boolean(e.detail?.checked))}
                    ></umi-icon-button>
                `;

            case FabMenuItemType.Switch:
                return html`
                    <label class="switch-wrap" @click=${(e: Event) => e.stopPropagation()}>
                        <span class="switch-label">${this.text}</span>
                        <md-switch
                            ?selected=${this.checked}
                            @change=${(e: Event) => this._emitToggled(Boolean((e.currentTarget as any).selected))}
                        ></md-switch>
                    </label>
                `;

            case FabMenuItemType.Checkbox:
                return html`
                    <label class="checkbox-wrap" @click=${(e: Event) => e.stopPropagation()}>
                        <span class="checkbox-label">${this.text}</span>
                        <md-checkbox
                            ?checked=${this.checked}
                            @change=${(e: Event) => this._emitToggled(Boolean((e.currentTarget as any).checked))}
                        ></md-checkbox>
                    </label>
                `;

            case FabMenuItemType.EFAB:
            default:
                return html`
                    <umi-extended-fab
                        .text=${this.text}
                        .iconName=${this.iconName}
                        @clicked=${this._emitClicked}
                    ></umi-extended-fab>
                `;
        }
    }

    render() {
        const style = this.itemWidth > 0 ? `--menu-item-width:${this.itemWidth}px;` : '';
        return html`
            <div class="item-root" style=${style} ?disabled=${!this.enabled}>
                ${this.enabled ? this._renderControl() : nothing}
                ${!this.enabled ? html`<div style="opacity:.55;pointer-events:none;">${this._renderControl()}</div>` : nothing}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-fab-menu-item': FloatingActionButtonMenuItem;
    }
}
