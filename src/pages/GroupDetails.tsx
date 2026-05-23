import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { FileText, Check, X, ArrowLeft, Plus } from 'lucide-react';

export const GroupDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { groups, currentUser } = useAppContext();
  
  const group = groups.find(g => g._id === id);
  
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProposeModal, setShowProposeModal] = useState(false);
  
  // Form for proposing new data
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDesc, setProposalDesc] = useState('');
  const [csvData, setCsvData] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');

  const fetchProposals = async () => {
    try {
      const res = await fetch(`${API_BASE}/groups/${id}/proposals`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setProposals(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProposals();
  }, [id]);

  if (!group) return <div style={{ padding: '40px' }}>Group not found</div>;

  const handlePropose = async () => {
    if (!proposalTitle.trim()) return;
    
    // Parse simplified CSV: description,amount,payerId
    // In a real app this would be a proper CSV parser or form
    const lines = csvData.split('\n').map(l => l.trim()).filter(l => l);
    const transactions = [];
    
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length >= 3) {
        const desc = parts[0].trim();
        const amount = parseFloat(parts[1].trim());
        const payerEmail = parts[2].trim();
        
        // Find user by email
        const payerUser = group.members.find((m: any) => m.email === payerEmail) || currentUser;
        
        // Split equally among all group members
        const splitAmount = amount / group.members.length;
        const splits = group.members.map((m: any) => ({ userId: m._id || m.id, amount: splitAmount }));
        
        transactions.push({
          description: desc,
          amount: amount,
          type: 'expense',
          payers: [{ userId: (payerUser as any)?._id || payerUser?.id, amount }],
          splits
        });
      }
    }
    
    if (transactions.length === 0 && csvData.trim()) {
      alert("Could not parse transactions. Format: Description,Amount,PayerEmail");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/groups/${id}/proposals`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: proposalTitle,
          description: proposalDesc,
          transactions
        })
      });
      if (res.ok) {
        setShowProposeModal(false);
        setProposalTitle('');
        setProposalDesc('');
        setCsvData('');
        fetchProposals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (proposalId: string) => {
    try {
      const res = await fetch(`${API_BASE}/groups/${id}/proposals/${proposalId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) fetchProposals();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (proposalId: string) => {
    try {
      const res = await fetch(`${API_BASE}/groups/${id}/proposals/${proposalId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) fetchProposals();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button className="btn" style={{ padding: '8px' }} onClick={() => navigate('/groups')}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="page-title" style={{ margin: 0 }}>{group.name}</h2>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>Data Import Proposals</h3>
        <button className="btn btn-primary" onClick={() => setShowProposeModal(true)}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Propose Data Import
        </button>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <p className="text-neutral" style={{ fontSize: '0.95rem' }}>
          Importing past expenses into the group ledger requires consensus. When you propose a data import, <strong>every member of the group</strong> must approve it before it is securely committed to the cryptographic ledger.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : proposals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ marginBottom: '8px' }}>No Pending Proposals</h3>
          <p className="text-neutral">There are no pending data imports requiring your approval.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {proposals.map(prop => {
            const myApproval = prop.approvals.some((u: any) => u._id === currentUser?.id);
            const allApproved = prop.status === 'approved';
            const rejected = prop.status === 'rejected';

            return (
              <div key={prop._id} className="card" style={{ borderLeft: `4px solid ${allApproved ? 'var(--success-color)' : rejected ? 'var(--danger-color)' : 'var(--warning-color)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{prop.title}</h3>
                    <p className="text-neutral" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
                      Proposed by {prop.proposedBy.name} • {prop.transactions.length} transactions
                    </p>
                    {prop.description && <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>{prop.description}</p>}
                  </div>
                  <div style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', 
                    backgroundColor: allApproved ? 'rgba(16, 185, 129, 0.1)' : rejected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: allApproved ? 'var(--success-color)' : rejected ? 'var(--danger-color)' : 'var(--warning-color)'
                  }}>
                    {prop.status.toUpperCase()}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>Approvals ({prop.approvals.length}/{group.members.length})</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {group.members.map((m: any) => {
                      const hasApproved = prop.approvals.some((a: any) => a._id === m._id || a._id === m.id);
                      return (
                        <div key={m._id || m.id} className="avatar" style={{ 
                          width: '32px', height: '32px', fontSize: '0.75rem',
                          border: hasApproved ? '2px solid var(--success-color)' : '2px dashed var(--border-color)',
                          opacity: hasApproved ? 1 : 0.5
                        }} title={m.name}>
                          {m.name.charAt(0)}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {prop.status === 'pending' && !myApproval && (
                  <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleApprove(prop._id)}>
                      <Check size={16} style={{ marginRight: '6px' }} /> Approve Data
                    </button>
                    <button className="btn btn-outline" style={{ flex: 1, borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }} onClick={() => handleReject(prop._id)}>
                      <X size={16} style={{ marginRight: '6px' }} /> Reject
                    </button>
                  </div>
                )}
                {prop.status === 'pending' && myApproval && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', textAlign: 'center', color: 'var(--success-color)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    <Check size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> You have approved this proposal. Waiting for others.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showProposeModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Propose Data Import</h2>
              <button className="close-btn" onClick={() => setShowProposeModal(false)}><X size={24} /></button>
            </div>
            
            <div className="modal-body">
              <div className="input-group">
                <label>Title</label>
                <input type="text" placeholder="e.g. October Trip Expenses" value={proposalTitle} onChange={e => setProposalTitle(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Description (Optional)</label>
                <input type="text" placeholder="Context for the group..." value={proposalDesc} onChange={e => setProposalDesc(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Paste Data (CSV format: Description, Amount, PayerEmail)</label>
                <textarea 
                  rows={5} 
                  placeholder="Dinner, 150.00, user@example.com&#10;Taxi, 25.50, friend@example.com"
                  value={csvData}
                  onChange={e => setCsvData(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)', fontFamily: 'monospace' }}
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  These expenses will be split equally among all {group.members.length} group members if approved.
                </p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowProposeModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePropose} disabled={!proposalTitle.trim() || !csvData.trim()}>Submit Proposal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
