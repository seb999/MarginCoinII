import { NavLink } from 'react-router-dom';
import { TrendingUp, BarChart3, Settings, Wallet } from 'lucide-react';

export default function Navigation() {
  return (
    <nav className="navigation">
      <div className="nav-logo">
        <h2>MarginCoin</h2>
      </div>
      <ul className="nav-menu">
        <li>
          <NavLink to="/trade" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <TrendingUp size={20} />
            <span>Trade</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/portfolio" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Wallet size={20} />
            <span>Portfolio</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/performance" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <BarChart3 size={20} />
            <span>Performance</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Settings size={20} />
            <span>Settings</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
