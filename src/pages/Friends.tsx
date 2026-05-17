import React, { useState, useEffect } from 'react';
import { useAppContext } from '../store/AppContext';
import { UserPlus, Search, Check } from 'lucide-react';

export const Friends: React.FC = () => {
  const { getBalances } = useAppContext();
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');
  const balances = getBalances();

  const fetchSocialData = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/me/friends`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends);
        setFriendRequests(data.friendRequests);
      }
    } catch (err) {
      console.error('Failed to load friends', err);
    }
  };

  useEffect(() => {
    fetchSocialData();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (targetUserId: string) => {
    try {
      await fetch(`${API_BASE}/users/request`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ targetUserId })
      });
      alert('Friend request sent!');
      setSearchResults(searchResults.filter(u => u._id !== targetUserId));
    } catch (err) {
      console.error(err);
    }
  };

  const acceptRequest = async (fromUserId: string) => {
    try {
      await fetch(`${API_BASE}/users/accept`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ fromUserId })
      });
      fetchSocialData(); // refresh list
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2>Social Graph</h2>
        <button className="btn btn-primary" onClick={() => setShowAddFriend(true)}>
          <UserPlus size={18} /> Find Friends
        </button>
      </div>

      {friendRequests.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', borderColor: 'var(--primary-color)' }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--primary-color)' }}>Pending Friend Requests</h3>
          {friendRequests.map(reqUser => (
            <div key={reqUser._id} className="list-item">
              <div className="list-item-left">
                <div className="avatar" style={{ width: '40px', height: '40px' }}>
                  {reqUser.name.charAt(0)}
                </div>
                <div className="list-item-content">
                  <h4>{reqUser.name}</h4>
                  <p>{reqUser.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline" style={{ padding: '6px 12px', color: 'var(--success-color)', borderColor: 'var(--success-color)' }} onClick={() => acceptRequest(reqUser._id)}>
                  <Check size={16} /> Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '24px' }}>My Friends</h3>
        {friends.length === 0 ? (
          <p className="text-neutral">You haven't added any friends yet.</p>
        ) : (
          friends.map(user => {
            const balance = balances[user._id] || 0;
            return (
              <div key={user._id} className="list-item">
                <div className="list-item-left">
                  <div className="avatar" style={{ width: '48px', height: '48px', fontSize: '1.2rem' }}>
                    {user.name.charAt(0)}
                  </div>
                  <div className="list-item-content">
                    <h4>{user.name}</h4>
                    <p>{user.email}</p>
                  </div>
                </div>
                
                <div className="list-item-right">
                  {balance === 0 ? (
                    <p className="text-neutral">settled up</p>
                  ) : balance > 0 ? (
                    <div>
                      <p className="text-neutral" style={{ fontSize: '0.85rem' }}>owes you</p>
                      <p className="text-success">${balance.toFixed(2)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-neutral" style={{ fontSize: '0.85rem' }}>you owe</p>
                      <p className="text-danger">${Math.abs(balance).toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showAddFriend && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Find Friends</h2>
              <button className="close-btn" onClick={() => setShowAddFriend(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                <input 
                  type="text" 
                  placeholder="Search by name or email..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ flex: 1 }}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Search size={18} />
                </button>
              </form>

              {searchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {searchResults.map(user => {
                    const isFriend = friends.some(f => f._id === user._id);
                    return (
                      <div key={user._id} className="list-item" style={{ padding: '8px 12px' }}>
                        <div className="list-item-left">
                          <div className="avatar" style={{ width: '32px', height: '32px' }}>{user.name.charAt(0)}</div>
                          <div>
                            <h4 style={{ margin: 0 }}>{user.name}</h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</p>
                          </div>
                        </div>
                        {isFriend ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Already Friends</span>
                        ) : (
                          <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => sendRequest(user._id)}>
                            Send Request
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAddFriend(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
