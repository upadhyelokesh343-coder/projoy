const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Manual Credit
code = code.replace(
  `      if (window.confirm(confirmMsg)) {
        if (isDeposit) {
          await manualCreditUser(targetUser.id, amountNum);
          const successMsg = \`Successfully credited ₹\${amountNum} to \${targetUser.name}'s wallet!\`;
          showWalletMsg('success', successMsg);
        } else {
          await manualDebitUser(targetUser.id, amountNum);
          const successMsg = \`Successfully deducted ₹\${amountNum} from \${targetUser.name}'s wallet!\`;
          showWalletMsg('success', successMsg);
        }
        setManualCreditAmount('');
        setManualCreditUserIdentifier('');
      }`,
  `      setConfirmModal({
        message: confirmMsg,
        onConfirm: async () => {
          if (isDeposit) {
            await manualCreditUser(targetUser.id, amountNum);
            const successMsg = \`Successfully credited ₹\${amountNum} to \${targetUser.name}'s wallet!\`;
            showWalletMsg('success', successMsg);
          } else {
            await manualDebitUser(targetUser.id, amountNum);
            const successMsg = \`Successfully deducted ₹\${amountNum} from \${targetUser.name}'s wallet!\`;
            showWalletMsg('success', successMsg);
          }
          setManualCreditAmount('');
          setManualCreditUserIdentifier('');
        }
      });`
);

// Delete User
code = code.replace(
  `                    onClick={async () => {
                      if(confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                        try {
                          await useStore.getState().deleteUser(u.id);
                        } catch (err) {
                          console.error("Failed to delete user", err);
                          alert("Failed to delete user. Make sure you have the correct permissions.");
                        }
                      }
                    }}`,
  `                    onClick={() => {
                      setConfirmModal({
                        message: 'Are you sure you want to delete this user? This action cannot be undone.',
                        onConfirm: async () => {
                          try {
                            await useStore.getState().deleteUser(u.id);
                          } catch (err) {
                            console.error("Failed to delete user", err);
                            alert("Failed to delete user. Make sure you have the correct permissions.");
                          }
                        }
                      });
                    }}`
);

// Declare Winners
code = code.replace(
  `                                if (confirm('Are you sure you want to declare these winners and complete the tournament? This will credit prize money and close registrations.')) {
                                  try {
                                    await declareWinner(selectedT.id, winnersListToSubmit);
                                    alert('Tournament completed and winners declared successfully!');
                                  } catch (error) {
                                    console.error(error);
                                    alert('Failed to declare winners. See console log for errors.');
                                  }
                                }`,
  `                                setConfirmModal({
                                  message: 'Are you sure you want to declare these winners and complete the tournament? This will credit prize money and close registrations.',
                                  onConfirm: async () => {
                                    try {
                                      await declareWinner(selectedT.id, winnersListToSubmit);
                                      alert('Tournament completed and winners declared successfully!');
                                    } catch (error) {
                                      console.error(error);
                                      alert('Failed to declare winners. See console log for errors.');
                                    }
                                  }
                                });`
);

// Navi Shares - Verify
code = code.replace(
  `                                onClick={async () => {
                                  if (confirm(\`Mark this referral share from \${share.sharerName} as verified?\`)) {
                                    await updateNaviShareStatus(share.id, 'verified');
                                  }
                                }}`,
  `                                onClick={() => {
                                  setConfirmModal({
                                    message: \`Mark this referral share from \${share.sharerName} as verified?\`,
                                    onConfirm: async () => {
                                      await updateNaviShareStatus(share.id, 'verified');
                                    }
                                  });
                                }}`
);

// Navi Shares - Complete
code = code.replace(
  `                                  onClick={async () => {
                                    if (confirm(\`Approve and credit ₹20 reward to \${share.sharerName} for recipient \${share.recipientMobile}?\`)) {
                                      await updateNaviShareStatus(share.id, 'completed');
                                    }
                                  }}`,
  `                                  onClick={() => {
                                    setConfirmModal({
                                      message: \`Approve and credit ₹20 reward to \${share.sharerName} for recipient \${share.recipientMobile}?\`,
                                      onConfirm: async () => {
                                        await updateNaviShareStatus(share.id, 'completed');
                                      }
                                    });
                                  }}`
);

// Navi Shares - Reject
code = code.replace(
  `                                  onClick={async () => {
                                    if (confirm(\`Reject referral share for recipient \${share.recipientMobile}?\`)) {
                                      await updateNaviShareStatus(share.id, 'rejected');
                                    }
                                  }}`,
  `                                  onClick={() => {
                                    setConfirmModal({
                                      message: \`Reject referral share for recipient \${share.recipientMobile}?\`,
                                      onConfirm: async () => {
                                        await updateNaviShareStatus(share.id, 'rejected');
                                      }
                                    });
                                  }}`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
