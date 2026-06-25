const https = require('https');
const fs = require('fs');

const filePath = 'src/pages/ListingEditor.jsx';
const text = fs.readFileSync(filePath, 'utf8');
const m = text.match(/const amenityIconMap = \{([\s\S]*?)\};/);
if (!m) {
  console.error('map not found');
  process.exit(1);
}
const mapBody = m[1];
const keys = [...new Set([...mapBody.matchAll(/\s*([a-zA-Z0-9]+): \"([\-a-z0-9]+)\",/g)].map((x) => x[2]))];

https.get('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const missing = [];
    for (const key of keys) {
      const pat = new RegExp('\\\.fa-' + key + '(?=[:\\.\\s])');
      if (!pat.test(data) && key !== 'default') {
        missing.push(key);
      }
    }
    if (missing.length === 0) {
      console.log('All keys supported');
    } else {
      console.log('Missing keys:', missing.join(', '));
    }
  });
}).on('error', (e) => {
  console.error(e);
  process.exit(1);
});
