const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
code = code.replace(/      \)\}\n\n      \{\/\* Transactions \/ Wallet Tab \*\/\}/g, '      ) : null}\n\n      {/* Transactions / Wallet Tab */}');
fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
