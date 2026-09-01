const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// I'll just use Regex to find these messed up blocks and replace them.
code = code.replace(/onClick=\{async \(\) => \{\s*if \(confirm\(\`Mark this referral share from \$\{share\.sharerName\} as verified\?\`\)\) \{\s*await updateNaviShareStatus\(share\.id, 'verified'\);\s*\}\);\s*\}\);\}/, `onClick={() => {
                                  setConfirmModal({
                                    message: \`Mark this referral share from \$\{share.sharerName\} as verified?\`,
                                    onConfirm: async () => {
                                      await updateNaviShareStatus(share.id, 'verified');
                                    }
                                  });
                                }}`);

code = code.replace(/onClick=\{async \(\) => \{\s*if \(confirm\(\`Approve and credit ₹20 reward to \$\{share\.sharerName\} for recipient \$\{share\.recipientMobile\}\?\`\)\) \{\s*await updateNaviShareStatus\(share\.id, 'completed'\);\s*\}\);\s*\}\);\}/, `onClick={() => {
                                    setConfirmModal({
                                      message: \`Approve and credit ₹20 reward to \$\{share.sharerName\} for recipient \$\{share.recipientMobile\}?\`,
                                      onConfirm: async () => {
                                        await updateNaviShareStatus(share.id, 'completed');
                                      }
                                    });
                                  }}`);

code = code.replace(/onClick=\{async \(\) => \{\s*if \(confirm\(\`Reject referral share for recipient \$\{share\.recipientMobile\}\?\`\)\) \{\s*await updateNaviShareStatus\(share\.id, 'rejected'\);\s*\}\);\s*\}\);\}/, `onClick={() => {
                                    setConfirmModal({
                                      message: \`Reject referral share for recipient \$\{share.recipientMobile\}?\`,
                                      onConfirm: async () => {
                                        await updateNaviShareStatus(share.id, 'rejected');
                                      }
                                    });
                                  }}`);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
