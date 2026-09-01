const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

const pattern = /<button[\s\S]*?onClick=\{async[\s\S]*?deleteTournament\(t.id\)[\s\S]*?<\/button>/;
const replace = `<button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({
                              message: 'Are you sure you want to delete this tournament?', 
                              onConfirm: async () => {
                                try {
                                  await deleteTournament(t.id);
                                  if (selectedTournamentId === t.id) setSelectedTournamentId(null);
                                } catch (err) {
                                  console.error(err);
                                  alert("Failed to delete tournament. Check console for details.");
                                }
                              }
                            });
                          }} 
                          className="p-2 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash className="w-5 h-5" />
                        </button>`;
code = code.replace(pattern, replace);
fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
