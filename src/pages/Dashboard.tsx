import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { SettleUpModal } from '../components/SettleUpModal';
import { Plus, Check, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { currentUser, users, getBalances } = useAppContext();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);
  
  const [settleUpDefaults, setSettleUpDefaults] = useState<{
    payerId?: string; payeeId?: string; amount?: number;
  }>({});

  const balances = getBalances();
  
  let totalYouOwe = 0;
  let totalOwedToYou = 0;
  
  Object.values(balances).forEach(amount => {
    if (amount > 0) totalOwedToYou += amount;
    else if (amount < 0) totalYouOwe += Math.abs(amount);
  });

  const totalBalance = totalOwedToYou - totalYouOwe;

  const handleSettleUpSpecific = (userId: string, amount: number) => {
    if (amount > 0) {
      // They owe you, so they are paying you
      setSettleUpDefaults({ payerId: userId, payeeId: currentUser!.id, amount });
    } else {
      // You owe them, so you are paying them
      setSettleUpDefaults({ payerId: currentUser!.id, payeeId: userId, amount: Math.abs(amount) });
    }
    setShowSettleUp(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '32px' }}>
        <button className="btn btn-primary" onClick={() => setShowAddExpense(true)}>
          <Plus size={18} /> Add an expense
        </button>
        <button className="btn btn-secondary" onClick={() => {
          setSettleUpDefaults({});
          setShowSettleUp(true);
        }}>
          <Check size={18} /> Settle up
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(91, 33, 182, 0.1)', color: 'var(--primary-color)' }}>
              <Wallet size={24} />
            </div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Total balance</h3>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: totalBalance >= 0 ? 'var(--secondary-color)' : 'var(--danger-color)' }}>
            {totalBalance >= 0 ? '+' : '-'}${Math.abs(totalBalance).toFixed(2)}
          </div>
        </div>
        
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}>
              <ArrowDownRight size={24} />
            </div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>You owe</h3>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            ${totalYouOwe.toFixed(2)}
          </div>
        </div>
        
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary-color)' }}>
              <ArrowUpRight size={24} />
            </div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>You are owed</h3>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            ${totalOwedToYou.toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        <div className="card">
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
            You owe
          </h3>
          <div>
            {Object.keys(balances).filter(id => balances[id] < 0).length === 0 ? (
              <p className="text-neutral">You do not owe anything</p>
            ) : (
              Object.keys(balances).filter(id => balances[id] < 0).map(id => {
                const user = users.find(u => u.id === id);
                return (
                  <div key={id} className="list-item">
                    <div className="list-item-left">
                      <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                        {user?.name.charAt(0)}
                      </div>
                      <div className="list-item-content">
                        <h4>{user?.name}</h4>
                        <p className="text-danger">you owe ${Math.abs(balances[id]).toFixed(2)}</p>
                      </div>
                    </div>
                    <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleSettleUpSpecific(id, balances[id])}>
                      Settle
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="card">
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
            You are owed
          </h3>
          <div>
            {Object.keys(balances).filter(id => balances[id] > 0).length === 0 ? (
              <p className="text-neutral">You are not owed anything</p>
            ) : (
              Object.keys(balances).filter(id => balances[id] > 0).map(id => {
                const user = users.find(u => u.id === id);
                return (
                  <div key={id} className="list-item">
                    <div className="list-item-left">
                      <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                        {user?.name.charAt(0)}
                      </div>
                      <div className="list-item-content">
                        <h4>{user?.name}</h4>
                        <p className="text-success">owes you ${balances[id].toFixed(2)}</p>
                      </div>
                    </div>
                    <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleSettleUpSpecific(id, balances[id])}>
                      Settle
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {showAddExpense && <AddExpenseModal onClose={() => setShowAddExpense(false)} />}
      {showSettleUp && (
        <SettleUpModal 
          onClose={() => setShowSettleUp(false)} 
          defaultPayerId={settleUpDefaults.payerId}
          defaultPayeeId={settleUpDefaults.payeeId}
          defaultAmount={settleUpDefaults.amount}
        />
      )}
    </div>
  );
};

// Also import Wallet for the first card
import { Wallet } from 'lucide-react';
