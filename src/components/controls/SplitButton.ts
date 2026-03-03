import { LitElement, html, unsafeCSS, nothing, render as litRender } from 'lit';
import { property, state } from 'lit/decorators.js';
import { customElement } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import splitButtonStyles from '../styles/SplitButton.css';
import '@material/web/ripple/ripple.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SplitButtonVariant = 'filled' | 'tonal' | 'elevated' | 'outlined';
export type SplitButtonSize    = 'xs' | 's' | 'm' | 'l' | 'xl';
export type MenuItemType       = 'button' | 'checkbox' | 'switch' | 'radio';
export type MenuItemLines      = 'one' | 'two' | 'three';
export type MenuDirection      = 'down' | 'up' | 'down-offset' | 'up-offset';
export type SplitIconStyle     = 'Outlined' | 'Rounded' | 'Sharp';

export interface SplitButtonMenuItem {
    text:           string;
    value?:         string | number;
    icon?:          string;
    secondaryText?: string;
    checked?:       boolean;
    enabled?:       boolean;
}

// ─── Size specs ───────────────────────────────────────────────────────────────

interface SizeSpec {
    h: number; menuW: number; iconSz: number; fontSz: number;
    pad: number; innerR: number; arrowOffset: number; itemH: number;
}

const SIZE_SPECS: Record<SplitButtonSize, SizeSpec> = {
    xs: { h: 32,  menuW: 32, iconSz: 16, fontSz: 12, pad: 12, innerR: 4,  arrowOffset: 1, itemH: 40 },
    s:  { h: 40,  menuW: 40, iconSz: 18, fontSz: 14, pad: 16, innerR: 4,  arrowOffset: 1, itemH: 44 },
    m:  { h: 56,  menuW: 56, iconSz: 24, fontSz: 16, pad: 24, innerR: 4,  arrowOffset: 2, itemH: 48 },
    l:  { h: 96,  menuW: 64, iconSz: 32, fontSz: 22, pad: 32, innerR: 8,  arrowOffset: 3, itemH: 56 },
    xl: { h: 136, menuW: 80, iconSz: 40, fontSz: 28, pad: 40, innerR: 12, arrowOffset: 6, itemH: 64 },
};

const VARIANT_COLORS: Record<SplitButtonVariant, { bg:string; text:string; outline:string; shadow:string }> = {
    filled:   { bg:'var(--md-sys-color-primary,#6750a4)',                text:'var(--md-sys-color-on-primary,#fff)',               outline:'transparent',                        shadow:'none' },
    tonal:    { bg:'var(--md-sys-color-secondary-container,#e8def8)',    text:'var(--md-sys-color-on-secondary-container,#1d192b)', outline:'transparent',                        shadow:'none' },
    elevated: { bg:'var(--md-sys-color-surface-container-low,#f7f2fa)', text:'var(--md-sys-color-primary,#6750a4)',                 outline:'transparent',                        shadow:'0 1px 2px rgba(0,0,0,.15),0 1px 3px 1px rgba(0,0,0,.10)' },
    outlined: { bg:'transparent',                                       text:'var(--md-sys-color-primary,#6750a4)',                 outline:'var(--md-sys-color-outline,#79747e)', shadow:'none' },
};

// ─── Global popup styles (injected once into <head>) ──────────────────────────

const POPUP_CSS = `
.umi-split-popup {
    position:fixed; z-index:9999; box-sizing:border-box; border-radius:8px;
    overflow:hidden;
    background:var(--md-sys-color-surface-container,var(--md-sys-color-surface,#fff));
    box-shadow:0 4px 8px rgba(0,0,0,.12),0 8px 24px rgba(0,0,0,.08);
    min-width:120px; max-height:320px; overflow-y:auto;
    scrollbar-width:thin;
    transform-origin:top right;
    transition:opacity 300ms cubic-bezier(.2,0,0,1),
               transform 600ms cubic-bezier(.34,1.56,.64,1);
}
.umi-split-popup[data-up]{transform-origin:bottom right}
.umi-split-popup[data-hidden]{opacity:0;transform:scale(.85);pointer-events:none;visibility:hidden}
.umi-split-popup[data-closing]{
    opacity:0!important;transform:scale(.9)!important;pointer-events:none;
    transition:opacity 200ms cubic-bezier(.4,0,1,1),transform 200ms cubic-bezier(.4,0,.6,1)!important;
}
/* ── items ── */
.umi-split-menu-item{
    display:flex;align-items:center;gap:12px;box-sizing:border-box;
    padding:0 16px;cursor:pointer;position:relative;overflow:hidden;user-select:none;
    color:var(--md-sys-color-on-surface,#1c1b1f);
    font-size:14px;font-family:var(--md-sys-typescale-body-large-font,'Roboto','Segoe UI',sans-serif);
    font-weight:400;
    opacity:0;
    transition:opacity 220ms ease,background 150ms linear;
}
.umi-split-menu-item.visible{opacity:1}
.umi-split-menu-item:hover{background:rgba(0,0,0,.08)}
.umi-split-menu-item.pressing{background:rgba(0,0,0,.12)}
.umi-split-menu-item.selected{
    background:color-mix(in srgb,var(--md-sys-color-primary,#6750a4) 12%,transparent);
    color:var(--md-sys-color-primary,#6750a4);
}
.umi-split-menu-item.disabled{opacity:.38;pointer-events:none}
/* ── icon, check ── */
.umi-split-menu-icon,.umi-split-menu-check{
    font-family:'Material Symbols Outlined';
    font-feature-settings:'liga' 1;
    -webkit-font-feature-settings:'liga' 1;
    font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 20;
    line-height:1;font-style:normal;display:inline-block;
}
.umi-split-menu-icon{font-size:20px;color:var(--md-sys-color-on-surface-variant,#49454f);flex-shrink:0}
.umi-split-menu-check{font-size:18px;margin-left:auto;opacity:0;transition:opacity 200ms;color:var(--md-sys-color-primary,#6750a4)}
.umi-split-menu-item.selected .umi-split-menu-check{opacity:1}
/* ── text ── */
.umi-split-item-text{flex:1;overflow:hidden}
.umi-split-item-primary{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.umi-split-item-secondary{font-size:12px;color:var(--md-sys-color-on-surface-variant,#49454f);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* ── checkbox ── */
.umi-split-item-cb{
    width:18px;height:18px;border:2px solid var(--md-sys-color-on-surface-variant,#49454f);
    border-radius:2px;flex-shrink:0;margin-left:auto;display:flex;align-items:center;justify-content:center;
    box-sizing:border-box;transition:background 200ms,border-color 200ms;
}
.umi-split-item-cb.checked{background:var(--md-sys-color-primary,#6750a4);border-color:var(--md-sys-color-primary,#6750a4)}
.umi-split-item-cb.checked::after{content:'';width:10px;height:6px;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(-45deg) translateY(-2px);display:block}
/* ── switch ── */
.umi-split-item-sw{
    width:52px;min-width:52px;height:32px;border-radius:16px;
    background:var(--md-sys-color-surface-container-highest,#e6e0e9);
    border:2px solid var(--md-sys-color-outline,#79747e);
    position:relative;margin-left:auto;flex-shrink:0;box-sizing:border-box;
    transition:background 200ms,border-color 200ms;
}
.umi-split-item-sw::after{
    content:'';position:absolute;top:50%;left:3px;width:16px;height:16px;
    border-radius:50%;background:var(--md-sys-color-outline,#79747e);
    transform:translateY(-50%);transition:left 300ms cubic-bezier(.34,1.56,.64,1),background 200ms;
}
.umi-split-item-sw.checked{background:var(--md-sys-color-primary,#6750a4);border-color:var(--md-sys-color-primary,#6750a4)}
.umi-split-item-sw.checked::after{left:calc(100% - 19px);background:var(--md-sys-color-on-primary,#fff)}
/* ── radio ── */
.umi-split-item-radio{
    width:20px;height:20px;border-radius:50%;border:2px solid var(--md-sys-color-on-surface-variant,#49454f);
    flex-shrink:0;margin-right:4px;position:relative;box-sizing:border-box;transition:border-color 200ms;
}
.umi-split-item-radio.checked{border-color:var(--md-sys-color-primary,#6750a4)}
.umi-split-item-radio.checked::after{content:'';position:absolute;inset:3px;border-radius:50%;background:var(--md-sys-color-primary,#6750a4)}
`;

function ensureGlobalStyle() {
    if (document.getElementById('__umi-split-style')) return;
    const s = document.createElement('style');
    s.id = '__umi-split-style';
    s.textContent = POPUP_CSS;
    document.head.appendChild(s);
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * `<umi-split-button>` — Material Design 3 Split Button
 *
 * Features:
 * - 4 variants: filled | tonal | elevated | outlined
 * - 5 sizes: xs | s | m | l | xl
 * - Life Material breathing animation + elastic corner morphing
 * - Arrow rotation on open (elastic spring)
 * - Menu portal appended to document.body (no clipping, correct z-index)
 * - Item types: button | checkbox | switch | radio
 * - Staggered item entrance animation
 *
 * @fires clicked       — primary button click
 * @fires menu-toggle   — {open: boolean}
 * @fires menu-select   — {index, item}
 * @fires menu-toggle-item — {index, item, checked}
 *
 * @example
 * ```html
 * <umi-split-button text="Create" icon-name="add" variant="filled" size="m"></umi-split-button>
 * ```
 * ```js
 * el.menuItems = [{ text: 'Option 1', icon: 'edit' }, { text: 'Option 2' }];
 * ```
 */
@customElement('umi-split-button')
export class SplitButton extends LitElement {

    @property({ type: String })                           text      = '';
    @property({ type: String, attribute: 'icon-name' })  iconName  = '';
    @property({ type: Number, attribute: 'icon-fill' })  iconFill  = 0;
    @property({ type: Number, attribute: 'icon-grad' })  iconGrad  = 0;
    @property({ type: Number, attribute: 'icon-wght' })  iconWght  = 400;
    @property({ type: String, attribute: 'icon-style' }) iconStyle: SplitIconStyle = 'Outlined';
    @property({ type: String, reflect: true })             variant: SplitButtonVariant = 'filled';
    @property({ type: String, reflect: true })             size: SplitButtonSize       = 'm';
    @property({ type: Boolean, reflect: true })            disabled  = false;
    @property({ type: Array,  attribute: false })          menuItems: SplitButtonMenuItem[] = [];
    @property({ type: String, attribute: 'menu-item-type' })  menuItemType: MenuItemType  = 'button';
    @property({ type: String, attribute: 'menu-item-lines' }) menuItemLines: MenuItemLines = 'one';
    @property({ type: String, attribute: 'menu-direction' })  menuDirection: MenuDirection = 'down';
    @property({ type: Number, attribute: 'menu-offset-x' })   menuOffsetX = 0;
    @property({ type: Number, attribute: 'menu-offset-y' })   menuOffsetY = 0;
    @property({ type: Boolean, attribute: 'allow-multiple' }) allowMultipleSelection = false;
    @property({ type: Boolean, attribute: 'auto-close' })     autoClose   = true;
    @property({ type: Boolean, attribute: 'life-material' })  lifeMaterialEnabled = true;
    @property({ type: Number,  attribute: 'selected-index' }) selectedIndex = -1;

    @state() private _menuOpen  = false;
    @state() private _priHov    = false;
    @state() private _priPress  = false;
    @state() private _menuHov   = false;
    @state() private _menuPress = false;

    private _portal: HTMLDivElement | null = null;
    private _closeTimer = 0;
    private _staggerTimers: ReturnType<typeof setTimeout>[] = [];
    private _scrollBound!: () => void;
    private _clickBound!: (e: MouseEvent) => void;
    private _ro?: ResizeObserver;

    // ── Lifecycle ───────────────────────────────────────────────────────────

    connectedCallback() {
        super.connectedCallback();
        ensureGlobalStyle();
        this._portal = document.createElement('div');
        this._portal.className = 'umi-split-popup';
        this._portal.setAttribute('data-hidden', '');
        document.body.appendChild(this._portal);

        this._scrollBound = () => { if (this._menuOpen) this._position(); };
        this._clickBound  = (e: MouseEvent) => {
            if (!this._menuOpen) return;
            const path = e.composedPath() as EventTarget[];
            if (!path.includes(this) && !path.includes(this._portal!)) this._close(true);
        };
        window.addEventListener('scroll',  this._scrollBound, { passive: true, capture: true });
        document.addEventListener('click', this._clickBound,  true);
        this._ro = new ResizeObserver(() => { if (this._menuOpen) this._position(); });
        this._ro.observe(document.documentElement);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('scroll',  this._scrollBound, { capture: true });
        document.removeEventListener('click', this._clickBound,  true);
        this._ro?.disconnect();
        this._portal?.remove();
        this._portal = null;
        this._clearTimers();
    }

    static styles = unsafeCSS(splitButtonStyles);

    // ── Helpers ─────────────────────────────────────────────────────────────

    private get _spec() { return SIZE_SPECS[this.size] ?? SIZE_SPECS.m; }
    private get _col()  { return VARIANT_COLORS[this.variant] ?? VARIANT_COLORS.filled; }

    private get _iconFamily() {
        return this.iconStyle === 'Rounded' ? "'Material Symbols Rounded'"
             : this.iconStyle === 'Sharp'   ? "'Material Symbols Sharp'"
             : "'Material Symbols Outlined'";
    }

    private get _vars(): Record<string, string> {
        const s = this._spec, c = this._col;
        return {
            '--split-h':            `${s.h}px`,
            '--split-outer-r':      `${s.h / 2}px`,
            '--split-inner-r':      `${s.innerR}px`,
            '--split-menu-w':       `${s.menuW}px`,
            '--split-icon-sz':      `${s.iconSz}px`,
            '--split-icon-opsz':    `${s.iconSz}`,
            '--split-font-sz':      `${s.fontSz}px`,
            '--split-pad':          `${s.pad}px`,
            '--split-arrow-offset': `${s.arrowOffset}px`,
            '--split-item-h':       `${s.itemH}px`,
            '--split-bg':     c.bg,   '--split-text':    c.text,
            '--split-outline': c.outline, '--split-shadow': c.shadow,
            '--split-icon-family': this._iconFamily,
            '--icon-fill': `${this.iconFill}`,
            '--icon-wght': `${this.iconWght}`,
            '--icon-grad': `${this.iconGrad}`,
        };
    }

    // ── Portal ─────────────────────────────────────────────────────────────

    private _position() {
        if (!this._portal) return;
        const r  = this.getBoundingClientRect();
        const pW = Math.max(this._portal.offsetWidth || 200, r.width);
        const pH = this._portal.scrollHeight;
        const gap = 4;
        const up = this.menuDirection === 'up' || this.menuDirection === 'up-offset';
        const oy = (this.menuDirection === 'down-offset' || this.menuDirection === 'up-offset') ? this.menuOffsetY : 0;

        this._portal.style.top   = `${up ? r.top - pH - gap + oy : r.bottom + gap + oy}px`;
        this._portal.style.left  = `${Math.max(4, r.right - pW + this.menuOffsetX)}px`;
        this._portal.style.width = `${pW}px`;
        up ? this._portal.setAttribute('data-up','') : this._portal.removeAttribute('data-up');
    }

    private _open() {
        if (this.disabled || !this._portal) return;
        clearTimeout(this._closeTimer);
        this._clearTimers();
        this._menuOpen = true;
        this._renderPortal();
        requestAnimationFrame(() => {
            this._position();
            if (!this._portal) return;
            this._portal.removeAttribute('data-hidden');
            this._portal.removeAttribute('data-closing');
            this._portal.querySelectorAll<HTMLElement>('.umi-split-menu-item').forEach((el, i) => {
                const t = setTimeout(() => el.classList.add('visible'), 30 + i * 45);
                this._staggerTimers.push(t as unknown as ReturnType<typeof setTimeout>);
            });
        });
        this.dispatchEvent(new CustomEvent('menu-toggle', { detail: { open: true }, bubbles: true, composed: true }));
    }

    private _close(immediate = false) {
        if (!this._menuOpen || !this._portal) return;
        this._menuOpen = false;
        this.requestUpdate();
        if (immediate) {
            this._portal.setAttribute('data-hidden', '');
            this._renderPortal();
        } else {
            this._portal.setAttribute('data-closing', '');
            this._closeTimer = window.setTimeout(() => {
                this._portal?.setAttribute('data-hidden', '');
                this._portal?.removeAttribute('data-closing');
                this._renderPortal();
            }, 220);
        }
        this.dispatchEvent(new CustomEvent('menu-toggle', { detail: { open: false }, bubbles: true, composed: true }));
    }

    private _toggle() { this._menuOpen ? this._close() : this._open(); }

    private _clearTimers() {
        this._staggerTimers.forEach(t => clearTimeout(t));
        this._staggerTimers = [];
    }

    private _renderPortal() {
        if (!this._portal) return;
        const s = this._spec;
        const itemH = this.menuItemLines === 'two' ? s.itemH + 16
                    : this.menuItemLines === 'three' ? s.itemH + 32 : s.itemH;

        litRender(html`
            ${this.menuItems.map((item, i) => {
                const sel = this.menuItemType === 'button'  && this.selectedIndex === i;
                const chk = this.menuItemType === 'radio'   ? this.selectedIndex === i : !!item.checked;
                const dis = item.enabled === false;
                return html`<div
                    class="umi-split-menu-item ${sel?'selected':''} ${dis?'disabled':''}"
                    style="height:${itemH}px"
                    role=${this.menuItemType==='radio'?'menuitemradio':this.menuItemType==='checkbox'?'menuitemcheckbox':'menuitem'}
                    aria-checked=${chk}
                    @click=${(e:Event) => this._itemClick(item, i, e)}
                    @mousedown=${(e:Event)  => (e.currentTarget as HTMLElement).classList.add('pressing')}
                    @mouseup=${(e:Event)    => (e.currentTarget as HTMLElement).classList.remove('pressing')}
                    @mouseleave=${(e:Event) => (e.currentTarget as HTMLElement).classList.remove('pressing')}
                >
                    ${item.icon ? html`<span class="umi-split-menu-icon">${item.icon}</span>` : nothing}
                    <div class="umi-split-item-text">
                        <div class="umi-split-item-primary">${item.text}</div>
                        ${item.secondaryText ? html`<div class="umi-split-item-secondary">${item.secondaryText}</div>` : nothing}
                    </div>
                    ${this._trailing(item, i, chk)}
                </div>`;
            })}
        `, this._portal);
    }

    private _trailing(item: SplitButtonMenuItem, _i: number, checked: boolean) {
        switch (this.menuItemType) {
            case 'checkbox': return html`<div class="umi-split-item-cb  ${checked?'checked':''}"></div>`;
            case 'switch':   return html`<div class="umi-split-item-sw  ${checked?'checked':''}"></div>`;
            case 'radio':    return html`<div class="umi-split-item-radio ${checked?'checked':''}"></div>`;
            default:         return html`<span class="umi-split-menu-check">check</span>`;
        }
    }

    private _itemClick(item: SplitButtonMenuItem, index: number, e: Event) {
        e.stopPropagation();
        if (item.enabled === false) return;
        switch (this.menuItemType) {
            case 'button':
                this.selectedIndex = index;
                this.dispatchEvent(new CustomEvent('menu-select', { detail: { index, item }, bubbles: true, composed: true }));
                if (this.autoClose) this._close();
                break;
            case 'checkbox':
                item.checked = !item.checked;
                if (!this.allowMultipleSelection) this.menuItems.forEach((m, i) => { if (i !== index) m.checked = false; });
                this.dispatchEvent(new CustomEvent('menu-toggle-item', { detail: { index, item, checked: item.checked }, bubbles: true, composed: true }));
                this._renderPortal();
                if (this.autoClose && !this.allowMultipleSelection) this._close();
                break;
            case 'switch':
                item.checked = !item.checked;
                this.dispatchEvent(new CustomEvent('menu-toggle-item', { detail: { index, item, checked: item.checked }, bubbles: true, composed: true }));
                this._renderPortal();
                if (this.autoClose) this._close();
                break;
            case 'radio':
                this.menuItems.forEach(m => m.checked = false);
                item.checked = true;
                this.selectedIndex = index;
                this.dispatchEvent(new CustomEvent('menu-select', { detail: { index, item }, bubbles: true, composed: true }));
                this._renderPortal();
                if (this.autoClose) this._close();
                break;
        }
    }

    // ── Keyboard ──────────────────────────────────────────────────────────

    private _keyDown(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ' ') {
            this.dispatchEvent(new CustomEvent('clicked', { bubbles: true, composed: true }));
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            if (!this._menuOpen) this._open();
            e.preventDefault();
        } else if (e.key === 'Escape') {
            if (this._menuOpen) this._close();
        }
    }

    // ── Render ────────────────────────────────────────────────────────────

    render() {
        return html`
            <div
                class=${classMap({ wrapper:true, pressed:this._priPress, 'menu-open':this._menuOpen, 'life-material': this.lifeMaterialEnabled })}
                style=${styleMap(this._vars)}
                tabindex=${this.disabled ? '-1' : '0'}
                role="group"
                aria-label=${this.text}
                @keydown=${this._keyDown}
            >
                <div
                    class=${classMap({ primary:true, hovered:this._priHov, pressed:this._priPress })}
                    role="button" tabindex="-1" aria-label=${this.text}
                    @mouseenter=${() => this._priHov = true}
                    @mouseleave=${() => { this._priHov = false; this._priPress = false; }}
                    @mousedown=${() => this._priPress = true}
                    @mouseup=${()   => this._priPress = false}
                    @click=${() => { if (!this.disabled) this.dispatchEvent(new CustomEvent('clicked', { bubbles:true, composed:true })); }}
                >
                    <div class="state-layer"></div>
                    <md-ripple></md-ripple>
                    <div class="content">
                        ${this.iconName ? html`<span class="icon">${this.iconName}</span>` : nothing}
                        ${this.text     ? html`<span class="label">${this.text}</span>`   : nothing}
                    </div>
                </div>

                <div
                    class=${classMap({ 'menu-btn':true, hovered:this._menuHov, pressed:this._menuPress, 'menu-open':this._menuOpen })}
                    role="button" tabindex="-1" aria-haspopup="menu" aria-expanded=${this._menuOpen} aria-label="Open menu"
                    @mouseenter=${() => this._menuHov = true}
                    @mouseleave=${() => { this._menuHov = false; this._menuPress = false; }}
                    @mousedown=${() => this._menuPress = true}
                    @mouseup=${()   => this._menuPress = false}
                    @click=${(e:Event) => { e.stopPropagation(); this._toggle(); }}
                >
                    <div class="state-layer"></div>
                    <md-ripple></md-ripple>
                    <span class="arrow-icon">arrow_drop_down</span>
                </div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-split-button': SplitButton;
    }
}
