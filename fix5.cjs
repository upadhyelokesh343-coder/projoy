const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// I will just replace the specific section from line 875 to 889
const badPart = `                                  alert('Please select at least one winner!');
                                  return;
                                }

                                if (confirm('Are you sure you want to declare these winners and complete the tournament? This will credit prize money and close registrations.')) {
                                  try {
                                    await declareWinner(selectedT.id, winnersListToSubmit);
                                    alert('Tournament completed and winners declared successfully!');
                                  } catch (error) {
                                    console.error(error);
                                    alert('Failed to declare winners. See console log for errors.');
                                  });
                                });
                              });}`;

const goodPart = `                                  alert('Please select at least one winner!');
                                  return;
                                }
                                setConfirmModal({
                                  message: 'Are you sure you want to declare these winners and complete the tournament?',
                                  onConfirm: async () => {
                                    try {
                                      await declareWinner(selectedT.id, winnersListToSubmit);
                                      alert('Tournament completed and winners declared successfully!');
                                    } catch (error) {
                                      console.error(error);
                                      alert('Failed to declare winners. See console log for errors.');
                                    }
                                  }
                                });
                              }}`;

code = code.replace(badPart, goodPart);
fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
