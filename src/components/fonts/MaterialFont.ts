import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { type SymbolsStyle } from '../types.js';

/** MD3 type scale — полный набор токенов
 *  Источник: https://m3.material.io/styles/typography/type-scale-tokens
 */
const TYPE_SCALE: Record<string, [string, number, number, number, string]> = {
    // role                        family    size  wght  lh    tracking
    'display-large':    ['Roboto',  57, 400, 64, '-0.25px'],
    'display-medium':   ['Roboto',  45, 400, 52,   '0px'],
    'display-small':    ['Roboto',  36, 400, 44,   '0px'],
    'headline-large':   ['Roboto',  32, 400, 40,   '0px'],
    'headline-medium':  ['Roboto',  28, 400, 36,   '0px'],
    'headline-small':   ['Roboto',  24, 400, 32,   '0px'],
    'title-large':      ['Roboto',  22, 400, 28,   '0px'],
    'title-medium':     ['Roboto',  16, 500, 24, '0.15px'],
    'title-small':      ['Roboto',  14, 500, 20,  '0.1px'],
    'body-large':       ['Roboto',  16, 400, 24,  '0.5px'],
    'body-medium':      ['Roboto',  14, 400, 20, '0.25px'],
    'body-small':       ['Roboto',  12, 400, 16,  '0.4px'],
    'label-large':      ['Roboto',  14, 500, 20,  '0.1px'],
    'label-medium':     ['Roboto',  12, 500, 16,  '0.5px'],
    'label-small':      ['Roboto',  11, 500, 16,  '0.5px'],
};

/**
 * `<umi-font>`
 *
 * Невизуальный компонент. При подключении:
 *   1. Инжектирует `<link>` для Roboto и, опционально, Roboto Mono
 *      в `<head>` документа (один раз, дубли игнорируются)
 *   2. Инжектирует `<link>` для Material Symbols (Outlined / Rounded / Sharp)
 *   3. Устанавливает CSS-переменные типографской шкалы MD3 на `:root`
 *
 * Свойства:
 *   symbols-style  — стиль иконок: "Outlined" | "Rounded" | "Sharp"  (по умолч. "Outlined")
 *   load-mono      — загружать Roboto Mono (дефолт false)
 *   load-symbols   — загружать Material Symbols (дефолт true)
 */
@customElement('umi-font')
export class MaterialFont extends LitElement {
    @property({ type: String, attribute: 'symbols-style' })
    symbolsStyle: SymbolsStyle = 'Outlined';

    @property({ type: Boolean, attribute: 'load-mono' })
    loadMono: boolean = false;

    @property({ type: Boolean, attribute: 'load-symbols' })
    loadSymbols: boolean = true;

    protected override createRenderRoot() {
        return this;
    }

    override connectedCallback() {
        super.connectedCallback();
        this._injectFonts();
        this._applyTypeScale();
    }

    override updated(changed: Map<string, unknown>) {
        if (changed.has('symbolsStyle') || changed.has('loadMono') || changed.has('loadSymbols')) {
            this._injectFonts();
        }
    }

    /**
     * Проверяет, загружается ли уже данное семейство шрифтов
     * каким-либо <link> в документе (по содержимому href).
     */
    private _isFamilyLinked(familyName: string): boolean {
        const plusForm  = familyName.toLowerCase().replace(/\s+/g, '+');
        const pctForm   = familyName.toLowerCase().replace(/\s+/g, '%20');
        const links = document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');
        for (const link of Array.from(links)) {
            const href = (link.getAttribute('href') || '').toLowerCase();
            if (href.includes(plusForm) || href.includes(pctForm)) return true;
        }
        return false;
    }

    private _injectLink(id: string, href: string, fontFamily?: string) {
        if (document.getElementById(id)) return;
        // Если шрифт уже загружается другим <link>, не дублируем
        if (fontFamily && this._isFamilyLinked(fontFamily)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    private _injectFonts() {
        // Preconnect (один раз)
        if (!document.getElementById('__umi-preconnect-gfonts')) {
            const pc1 = document.createElement('link');
            pc1.id = '__umi-preconnect-gfonts';
            pc1.rel = 'preconnect';
            pc1.href = 'https://fonts.googleapis.com';
            document.head.prepend(pc1);

            const pc2 = document.createElement('link');
            pc2.rel = 'preconnect';
            pc2.href = 'https://fonts.gstatic.com';
            (pc2 as HTMLLinkElement).crossOrigin = 'anonymous';
            document.head.prepend(pc2);
        }

        // Roboto
        this._injectLink(
            '__umi-font-roboto',
            'https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap',
            'Roboto'
        );

        // Roboto Mono (опционально)
        if (this.loadMono) {
            this._injectLink(
                '__umi-font-roboto-mono',
                'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500&display=swap',
                'Roboto Mono'
            );
        }

        // Material Symbols (опционально)
        // Важно: многие umi-компоненты могут использовать разные family
        // (Outlined / Rounded / Sharp) через iconType или CSS-переменные.
        // Загружаем все три набора, чтобы не было «пропавших» иконок.
        if (this.loadSymbols) {
            const styles: SymbolsStyle[] = ['Outlined', 'Rounded', 'Sharp'];
            for (const style of styles) {
                const familyName = `Material Symbols ${style}`;
                const family = encodeURIComponent(familyName);
                this._injectLink(
                    `__umi-symbols-${style.toLowerCase()}`,
                    `https://fonts.googleapis.com/css2?family=${family}:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap`,
                    familyName
                );
            }

            // Legacy Material Icons family (и её варианты),
            // т.к. часть стилей/компонентов может использовать fallback на них.
            const legacyFamilies = [
                { id: '__umi-material-icons',          family: 'Material+Icons',          name: 'Material Icons' },
                { id: '__umi-material-icons-outlined', family: 'Material+Icons+Outlined', name: 'Material Icons Outlined' },
                { id: '__umi-material-icons-round',    family: 'Material+Icons+Round',    name: 'Material Icons Round' },
                { id: '__umi-material-icons-sharp',    family: 'Material+Icons+Sharp',    name: 'Material Icons Sharp' },
                { id: '__umi-material-icons-twotone',  family: 'Material+Icons+Two+Tone', name: 'Material Icons Two Tone' },
            ];

            for (const f of legacyFamilies) {
                this._injectLink(
                    f.id,
                    `https://fonts.googleapis.com/icon?family=${f.family}&display=swap`,
                    f.name
                );
            }
        }
    }

    private _applyTypeScale() {
        const root = document.documentElement;

        for (const [role, [family, size, weight, lineHeight, tracking]] of Object.entries(TYPE_SCALE)) {
            const prefix = `--md-sys-typescale-${role}`;
            root.style.setProperty(`${prefix}-font`,        family);
            root.style.setProperty(`${prefix}-size`,        `${size}px`);
            root.style.setProperty(`${prefix}-weight`,      String(weight));
            root.style.setProperty(`${prefix}-line-height`, `${lineHeight}px`);
            root.style.setProperty(`${prefix}-tracking`,    tracking);
        }

        // Применяем базовый шрифт к документу
        root.style.setProperty('--md-sys-typescale-body-font', 'Roboto, "Segoe UI", sans-serif');
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-font': MaterialFont;
    }
}
