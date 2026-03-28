// Run with: node generate-icons.js
// Generates simple PNG icons using Canvas API (Node.js with canvas package)
// If canvas is not available, icons will be generated as SVG fallbacks

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

// Generate SVG icon and save as placeholder
function generateSVGIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#6366f1"/>
  <text x="50%" y="54%" font-family="Arial,sans-serif" font-size="${size * 0.45}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">$</text>
</svg>`;
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), generateSVGIcon(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), generateSVGIcon(512));
console.log('SVG icons generated in /icons folder');
