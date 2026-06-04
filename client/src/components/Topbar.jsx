import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bell, Search, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const CRUMBS = [
  { match: '/dashboard', items: ['Home', 'Dashboard'] },
  { match: '/assets/new', items: ['Inventory', 'Asset Registry', 'Add Asset'] },
  { match: '/assets', items: ['Inventory', 'Asset Registry'] },
  { match: '/transfers/new', items: ['Inventory', 'Transfers', 'New Transfer'] },
  { match: '/transfers', items: ['Inventory', 'Transfers'] },
  { match: '/maintenance', items: ['Inventory', 'Maintenance'] },
  { match: '/disposals', items: ['Inventory', 'Disposals'] },
  { match: '/approvals', items: ['Governance', 'Approvals'] },
  { match: '/audit', items: ['Governance', 'Audit Logs'] },
  { match: '/reports', items: ['Governance', 'Reports'] },
  { match: '/users', items: ['Admin', 'Users'] },
  { match: '/roles', items: ['Admin', 'Roles'] },
  { match: '/settings', items: ['Admin', 'Settings'] },
];

const resolveCrumbs = (pathname) => {
  const route = CRUMBS.find((entry) => pathname === entry.match || pathname.startsWith(`${entry.match}/`));
  return route?.items || ['Home'];
};

const Topbar = ({ onOpenSidebar }) => {
  const location = useLocation();
  const { user } = useAuth();
  const crumbs = resolveCrumbs(location.pathname);
  const title = crumbs[crumbs.length - 1];
  const initials =
    user?.name
      ?.split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="icon-btn mobile-menu" onClick={onOpenSidebar} aria-label="Open menu">
          <Menu size={16} />
        </button>
        <div>
          <div className="topbar-title">{title}</div>
          <nav className="topbar-bc" aria-label="Breadcrumb">
            <Link to="/dashboard">Home</Link>
            {crumbs.slice(1).map((crumb) => (
              <React.Fragment key={crumb}>
                <span className="crumb-separator">/</span>
                <span>{crumb}</span>
              </React.Fragment>
            ))}
          </nav>
        </div>
      </div>

      <div className="topbar-right" aria-label="Toolbar actions">
        <button type="button" className="icon-btn" aria-label="Search">
          <Search size={15} />
        </button>
        <button type="button" className="icon-btn" aria-label="Notifications">
          <Bell size={15} />
          <span className="notif-badge" aria-hidden="true" />
        </button>
        <div className="topbar-avatar" title={user?.name || 'User'}>
          {initials}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
