const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// 1. Manual Credit Confirm
code = code.replace(/if \(window\.confirm\(confirmMsg\)\) \{/, `setConfirmModal({ message: confirmMsg, onConfirm: async () => {`);

// 2. Delete User
code = code.replace(/if\(confirm\('Are you sure you want to delete this user\? This action cannot be undone\.'\)\) \{/, `setConfirmModal({ message: 'Are you sure you want to delete this user? This action cannot be undone.', onConfirm: async () => {`);

// 3. Declare Winners
code = code.replace(/if \(confirm\('Are you sure you want to declare these winners and complete the tournament\? This will credit prize money and close registrations\.'\)\) \{/, `setConfirmModal({ message: 'Are you sure you want to declare these winners and complete the tournament? This will credit prize money and close registrations.', onConfirm: async () => {`);

// 4. Mark verified
code = code.replace(/if \(confirm\(\`Mark this referral share from \$\{share.sharerName\} as verified\?\`\)\) \{/, `setConfirmModal({ message: \`Mark this referral share from \$\{share.sharerName\} as verified?\`, onConfirm: async () => {`);

// 5. Approve & credit
code = code.replace(/if \(confirm\(\`Approve and credit ₹20 reward to \$\{share.sharerName\} for recipient \$\{share.recipientMobile\}\?\`\)\) \{/, `setConfirmModal({ message: \`Approve and credit ₹20 reward to \$\{share.sharerName\} for recipient \$\{share.recipientMobile\}?\`, onConfirm: async () => {`);

// 6. Reject
code = code.replace(/if \(confirm\(\`Reject referral share for recipient \$\{share.recipientMobile\}\?\`\)\) \{/, `setConfirmModal({ message: \`Reject referral share for recipient \$\{share.recipientMobile\}?\`, onConfirm: async () => {`);

// 7. Fix closing tags: for each replaced setConfirmModal we need to close the `});`
// Actually, it's easier to manually replace the specific closing brackets, or just use a generic strategy.
// Let's do it by regexing the blocks. Or I can just write a more precise replace.

// I'll undo the first replace to make it safer.
