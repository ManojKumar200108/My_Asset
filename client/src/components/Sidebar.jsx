import React, { useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../hooks/useAppData';
import {
  LayoutDashboard, Package, ArrowRightLeft, Wrench, Trash2,
  ShieldCheck, BarChart2, Users, Settings, LogOut, Box, X,
  UserCog, CheckSquare,
} from 'lucide-react';

// ─── Config ──────────────────────────────────────────────────────────────────

const NAV = [
  {
    section: 'Main',
    items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    section: 'Inventory',
    items: [
      { to: '/assets',      icon: Package,        label: 'Asset Registry' },
      { to: '/transfers',   icon: ArrowRightLeft,  label: 'Transfers',   badgeKey: 'activeTransfers' },
      { to: '/maintenance', icon: Wrench,          label: 'Maintenance', badgeKey: 'maintenanceDue' },
      { to: '/disposals',   icon: Trash2,          label: 'Disposals' },
    ],
  },
  {
    section: 'Governance',
    items: [
      { to: '/approvals', icon: CheckSquare, label: 'Approvals', roles: ['ADMIN', 'MANAGER'], badgeKey: 'pendingApprovals' },
      { to: '/audit',     icon: ShieldCheck, label: 'Audit Logs' },
      { to: '/reports',   icon: BarChart2,   label: 'Reports' },
    ],
  },
  {
    section: 'Admin',
    items: [
      { to: '/users',    icon: Users,    label: 'Users',    roles: ['ADMIN'] },
      { to: '/roles',    icon: UserCog,  label: 'Roles',    roles: ['ADMIN'] },
      { to: '/settings', icon: Settings, label: 'Settings', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name) {
  return name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}

function getBadgeValue(totals, badgeKey) {
  if (!totals || !badgeKey) return null;
  const value = totals[badgeKey];
  return value > 0 ? value : null;
}

function isItemVisible(item, userRole) {
  return !item.roles || item.roles.includes(userRole);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SidebarLogo({ onClose }) {
  return (
    <div className="sidebar-logo">
      <div className="sidebar-logomark">
        <Box size={16} color="#fff" />
      </div>
      <div className="sidebar-brand-wrap show-on-expand">
        <div className="sidebar-brand">AssetTrack</div>
        <span className="sidebar-brand-tag">Enterprise v2.0</span>
      </div>
      <button
        type="button"
        className="icon-btn sidebar-close"
        onClick={onClose}
        aria-label="Close menu"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function NavItem({ item, badgeValue, onClose }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      onClick={onClose}
      title={item.label}
      aria-label={item.label}
      className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
    >
      <span className="sidebar-icon-wrap" aria-hidden="true">
        <Icon size={18} strokeWidth={1.8} />
      </span>
      <span className="sidebar-label show-on-expand">{item.label}</span>
      {badgeValue && (
        <span className="sidebar-badge show-on-expand">{badgeValue}</span>
      )}
      <span className="sidebar-tooltip" role="tooltip">{item.label}</span>
    </NavLink>
  );
}

function NavGroup({ section, items, userRole, totals, onClose }) {
  const visible = items.filter((item) => isItemVisible(item, userRole));
  if (!visible.length) return null;

  return (
    <div className="sidebar-group">
      <h2 className="sidebar-section show-on-expand">{section}</h2>
      {visible.map((item) => (
        <NavItem
          key={item.to}
          item={item}
          badgeValue={getBadgeValue(totals, item.badgeKey)}
          onClose={onClose}
        />
      ))}
    </div>
  );
}

function SidebarUser({ name, role }) {
  return (
    <div className="sidebar-user">
      <div className="sidebar-avatar">{getInitials(name)}</div>
      <div className="sidebar-user-meta show-on-expand" style={{ minWidth: 0 }}>
        <div className="sidebar-uname" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name || 'User'}
        </div>
        <div className="sidebar-urole">{role || 'Role'}</div>
      </div>
    </div>
  );
}

function LogoutButton({ onLogout }) {
  return (
    <div className="sidebar-logout show-on-expand">
      <button
        className="sidebar-logout-btn btn btn-soft"
        onClick={onLogout}
        aria-label="Logout"
      >
        <LogOut size={16} />
        <span>Logout</span>
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { data } = useAppData();
  const navigate = useNavigate();

  const totals = data?.dashboard?.totals ?? null;

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} aria-label="Primary navigation">
      <SidebarLogo onClose={onClose} />

      <nav className="sidebar-nav">
        {NAV.map(({ section, items }) => (
          <NavGroup
            key={section}
            section={section}
            items={items}
            userRole={user?.role}
            totals={totals}
            onClose={onClose}
          />
        ))}
      </nav>

      <SidebarUser name={user?.name} role={user?.role} />
      <LogoutButton onLogout={handleLogout} />
    </aside>
  );
};

export default Sidebar;