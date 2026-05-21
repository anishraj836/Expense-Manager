import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { Users, Plus, X } from 'lucide-react';

export const Groups: React.FC = () => {
  const { groups, users, currentUser, createGroup } = useAppContext();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // Exclude current user from selectable members, they are added automatically
  const availableUsers = users.filter(u => u.id !== currentUser?.id);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createGroup(name, description, selectedMembers);
    setShowCreate(false);
    setName('');
    setDescription('');
    setSelectedMembers([]);
  };

  const toggleMember = (id: string) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter(m => m !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 className="page-title">Groups</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> New Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ marginBottom: '8px' }}>No groups yet</h3>
          <p className="text-neutral">Create a group to share expenses with roommates, trips, or events.</p>
        </div>
      ) : (
        <div className="dashboard-grid">
          {groups.map(group => (
            <div key={group._id} className="card" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(91, 33, 182, 0.1)', color: 'var(--primary-color)' }}>
                  <Users size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem' }}>{group.name}</h3>
                  {group.description && <p className="text-neutral" style={{ fontSize: '0.85rem' }}>{group.description}</p>}
                </div>
              </div>
              <p className="text-neutral" style={{ fontSize: '0.9rem' }}>
                {group.members.length} members
              </p>
              <div style={{ display: 'flex', marginTop: '16px' }}>
                {group.members.slice(0, 5).map((m: any, i) => (
                  <div key={m._id} className="avatar" style={{ 
                    width: '28px', height: '28px', fontSize: '0.7rem', 
                    marginLeft: i > 0 ? '-8px' : '0',
                    border: '2px solid var(--bg-card)' 
                  }}>
                    {m.name ? m.name.charAt(0) : '?'}
                  </div>
                ))}
                {group.members.length > 5 && (
                  <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '0.7rem', marginLeft: '-8px', border: '2px solid var(--bg-card)', backgroundColor: 'var(--text-muted)' }}>
                    +{group.members.length - 5}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h2>Create a Group</h2>
              <button className="close-btn" onClick={() => setShowCreate(false)}><X size={24} /></button>
            </div>
            
            <div className="modal-body">
              <div className="input-group">
                <label>Group Name</label>
                <input 
                  type="text" 
                  placeholder="E.g., Apartment, Paris Trip, Ski Weekend" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="input-group">
                <label>Description (Optional)</label>
                <input 
                  type="text" 
                  placeholder="Optional details..." 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              
              <div style={{ margin: '20px 0 10px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>Add Members</label>
                <div style={{ marginTop: '8px', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  {availableUsers.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      You need to add friends first before you can put them in a group.
                    </div>
                  ) : (
                    availableUsers.map(u => (
                      <div key={u.id} className="list-item" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => toggleMember(u.id)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedMembers.includes(u.id)}
                            readOnly
                          />
                          <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '0.6rem' }}>{u.name.charAt(0)}</div>
                          <span>{u.name}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!name.trim()}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
