import React from 'react';
import { useAppContext } from '../store/AppContext';
import { Receipt, CheckCircle } from 'lucide-react';

export const Activity: React.FC = () => {
  const { expenses, settlements, users, currentUser } = useAppContext();

  // Combine and sort by date descending
  const allActivity = [
    ...expenses.map(e => ({ ...e, type: 'expense' as const })),
    ...settlements.map(s => ({ ...s, type: 'settlement' as const }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getUserName = (id: string) => id === currentUser!.id ? 'You' : users.find(u => u.id === id)?.name || 'Unknown';

  return (
    <div className="card">
      <h2 style={{ marginBottom: '24px' }}>Recent Activity</h2>
      
      {allActivity.length === 0 ? (
        <p className="text-neutral">No activity yet.</p>
      ) : (
        allActivity.map(item => {
          if (item.type === 'expense') {
            const expense = item as any; 
            const myPayment = expense.payers.find((p: any) => p.userId === currentUser!.id);
            const mySplit = expense.splits.find((s: any) => s.userId === currentUser!.id);
            const involved = myPayment || mySplit;

            const primaryPayerId = expense.payers[0]?.userId;
            const otherPayersCount = expense.payers.length - 1;
            let payerText = getUserName(primaryPayerId);
            if (otherPayersCount > 0) payerText += ` + ${otherPayersCount} others`;

            return (
              <div key={expense.id} className="list-item">
                <div className="list-item-left">
                  <div className="list-item-icon" style={{ backgroundColor: 'rgba(91, 33, 182, 0.1)', color: 'var(--primary-color)' }}>
                    <Receipt size={24} />
                  </div>
                  <div className="list-item-content">
                    <h4>{expense.description}</h4>
                    <p>{payerText} paid ${expense.amount.toFixed(2)}</p>
                    <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                      {new Date(expense.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {involved && (
                  <div className="list-item-right">
                    {(myPayment?.amount || 0) > (mySplit?.amount || 0) ? (
                      <div>
                        <p className="text-neutral" style={{ fontSize: '0.85rem' }}>you lent</p>
                        <p className="text-success">${((myPayment?.amount || 0) - (mySplit?.amount || 0)).toFixed(2)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-neutral" style={{ fontSize: '0.85rem' }}>you borrowed</p>
                        <p className="text-danger">${((mySplit?.amount || 0) - (myPayment?.amount || 0)).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          } else {
            const settlement = item as any;
            const involved = settlement.from === currentUser!.id || settlement.to === currentUser!.id;

            return (
              <div key={settlement.id} className="list-item">
                <div className="list-item-left">
                  <div className="list-item-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary-color)' }}>
                    <CheckCircle size={24} />
                  </div>
                  <div className="list-item-content">
                    <h4>{getUserName(settlement.from)} paid {getUserName(settlement.to)}</h4>
                    <p className="text-success">${settlement.amount.toFixed(2)}</p>
                    <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                      {new Date(settlement.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {involved && (
                  <div className="list-item-right">
                    {settlement.from === currentUser!.id ? (
                      <div>
                        <p className="text-neutral" style={{ fontSize: '0.85rem' }}>you paid</p>
                        <p className="text-success">${settlement.amount.toFixed(2)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-neutral" style={{ fontSize: '0.85rem' }}>you received</p>
                        <p className="text-neutral">${settlement.amount.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }
        })
      )}
    </div>
  );
};
