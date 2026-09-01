const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

const bad1 = `                                onClick={async () => {
                                    if (confirm(\`Mark this referral share from \${share.sharerName} as verified?\`)) {
                                      await updateNaviShareStatus(share.id, 'verified');
                                    });
                                  });}`;
const good1 = `                                onClick={() => {
                                  setConfirmModal({
                                    message: \`Mark this referral share from \${share.sharerName} as verified?\`,
                                    onConfirm: async () => {
                                      await updateNaviShareStatus(share.id, 'verified');
                                    }
                                  });
                                }}`;

const bad2 = `                                  onClick={async () => {
                                    if (confirm(\`Approve and credit ₹20 reward to \${share.sharerName} for recipient \${share.recipientMobile}?\`)) {
                                      await updateNaviShareStatus(share.id, 'completed');
                                    });
                                  });}`;
const good2 = `                                  onClick={() => {
                                    setConfirmModal({
                                      message: \`Approve and credit ₹20 reward to \${share.sharerName} for recipient \${share.recipientMobile}?\`,
                                      onConfirm: async () => {
                                        await updateNaviShareStatus(share.id, 'completed');
                                      }
                                    });
                                  }}`;
const bad3 = `                                  onClick={async () => {
                                    if (confirm(\`Reject referral share for recipient \${share.recipientMobile}?\`)) {
                                      await updateNaviShareStatus(share.id, 'rejected');
                                    });
                                  });}`;
const good3 = `                                  onClick={() => {
                                    setConfirmModal({
                                      message: \`Reject referral share for recipient \${share.recipientMobile}?\`,
                                      onConfirm: async () => {
                                        await updateNaviShareStatus(share.id, 'rejected');
                                      }
                                    });
                                  }}`;

code = code.replace(bad1, good1);
code = code.replace(bad2, good2);
code = code.replace(bad3, good3);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
