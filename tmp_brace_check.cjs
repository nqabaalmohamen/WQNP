const fs = require('fs');
const path = 'src/App.tsx';
const s = fs.readFileSync(path, 'utf8').split(/\r?\n/);
let bal = 0;
let maxBal = 0, maxLine = 0;
let firstNeg = -1;
const perLine = [];
for (let i = 0; i < s.length; i++) {
  const line = s[i];
  for (const ch of line) {
    if (ch === '{') bal++;
    else if (ch === '}') bal--;
  }
  perLine.push(bal);
  if (bal > maxBal) { maxBal = bal; maxLine = i + 1; }
  if (bal < 0 && firstNeg === -1) firstNeg = i + 1;
}
console.log('lines', s.length);
console.log('endBalance', bal);
console.log('maxBal', maxBal, 'at line', maxLine);
console.log('firstNegativeBalanceLine', firstNeg === -1 ? 'none' : firstNeg);
console.log('snippet around maxLine:');
const start = Math.max(1, maxLine - 6);
const end = Math.min(s.length, maxLine + 6);
for (let i = start; i <= end; i++) {
  console.log(i.toString().padStart(4) + ': ' + s[i-1]);
}
console.log('\nlast 20 lines:');
for (let i = Math.max(1, s.length-19); i <= s.length; i++) {
  console.log(i.toString().padStart(4) + ': ' + s[i-1]);
}

// Find unmatched opening brace by scanning from file end
let bal2 = 0;
let unmatchedLine = -1;
for (let i = s.length - 1; i >= 0; i--) {
  const line = s[i];
  for (let j = line.length - 1; j >= 0; j--) {
    const ch = line[j];
    if (ch === '}') bal2++;
    else if (ch === '{') bal2--;
    if (bal2 < 0) { unmatchedLine = i + 1; break; }
  }
  if (unmatchedLine !== -1) break;
}
console.log('unmatched opening brace at line', unmatchedLine === -1 ? 'none' : unmatchedLine);
