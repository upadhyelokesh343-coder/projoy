const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
const lines = code.split('\n');
const fixedLines = [];
let skip = false;
for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('onClick={async (e) => {') && lines[i+1].includes('e.stopPropagation();') && lines[i+2].includes('setConfirmModal({message: \'Are you sure you want to delete this tournament?\', onConfirm: async () => {')) {
    fixedLines.push(lines[i]);
    fixedLines.push(lines[i+1]);
    fixedLines.push(lines[i+2]);
    fixedLines.push('                              try {');
    fixedLines.push('                                await deleteTournament(t.id);');
    fixedLines.push('                                if (selectedTournamentId === t.id) setSelectedTournamentId(null);');
    fixedLines.push('                              } catch (err) {');
    fixedLines.push('                                console.error(err);');
    fixedLines.push('                                alert("Failed to delete tournament. Check console for details.");');
    fixedLines.push('                              }');
    fixedLines.push('                            });');
    fixedLines.push('                          }}');
    i += 11;
  } else {
    fixedLines.push(lines[i]);
  }
}
fs.writeFileSync('src/pages/AdminDashboard.tsx', fixedLines.join('\n'));
