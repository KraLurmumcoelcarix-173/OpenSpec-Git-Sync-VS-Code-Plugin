const sharp = require('sharp');
const fs = require('fs');

// 市场图标：深色圆角底 + 白色描边的同步双文件图案
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#1e1e2e"/>
  <g transform="translate(28,28) scale(3.0)" fill="none" stroke="#ffffff"
     stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 3.5h7l3 3v8.5a0.6 0.6 0 0 1-.6.6H4a0.6 0.6 0 0 1-.6-.6V4.1a0.6 0.6 0 0 1 .6-.6z"/>
    <path d="M10 8.5h7l3.5 3.5v8.4a0.6 0.6 0 0 1-.6.6h-9.8a0.6 0.6 0 0 1-.6-.6V9.1a0.6 0.6 0 0 1 .6-.6z"/>
    <path d="M17 8.5V12h3.5"/>
    <path d="M13.5 18.5V14m0 4.5l-1.6-1.6m1.6 1.6l1.6-1.6"/>
    <path d="M17 14v4.5m0-4.5l-1.6 1.6m1.6-1.6l1.6 1.6"/>
  </g>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .toFile('media/icon.png')
  .then(() => console.log('media/icon.png 生成成功'))
  .catch(err => console.error('失败:', err));