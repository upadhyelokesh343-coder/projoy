const fs = require('fs');

let content = fs.readFileSync('src/store.ts', 'utf8');

content = content.replace(
  'throw new Error("Account not found. Please register.");',
  'throw new Error("Account not found. Please Sign Up first.");'
);

const googleCheck = `
    if (userData.loginMethod === 'google') {
      throw new Error("This account uses Google Sign-In. Please click 'Sign in with Google' below.");
    }
    if (userData.password !== password) throw new Error("Incorrect email or password. Please try again.");
`;

content = content.replace(
  'if (userData.password !== password) throw new Error("Incorrect email or password. Please try again.");',
  googleCheck
);

fs.writeFileSync('src/store.ts', content);
console.log('Done store patching');
