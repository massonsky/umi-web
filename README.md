# @luminaui/web

Библиотека Web Components на базе Material Design 3 (Lit + @material/web).

После импорта доступны:

- стандартные компоненты `md-*` из `@material/web`
- кастомные компоненты `lumina-*` из этой библиотеки

---

## Установка

```bash
npm install @luminaui/web
```

## Быстрый старт

```ts
import '@luminaui/web';
```

```html
<lumina-color-scheme seed="#6750a4" variant="expressive"></lumina-color-scheme>
<lumina-font symbols-style="Outlined" load-mono></lumina-font>
<lumina-filled-button text="Hello" icon-name="rocket_launch"></lumina-filled-button>
```

---

## Актуальные префиксы

- ✅ актуально: `lumina-*`
- ❌ устарело в документации: `md3-*`

---

## Публичные группы компонентов (`lumina-*`)

### Foundation

- `lumina-color-scheme`
- `lumina-font`
- `lumina-icon`

### Action / Buttons

- `lumina-filled-button`, `lumina-tonal-button`, `lumina-elevated-button`, `lumina-outlined-button`, `lumina-text-button`, `lumina-icon-button`
- `lumina-split-button`

### FAB

- `lumina-fab`, `lumina-extended-fab`
- `lumina-fab-menu`, `lumina-fab-menu-item`

### Selection

- `lumina-checkbox`, `lumina-radio-button`, `lumina-button-group`

### Chips

- `lumina-assist-chip`, `lumina-filter-chip`, `lumina-input-chip`, `lumina-suggestion-chip`, `lumina-chips`

### Stateful buttons

- Progress: `lumina-progress-bar-button`, `lumina-progress-bar-icon-button`, `lumina-progress-bar-fab`, `lumina-progress-bar-efab`
- Loading: `lumina-loader-button`, `lumina-loading-icon-button`, `lumina-loading-floating-action-button`, `lumina-loading-extended-floating-action-button`
- Timer: `lumina-time-button`, `lumina-icon-timer-button`, `lumina-floating-action-time-button`, `lumina-extended-floating-action-time-button`

### Sliders

- `lumina-slide-bar`, `lumina-range-slide-bar`
- `lumina-slide-bar-handle`, `lumina-slide-bar-track`, `lumina-slide-bar-wave-track`, `lumina-slide-bar-label`

### Scroll bars

- `lumina-scroll-bar`, `lumina-scroll-bar-expressive`

### Feedback

- `lumina-loading-indicator`, `lumina-snackbar`
- Circular: `lumina-dc-progress-bar`, `lumina-ic-progress-bar`, `lumina-dc-progress-bar-expressive`, `lumina-ic-progress-bar-expressive`
- Linear: `lumina-dl-progress-bar`, `lumina-il-progress-bar`, `lumina-dl-progress-bar-expressive`, `lumina-il-progress-bar-expressive`

---

## Стили и токены

Компоненты используют MD3 CSS-переменные, например:

- `--md-sys-color-*`
- `--md-sys-typescale-*`

Рекомендуемый старт темы/шрифтов:

- `lumina-color-scheme` — генерация color tokens
- `lumina-font` — загрузка Roboto/Material Symbols + типографика

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
- экспортирует все LuminaUI-компоненты из `actions/fab/selection/stateful/colors/fonts/icons/feedback`
- экспортирует базовые шаблоны (`Button`, `Fab`) и типы
