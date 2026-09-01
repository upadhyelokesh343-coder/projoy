const fs = require('fs');

let content = fs.readFileSync('src/store.ts', 'utf8');

// Replace imports
content = content.replace(
  "signInAnonymously",
  "createUserWithEmailAndPassword, signInWithEmailAndPassword"
);

// Replace login method
content = content.replace(
  /login: async \(\{ phone, name, email, password, referredBy \}\) => \{[\s\S]*?loginWithEmailAndPassword:/,
  `login: async ({ phone, name, email, password, referredBy }) => {
    if (!password) throw new Error("Password is required for signup.");
    const cleanedEmail = email.trim().toLowerCase();
    
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, cleanedEmail, password);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        throw new Error("An account with this email already exists. Please log in.");
      }
      throw err;
    }
    
    const userId = userCredential.user.uid;
    const userRef = doc(db, 'users', userId);
    
    const user = {
      id: userId,
      phone,
      name,
      email: cleanedEmail,
      gameId: '',
      balance: 0,
      role: (cleanedEmail === 'rajsjarma8@gmail.com' || cleanedEmail === 'admin@nexus.com') ? 'admin' : 'user',
      referralCode: generateId().toUpperCase(),
      referralEarnings: 0,
      referredBy,
      loginMethod: 'email',
    };
    
    const { id, ...userDataToSave } = user;
    await setDoc(userRef, userDataToSave);
    
    if (get().tournaments.length === 0) {
      try {
        await setDoc(doc(db, 'tournaments', 't-1'), {
          title: 'BGMI Weekly Showdown', game: 'BGMI', banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop',
          prizePool: 5000, entryFee: 50, maxSlots: 100, startTime: new Date(Date.now() + 86400000).toISOString(), status: 'upcoming', participants: []
        });
      } catch (err) {}
    }
    set({ currentUser: user });
  },
  
  loginWithEmailAndPassword:`
);

// Replace loginWithEmailAndPassword
content = content.replace(
  /loginWithEmailAndPassword: async \(email, password\) => \{[\s\S]*?resetPassword: async \(email\) => \{/,
  `loginWithEmailAndPassword: async (email, password) => {
    const cleanedEmail = email.trim().toLowerCase();
    if (!password) throw new Error("Password is required.");
    
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, cleanedEmail, password);
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', cleanedEmail));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          if (userData.loginMethod === 'google') {
            throw new Error("This account uses Google Sign-In. Please click 'Sign in with Google' below.");
          }
        }
        
        throw new Error("Account not found. Please Sign Up first.");
      }
      if (err.code === 'auth/wrong-password') {
        throw new Error("Incorrect email or password. Please try again.");
      }
      throw err;
    }
    
    const userId = userCredential.user.uid;
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists()) {
      set({ currentUser: { id: docSnap.id, ...docSnap.data() } });
    } else {
      // In case they just authenticated but document is missing,
      // you could theoretically handle it, but realistically if they are signed in they should have a doc.
      // Re-trigger listener to handle this gracefully if needed.
    }
  },
  
  resetPassword: async (email) => {`
);

fs.writeFileSync('src/store.ts', content);
console.log('Done auth patching');
