export type Role = 'user' | 'admin';

export interface User {
  id: string;
  phone: string;
  name: string;
  email: string;
  password?: string;
  gameId: string; // e.g. BGMI ID / Free Fire ID
  balance: number;
  role: Role;
  upiId?: string;
  bankAccount?: string;
  loginMethod?: 'google' | 'phone' | 'email';
  referralCode?: string;
  referredBy?: string;
  referralEarnings?: number;
  hasPerformedFirstAction?: boolean;
  claimedReferralMilestone?: boolean;
}

export type TournamentStatus = 'upcoming' | 'live' | 'completed';

export interface TournamentParticipant {
  userId: string;
  freeFireId: string;
  freeFireName: string;
  userName?: string;
  phone?: string;
}

export interface WinnerRecord {
  userId: string;
  userName: string;
  freeFireId: string;
  freeFireName: string;
  position: number; // 1 for 1st, 2 for 2nd, 3 for 3rd
  prize: number;
}

export interface PrizeDistribution {
  rank: number;
  prize: number;
}

export interface Tournament {
  id: string;
  title: string;
  game: string;
  banner: string;
  prizePool: number;
  entryFee: number;
  maxSlots: number;
  startTime: string; // ISO string
  status: TournamentStatus;
  participants: TournamentParticipant[];
  roomId?: string;
  roomPassword?: string;
  winners?: WinnerRecord[];
  prizeDistribution?: PrizeDistribution[];
  createdAt?: string; // ISO string
}

export type TransactionType = 'deposit' | 'withdraw' | 'join_fee' | 'prize';
export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number; // This will be the amount credited to wallet (base amount)
  requestedAmount?: number; // The base amount requested by user
  paymentAmount?: number; // The exact randomized amount user should pay
  status: TransactionStatus;
  date: string; // ISO string
  reference?: string; // UPI ID / Bank details / Tournament ID
}

export interface NaviShare {
  id: string;
  sharerUid: string;
  sharerName: string;
  sharerMobile: string;
  recipientMobile: string;
  createdAt: string;
  status: 'pending' | 'verified' | 'completed' | 'rejected';
}

export interface CaptchaHold {
  id: string;
  uid: string;
  amount: number;
  completedAt: string;
  status: 'pending' | 'released';
  releaseAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  timestamp: string; // ISO string
  userId: string; // The user ID of the conversation
}

