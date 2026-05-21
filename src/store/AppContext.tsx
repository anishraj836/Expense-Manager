import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, Expense, Settlement, Group } from '../types';
import SHA256 from 'crypto-js/sha256';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  groups: Group[];
  expenses: Expense[];
  settlements: Settlement[];
  setCurrentUser: (user: User | null) => void;
  addExpense: (expense: Omit<Expense, 'id' | '_id'>) => Promise<void>;
  addSettlement: (settlement: Omit<Settlement, 'id' | '_id'>) => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  createGroup: (name: string, description: string, members: string[]) => Promise<void>;
  addGroupMember: (groupId: string, userId: string) => Promise<void>;
  getBalances: () => Record<string, number>; 
  dataWarning: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to compute hash exactly as backend does
function computeHashLocally(txData: any, previousHash: string) {
  const dataString = JSON.stringify({
    description: txData.description,
    amount: txData.amount,
    date: txData.date,
    type: txData.type,
    payers: txData.payers.map((p: any) => ({ userId: p.userId, amount: p.amount })),
    splits: txData.splits.map((s: any) => ({ userId: s.userId, amount: s.amount })),
    status: txData.status,
    supersededBy: txData.supersededBy || null,
    originalTxId: txData.originalTxId || null,
    attachmentBase64: txData.attachmentBase64 || null
  });
  return SHA256(dataString + previousHash).toString();
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [dataWarning, setDataWarning] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');

  useEffect(() => {
    // Initial data fetch
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Fetch current user
        const meRes = await fetch(`${API_BASE}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!meRes.ok) {
          localStorage.removeItem('token');
          setCurrentUser(null);
          return;
        }
        const meData = await meRes.json();
        setCurrentUser({ ...meData, id: meData._id });

        // Fetch all users for displaying names (later we'll restrict to friends)
        const userRes = await fetch(`${API_BASE}/users`);
        const usersData = await userRes.json();
        const mappedUsers = usersData.map((u: any) => ({ ...u, id: u._id }));
        setUsers(mappedUsers);

        // Fetch groups
        const groupsRes = await fetch(`${API_BASE}/groups`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          setGroups(groupsData);
        }

        // Fetch paginated transactions for the UI feed
        const txRes = await fetch(`${API_BASE}/transactions?page=1&limit=50`);
        let txData = await txRes.json();

        // Fetch minimal ledger for hash verification
        const ledgerRes = await fetch(`${API_BASE}/transactions/ledger`);
        const ledgerData = await ledgerRes.json();

        // --- CRYPTOGRAPHIC VERIFICATION ---
        let isValid = true;
        let warningMsg = null;
        let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';

        for (let i = 0; i < ledgerData.length; i++) {
          const tx = ledgerData[i];
          if (tx.description === 'GENESIS_BLOCK') {
            prevHash = tx.hash;
            continue;
          }
          
          const expectedHash = computeHashLocally(tx, prevHash);
          if (expectedHash !== tx.hash) {
            isValid = false;
            warningMsg = `CRITICAL SECURITY ALERT: Transaction "${tx.description}" has been tampered with! Expected hash did not match server hash.`;
            break;
          }
          prevHash = tx.hash;
        }

        if (!isValid && warningMsg) {
          setDataWarning(warningMsg);
          console.error(warningMsg);
        } else {
          const storedLastHash = localStorage.getItem('lastVerifiedHash');
          if (storedLastHash && storedLastHash !== prevHash) {
             // Verification successful, chain extended
          }
          localStorage.setItem('lastVerifiedHash', prevHash);
        }

        // Filter active expenses and settlements from the paginated feed
        const activeTxs = txData.filter((t: any) => t.status === 'active' && t.description !== 'GENESIS_BLOCK');
        const exps = activeTxs.filter((t: any) => t.type === 'expense').map((t: any) => ({...t, id: t._id}));
        const setts = activeTxs.filter((t: any) => t.type === 'settlement').map((t: any) => ({...t, id: t._id, from: t.payers[0]?.userId, to: t.splits[0]?.userId}));

        setExpenses(exps);
        setSettlements(setts);

      } catch (err) {
        console.error('Failed to fetch data', err);
      }
    };
    fetchData();
  }, []);

  const addExpense = async (expense: Omit<Expense, 'id' | '_id'>) => {
    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expense, type: 'expense' })
      });
      const newTx = await res.json();
      setExpenses([{ ...newTx, id: newTx._id }, ...expenses]);
    } catch (err) {
      console.error(err);
    }
  };

  const addSettlement = async (settlement: Omit<Settlement, 'id' | '_id'>) => {
    try {
      // Convert settlement format to transaction ledger format
      const txData = {
        description: 'Settlement',
        amount: settlement.amount,
        date: settlement.date,
        type: 'settlement',
        payers: [{ userId: settlement.from, amount: settlement.amount }],
        splits: [{ userId: settlement.to, amount: settlement.amount }],
        attachmentBase64: settlement.attachmentBase64
      };
      const res = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txData)
      });
      const newTx = await res.json();
      setSettlements([{ ...settlement, id: newTx._id }, ...settlements]);
    } catch (err) {
      console.error(err);
    }
  };

  const addUser = async (user: Omit<User, 'id'>) => {
    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oauthId: `oauth_${Date.now()}`, ...user })
      });
      const newUser = await res.json();
      setUsers([...users, { ...newUser, id: newUser._id }]);
    } catch (err) {
      console.error(err);
    }
  };

  const createGroup = async (name: string, description: string, members: string[]) => {
    try {
      const res = await fetch(`${API_BASE}/groups`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name, description, members })
      });
      const newGroup = await res.json();
      setGroups([...groups, newGroup]);
    } catch (err) {
      console.error(err);
    }
  };

  const addGroupMember = async (groupId: string, userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId })
      });
      
      if (res.ok) {
        const updatedGroup = await res.json();
        setGroups(groups.map(g => g._id === updatedGroup._id ? updatedGroup : g));
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add member');
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Simplifies debts matching creditors and debtors
  const getBalances = () => {
    const netBalances: Record<string, number> = {};
    users.forEach(u => netBalances[u.id] = 0);

    // Calculate net balance for everyone
    expenses.forEach(exp => {
      exp.payers.forEach(p => { if (netBalances[p.userId] !== undefined) netBalances[p.userId] += p.amount; });
      exp.splits.forEach(s => { if (netBalances[s.userId] !== undefined) netBalances[s.userId] -= s.amount; });
    });

    settlements.forEach(settle => {
      if (netBalances[settle.from] !== undefined) netBalances[settle.from] += settle.amount;
      if (netBalances[settle.to] !== undefined) netBalances[settle.to] -= settle.amount;
    });

    // We want to return who owes the `currentUser`, or who `currentUser` owes.
    // For simplicity, we just distribute the currentUser's net balance proportionally among opposite balances.
    // E.g. if I am +100 (others owe me 100), and A is -80, B is -20, C is +50.
    // I am owed 100, C is owed 50. A owes 80, B owes 20. Total debt = 100. (Wait, total debt is 100+50=150 != 80+20. This shouldn't happen, sum is always 0).
    
    const myBalance = currentUser ? (netBalances[currentUser.id] || 0) : 0;
    const finalBalances: Record<string, number> = {};
    
    if (!currentUser || Math.abs(myBalance) < 0.01) return finalBalances;

    // Separate others into creditors and debtors
    const others = Object.keys(netBalances).filter(id => id !== currentUser?.id);
    let totalOpposite = 0;
    
    if (myBalance > 0) {
      // I am owed money. Who owes money? (people with negative balance)
      const debtors = others.filter(id => netBalances[id] < -0.01);
      debtors.forEach(id => totalOpposite += Math.abs(netBalances[id]));
      
      debtors.forEach(id => {
        const proportion = Math.abs(netBalances[id]) / totalOpposite;
        finalBalances[id] = myBalance * proportion; // Positive means they owe me
      });
    } else {
      // I owe money. Who is owed money? (people with positive balance)
      const creditors = others.filter(id => netBalances[id] > 0.01);
      creditors.forEach(id => totalOpposite += netBalances[id]);
      
      creditors.forEach(id => {
        const proportion = netBalances[id] / totalOpposite;
        finalBalances[id] = myBalance * proportion; // Negative means I owe them
      });
    }

    return finalBalances;
  };

  return (
    <AppContext.Provider value={{
      currentUser, users, groups, expenses, settlements,
      setCurrentUser, addExpense, addSettlement, addUser, createGroup, getBalances, dataWarning, addGroupMember
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
