import { CheckCircle2, Shield, Activity, Laptop, AlertTriangle, Smartphone, Key, FileText, Lock } from "lucide-react";
import { Link } from "react-router-dom";

export default function Security() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-8">
      <section>
        <h2 className="text-h2 font-h2 text-primary mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-6 flex flex-col justify-between min-h-[140px] shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-label-caps font-label-caps text-on-surface-variant">SYSTEM HEALTH</span>
              <CheckCircle2 className="w-6 h-6 text-[#16a34a]" />
            </div>
            <span className="text-display-metrics font-display-metrics text-primary">Secure</span>
          </div>
          
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-6 flex flex-col justify-between min-h-[140px] shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-label-caps font-label-caps text-on-surface-variant">ACTIVE FIREWALL</span>
              <Shield className="w-6 h-6 text-secondary" />
            </div>
            <span className="text-display-metrics font-display-metrics text-primary">On</span>
          </div>

          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-6 flex flex-col justify-between min-h-[140px] shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-primary-container/5"></div>
            <div className="relative flex justify-between items-start">
              <span className="text-label-caps font-label-caps text-on-surface-variant">SECURITY SCORE</span>
              <Activity className="w-6 h-6 text-primary bg-surface-variant rounded-full p-1" />
            </div>
            <div className="relative flex items-baseline gap-2">
              <span className="text-display-metrics font-display-metrics text-primary">98</span>
              <span className="text-body-lg text-on-surface-variant">/ 100</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-h2 font-h2 text-primary">Recent Activity</h2>
            <Link to="/logs" className="text-button font-button text-secondary hover:underline px-2 py-1">View All</Link>
          </div>
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden shadow-sm">
            <ul className="divide-y divide-outline-variant">
              <li className="p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-primary">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-body-sm font-medium text-primary">Successful Login</p>
                    <p className="text-label-caps text-on-surface-variant">San Francisco, US • Mac OS</p>
                  </div>
                </div>
                <span className="text-label-caps text-[#16a34a] bg-[#16a34a]/10 px-2 py-1 rounded">Success</span>
              </li>
              <li className="p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-primary">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-body-sm font-medium text-primary">Successful Login</p>
                    <p className="text-label-caps text-on-surface-variant">New York, US • iOS</p>
                  </div>
                </div>
                <span className="text-label-caps text-[#16a34a] bg-[#16a34a]/10 px-2 py-1 rounded">Success</span>
              </li>
            </ul>
          </div>
        </section>

        <div className="space-y-8">
          <section>
            <h2 className="text-h2 font-h2 text-primary mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 bg-primary-container text-on-primary-container font-button h-12 rounded-lg px-4 hover:opacity-90 shadow-sm">
                <Key className="w-5 h-5" />
                Rotate API Keys
              </button>
              <button className="flex items-center justify-center gap-2 bg-surface-container-lowest text-primary border border-outline-variant font-button h-12 rounded-lg px-4 hover:bg-surface-container-low shadow-sm">
                <Lock className="w-5 h-5" />
                Enable 2FA for all Users
              </button>
              <Link to="/logs" className="flex items-center justify-center gap-2 bg-surface-container-lowest text-primary border border-outline-variant font-button h-12 rounded-lg px-4 hover:bg-surface-container-low shadow-sm sm:col-span-2">
                <FileText className="w-5 h-5" />
                Audit Logs
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-h2 font-h2 text-primary mb-4">Settings</h2>
            <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-6 space-y-6 shadow-sm">
              {[
                { title: "IP Whitelisting", desc: "Restrict access to known IP addresses.", checked: true },
                { title: "Session Timeout", desc: "Automatically log out idle users after 15m.", checked: true },
                { title: "Automatic Backups", desc: "Daily encrypted backups of security logs.", checked: false },
              ].map((setting) => (
                <div key={setting.title} className="flex items-center justify-between">
                  <div className="flex-1 pr-4">
                    <p className="text-body-lg font-medium text-primary">{setting.title}</p>
                    <p className="text-body-sm text-on-surface-variant">{setting.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" className="sr-only peer" defaultChecked={setting.checked} />
                    <div className="w-11 h-6 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                  </label>
                </div>
              ))}
            </div>
            
            <div className="mt-4">
              <Link to="/security/sessions" className="text-secondary font-button hover:underline">
                Manage Active Sessions &rarr;
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
