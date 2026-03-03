# @umi/components

Библиотека Web Components на базе Material Design 3 (Lit + @material/web).

После импорта доступны:

- стандартные компоненты `md-*` из `@material/web`
- кастомные компоненты `umi-*` из этой библиотеки

---

## Установка

```bash
npm install @umi/components
```

## Быстрый старт

```ts
import '@umi/components';
```

```html
<umi-color-scheme seed="#6750a4" variant="expressive"></umi-color-scheme>
<umi-font symbols-style="Outlined" load-mono></umi-font>
<umi-filled-button text="Hello" icon-name="rocket_launch"></umi-filled-button>
```

---

## Актуальные префиксы

- ✅ актуально: `umi-*`
- ❌ устарело в документации: `md3-*`

---

## Публичные группы компонентов (`umi-*`)

### Foundation

- `umi-color-scheme`
- `umi-font`
- `umi-icon`

### Action / Buttons

- `umi-filled-button`, `umi-tonal-button`, `umi-elevated-button`, `umi-outlined-button`, `umi-text-button`, `umi-icon-button`
- `umi-split-button`

### FAB

- `umi-fab`, `umi-extended-fab`
- `umi-fab-menu`, `umi-fab-menu-item`

### Selection

- `umi-checkbox`, `umi-radio-button`, `umi-button-group`

### Chips

- `umi-assist-chip`, `umi-filter-chip`, `umi-input-chip`, `umi-suggestion-chip`, `umi-chips`

### Stateful buttons

- Progress: `umi-progress-bar-button`, `umi-progress-bar-icon-button`, `umi-progress-bar-fab`, `umi-progress-bar-efab`
- Loading: `umi-loader-button`, `umi-loading-icon-button`, `umi-loading-floating-action-button`, `umi-loading-extended-floating-action-button`
- Timer: `umi-time-button`, `umi-icon-timer-button`, `umi-floating-action-time-button`, `umi-extended-floating-action-time-button`

### Sliders

- `umi-slide-bar`, `umi-range-slide-bar`
- `umi-slide-bar-handle`, `umi-slide-bar-track`, `umi-slide-bar-wave-track`, `umi-slide-bar-label`

### Scroll bars

- `umi-scroll-bar`, `umi-scroll-bar-expressive`

### Feedback

- `umi-loading-indicator`, `umi-snackbar`
- Circular: `umi-dc-progress-bar`, `umi-ic-progress-bar`, `umi-dc-progress-bar-expressive`, `umi-ic-progress-bar-expressive`
- Linear: `umi-dl-progress-bar`, `umi-il-progress-bar`, `umi-dl-progress-bar-expressive`, `umi-il-progress-bar-expressive`

---

## Стили и токены

Компоненты используют MD3 CSS-переменные, например:

- `--md-sys-color-*`
- `--md-sys-typescale-*`

Рекомендуемый старт темы/шрифтов:

- `umi-color-scheme` — генерация color tokens
- `umi-font` — загрузка Roboto/Material Symbols + типографика

---

## Сборка

```bash
npm run build
```

Сборка теперь создаёт **два JS-бандла**:

- `dist/index.js` — library bundle (для npm/бандлеров, с внешними зависимостями)
- `dist/index.browser.js` — browser-ready bundle (для статического хостинга, включая GitHub Pages)

Также генерируются типы через `tsc --project tsconfig.types.json`.

---

## GitHub Pages / статический хостинг

Используйте browser-ready бандл:

```html
<script type="module" src="./dist/index.browser.js"></script>
```

В репозитории есть готовая витрина: `index.html`.

Локальная проверка:

```bash
npm run build
# затем откройте index.html через любой static server
```

---

## Экспорт модуля

Из `src/index.ts` библиотека:

- регистрирует `@material/web/all.js` + labs-компоненты
- экспортирует все Umi-компоненты из `actions/fab/selection/stateful/colors/fonts/icons/feedback`
- экспортирует базовые шаблоны (`Button`, `Fab`) и типы
