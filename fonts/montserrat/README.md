# Montserrat

Локальная variable-гарнитура сайта. Все веса 100–900, normal и italic.

| font-weight | Начертание |
| --- | --- |
| 100 | Thin |
| 200 | ExtraLight |
| 300 | Light |
| 400 | Regular |
| 500 | Medium |
| 600 | SemiBold |
| 700 | Bold |
| 800 | ExtraBold |
| 900 | Black |

Один WOFF2 содержит все веса своего языкового набора. Есть кириллица, расширенная кириллица, латиница, расширенная латиница и вьетнамский; normal и italic хранятся отдельно. Браузер выбирает набор по unicode-range, скачивать все файлы для каждой страницы не требуется.

Подключение: css/base/fonts.css. Общая переменная: --font-body в css/base/vars.css. Не дублируй @font-face в стилях блоков.

Источник: @fontsource-variable/montserrat 5.3.0 (Google Fonts v31).
https://www.npmjs.com/package/@fontsource-variable/montserrat/v/5.3.0
https://github.com/JulietaUla/Montserrat

Лицензия SIL Open Font License 1.1: LICENSE.
