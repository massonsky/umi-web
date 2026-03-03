import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import menuStyles from '../styles/FabMenu.css';
import { FabMenuItemType } from './FloatingActionButtonMenuItem.js';

export enum FabMenuDirection {
    Up = 0,
    Down = 1,
    Left = 2,
    Right = 3,
}

export enum FabMenuAlignment {
    Left = 0,
    Center = 1,
    Right = 2,
}

export interface FabMenuItemData {
    icon?: string;
    text?: string;
    color?: string;
    type?: FabMenuItemType;
    checked?: boolean;
    enabled?: boolean;
}

@customElement('umi-fab-menu')
export class FloatingActionButtonMenu extends LitElement {
    private static _registry = new Set<FloatingActionButtonMenu>();

    @property({ type: String, attribute: 'main-icon' }) mainIcon = 'add';
    @property({ type: String, attribute: 'main-text' }) mainText = '';
    @property({ attribute: false }) menuItems: FabMenuItemData[] = [];

    @property({ type: Boolean, reflect: true }) expanded = false;
    @property({ type: Boolean, attribute: 'auto-close' }) autoClose = true;
    @property({ type: Number, attribute: 'default-item-type' }) defaultItemType: FabMenuItemType = FabMenuItemType.EFAB;

    @property({ type: Boolean, attribute: 'expressive-motion' }) expressiveMotion = true;
    @property({ type: Number, attribute: 'animation-duration' }) animationDuration = 250;
    @property({ type: Number, attribute: 'stagger-delay' }) staggerDelay = 50;

    @property({ type: Number }) direction: FabMenuDirection = FabMenuDirection.Up;
    @property({ type: Number, attribute: 'item-spacing' }) itemSpacing = 16;
    @property({ type: Number, attribute: 'max-menu-width' }) maxMenuWidth = 280;

    @property({ type: Number, attribute: 'menu-alignment' }) menuAlignment: FabMenuAlignment = FabMenuAlignment.Left;

    @property({ type: Number, attribute: 'offset-x' }) offsetX = 0;
    @property({ type: Number, attribute: 'offset-y' }) offsetY = 0;

    @property({ type: String, attribute: 'scrim-color' }) scrimColor = 'transparent';

    @property({ type: Number, attribute: 'fab-size' }) fabSize = 56;
    @property({ type: Number, attribute: 'menu-item-height' }) menuItemHeight = 56;
    @property({ type: Number, attribute: 'menu-item-min-width' }) menuItemMinWidth = 80;

    @state() private _itemState = new Map<number, boolean>();

    static styles = unsafeCSS(menuStyles);

    connectedCallback(): void {
        super.connectedCallback();
        FloatingActionButtonMenu._registry.add(this);
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        FloatingActionButtonMenu._registry.delete(this);
    }

    updated(changed: Map<string, unknown>): void {
        if (changed.has('expanded') && this.expanded) {
            for (const menu of FloatingActionButtonMenu._registry) {
                if (menu !== this) menu.closeMenu();
            }
            this.dispatchEvent(new CustomEvent('menu-opened', { bubbles: true, composed: true }));
        }

        if (changed.has('expanded') && !this.expanded) {
            this.dispatchEvent(new CustomEvent('menu-closed', { bubbles: true, composed: true }));
        }
    }

    openMenu(): void {
        if (!this.expanded) {
            this.expanded = true;
        }
    }

    closeMenu(): void {
        if (this.expanded) {
            this.expanded = false;
        }
    }

    toggleMenu(): void {
        this.expanded = !this.expanded;
    }

    private _baseType(item: FabMenuItemData): FabMenuItemType {
        return item.type ?? this.defaultItemType;
    }

    private _isCheckable(item: FabMenuItemData): boolean {
        const t = this._baseType(item);
        return t === FabMenuItemType.Switch || t === FabMenuItemType.Checkbox || t === FabMenuItemType.ToggleIcon;
    }

    private _estimatedWidth(item: FabMenuItemData): number {
        const type = this._baseType(item);
        const textLen = (item.text ?? '').length;
        switch (type) {
            case FabMenuItemType.EFAB:
                return Math.max(this.menuItemMinWidth, 50 + textLen * 8 + ((item.icon ?? '').length ? 36 : 0));
            case FabMenuItemType.IconButton:
            case FabMenuItemType.ToggleIcon:
                return 56;
            case FabMenuItemType.Switch:
                return Math.max(120, 84 + textLen * 8);
            case FabMenuItemType.Checkbox:
                return Math.max(120, 72 + textLen * 8);
            default:
                return 56;
        }
    }

    private _allWidths(): number[] {
        return this.menuItems.map((item) => this._estimatedWidth(item));
    }

    private _maxWidth(): number {
        return Math.min(this.maxMenuWidth, Math.max(...this._allWidths(), this.menuItemMinWidth));
    }

    private _trackClass(): string {
        const directionClass = this.direction === FabMenuDirection.Up
            ? 'up'
            : this.direction === FabMenuDirection.Down
                ? 'down'
                : this.direction === FabMenuDirection.Left
                    ? 'left'
                    : 'right';

        const alignClass = this.menuAlignment === FabMenuAlignment.Left
            ? 'align-left'
            : this.menuAlignment === FabMenuAlignment.Right
                ? 'align-right'
                : 'align-center';

        return `${directionClass} ${alignClass}`;
    }

    private _startOffset(): { x: number; y: number } {
        switch (this.direction) {
            case FabMenuDirection.Up: return { x: 0, y: 14 };
            case FabMenuDirection.Down: return { x: 0, y: -14 };
            case FabMenuDirection.Left: return { x: 14, y: 0 };
            case FabMenuDirection.Right: return { x: -14, y: 0 };
            default: return { x: 0, y: 14 };
        }
    }

    private _isCollapsedDelayIndex(index: number, count: number): number {
        return Math.max(0, count - index - 1);
    }

    private _itemChecked(index: number, item: FabMenuItemData): boolean {
        if (this._itemState.has(index)) return Boolean(this._itemState.get(index));
        return Boolean(item.checked);
    }

    private _onItemClicked(index: number, item: FabMenuItemData): void {
        this.dispatchEvent(new CustomEvent('item-clicked', {
            detail: { index, item },
            bubbles: true,
            composed: true,
        }));

        if (this.autoClose && !this._isCheckable(item)) {
            this.closeMenu();
        }
    }

    private _onItemToggled(index: number, checked: boolean, item: FabMenuItemData): void {
        this._itemState.set(index, checked);
        this.requestUpdate();

        this.dispatchEvent(new CustomEvent('item-toggled', {
            detail: { index, checked, item },
            bubbles: true,
            composed: true,
        }));
    }

    private _onMainClick(): void {
        this.toggleMenu();
        this.dispatchEvent(new CustomEvent('main-button-clicked', { bubbles: true, composed: true }));
    }

    private _onKeyDown(e: KeyboardEvent): void {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            this.toggleMenu();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            if (this.expanded) {
                this.closeMenu();
            } else {
                for (const menu of FloatingActionButtonMenu._registry) {
                    menu.closeMenu();
                }
            }
        }
    }

    render() {
        const widths = this._allWidths();
        const maxWidth = this._maxWidth();
        const start = this._startOffset();
        const count = this.menuItems.length;
        const showClose = this.expanded;

        const rootStyle = [
            `--fab-menu-duration:${this.animationDuration}ms`,
            `--fab-menu-stagger:${this.staggerDelay}ms`,
            `--fab-menu-fab-size:${this.fabSize}px`,
            `--fab-menu-gap:${this.itemSpacing}px`,
            `--fab-menu-scrim:${this.scrimColor}`,
            `--fab-menu-offset-x:${this.offsetX}px`,
            `--fab-menu-offset-y:${this.offsetY}px`,
        ].join(';');

        return html`
            <div class="root" style=${rootStyle} tabindex="0" @keydown=${this._onKeyDown}>
                <div
                    class="scrim ${this.expanded ? 'expanded' : ''} ${this.expanded && this.autoClose ? 'clickable' : ''}"
                    @click=${() => this.autoClose ? this.closeMenu() : null}
                ></div>

                <div class="menu-track ${this._trackClass()}">
                    ${this.menuItems.map((item, index) => {
                        const width = (this.direction === FabMenuDirection.Up || this.direction === FabMenuDirection.Down)
                            ? maxWidth
                            : Math.min(this.maxMenuWidth, widths[index]);

                        const delayIndex = this.expanded ? index : this._isCollapsedDelayIndex(index, count);
                        const delayMs = delayIndex * this.staggerDelay;

                        return html`
                            <div
                                class="menu-item-wrap ${this.expanded ? 'expanded' : ''}"
                                style="
                                    width:${width}px;
                                    min-height:${this.menuItemHeight}px;
                                    --menu-delay:${delayMs}ms;
                                    --start-x:${start.x}px;
                                    --start-y:${start.y}px;
                                "
                            >
                                <umi-fab-menu-item
                                    .text=${item.text ?? ''}
                                    .iconName=${item.icon ?? ''}
                                    .buttonType=${this._baseType(item)}
                                    .checked=${this._itemChecked(index, item)}
                                    .enabled=${item.enabled ?? true}
                                    .itemWidth=${width}
                                    @clicked=${() => this._onItemClicked(index, item)}
                                    @toggled=${(e: CustomEvent) => this._onItemToggled(index, Boolean(e.detail?.checked), item)}
                                ></umi-fab-menu-item>
                            </div>
                        `;
                    })}
                </div>

                <button
                    class="main-fab ${this.expanded ? 'expanded' : ''}"
                    aria-label=${this.expanded ? 'Close FAB menu' : 'Open FAB menu'}
                    title=${this.mainText || 'FAB menu'}
                    @click=${this._onMainClick}
                >
                    <span class="icon">${showClose ? 'close' : this.mainIcon}</span>
                </button>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-fab-menu': FloatingActionButtonMenu;
    }
}
