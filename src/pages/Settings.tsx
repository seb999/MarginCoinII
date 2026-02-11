import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="page-container">
      <div className="page-header">
        <SettingsIcon size={32} />
        <h1>Settings</h1>
      </div>
      <div className="page-content">
        <p>Configure your application settings here.</p>
      </div>
    </div>
  );
}
