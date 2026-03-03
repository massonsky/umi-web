/**
 * @umi/components — Umi Component Library
 *
 * Автоматически регистрирует все стандартные компоненты @material/web (md-*),
 * а также экспортирует все кастомные компоненты Umi (umi-*).
 *
 * Использование:
 *   import '@umi/components';
 *   // или именованный импорт:
 *   import { FilledButton, MaterialColor, SchemeVariant } from '@umi/components';
 *
 * После этого доступны теги:
 *   md-filled-button, md-checkbox, md-slider, ... (стандартный MD3)
 *   umi-filled-button, umi-fab, umi-color-scheme, umi-font, umi-icon, ...
 */

// ─── Регистрируем все стандартные компоненты @material/web ───────────────────
import '@material/web/all.js';

// Labs-компоненты (не входят в all.js)
import '@material/web/labs/badge/badge.js';
import '@material/web/labs/card/elevated-card.js';
import '@material/web/labs/card/filled-card.js';
import '@material/web/labs/card/outlined-card.js';
import '@material/web/labs/navigationbar/navigation-bar.js';
import '@material/web/labs/navigationtab/navigation-tab.js';
import '@material/web/labs/navigationdrawer/navigation-drawer.js';
import '@material/web/labs/segmentedbutton/outlined-segmented-button.js';
import '@material/web/labs/segmentedbuttonset/outlined-segmented-button-set.js';

// ─── Кастомные компоненты Umi ─────────────────────────────────────────────────
export * from './components/types.js';
export * from './components/actions/index.js';
export * from './components/fab/index.js';
export * from './components/selection/index.js';
export * from './components/stateful/index.js';
export * from './components/colors/index.js';
export * from './components/fonts/index.js';
export * from './components/icons/index.js';
export * from './components/feedback/index.js';

// Базовые классы и enum-ы доступны для расширения
export * from './components/templates/Button.js';
export * from './components/templates/Fab.js';
