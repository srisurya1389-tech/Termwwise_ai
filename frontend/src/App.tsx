import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Receivables from './pages/Receivables';
import InvoiceDetail from './pages/InvoiceDetail';
import Buyers from './pages/Buyers';
import BuyerDetail from './pages/BuyerDetail';
import CashFlow from './pages/CashFlow';
import Priorities from './pages/Priorities';
import Negotiations from './pages/Negotiations';
import NegotiationWorkspace from './pages/NegotiationWorkspace';
import Outcomes from './pages/Outcomes';
import Insights from './pages/Insights';
import Integrations from './pages/Integrations';

import './App.css';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Core Entry Portal */}
        <Route path="/" element={<Landing />} />

        {/* Dashboard Panels */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Accounts Receivables Ledger */}
        <Route path="/receivables" element={<Receivables />} />
        <Route path="/receivables/:invoiceId" element={<InvoiceDetail />} />
        
        {/* Buyer Health Profiles */}
        <Route path="/buyers" element={<Buyers />} />
        <Route path="/buyers/:buyerId" element={<BuyerDetail />} />
        
        {/* Cash Flow and Priorities Gaps */}
        <Route path="/cash-flow" element={<CashFlow />} />
        <Route path="/priorities" element={<Priorities />} />
        
        {/* Strategy Copilot and Message Logs */}
        <Route path="/negotiations" element={<Negotiations />} />
        <Route path="/negotiations/:negotiationId" element={<NegotiationWorkspace />} />
        
        {/* Success Scoreboards */}
        <Route path="/outcomes" element={<Outcomes />} />
        <Route path="/insights" element={<Insights />} />

        {/* Integrations & Gateway Settings */}
        <Route path="/settings/integrations" element={<Integrations />} />

        {/* Wildcard Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

