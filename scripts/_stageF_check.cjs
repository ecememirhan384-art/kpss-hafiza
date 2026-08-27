const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
for (let i = 1; i <= 12; i++) {
  const name = 'batch-' + String(i).padStart(2, '0') + '.json';
  const p = path.join(dir, name);
  if (!fs.existsSync(p)) {
    console.log(name, 'MISSING');
    continue;
  }
  try {
    const d = JSON.parse(fs.readFileSync(p, 'utf-8'));
    console.log(name, 'ok, records=', d.length);
  } catch (e) {
    console.log(name, 'INVALID JSON:', e.message);
  }
}
