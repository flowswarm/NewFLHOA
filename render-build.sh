#!/bin/bash
echo "Forcing Puppeteer to reinstall Chrome..."
rm -rf ~/.cache/puppeteer
npx puppeteer browsers install chrome --force
ls ~/.cache/puppeteer/chrome/*/chrome-linux64 || echo "Chrome not found!"
