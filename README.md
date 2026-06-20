# GridGen

A clean, browser-based tool for laying a coordinate grid over any image and exporting the result as a PDF. Useful for archaeologists documenting sites, artists using the grid drawing method, game masters making battle maps, surveyors marking reference points, or anyone who needs a quick way to add a labeled grid to a photo.

No installation, no build step, no server. Open the HTML file in a browser and you're done.

## Features

- **Image upload** — drag and drop, or click to pick a PNG, JPG, or WEBP
- **Two grid modes** — define the grid by number of cells (e.g., 10 × 10) or by cell size in pixels (e.g., 50 px)
- **Customizable appearance** — line color (presets + custom picker), thickness (1–10 px), and opacity
- **Coordinate labels**
  - Style: chess notation (A1, B2…) or numeric (1,1 / 1,2)
  - Position: outside the image in a clean white margin, or inside each cell with an automatic legibility halo
  - Origin: top-left or bottom-left
- **PDF export** — A4, auto-orientation, full image resolution preserved


## Usage

1. Upload or drop an image into the preview area.
2. Pick a grid mode and configure columns/rows or cell size.
3. Adjust color, thickness, and opacity until the grid is readable against your image.
4. Toggle coordinate labels and choose the style, position, and origin.
5. Click **Download PDF**.

The exported file is named after the original image (e.g., `site-photo-grid.pdf`).

## Tips

- **Outside labels** are most readable for printing and reference. **Inside labels** save space when every cell needs to be identified at a glance.
- For dark images, switch the line color to white. The label color auto-adjusts for legibility.
- Bottom-left origin matches conventional Cartesian coordinates and chess boards. Top-left matches image-pixel and spreadsheet conventions.

## Documentation

A wiki-style guide is published alongside the app (English, Dutch, and German):

- **[How GridGen Works](https://aborndev.github.io/GridGen/wiki/)** — a full user guide covering uploading, grid modes, appearance, labels, and PDF export.
- **[Grids on maps](https://aborndev.github.io/GridGen/wiki/map-grid.html)** — adding a coordinate reference grid to a map image and exporting a PDF.
- **[Technical Reference](https://aborndev.github.io/GridGen/wiki/technical.html)** — the tech stack, rendering pipeline, label algorithm, and PDF export internals.

Dutch versions live under [`/nl/`](https://aborndev.github.io/GridGen/nl/) and German under [`/de/`](https://aborndev.github.io/GridGen/de/).

## Build & internationalization

The published HTML is **generated**. Source lives in `site/` and a zero-dependency Node script renders one set of templates into per-language static pages (English at the root, other languages under `/<lang>/`), along with `hreflang` tags, per-language metadata and JSON-LD, a language switcher, and `sitemap.xml`.

```
node build.js
```

Edit the templates in `site/`, never the generated output (`index.html`, `wiki/`, `nl/`). To add a language:

1. Add `site/locales/<lang>.json` (titles, descriptions, nav labels, schema strings).
2. Add translated bodies under `site/pages/<lang>/`.
3. Register the language code in `LOCALES` in `build.js`.
4. Run `node build.js`.

> **Changing the domain?** Absolute URLs (canonical, Open Graph, `hreflang`, sitemap) are built from `SITE_URL` in `build.js`. Update that one constant and re-run the build; also update the `Sitemap:` line in `robots.txt`.

## Tech

Plain HTML, CSS, and vanilla JavaScript for the app. PDF generation via [jsPDF](https://github.com/parallax/jsPDF). No runtime frameworks or bundler; the only tooling is the static-site generator (`build.js`, no dependencies).

## Browser support

Any modern browser with Canvas and File API support — Chrome, Firefox, Safari, and Edge all work.

## License

GNU GENERAL PUBLIC LICENSE V3