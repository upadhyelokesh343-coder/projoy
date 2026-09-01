const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
code = code.replace(`                              });
                            }}
                            className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-neutral-950 hover:text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-[0.98]"`, `                              }
                            }}
                            className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-neutral-950 hover:text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-[0.98]"`);
fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
