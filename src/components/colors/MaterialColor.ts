import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
    argbFromHex,
    hexFromArgb,
    Hct,
    TonalPalette,
    MaterialDynamicColors,
    DynamicScheme,
    SchemeMonochrome,
    SchemeExpressive,
    SchemeTonalSpot,
    SchemeFidelity,
    SchemeVibrant,
    SchemeRainbow,
    SchemeFruitSalad,
    SchemeContent,
    SchemeNeutral,
} from '@material/material-color-utilities';

/**
 * Поддерживаемые варианты цветовой схемы MD3.
 * Каждый вариант — отдельный алгоритм подбора палитры.
 */
export type SchemeVariant =
    | 'tonal-spot'   // Default MD3 — умеренно насыщенный тон
    | 'expressive'   // Живая, яркая схема
    | 'vibrant'      // Максимальная насыщенность
    | 'fidelity'     // Ближе всего к исходному цвету
    | 'content'      // Для UI с контентными изображениями
    | 'monochrome'   // Только нейтральные тона
    | 'neutral'      // Мягкая нейтральная схема
    | 'rainbow'      // Множество отдельных оттенков
    | 'fruit-salad'; // Игривая многоцветная схема

/** Описания вариантов для UI */
export const SCHEME_VARIANTS: { value: SchemeVariant; label: string; description: string }[] = [
    { value: 'tonal-spot',  label: 'Tonal Spot',  description: 'MD3 по умолчанию' },
    { value: 'expressive',  label: 'Expressive',  description: 'Живой и яркий' },
    { value: 'vibrant',     label: 'Vibrant',     description: 'Максимально насыщенный' },
    { value: 'fidelity',    label: 'Fidelity',    description: 'Близко к исходному цвету' },
    { value: 'content',     label: 'Content',     description: 'Для контентных UI' },
    { value: 'monochrome',  label: 'Monochrome',  description: 'Только нейтральные тона' },
    { value: 'neutral',     label: 'Neutral',     description: 'Мягкие нейтральные' },
    { value: 'rainbow',     label: 'Rainbow',     description: 'Несколько оттенков' },
    { value: 'fruit-salad', label: 'Fruit Salad', description: 'Игривый многоцвет' },
];

/** Фабрика DynamicScheme по варианту */
function createScheme(
    hct: Hct,
    dark: boolean,
    contrastLevel: number,
    variant: SchemeVariant
): DynamicScheme {
    switch (variant) {
        case 'monochrome':  return new SchemeMonochrome(hct, dark, contrastLevel);
        case 'expressive':  return new SchemeExpressive(hct, dark, contrastLevel);
        case 'fidelity':    return new SchemeFidelity(hct, dark, contrastLevel);
        case 'vibrant':     return new SchemeVibrant(hct, dark, contrastLevel);
        case 'rainbow':     return new SchemeRainbow(hct, dark, contrastLevel);
        case 'fruit-salad': return new SchemeFruitSalad(hct, dark, contrastLevel);
        case 'content':     return new SchemeContent(hct, dark, contrastLevel);
        case 'neutral':     return new SchemeNeutral(hct, dark, contrastLevel);
        default:            return new SchemeTonalSpot(hct, dark, contrastLevel);
    }
}

/**
 * Полный набор MD3 DynamicColor → CSS-переменные.
 * Использует MaterialDynamicColors — официальный API токенов.
 */
function schemeToVars(scheme: DynamicScheme): Record<string, string> {
    const c = MaterialDynamicColors;
    return {
        // Primary
        '--md-sys-color-primary':                    hexFromArgb(c.primary.getArgb(scheme)),
        '--md-sys-color-on-primary':                 hexFromArgb(c.onPrimary.getArgb(scheme)),
        '--md-sys-color-primary-container':          hexFromArgb(c.primaryContainer.getArgb(scheme)),
        '--md-sys-color-on-primary-container':       hexFromArgb(c.onPrimaryContainer.getArgb(scheme)),
        '--md-sys-color-primary-fixed':              hexFromArgb(c.primaryFixed.getArgb(scheme)),
        '--md-sys-color-primary-fixed-dim':          hexFromArgb(c.primaryFixedDim.getArgb(scheme)),
        '--md-sys-color-on-primary-fixed':           hexFromArgb(c.onPrimaryFixed.getArgb(scheme)),
        '--md-sys-color-on-primary-fixed-variant':   hexFromArgb(c.onPrimaryFixedVariant.getArgb(scheme)),
        // Secondary
        '--md-sys-color-secondary':                  hexFromArgb(c.secondary.getArgb(scheme)),
        '--md-sys-color-on-secondary':               hexFromArgb(c.onSecondary.getArgb(scheme)),
        '--md-sys-color-secondary-container':        hexFromArgb(c.secondaryContainer.getArgb(scheme)),
        '--md-sys-color-on-secondary-container':     hexFromArgb(c.onSecondaryContainer.getArgb(scheme)),
        '--md-sys-color-secondary-fixed':            hexFromArgb(c.secondaryFixed.getArgb(scheme)),
        '--md-sys-color-secondary-fixed-dim':        hexFromArgb(c.secondaryFixedDim.getArgb(scheme)),
        '--md-sys-color-on-secondary-fixed':         hexFromArgb(c.onSecondaryFixed.getArgb(scheme)),
        '--md-sys-color-on-secondary-fixed-variant': hexFromArgb(c.onSecondaryFixedVariant.getArgb(scheme)),
        // Tertiary
        '--md-sys-color-tertiary':                   hexFromArgb(c.tertiary.getArgb(scheme)),
        '--md-sys-color-on-tertiary':                hexFromArgb(c.onTertiary.getArgb(scheme)),
        '--md-sys-color-tertiary-container':         hexFromArgb(c.tertiaryContainer.getArgb(scheme)),
        '--md-sys-color-on-tertiary-container':      hexFromArgb(c.onTertiaryContainer.getArgb(scheme)),
        '--md-sys-color-tertiary-fixed':             hexFromArgb(c.tertiaryFixed.getArgb(scheme)),
        '--md-sys-color-tertiary-fixed-dim':         hexFromArgb(c.tertiaryFixedDim.getArgb(scheme)),
        '--md-sys-color-on-tertiary-fixed':          hexFromArgb(c.onTertiaryFixed.getArgb(scheme)),
        '--md-sys-color-on-tertiary-fixed-variant':  hexFromArgb(c.onTertiaryFixedVariant.getArgb(scheme)),
        // Error
        '--md-sys-color-error':                      hexFromArgb(c.error.getArgb(scheme)),
        '--md-sys-color-on-error':                   hexFromArgb(c.onError.getArgb(scheme)),
        '--md-sys-color-error-container':            hexFromArgb(c.errorContainer.getArgb(scheme)),
        '--md-sys-color-on-error-container':         hexFromArgb(c.onErrorContainer.getArgb(scheme)),
        // Background
        '--md-sys-color-background':                 hexFromArgb(c.background.getArgb(scheme)),
        '--md-sys-color-on-background':              hexFromArgb(c.onBackground.getArgb(scheme)),
        // Surface
        '--md-sys-color-surface':                    hexFromArgb(c.surface.getArgb(scheme)),
        '--md-sys-color-on-surface':                 hexFromArgb(c.onSurface.getArgb(scheme)),
        '--md-sys-color-surface-variant':            hexFromArgb(c.surfaceVariant.getArgb(scheme)),
        '--md-sys-color-on-surface-variant':         hexFromArgb(c.onSurfaceVariant.getArgb(scheme)),
        '--md-sys-color-surface-dim':                hexFromArgb(c.surfaceDim.getArgb(scheme)),
        '--md-sys-color-surface-bright':             hexFromArgb(c.surfaceBright.getArgb(scheme)),
        '--md-sys-color-surface-tint':               hexFromArgb(c.surfaceTint.getArgb(scheme)),
        // Surface containers
        '--md-sys-color-surface-container-lowest':   hexFromArgb(c.surfaceContainerLowest.getArgb(scheme)),
        '--md-sys-color-surface-container-low':      hexFromArgb(c.surfaceContainerLow.getArgb(scheme)),
        '--md-sys-color-surface-container':          hexFromArgb(c.surfaceContainer.getArgb(scheme)),
        '--md-sys-color-surface-container-high':     hexFromArgb(c.surfaceContainerHigh.getArgb(scheme)),
        '--md-sys-color-surface-container-highest':  hexFromArgb(c.surfaceContainerHighest.getArgb(scheme)),
        // Outline
        '--md-sys-color-outline':                    hexFromArgb(c.outline.getArgb(scheme)),
        '--md-sys-color-outline-variant':            hexFromArgb(c.outlineVariant.getArgb(scheme)),
        // Misc
        '--md-sys-color-shadow':                     hexFromArgb(c.shadow.getArgb(scheme)),
        '--md-sys-color-scrim':                      hexFromArgb(c.scrim.getArgb(scheme)),
        // Inverse
        '--md-sys-color-inverse-surface':            hexFromArgb(c.inverseSurface.getArgb(scheme)),
        '--md-sys-color-inverse-on-surface':         hexFromArgb(c.inverseOnSurface.getArgb(scheme)),
        '--md-sys-color-inverse-primary':            hexFromArgb(c.inversePrimary.getArgb(scheme)),
    };
}

/**
 * Генерирует 4 CSS-переменных для семантической роли (success, warning, …)
 * с правильными HCT-тонами по umi-спецификации.
 */
function customRoleVars(
    seedArgb: number,
    role: string,
    dark: boolean
): Record<string, string> {
    const hct = Hct.fromInt(seedArgb);
    const palette = TonalPalette.fromHueAndChroma(hct.hue, Math.max(hct.chroma, 36));
    const t = dark
        ? { role: 80, onRole: 20, container: 30, onContainer: 90 }
        : { role: 40, onRole: 100, container: 90, onContainer: 10 };

    return {
        [`--md-sys-color-${role}`]:                hexFromArgb(palette.tone(t.role)),
        [`--md-sys-color-on-${role}`]:             hexFromArgb(palette.tone(t.onRole)),
        [`--md-sys-color-${role}-container`]:      hexFromArgb(palette.tone(t.container)),
        [`--md-sys-color-on-${role}-container`]:   hexFromArgb(palette.tone(t.onContainer)),
    };
}

/**
 * `<umi-color-scheme seed="#6750a4" variant="expressive" contrast="0" ?dark>`
 *
 * Невизуальный Web Component. Принимает hex-цвет зерна, вариант схемы
 * и уровень контраста. Генерирует полную umi-палитру и применяет
 * CSS-переменные к `document.body`.
 *
 * Свойства:
 *   seed          — hex-цвет зерна, например "#6750a4"
 *   dark          — тёмная тема
 *   variant       — вариант схемы (см. SchemeVariant)
 *   contrast      — уровень контраста: -1 (уменьшенный) … 0 (обычный) … 1 (высокий)
 *   success-seed  — hex seed для роли success
 *   warning-seed  — hex seed для роли warning
 *
 * События:
 *   theme-changed — CustomEvent<{ vars, dark, seed, variant, contrast }>
 */
@customElement('umi-color-scheme')
export class MaterialColor extends LitElement {
    @property({ type: String }) seed: string = '#6750a4';
    @property({ type: Boolean, reflect: true }) dark: boolean = false;
    @property({ type: String, reflect: true }) variant: SchemeVariant = 'tonal-spot';
    /** -1 = уменьшенный, 0 = обычный, 0.5 = средний, 1 = высокий (a11y) */
    @property({ type: Number, reflect: true }) contrast: number = 0;
    @property({ type: String, attribute: 'success-seed' }) successSeed: string = '#386a20';
    @property({ type: String, attribute: 'warning-seed' }) warningSeed: string = '#7c5800';

    protected override createRenderRoot() { return this; }

    get appliedVars(): Readonly<Record<string, string>> { return this._appliedVars; }
    private _appliedVars: Record<string, string> = {};

    override updated(changed: Map<string, unknown>) {
        if (['seed', 'dark', 'variant', 'contrast', 'successSeed', 'warningSeed'].some(k => changed.has(k))) {
            this._applyTheme();
        }
    }

    override connectedCallback() {
        super.connectedCallback();
        this._applyTheme();
    }

    private _applyTheme() {
        let argb: number;
        try {
            argb = argbFromHex(this.seed);
        } catch {
            console.warn(`[umi-color-scheme] Некорректный hex: "${this.seed}"`);
            return;
        }

        const hct = Hct.fromInt(argb);
        const scheme = createScheme(hct, this.dark, this.contrast, this.variant);

        let successArgb: number;
        let warningArgb: number;
        try { successArgb = argbFromHex(this.successSeed); } catch { successArgb = argbFromHex('#386a20'); }
        try { warningArgb = argbFromHex(this.warningSeed); } catch { warningArgb = argbFromHex('#7c5800'); }

        const vars: Record<string, string> = {
            ...schemeToVars(scheme),
            ...customRoleVars(successArgb, 'success', this.dark),
            ...customRoleVars(warningArgb, 'warning', this.dark),
            '--md-sys-color-scheme': this.dark ? 'dark' : 'light',
        };

        // Пишем на body — то же место, куда пишет applyTheme() из @material/material-color-utilities.
        const root = document.body;
        for (const [key, value] of Object.entries(vars)) {
            root.style.setProperty(key, value);
        }
        document.documentElement.style.setProperty('color-scheme', this.dark ? 'dark' : 'light');

        this._appliedVars = vars;

        this.dispatchEvent(new CustomEvent('theme-changed', {
            bubbles: true,
            composed: true,
            detail: { vars, dark: this.dark, seed: this.seed, variant: this.variant, contrast: this.contrast },
        }));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-color-scheme': MaterialColor;
    }
}
