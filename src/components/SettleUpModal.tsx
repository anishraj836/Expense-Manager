import React, { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { useAppContext } from '../store/AppContext';

interface Props {
  onClose: () => void;
  defaultPayerId?: string;
  defaultPayeeId?: string;
  defaultAmount?: number;
}

export const SettleUpModal: React.FC<Props> = ({ 
  onClose, 
  defaultPayerId, 
  defaultPayeeId, 
  defaultAmount 
}) => {
  const { users, currentUser, addSettlement } = useAppContext();
  
  const [payerId, setPayerId] = useState(defaultPayerId || currentUser!.id);
  const [payeeId, setPayeeId] = useState(defaultPayeeId || users.find(u => u.id !== payerId)?.id || '');
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '');

  const handleSave = () => {
    const totalAmount = parseFloat(amount);
    if (!payerId || !payeeId || isNaN(totalAmount) || totalAmount <= 0) return;

    addSettlement({
      from: payerId,
      to: payeeId,
      amount: totalAmount,
      date: new Date().toISOString()
    });
    
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2>Settle up</h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>
        
        <div className="modal-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <select value={payerId} onChange={e => setPayerId(e.target.value)}>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            
            <ArrowRight size={24} color="var(--text-muted)" />
            
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <select value={payeeId} onChange={e => setPayeeId(e.target.value)}>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
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
              autoFocus
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-secondary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};
