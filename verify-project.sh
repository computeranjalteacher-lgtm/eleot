#!/bin/bash
echo "=== ELEOT AI Evaluator - Project Verification ==="
echo ""
echo "Checking required files..."
echo ""

REQUIRED_FILES=(
  "manifest.json"
  "popup.html"
  "popup.css"
  "popup.js"
  "background.js"
  "utils.js"
  "config/eleot_ai_config.json"
  "README.md"
)

MISSING=0
for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file (MISSING)"
    MISSING=1
  fi
done

echo ""
echo "Optional files..."
OPTIONAL_FILES=(
  "proxy.js"
  "package.json"
  "generate-icons.html"
  "QUICKSTART.md"
)

for file in "${OPTIONAL_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "⚠️  $file (optional)"
  fi
done

echo ""
if [ $MISSING -eq 0 ]; then
  echo "✅ All required files present!"
  echo "✅ Project is ready to use!"
else
  echo "❌ Some required files are missing!"
fi

echo ""
echo "Icon files check..."
if [ -f "icons/icon16.png" ] && [ -f "icons/icon48.png" ] && [ -f "icons/icon128.png" ]; then
  echo "✅ All icons present"
else
  echo "⚠️  Icons missing - use generate-icons.html to create them"
fi

echo ""
echo "Verification complete!"
