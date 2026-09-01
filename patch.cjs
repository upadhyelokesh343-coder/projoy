const fs = require('fs');
const path = require('path');

let content = fs.readFileSync('src/store.ts', 'utf8');

// Replace login method
content = content.replace(
  /login: async \(\{ phone, name, email, password, referredBy \}\) => \{[\s\S]*?loginWithEmailAndPassword:/,
  `login: async ({ phone, name, email, password, referredBy }) => {
    if (!password) throw new Error("Password is required for signup.");
    const cleanedEmail = email.trim().toLowerCase();
    
    // Fallback: Check if user exists since we use Anonymous Auth
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', cleanedEmail));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error("An account with this email already exists. Please log in.");
    }
    
    const userCredential = await signInAnonymously(auth);
    const userId = userCredential.user.uid;
    const userRef = doc(db, 'users', userId);
    
    const user: User = {
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
    await setDoc(userRef, { ...userDataToSave, password });
    
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
    const isAdminEmail = cleanedEmail === 'rajsjarma8@gmail.com';
    if (!password) throw new Error("Password is required.");
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', cleanedEmail));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      if (isAdminEmail && password === 'Raja90') {
         const cred = await signInAnonymously(auth);
         const userRef = doc(db, 'users', cred.user.uid);
         const newAdmin: User = {
           id: cred.user.uid, phone: '0000000000', name: 'Admin', email: cleanedEmail, gameId: '',
           balance: 0, role: 'admin', referralCode: 'ADMIN', referralEarnings: 0, loginMethod: 'email'
         };
         const { id, ...saveData } = newAdmin;
         await setDoc(userRef, { ...saveData, password });
         set({ currentUser: newAdmin });
         return;
      }
      throw new Error("Account not found. Please register.");
    }
    
    const docSnap = querySnapshot.docs[0];
    const userData = docSnap.data();
    if (userData.password !== password) throw new Error("Incorrect email or password. Please try again.");
    
    const cred = await signInAnonymously(auth);
    const newUserId = cred.user.uid;
    
    if (newUserId !== docSnap.id) {
      const migratedUser: User = { ...userData, id: newUserId, loginMethod: 'email' } as User;
      const { id, ...saveData } = migratedUser;
      await setDoc(doc(db, 'users', newUserId), saveData);
      await deleteDoc(doc(db, 'users', docSnap.id));
      set({ currentUser: migratedUser });
    } else {
      set({ currentUser: { id: docSnap.id, ...userData } as User });
    }
  },
  
  resetPassword: async (email) => {`
);

fs.writeFileSync('src/store.ts', content);
console.log('Done!');
