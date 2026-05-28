const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, '..', 'context', 'WorkoutContext', 'exerciseLibrary', 'dataV2', 'exerciseImgs');
const outFile = path.join(__dirname, '..', 'context', 'WorkoutContext', 'exerciseLibrary', 'dataV2', 'imageMap.ts');

const files = fs.readdirSync(imgDir).filter(f => f.endsWith('.png')).sort();

const lines = files.map(f => `    '${f}': require('./exerciseImgs/${f}'),`);

const output = [
    '// Auto-generated — do not edit by hand.',
    '// Re-run: node scripts/generateImageMap.js',
    'export const IMAGE_MAP: Record<string, number> = {',
    ...lines,
    '}',
    '',
].join('\n');

fs.writeFileSync(outFile, output);
console.log(`Written ${files.length} entries to ${outFile}`);
