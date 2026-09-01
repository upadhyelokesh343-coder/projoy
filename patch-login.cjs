const fs = require('fs');

let content = fs.readFileSync('src/pages/Login.tsx', 'utf8');

content = content.replace(
  '              </button>\n            </form>\n          ) : (',
  `              </button>
              
              <div className="mt-4 text-center">
                <p className="text-xs text-neutral-400">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => { setActiveTab('signup'); setErrorMsg(''); }} className="text-emerald-400 font-bold hover:underline">
                    Sign Up
                  </button>
                </p>
              </div>
            </form>
          ) : (`
);

content = content.replace(
  '              </button>\n            </form>\n          )}\n        </div>',
  `              </button>
              
              <div className="mt-4 text-center">
                <p className="text-xs text-neutral-400">
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setActiveTab('signin'); setErrorMsg(''); }} className="text-emerald-400 font-bold hover:underline">
                    Log In
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>`
);

fs.writeFileSync('src/pages/Login.tsx', content);
console.log('Done login patching');
