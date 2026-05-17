import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '../store/AppContext';
import type { Split, Payer } from '../types';

interface Props {
  onClose: () => void;
}

export const AddExpenseModal: React.FC<Props> = ({ onClose }) => {
  const { users, currentUser, addExpense } = useAppContext();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  
  const [payerMode, setPayerMode] = useState<'single' | 'multiple'>('single');
  const [singlePayerId, setSinglePayerId] = useState(currentUser!.id);
  const [multiplePayers, setMultiplePayers] = useState<Record<string, string>>({});
  
  const [splitMethod, setSplitMethod] = useState<'equal' | 'exact' | 'percentage'>('equal');
  
  // Start with all users selected for equal split
  const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>(
    users.reduce((acc, user) => ({ ...acc, [user.id]: true }), {})
  );

  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});

  const handleSave = () => {
    const totalAmount = parseFloat(amount);
    if (!description || isNaN(totalAmount) || totalAmount <= 0) return;

    let splits: Split[] = [];

    if (splitMethod === 'equal') {
      const activeUserIds = Object.keys(selectedUsers).filter(id => selectedUsers[id]);
      if (activeUserIds.length === 0) return;
      
      const splitAmount = totalAmount / activeUserIds.length;
      splits = activeUserIds.map(id => ({ userId: id, amount: splitAmount }));
    } else if (splitMethod === 'exact') {
      let sum = 0;
      splits = Object.keys(exactAmounts).map(id => {
        const amt = parseFloat(exactAmounts[id] || '0');
        sum += amt;
        return { userId: id, amount: amt };
      }).filter(s => s.amount > 0);

      if (Math.abs(sum - totalAmount) > 0.01) {
        alert('Split amounts do not add up to total!');
        return;
      }
    } else if (splitMethod === 'percentage') {
      let sum = 0;
      splits = Object.keys(percentages).map(id => {
        const pct = parseFloat(percentages[id] || '0');
        sum += pct;
        return { userId: id, amount: (totalAmount * pct) / 100 };
      }).filter(s => s.amount > 0);

      if (Math.abs(sum - 100) > 0.01) {
        alert('Percentages must add up to 100!');
        return;
      }
    }

    let payers: Payer[] = [];
    if (payerMode === 'single') {
      payers = [{ userId: singlePayerId, amount: totalAmount }];
    } else {
      let payerSum = 0;
      payers = Object.keys(multiplePayers).map(id => {
        const amt = parseFloat(multiplePayers[id] || '0');
        payerSum += amt;
        return { userId: id, amount: amt };
      }).filter(p => p.amount > 0);
      
      if (Math.abs(payerSum - totalAmount) > 0.01) {
        alert('Payer amounts do not add up to total!');
        return;
      }
    }

    addExpense({
      description,
      amount: totalAmount,
      date: new Date().toISOString(),
      payers,
      splits
    });
    
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <div className="modal-header">
          <h2>Add an expense</h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>
        
        <div className="modal-body">
          <div className="input-group">
            <label>Description</label>
            <input 
              type="text" 
              placeholder="Enter a description" 
              value={description}
              onChange={e => setDescription(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="input-group">
            <label>Amount</label>
            <input 
              type="number" 
              placeholder="0.00" 
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div style={{ margin: '20px 0 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>Paid by</label>
              <button 
                className="btn btn-outline" 
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                onClick={() => setPayerMode(payerMode === 'single' ? 'multiple' : 'single')}
              >
                {payerMode === 'single' ? 'Multiple people?' : 'Single person?'}
              </button>
            </div>
            
            {payerMode === 'single' ? (
              <select className="input-group" style={{ width: '100%', marginTop: '8px' }} value={singlePayerId} onChange={e => setSinglePayerId(e.target.value)}>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            ) : (
              <div style={{ marginTop: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                {users.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>{u.name} paid:</span>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      style={{ width: '100px', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                      value={multiplePayers[u.id] || ''}
                      onChange={e => setMultiplePayers({...multiplePayers, [u.id]: e.target.value})}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ margin: '20px 0 10px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>Split method</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button 
                className={`btn ${splitMethod === 'equal' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSplitMethod('equal')}
                style={{ flex: 1, padding: '8px' }}
              >
                Equal
              </button>
              <button 
                className={`btn ${splitMethod === 'exact' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSplitMethod('exact')}
                style={{ flex: 1, padding: '8px' }}
              >
                Exact
              </button>
              <button 
                className={`btn ${splitMethod === 'percentage' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSplitMethod('percentage')}
                style={{ flex: 1, padding: '8px' }}
              >
                %
              </button>
            </div>
          </div>

          <div style={{ marginTop: '20px', maxHeight: '200px', overflowY: 'auto' }}>
            {users.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {splitMethod === 'equal' && (
                    <input 
                      type="checkbox" 
                      checked={selectedUsers[u.id] || false}
                      onChange={e => setSelectedUsers({...selectedUsers, [u.id]: e.target.checked})}
                    />
                  )}
                  {u.name}
                </span>
                
                {splitMethod === 'exact' && (
                  <input 
                    type="number" 
                    placeholder="0.00"
                    style={{ width: '100px', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    value={exactAmounts[u.id] || ''}
                    onChange={e => setExactAmounts({...exactAmounts, [u.id]: e.target.value})}
                  />
                )}
                
                {splitMethod === 'percentage' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input 
                      type="number" 
                      placeholder="0"
                      style={{ width: '80px', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                      value={percentages[u.id] || ''}
                      onChange={e => setPercentages({...percentages, [u.id]: e.target.value})}
                    />
                    <span>%</span>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
        
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};
