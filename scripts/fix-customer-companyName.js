const fs = require('fs');

console.log('🔧 Fixing companyName references in customer.ts...');

const customerPath = 'packages/database/src/customer.ts';
let content = fs.readFileSync(customerPath, 'utf8');

// Replace all companyName with name
content = content.replace(/companyName: true/g, 'name: true');

fs.writeFileSync(customerPath, content);

console.log('✅ Fixed all companyName references in customer.ts');
