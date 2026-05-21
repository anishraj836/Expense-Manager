import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, Wallet } from 'lucide-react';
import { useAppContext } from '../store/AppContext';

export const Layout: React.FC = () => {
  const location = useLocation();
  const { currentUser, setCurrentUser, dataWarning } = useAppContext();

  return (
    <div className="app-container">
      {dataWarning && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: 'var(--danger-color)', color: 'white', padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
          {dataWarning}
        </div>
      )}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Wallet color="var(--primary-color)" size={28} />
          ExpenseManager
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
            <LayoutDashboard size={20} /> Dashboard
          </Link>
          <Link to="/friends" className={`nav-item ${location.pathname === '/friends' ? 'active' : ''}`}>
            <Users size={20} /> Friends
          </Link>
          <Link to="/groups" className={`nav-item ${location.pathname === '/groups' ? 'active' : ''}`}>
            <Users size={20} /> Groups
          </Link>
          <Link to="/activity" className={`nav-item ${location.pathname === '/activity' ? 'active' : ''}`}>
            <Activity size={20} /> Recent Activity
          </Link>
        </nav>
        
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            className="btn btn-outline" 
            style={{ width: '100%', borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}
            onClick={() => {
              localStorage.removeItem('token');
              setCurrentUser(null);
            }}
          >
            Logout
          </button>
          <button 
            className="btn btn-outline" 
            style={{ width: '100%', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}
            onClick={async () => {
              if (window.confirm('Are you sure you want to completely delete your account? This cannot be undone.')) {
                try {
                  const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');
                  await fetch(`${API_BASE}/users/me`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                  });
                  localStorage.removeItem('token');
                  setCurrentUser(null);
                } catch (e) {
                  console.error(e);
                }
              }
            }}
          >
            Delete Account
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="page-title">
            {location.pathname === '/' && 'Dashboard'}
            {location.pathname === '/friends' && 'Friends & Groups'}
            {location.pathname === '/activity' && 'Recent Activity'}
          </div>
          
          <div className="user-profile">
            <div className="avatar">
              {currentUser?.name?.charAt(0).toUpperCase()}
            </div>
            <span>{currentUser?.name}</span>
          </div>
        </header>
        
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
