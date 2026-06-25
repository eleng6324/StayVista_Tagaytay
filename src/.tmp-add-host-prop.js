const fs = require('fs');
const path = require('path');
const root = path.join(process.cwd(), 'src', 'pages');
const files = fs.readdirSync(root).filter((f) => f.endsWith('.jsx'));
const updated = [];
for (const file of files) {
  const filePath = path.join(root, file);
  let text = fs.readFileSync(filePath, 'utf8');
  if (text.includes('homePath="/host"') && text.includes('<Navbar')) {
    if (text.includes('isHost')) continue;
    const newText = text.replace('menuOpen={menuOpen}', 'isHost menuOpen={menuOpen}');
    if (newText !== text) {
      fs.writeFileSync(filePath, newText, 'utf8');
      updated.push(file);
    }
  }
}
console.log('Updated files:', updated.join(', '));
