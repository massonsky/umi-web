# @umi/components

Библиотека компонентов **Umi** на базе Material Design 3.

При установке автоматически устанавливает весь пакет `@material/web` (MD3 Web Components), `@material/material-color-utilities` и `lit`. После импорта доступны как стандартные теги MD3 (`md-*`), так и кастомные компоненты Umi (`md3-*`).

## Установка

```bash
npm install @umi/components
```

## Использование

### Подключить всё сразу

```ts
import '@umi/components';
// Теперь доступны оба набора компонентов:
//   md-filled-button, md-checkbox, md-slider, md-tabs, ...  (стандартный @material/web)
//   md3-filled-button, md3-fab, md3-color-scheme, md3-font, md3-icon, ...
```

### Именованный импорт классов и типов

```ts
import { FilledButton, MaterialColor, SchemeVariant, SCHEME_VARIANTS } from '@umi/components';
```

---

## Компоненты

### Кнопки (`md3-*`)

| Тег | Класс | Описание |
|-----|-------|----------|
| `<md3-filled-button>` | `FilledButton` | Залитая кнопка |
| `<md3-tonal-button>` | `TonalButton` | Тональная кнопка |
| `<md3-elevated-button>` | `ElevatedButton` | Приподнятая кнопка |
| `<md3-outlined-button>` | `OutlinedButton` | Кнопка с рамкой |
| `<md3-text-button>` | `TextButton` | Текстовая кнопка |
| `<md3-extended-fab>` | `ExtendedFab` | Расширенная FAB |
| `<md3-fab>` | `Fab` | Круглая FAB |
| `<md3-icon-button>` | `IconButton` | Кнопка-иконка |

Все кнопки поддерживают:
- `size` 0–4 (XS/S/M/L/XL)
- `checkable` + `checked` — режим переключателя
- `iconName`, `iconType` (0=Outlined, 1=Rounded, 2=Sharp)
- `iconFill`, `iconWght`, `iconGrad` — variable font axes
- Group API для группировки кнопок

### Цвета

```html
<md3-color-scheme
  seed="#6750a4"
  variant="expressive"
  contrast="0"
  ?dark="${isDark}"
  success-seed="#386a20"
  warning-seed="#7c5800">
</md3-color-scheme>
```

Устанавливает ~60 CSS-переменных `--md-sys-color-*` на `document.body`.

**Варианты схемы** (`variant`): `tonal-spot` | `expressive` | `vibrant` | `fidelity` | `content` | `monochrome` | `neutral` | `rainbow` | `fruit-salad`

### Шрифты

```html
<md3-font symbols-style="Outlined" ?load-mono></md3-font>
```

Загружает Roboto, Material Symbols и устанавливает 15 токенов `--md-sys-typescale-*` на `:root`.

### Иконки

```html
<md3-icon name="home" fill="1" weight="600" size="32"></md3-icon>
<md3-icon name="star" icon-style="Rounded" color="var(--md-sys-color-primary)"></md3-icon>
```

---

## CSS-переменные

| Переменная | Источник | Назначение |
|-----------|----------|-----------|
| `--md-sys-color-primary` … | `<md3-color-scheme>` | Цветовые токены MD3 |
| `--md-sys-typescale-label-large-*` | `<md3-font>` | Типографская шкала |
| `--icon-font-family`, `--icon-fill`, … | компоненты | Иконочные переменные |

---

## Сборка

```bash
npm run build          # esbuild (bundle) + tsc (types)
npm run build:bundle   # только JS
npm run build:types    # только .d.ts
npm run dev            # watch mode
```
