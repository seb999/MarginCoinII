import { BarChart3 } from 'lucide-react';

export default function Performance() {
  return (
    <div className="page-container">
      <div className="page-header">
        <BarChart3 size={32} />
        <h1>Performance</h1>
      </div>
      <div className="page-content">
        <p>Track your trading performance and analytics here.</p>
      </div>
    </div>
  );
}
