// PostToolUse hygiene hook: normalize trailing spaces and final newline in app source.
// Uses only Node built-ins so it works before frontend/backend dependencies exist.
const fs = require('node:fs');
const path = require('node:path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const event = JSON.parse(input);
    const filePath = event?.tool_input?.file_path;
    if (typeof filePath !== 'string') return;

    const root = path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
    const absolute = path.resolve(root, filePath);
    const relative = path.relative(root, absolute).replaceAll('\\', '/');
    if (relative.startsWith('../') || relative === '..' || path.isAbsolute(relative)) return;
    if (!/^(client|server)\//.test(relative) || !/\.(js|jsx|css)$/.test(relative)) return;
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return;

    const original = fs.readFileSync(absolute, 'utf8');
    const normalized = original.replace(/[ \t]+(?=\r?\n|$)/g, '').replace(/\r\n/g, '\n').replace(/\n*$/, '\n');
    if (normalized !== original) {
      fs.writeFileSync(absolute, normalized, 'utf8');
      process.stdout.write(`Normalized whitespace: ${relative}\n`);
    }
  } catch (error) {
    process.stderr.write(`Format hook error: ${error.message}\n`);
    process.exitCode = 2;
  }
});
