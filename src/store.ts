import { create } from 'zustand';
import { User, Tournament, Transaction, TransactionStatus, TournamentStatus, WinnerRecord, NaviShare, CaptchaHold, Message } from './types';
import { db, auth } from './lib/firebase';
import { collection, doc, setDoc, getDoc, onSnapshot, updateDoc, writeBatch, deleteDoc, query, where, getDocs, increment } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from 'firebase/auth';

const generateId = () => Math.random().toString(36).substring(2, 9);

const getInitialUser = (): User | null => {
  try {
    const stored = localStorage.getItem('projoy_currentUser');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
};

interface AppState {
  users: User[];
  tournaments: Tournament[];
  transactions: Transaction[];
  currentUser: User | null;

  // Initialization
  initFirebaseSync: () => void;

  // Actions
  login: (userData: { phone: string; name: string; email: string; password?: string; referredBy?: string }) => Promise<void>;
  loginWithEmailAndPassword: (email: string, password?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  
  // Wallet
  requestDeposit: (amount: number, reference: string, paymentAmount?: number) => Promise<void>;
  requestWithdraw: (amount: number, reference: string) => Promise<void>;
  processReferral: (userId: string) => Promise<void>;
  
  // Tournaments
  joinTournament: (tournamentId: string) => Promise<{ success: boolean; message: string }>;
  joinTournamentExtended: (tournamentId: string, freeFireId: string, freeFireName: string) => Promise<{ success: boolean; message: string }>;
  
  // Admin Actions
  createTournament: (t: Omit<Tournament, 'id' | 'participants' | 'status'>) => Promise<void>;
  updateTournament: (id: string, updates: Partial<Tournament>) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateTransactionStatus: (transactionId: string, status: TransactionStatus) => Promise<void>;
  declareWinner: (tournamentId: string, winners: { userId: string; position: number; prize: number }[]) => Promise<void>;
  manualCreditUser: (userId: string, amount: number) => Promise<void>;
  manualDebitUser: (userId: string, amount: number) => Promise<void>;
  
  // Navi Share Actions
  naviShares: NaviShare[];
  submitNaviShare: (sharerMobile: string, recipientMobile: string) => Promise<string>;
  updateNaviShareStatus: (shareId: string, status: 'pending' | 'verified' | 'completed' | 'rejected') => Promise<void>;
  claimReferralMilestone: () => Promise<void>;

  // Admin Settings
  adminUpiId: string;
  adminQrCodeUrl: string;
  isDepositLocked: boolean;
  depositLockMessage: string;
  updateAdminSettings: (upiId: string, qrCodeUrl: string, isDepositLocked?: boolean, depositLockMessage?: string) => Promise<void>;
  
  // Messaging Actions
  sendMessage: (text: string, userId: string, receiverId: string, isAdmin?: boolean) => Promise<void>;
}

let syncInitialized = false;

export const useStore = create<AppState>()((set, get) => ({
  users: [],
  tournaments: [],
  transactions: [],
  naviShares: [],
  currentUser: getInitialUser(),
  adminUpiId: '7285009425-2@ybl',
  adminQrCodeUrl: '',
  isDepositLocked: false,
  depositLockMessage: 'Deposit is currently locked by admin. Please try again later.',

  initFirebaseSync: () => {
    if (syncInitialized) return;
    syncInitialized = true;

    // Listen to Firebase Auth state
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user from Firestore using their unique ID
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(userRef);
          
          if (docSnap.exists()) {
            const userData = { id: docSnap.id, ...docSnap.data() } as User;
            set({ currentUser: userData });
            localStorage.setItem('projoy_currentUser', JSON.stringify(userData));
          } else {
            // Fallback for migrated old users who might not have updated their ID yet.
            // This is wrapped in try/catch to gracefully fail if rules prevent collection queries.
            try {
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('email', '==', firebaseUser.email));
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                const legacyDocSnap = querySnapshot.docs[0];
                const userData = { id: legacyDocSnap.id, ...legacyDocSnap.data() } as User;
                set({ currentUser: userData });
                localStorage.setItem('projoy_currentUser', JSON.stringify(userData));
              }
            } catch (qErr) {
              console.warn("Could not query legacy user format:", qErr);
            }
          }
        } catch (err) {
          console.error("Failed to load user session data:", err);
        }
      } else {
        if (!localStorage.getItem('projoy_currentUser')) {
          set({ currentUser: null });
        }
      }
    });

    // Listen to users
    onSnapshot(collection(db, 'users'), async (snapshot) => {
      const usersData: User[] = [];
      snapshot.forEach(doc => usersData.push({ id: doc.id, ...doc.data() } as User));
      
      const { currentUser } = get();
      let updatedCurrentUser = currentUser ? usersData.find(u => u.id === currentUser.id) || currentUser : null;
      
      if (updatedCurrentUser && !updatedCurrentUser.referralCode) {
        const newCode = generateId().toUpperCase();
        updatedCurrentUser = { ...updatedCurrentUser, referralCode: newCode };
        try {
          await updateDoc(doc(db, 'users', updatedCurrentUser.id), { referralCode: newCode });
        } catch (e) {
          console.warn("Could not auto-generate missing referral code:", e);
        }
      }
      
      set({ users: usersData, currentUser: updatedCurrentUser });
      if (updatedCurrentUser) {
        localStorage.setItem('projoy_currentUser', JSON.stringify(updatedCurrentUser));
      }
    }, (error) => {
      console.warn("Could not sync users:", error.message);
    });

    // Listen to tournaments
    onSnapshot(collection(db, 'tournaments'), (snapshot) => {
      const tData: Tournament[] = [];
      snapshot.forEach(doc => tData.push({ id: doc.id, ...doc.data() } as Tournament));
      // sort by start time maybe, or leave as is
      set({ tournaments: tData });
    }, (error) => {
      console.warn("Could not sync tournaments:", error.message);
    });

    // Listen to transactions
    onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const txData: Transaction[] = [];
      snapshot.forEach(doc => txData.push({ id: doc.id, ...doc.data() } as Transaction));
      // sort newest first
      txData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      set({ transactions: txData });
    }, (error) => {
      console.warn("Could not sync transactions:", error.message);
    });

    // Listen to admin settings (UPI & QR)
    onSnapshot(doc(db, 'settings', 'appConfig'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        set({
          adminUpiId: data.adminUpiId || '7285009425-2@ybl',
          adminQrCodeUrl: data.adminQrCodeUrl || '',
          isDepositLocked: data.isDepositLocked || false,
          depositLockMessage: data.depositLockMessage || 'Deposit is currently locked by admin. Please try again later.'
        });
      }
    }, (error) => {
      console.warn("Could not sync app settings:", error.message);
    });

    // Listen to Navi Shares
    onSnapshot(collection(db, 'navi_shares'), (snapshot) => {
      const sharesData: NaviShare[] = [];
      snapshot.forEach(doc => sharesData.push({ id: doc.id, ...doc.data() } as NaviShare));
      sharesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      set({ naviShares: sharesData });
    }, (error) => {
      console.warn("Could not sync navi_shares:", error.message);
    });
  },

  login: async ({ phone, name, email, password, referredBy }) => {
    if (!password) throw new Error("Password is required for signup.");
    const cleanedEmail = email.trim().toLowerCase();
    
    let userId = 'user_' + generateId();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanedEmail, password);
      userId = userCredential.user.uid;
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        throw new Error("An account with this email already exists. Please log in.");
      }
      if (err.code === 'auth/operation-not-allowed') {
        console.warn("Firebase Email/Password auth is not enabled in Firebase Console. Falling back to local session mode.");
      } else {
        throw err;
      }
    }
    
    const user: User = {
      id: userId,
      phone: phone || '',
      name: name || cleanedEmail.split('@')[0],
      email: cleanedEmail,
      password: password,
      gameId: '',
      balance: 0,
      role: (cleanedEmail === 'rajsjarma8@gmail.com' || cleanedEmail === 'admin@nexus.com') ? 'admin' : 'user',
      referralCode: generateId().toUpperCase(),
      referralEarnings: 0,
      referredBy,
      loginMethod: 'email',
    };
    
    try {
      const userRef = doc(db, 'users', userId);
      const { id, ...userDataToSave } = user;
      await setDoc(userRef, userDataToSave);
    } catch (dbErr) {
      console.warn("Could not save user to Firestore, using local session:", dbErr);
    }
    
    set({ currentUser: user });
    localStorage.setItem('projoy_currentUser', JSON.stringify(user));
  },
  
  loginWithEmailAndPassword: async (email, password) => {
    const cleanedEmail = email.trim().toLowerCase();
    if (!password) throw new Error("Password is required.");
    
    let userId = 'user_' + generateId();
    let existingUserData: any = null;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanedEmail, password);
      userId = userCredential.user.uid;
      const userRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userRef);
      
      if (docSnap.exists()) {
        const userData = { id: docSnap.id, ...docSnap.data() } as User;
        if (userData.password !== password) {
          userData.password = password;
          try {
            await setDoc(userRef, { password }, { merge: true });
          } catch (e) {}
        }
        set({ currentUser: userData });
        localStorage.setItem('projoy_currentUser', JSON.stringify(userData));
        return;
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        console.warn("Firebase Email/Password auth is not enabled in Firebase Console. Falling back to local session mode.");
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        if (err.code === 'auth/wrong-password') {
          throw new Error("Incorrect email or password. Please try again.");
        }
      } else {
        throw err;
      }
    }

    // Always check if an existing user record exists in Firestore by email to prevent balance loss
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', cleanedEmail));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        existingUserData = { id: existingDoc.id, ...existingDoc.data() } as User;
      }
    } catch (dbQueryErr) {
      console.warn("Could not query existing user by email:", dbQueryErr);
    }

    if (cleanedEmail === 'rajsjarma8@gmail.com') {
      if (existingUserData) {
        existingUserData.role = 'admin';
        if (existingUserData.balance < 1000) existingUserData.balance = 1000;
      }
    }

    if (existingUserData) {
      if (existingUserData.password !== password) {
        existingUserData.password = password;
        try {
          const userRef = doc(db, 'users', existingUserData.id);
          await setDoc(userRef, { password }, { merge: true });
        } catch (e) {}
      }
      set({ currentUser: existingUserData });
      localStorage.setItem('projoy_currentUser', JSON.stringify(existingUserData));
      try {
        const userRef = doc(db, 'users', existingUserData.id);
        await setDoc(userRef, { role: existingUserData.role, balance: existingUserData.balance }, { merge: true });
      } catch (e) {}
      return;
    }

    // Fallback new user if none found anywhere
    let fallbackUser: User = {
      id: userId,
      phone: '',
      name: cleanedEmail.split('@')[0],
      email: cleanedEmail,
      password: password,
      gameId: '',
      balance: cleanedEmail === 'rajsjarma8@gmail.com' ? 1000 : 100, // starting balance
      role: (cleanedEmail === 'rajsjarma8@gmail.com' || cleanedEmail === 'admin@nexus.com') ? 'admin' : 'user',
      referralCode: generateId().toUpperCase(),
      referralEarnings: 0,
      loginMethod: 'email',
    };

    try {
      const userRef = doc(db, 'users', userId);
      const { id, ...userDataToSave } = fallbackUser;
      await setDoc(userRef, userDataToSave, { merge: true });
    } catch (e) {}

    set({ currentUser: fallbackUser });
    localStorage.setItem('projoy_currentUser', JSON.stringify(fallbackUser));
  },
  
  resetPassword: async (email) => {
    await sendPasswordResetEmail(auth, email);
  },

  googleLogin: async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userId = user.uid;
    const email = user.email?.toLowerCase() || '';
    const userRef = doc(db, 'users', userId);
    
    let snap;
    try {
      snap = await getDoc(userRef);
    } catch (err: any) {
      throw new Error(`Permission Denied: Cannot read users collection during Google login. ${err.message}`);
    }

    let dbUser: User;
    if (snap.exists()) {
      dbUser = { id: userId, ...snap.data() } as User;
    } else {
      // Check if user already exists by email in Firestore to preserve balance/data
      let existingEmailUser: User | null = null;
      try {
        if (email) {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const existingDoc = querySnapshot.docs[0];
            existingEmailUser = { id: existingDoc.id, ...existingDoc.data() } as User;
          }
        }
      } catch (e) {}

      if (existingEmailUser) {
        dbUser = existingEmailUser;
      } else {
        dbUser = {
          id: userId,
          phone: user.phoneNumber || '',
          name: user.displayName || email.split('@')[0],
          email: email,
          gameId: '',
          balance: email === 'rajsjarma8@gmail.com' ? 1000 : 0,
          role: (email === 'rajsjarma8@gmail.com') ? 'admin' : 'user',
          referralCode: generateId().toUpperCase(),
          referralEarnings: 0,
          loginMethod: 'google',
        };
        const { id, ...userDataToSave } = dbUser;
        try {
          await setDoc(userRef, userDataToSave, { merge: true });
        } catch (err: any) {
          throw new Error(`Permission Denied: Cannot write to users collection during Google login. ${err.message}`);
        }
      }
    }

    if (email === 'rajsjarma8@gmail.com') {
      dbUser.role = 'admin';
      if (dbUser.balance < 1000) dbUser.balance = 1000;
      try {
        await setDoc(doc(db, 'users', dbUser.id), { role: 'admin', balance: dbUser.balance }, { merge: true });
      } catch (e) {}
    }

    set({ currentUser: dbUser });
    localStorage.setItem('projoy_currentUser', JSON.stringify(dbUser));
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("SignOut error:", e);
    }
    localStorage.removeItem('projoy_currentUser');
    set({ currentUser: null });
  },

  updateProfile: async (updates) => {
    const { currentUser } = get();
    if (!currentUser) return;
    
    const userRef = doc(db, 'users', currentUser.id);
    await updateDoc(userRef, updates);
    // Realtime listener will update state
  },

  requestDeposit: async (amount, reference, paymentAmount) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const txId = generateId();
    await setDoc(doc(db, 'transactions', txId), {
      userId: currentUser.id,
      type: 'deposit',
      amount, // Base amount to credit
      requestedAmount: amount,
      paymentAmount: paymentAmount || amount,
      status: 'pending',
      date: new Date().toISOString(),
      reference,
    });
  },

  requestWithdraw: async (amount, reference) => {
    const { currentUser } = get();
    if (!currentUser || currentUser.balance < amount) return;

    // Deduct balance immediately
    const userRef = doc(db, 'users', currentUser.id);
    await updateDoc(userRef, { balance: currentUser.balance - amount });
    
    const txId = generateId();
    await setDoc(doc(db, 'transactions', txId), {
      userId: currentUser.id,
      type: 'withdraw',
      amount,
      status: 'pending',
      date: new Date().toISOString(),
      reference,
    });
  },

  processReferral: async (userId: string) => {
    const { users } = get();
    const user = users.find(u => u.id === userId);
    if (!user || !user.referredBy || user.hasPerformedFirstAction) return;

    const batch = writeBatch(db);
    
    // Update user to indicate their payment/deposit has been verified
    batch.update(doc(db, 'users', userId), { hasPerformedFirstAction: true });
    
    await batch.commit();
  },

  joinTournament: async (tournamentId) => {
    const { currentUser, tournaments } = get();
    if (!currentUser) return { success: false, message: 'Please login first' };
    
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return { success: false, message: 'Tournament not found' };
    
    const participants = tournament.participants || [];
    
    if (participants.find(p => p.userId === currentUser.id)) {
      return { success: false, message: 'Already joined this tournament' };
    }

    if (participants.length >= tournament.maxSlots) {
      return { success: false, message: 'Tournament is full' };
    }

    if (currentUser.balance < tournament.entryFee) {
      return { success: false, message: 'Insufficient balance' };
    }

    // Run as batch to deduct fee, join tournament, and create transaction
    const batch = writeBatch(db);
    
    const userRef = doc(db, 'users', currentUser.id);
    batch.update(userRef, { balance: currentUser.balance - tournament.entryFee });
    
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    batch.update(tournamentRef, { participants: [...participants, { userId: currentUser.id, freeFireId: '', freeFireName: '' }] });
    
    const txId = generateId();
    const txRef = doc(db, 'transactions', txId);
    batch.set(txRef, {
      userId: currentUser.id,
      type: 'join_fee',
      amount: tournament.entryFee,
      status: 'completed',
      date: new Date().toISOString(),
      reference: tournament.id,
    });

    await batch.commit();
    get().processReferral(currentUser.id);
    return { success: true, message: 'Successfully joined tournament' };
  },

  // --- Admin Actions ---
  createTournament: async (t) => {
    const newId = generateId();
    const data = Object.entries({
      ...t,
      status: 'upcoming',
      participants: [],
      createdAt: new Date().toISOString()
    }).reduce((acc, [k, v]) => {
      if (v !== undefined) acc[k] = v;
      return acc;
    }, {} as any);
    await setDoc(doc(db, 'tournaments', newId), data);
  },

  updateTournament: async (id, updates) => {
    const safeUpdates = Object.entries(updates).reduce((acc, [k, v]) => {
      if (v !== undefined) acc[k] = v;
      return acc;
    }, {} as any);
    await updateDoc(doc(db, 'tournaments', id), safeUpdates);
  },

  deleteTournament: async (id) => {
    await deleteDoc(doc(db, 'tournaments', id));
    set(state => ({ tournaments: state.tournaments.filter(t => t.id !== id) }));
  },

  deleteUser: async (id) => {
    await deleteDoc(doc(db, 'users', id));
    set(state => ({ users: state.users.filter(u => u.id !== id) }));
  },

  updateTransactionStatus: async (transactionId, status) => {
    const { transactions } = get();
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx || tx.status !== 'pending') return;

    const batch = writeBatch(db);
    const txRef = doc(db, 'transactions', transactionId);
    batch.update(txRef, { status });

    const userRef = doc(db, 'users', tx.userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const currentBalance = userSnap.data().balance || 0;
      
      if (tx.type === 'deposit' && status === 'approved') {
        // Check if first deposit
        const userDeposits = transactions.filter(t => t.userId === tx.userId && t.type === 'deposit' && t.status === 'approved');
        
        if (userDeposits.length === 0) {
          const bonusAmount = Math.floor(tx.amount * 0.2); // 20% bonus
          batch.update(userRef, { balance: currentBalance + tx.amount + bonusAmount });
          
          const bonusTxId = generateId();
          batch.set(doc(db, 'transactions', bonusTxId), {
            userId: tx.userId,
            type: 'prize',
            amount: bonusAmount,
            status: 'completed',
            date: new Date().toISOString(),
            reference: 'First Deposit Bonus (20%)',
          });
        } else {
          batch.update(userRef, { balance: currentBalance + tx.amount });
        }
      } else if (tx.type === 'withdraw' && status === 'rejected') {
        batch.update(userRef, { balance: currentBalance + tx.amount });
      }
    }
    
    await batch.commit();
    get().processReferral(tx.userId);
  },


  joinTournamentExtended: async (tournamentId: string, freeFireId: string, freeFireName: string) => {
    const { currentUser, tournaments } = get();
    if (!currentUser) return { success: false, message: "Please login first" };
    
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return { success: false, message: "Tournament not found" };
    
    const participants = tournament.participants || [];
    if (participants.find(p => p.userId === currentUser.id)) {
      return { success: false, message: "Already joined this tournament" };
    }

    if (participants.length >= tournament.maxSlots) {
      return { success: false, message: "Tournament is full" };
    }

    if (currentUser.balance < tournament.entryFee) {
      return { success: false, message: "Insufficient balance" };
    }

    const batch = writeBatch(db);
    
    const userRef = doc(db, "users", currentUser.id);
    batch.update(userRef, { balance: currentUser.balance - tournament.entryFee });
    
    const tournamentRef = doc(db, "tournaments", tournamentId);
    batch.update(tournamentRef, { 
        participants: [...participants, { 
          userId: currentUser.id, 
          userName: currentUser.name, 
          phone: currentUser.phone, 
          freeFireId, 
          freeFireName 
        }]
    });
    
    const txId = generateId();
    const txRef = doc(db, "transactions", txId);
    batch.set(txRef, {
      userId: currentUser.id,
      type: "join_fee",
      amount: tournament.entryFee,
      status: "completed",
      date: new Date().toISOString(),
      reference: tournament.id,
    });

    await batch.commit();
    get().processReferral(currentUser.id);
    return { success: true, message: "Successfully joined tournament" };
  },

  declareWinner: async (tournamentId, winnersList) => {
    const { tournaments, users } = get();
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return;

    const batch = writeBatch(db);
    
    // Construct full WinnerRecord list
    const fullyMappedWinners: WinnerRecord[] = [];
    
    winnersList.forEach(w => {
      // Find the user info in the tournament participants or users list
      const participant = tournament.participants?.find(p => p.userId === w.userId);
      const user = users.find(u => u.id === w.userId);
      
      const winnerName = participant?.userName || user?.name || "Player";
      const fFireId = participant?.freeFireId || user?.gameId || "";
      const fFireName = participant?.freeFireName || "In-game Player";
      
      fullyMappedWinners.push({
        userId: w.userId,
        userName: winnerName,
        freeFireId: fFireId,
        freeFireName: fFireName,
        position: w.position,
        prize: w.prize
      });

      // Update user wallet balance
      if (user) {
        const userRef = doc(db, 'users', w.userId);
        batch.update(userRef, { balance: (user.balance || 0) + w.prize });
        
        // Add completed transaction
        const txId = generateId();
        const txRef = doc(db, 'transactions', txId);
        batch.set(txRef, {
          userId: w.userId,
          type: 'prize',
          amount: w.prize,
          status: 'completed',
          date: new Date().toISOString(),
          reference: tournament.title,
        });
      }
    });

    const tournamentRef = doc(db, 'tournaments', tournamentId);
    batch.update(tournamentRef, { 
      status: 'completed',
      winners: fullyMappedWinners
    });

    await batch.commit();
  },

  manualCreditUser: async (userId, amount) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error(`User document with UID "${userId}" was not found in Firestore users collection.`);
      }

      const batch = writeBatch(db);
      
      // Update balance atomically using increment
      batch.update(userRef, { 
        balance: increment(amount) 
      });

      // Also update wallets collection if document exists
      const walletRef = doc(db, 'wallets', userId);
      const walletSnap = await getDoc(walletRef);
      if (walletSnap.exists()) {
        batch.update(walletRef, { 
          balance: increment(amount) 
        });
      }

      // Record transaction history
      const txId = generateId();
      const txRef = doc(db, 'transactions', txId);
      batch.set(txRef, {
        userId,
        type: 'deposit',
        amount,
        status: 'completed',
        date: new Date().toISOString(),
        reference: 'Admin Direct Credit',
      });

      await batch.commit();
      console.log(`[Admin Wallet Success] Credited ₹${amount} to user UID: ${userId}`);
    } catch (error) {
      console.error("[Admin Wallet Error] Failed in manualCreditUser:", error);
      throw error;
    }
  },

  manualDebitUser: async (userId, amount) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error(`User document with UID "${userId}" was not found in Firestore users collection.`);
      }

      const batch = writeBatch(db);
      
      // Deduct balance atomically using increment(-amount)
      batch.update(userRef, { 
        balance: increment(-amount) 
      });

      // Also update wallets collection if document exists
      const walletRef = doc(db, 'wallets', userId);
      const walletSnap = await getDoc(walletRef);
      if (walletSnap.exists()) {
        batch.update(walletRef, { 
          balance: increment(-amount) 
        });
      }

      // Record transaction history
      const txId = generateId();
      const txRef = doc(db, 'transactions', txId);
      batch.set(txRef, {
        userId,
        type: 'withdrawal',
        amount,
        status: 'completed',
        date: new Date().toISOString(),
        reference: 'Admin Direct Debit',
      });

      await batch.commit();
      console.log(`[Admin Wallet Success] Deducted ₹${amount} from user UID: ${userId}`);
    } catch (error) {
      console.error("[Admin Wallet Error] Failed in manualDebitUser:", error);
      throw error;
    }
  },

  submitNaviShare: async (sharerMobile, recipientMobile) => {
    const currentUser = get().currentUser;
    if (!currentUser) throw new Error("Must be logged in to share.");
    const shareId = generateId();
    const newShare: NaviShare = {
      id: shareId,
      sharerUid: currentUser.id,
      sharerName: currentUser.name,
      sharerMobile,
      recipientMobile,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    await setDoc(doc(db, 'navi_shares', shareId), newShare);
    return shareId;
  },

  updateNaviShareStatus: async (shareId, status) => {
    const shareRef = doc(db, 'navi_shares', shareId);
    const shareSnap = await getDoc(shareRef);
    if (!shareSnap.exists()) throw new Error("Share record not found.");
    const shareData = shareSnap.data() as NaviShare;
    
    const batch = writeBatch(db);
    batch.update(shareRef, { status });
    
    if (status === 'completed' && shareData.status !== 'completed') {
      const userRef = doc(db, 'users', shareData.sharerUid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentBalance = userSnap.data().balance || 0;
        batch.update(userRef, { balance: currentBalance + 20 });
        
        const txId = generateId();
        batch.set(doc(db, 'transactions', txId), {
          userId: shareData.sharerUid,
          type: 'deposit',
          amount: 20,
          status: 'completed',
          date: new Date().toISOString(),
          reference: `Navi Share Bonus (Friend: ${shareData.recipientMobile})`
        });
      }
    }
    await batch.commit();
  },

  claimReferralMilestone: async () => {
    const { currentUser, users } = get();
    if (!currentUser) throw new Error("Must be logged in to claim milestone reward.");
    
    const referralCode = currentUser.referralCode;
    const successfulReferrals = users.filter(u => {
      const isReferredByCode = referralCode && u.referredBy && u.referredBy.toUpperCase() === referralCode.toUpperCase();
      const isReferredById = u.referredBy === currentUser.id;
      return (isReferredByCode || isReferredById) && u.hasPerformedFirstAction;
    });
    
    if (successfulReferrals.length < 5) {
      throw new Error(`You need at least 5 verified referrals. Currently you have ${successfulReferrals.length}.`);
    }
    
    if (currentUser.claimedReferralMilestone) {
      throw new Error("You have already claimed this milestone reward.");
    }
    
    const userRef = doc(db, 'users', currentUser.id);
    const batch = writeBatch(db);
    
    const newBalance = (currentUser.balance || 0) + 50;
    const newEarnings = (currentUser.referralEarnings || 0) + 50;
    
    batch.update(userRef, {
      balance: newBalance,
      referralEarnings: newEarnings,
      claimedReferralMilestone: true
    });
    
    const txId = generateId();
    batch.set(doc(db, 'transactions', txId), {
      userId: currentUser.id,
      type: 'deposit',
      amount: 50,
      status: 'completed',
      date: new Date().toISOString(),
      reference: 'Referral Milestone Reward (5 Referrals Complete)'
    });
    
    await batch.commit();
  },

  updateAdminSettings: async (upiId, qrCodeUrl, isDepositLocked, depositLockMessage) => {
    const settingsRef = doc(db, 'settings', 'appConfig');
    const updates: any = {
      adminUpiId: upiId.trim(),
      adminQrCodeUrl: qrCodeUrl.trim()
    };
    if (isDepositLocked !== undefined) updates.isDepositLocked = isDepositLocked;
    if (depositLockMessage !== undefined) updates.depositLockMessage = depositLockMessage;
    
    await setDoc(settingsRef, updates, { merge: true });
    set({
      adminUpiId: upiId.trim(),
      adminQrCodeUrl: qrCodeUrl.trim(),
      ...(isDepositLocked !== undefined && { isDepositLocked }),
      ...(depositLockMessage !== undefined && { depositLockMessage })
    });
  },

  sendMessage: async (text, userId, receiverId, isAdmin = false) => {
    const currentUser = get().currentUser;
    if (!currentUser) throw new Error("Must be logged in to send messages");
    
    const msgId = generateId();
    await setDoc(doc(db, 'messages', msgId), {
      id: msgId,
      senderId: isAdmin ? 'admin' : currentUser.id,
      senderName: isAdmin ? "Support Admin" : (currentUser.name || "Anonymous"),
      receiverId: receiverId,
      text: text.trim(),
      timestamp: new Date().toISOString(),
      userId: userId
    });
  }
}));
