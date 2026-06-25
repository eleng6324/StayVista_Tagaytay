const fs = require('fs');
const parser = require('@babel/parser');
const path = 'c:/Users/garci/web/lodging-system/src/pages/UserProfile.jsx';
const code = fs.readFileSync(path, 'utf8');
try {
  parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('parsed');
} catch (e) {
  console.error('ERROR', e.message);
  console.error(e.loc);
}
