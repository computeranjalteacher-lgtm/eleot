# Icon Files

The extension requires icon files for display in Chrome. The icons should be placed in the `icons/` directory:

- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Creating Icons

### Option 1: Simple Placeholder Icons

You can create simple colored square icons using any image editor:

1. Create a 128x128 pixel image
2. Use a blue background (#2196F3) with white "E" text
3. Save as PNG
4. Resize to 48x48 and 16x16 for the other sizes

### Option 2: Online Icon Generator

Use free online tools like:
- [Favicon Generator](https://favicon.io/)
- [Canva](https://www.canva.com/)
- [IconKitchen](https://icon.kitchen/)

### Option 3: SVG to PNG

1. Create an SVG icon (128x128 viewBox)
2. Convert to PNG at required sizes using:
   - Online converter: https://cloudconvert.com/svg-to-png
   - Command line: `inkscape --export-type=png --export-width=128 icon.svg`

### Quick Command Line Creation (ImageMagick)

If you have ImageMagick installed:

```bash
# Create a simple blue icon with white "E" text
convert -size 128x128 xc:#2196F3 -font Arial-Bold -pointsize 80 -fill white -gravity center -annotate +0+0 "E" icons/icon128.png
convert icons/icon128.png -resize 48x48 icons/icon48.png
convert icons/icon128.png -resize 16x16 icons/icon16.png
```

### Temporary Solution

If icons are missing, Chrome will show a default extension icon. The extension will still function correctly, but custom icons improve user experience.

## Icon Design Tips

- Use a simple, recognizable design
- Ensure the icon is readable at small sizes (16x16)
- Maintain consistent style across all sizes
- Use high contrast colors
- Test visibility on light and dark backgrounds
