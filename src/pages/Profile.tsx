import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { Edit2, Check, ArrowLeft, QrCode } from 'lucide-react';
import type { User } from '../types';

export const Profile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, updateProfile } = useAppContext();
  
  const isMe = id === currentUser?.id || !id;
  
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  
  const [upiId, setUpiId] = useState('');
  const [qrBase64, setQrBase64] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        if (isMe && currentUser) {
          setProfileUser(currentUser);
          setUpiId(currentUser.upiId || '');
          setQrBase64(currentUser.paymentQrBase64 || '');
        } else {
          const res = await fetch(`${API_BASE}/users/${id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            const data = await res.json();
            setProfileUser(data);
            setUpiId(data.upiId || '');
            setQrBase64(data.paymentQrBase64 || '');
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, isMe, currentUser]);

  const handleSave = async () => {
    if (!isMe) return;
    await updateProfile({ upiId, paymentQrBase64: qrBase64 });
    setEditing(false);
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading profile...</div>;
  }

  if (!profileUser) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>User not found</h2>
        <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ marginTop: '16px' }}>Go Back</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button className="btn" style={{ padding: '8px' }} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="page-title" style={{ margin: 0 }}>Profile</h2>
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div className="avatar" style={{ width: '80px', height: '80px', fontSize: '2rem', marginBottom: '16px' }}>
            {profileUser.avatarUrl ? (
              <img src={profileUser.avatarUrl} alt={profileUser.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              profileUser.name.charAt(0)
            )}
          </div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{profileUser.name}</h2>
          <p className="text-neutral">{profileUser.email}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          <h3 style={{ margin: 0 }}>Payment Details</h3>
          {isMe && !editing && (
            <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => setEditing(true)}>
              <Edit2 size={14} style={{ marginRight: '6px' }} /> Edit
            </button>
          )}
          {isMe && editing && (
            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={handleSave}>
              <Check size={14} style={{ marginRight: '6px' }} /> Save
            </button>
          )}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>UPI ID</label>
          {editing ? (
            <input 
              type="text" 
              value={upiId} 
              onChange={e => setUpiId(e.target.value)} 
              placeholder="e.g. john@upi"
              style={{ width: '100%' }}
            />
          ) : (
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 500 }}>
              {upiId || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided</span>}
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Payment QR Code</label>
          {editing ? (
            <div>
              {qrBase64 && (
                <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                  <img src={qrBase64} alt="QR Code" style={{ maxWidth: '200px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                </div>
              )}
              <div style={{ position: 'relative' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleQrUpload}
                  style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                />
                <button className="btn btn-outline" style={{ width: '100%', pointerEvents: 'none' }}>
                  <QrCode size={18} style={{ marginRight: '8px' }} /> 
                  {qrBase64 ? 'Change QR Code' : 'Upload QR Code'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
              {qrBase64 ? (
                <img src={qrBase64} alt="QR Code" style={{ maxWidth: '250px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
              ) : (
                <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <QrCode size={48} style={{ opacity: 0.5, marginBottom: '8px' }} />
                  <p>No QR Code available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
