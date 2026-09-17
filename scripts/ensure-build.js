const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const dist = path.join(__dirname, '..', 'client', 'dist', 'index.html');
if (fs.existsSync(dist)) {
  process.exit(0);
}

console.log('首次启动：正在构建前端…');
const result = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  shell: process.platform === 'win32',
});
process.exit(result.status || 0);
