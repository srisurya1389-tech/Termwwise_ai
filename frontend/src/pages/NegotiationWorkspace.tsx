import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Send,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  BookOpen,
  Zap,
  Info
} from 'lucide-react';
import { api } from '../api/client';
import type { Negotiation, Invoice, ResponseAnalysis, Outcome } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function NegotiationWorkspace() {
  const { negotiationId } = useParams<{ negotiationId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [negotiation, setNegotiation] = useState<Negotiation | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  
  // Interactive Simulation state
  const [buyerMessageInput, setBuyerMessageInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState<ResponseAnalysis | null>(null);
  const [analyzingResponse, setAnalyzingResponse] = useState(false);
  
  // Outcome recording state
  const [recordingOutcome, setRecordingOutcome] = useState(false);
  const [outcomeAgreedTerm, setOutcomeAgreedTerm] = useState<number>(60);
  const [outcomePaymentDays, setOutcomePaymentDays] = useState<number>(60);
  const [recordedOutcomeResult, setRecordedOutcomeResult] = useState<Outcome | null>(null);

  const fetchNegotiationData = async () => {
    if (!negotiationId) return;
    try {
      setLoading(true);
      const neg = await api.getNegotiation(Number(negotiationId));
      setNegotiation(neg);

      const inv = await api.getInvoice(neg.invoice_id);
      setInvoice(inv);
      
      // Initialize default values for outcome form
      setOutcomeAgreedTerm(neg.target_term);
      setOutcomePaymentDays(neg.target_term);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load negotiation workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNegotiationData();
  }, [negotiationId]);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Negotiation Copilot">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  if (error || !negotiation || !invoice) {
    return (
      <DashboardLayout pageTitle="Negotiation Copilot">
        <div className="flex flex-col items-center justify-center p-12 text-center bg-[#0C0C12] border border-[#171822] rounded-2xl max-w-md mx-auto mt-12">
          <AlertTriangle className="text-rose-500 mb-4" size={40} />
          <h3 className="text-sm font-semibold text-white mb-2">Workspace Not Found</h3>
          <p className="text-xs text-gray-500 mb-6">{error || 'Negotiation details could not be loaded.'}</p>
          <button 
            onClick={() => navigate('/negotiations')}
            className="px-4 py-2 bg-[#12121B] border border-[#1C1D26] hover:bg-[#1A1A26] rounded-xl text-xs font-semibold cursor-pointer text-white"
          >
            Back to Workspaces
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const formatLakhs = (amount: number) => {
    return `₹${(amount / 100000).toFixed(2)}L`;
  };

  const handleUpdateApproval = async (status: 'APPROVED' | 'REJECTED' | 'EDITED') => {
    try {
      const updatedNeg = await (status === 'APPROVED' 
        ? api.approveNegotiation(negotiation.id) 
        : status === 'REJECTED' 
        ? api.rejectNegotiation(negotiation.id) 
        : api.editNegotiation(negotiation.id));
      
      setNegotiation(updatedNeg);
    } catch (err) {
      console.error('Approval state update failed', err);
    }
  };

  const handleAnalyzeBuyerResponse = async () => {
    if (!buyerMessageInput.trim()) return;
    try {
      setAnalyzingResponse(true);
      const res = await api.analyzeBuyerResponse(negotiation.id, buyerMessageInput);
      setAnalysisResult(res);
      
      // Update local negotiation status to reflect classified outcome
      setNegotiation(prev => prev ? {
        ...prev,
        status: res.negotiation_status,
        buyer_latest_offer: res.detected_term_days
      } : null);

      if (res.detected_term_days) {
        setOutcomeAgreedTerm(res.detected_term_days);
        if (res.detected_term_days === 75) {
          setOutcomePaymentDays(64);
        }
      }
    } catch (err) {
      console.error('Response analysis failed', err);
      alert('Analysis failed. Try a simpler numeric offer text.');
    } finally {
      setAnalyzingResponse(false);
    }
  };

  const handleRecordOutcome = async () => {
    try {
      setRecordingOutcome(true);
      const outcome = await api.recordOutcome({
        negotiation_id: negotiation.id,
        final_agreed_term: outcomeAgreedTerm,
        actual_payment_date: new Date().toISOString().split('T')[0],
        actual_payment_days: outcomePaymentDays,
        cash_flow_gap_before: 500000.0, // mock initial
        cash_flow_gap_after: 180000.0 // mock improved
      });
      setRecordedOutcomeResult(outcome);
      setNegotiation(prev => prev ? { ...prev, status: 'CLOSED' } : null);
    } catch (err) {
      console.error('Failed to record outcome', err);
      alert('Error recording outcome.');
    } finally {
      setRecordingOutcome(false);
    }
  };

  // Helper template simulations
  const loadTemplate = (text: string) => {
    setBuyerMessageInput(text);
  };

  return (
    <DashboardLayout pageTitle={`AI Negotiation Workspace #${negotiation.id}`}>
      <div className="space-y-6 text-left">
        
        {/* Back Link */}
        <button 
          onClick={() => navigate('/negotiations')}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white cursor-pointer transition font-medium"
        >
          <ArrowLeft size={14} />
          Back to Negotiations List
        </button>

        {/* Header summary banner */}
        <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white tracking-tight">Active Strategy Workspace</h2>
            <div className="text-xs text-gray-400 leading-relaxed">
              Buyer: <span className="text-white font-semibold">{invoice.buyer_name}</span> • Reference Invoice ID:{' '}
              <span className="text-purple-400 font-mono font-bold">{negotiation.invoice_id}</span> • Value:{' '}
              <span className="text-white font-semibold font-mono">{formatLakhs(invoice.amount)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs text-gray-500 font-mono">WORKSPACE STATE:</span>
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
              negotiation.status === 'AGREED' || negotiation.status === 'CLOSED'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                : negotiation.status === 'REJECTED'
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
            }`}>
              {negotiation.status}
            </span>
          </div>
        </div>

        {/* Main Columns workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left panel: Context and AI Strategy */}
          <div className="space-y-6">
            {/* Target values */}
            <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-[#12121A] pb-3">
                <BookOpen size={14} className="text-purple-400" />
                Target Boundaries
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-gray-500 font-mono">Contractual Agreed Term</div>
                  <div className="text-sm font-bold text-white mt-0.5">{invoice.agreed_payment_days} Days</div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-500 font-mono">AI Target Net Term</div>
                  <div className="text-sm font-bold text-indigo-400 mt-0.5">{negotiation.target_term} Days</div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-500 font-mono">Fallback Acceptable Term</div>
                  <div className="text-sm font-bold text-purple-400 mt-0.5">{negotiation.fallback_term} Days</div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-500 font-mono">Maximum Acceptable boundary</div>
                  <div className="text-sm font-bold text-rose-400 mt-0.5">{negotiation.boundary_term} Days</div>
                </div>
              </div>
            </div>

            {/* Compiled Strategy details */}
            <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-purple-400" />
                AI Strategy Outline
              </h3>
              <div className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                {negotiation.strategy}
              </div>
            </div>

            {/* Explainable AI Decision Card */}
            <div className="p-6 rounded-2xl bg-[#0B0C14] border border-[#1E1F30] space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-purple-400">
                <Sparkles size={14} />
                Explainable Decision
              </h3>
              
              <div className="space-y-3 text-xs leading-relaxed">
                <div>
                  <span className="font-mono text-gray-500 font-bold">DECISION:</span>{' '}
                  <span className="text-white font-semibold">Prioritize {invoice.invoice_id} & Optimize terms</span>
                </div>
                <div>
                  <span className="font-mono text-gray-500 font-bold">WHY:</span>{' '}
                  <span className="text-gray-300">High financial cash position threat + payment-term mismatch opportunity</span>
                </div>
                <div>
                  <span className="font-mono text-gray-500 font-bold">EVIDENCE:</span>{' '}
                  <span className="text-gray-300">
                    Buyer median payment speed = 62 days • Agreed term = 90 days • Receivable amount = {formatLakhs(invoice.amount)}
                  </span>
                </div>
                <div>
                  <span className="font-mono text-gray-500 font-bold">ACTION:</span>{' '}
                  <span className="text-purple-300 font-semibold">Initiate AI Strategy negotiation workspace to compromise target terms at 60 days</span>
                </div>
              </div>
            </div>

            {/* Audit Trail Event Log */}
            <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-gray-400">
                <Info size={14} />
                Demo Event Audit Trail
              </h3>
              
              <div className="space-y-3 font-mono text-[10px] text-gray-400">
                <div className="flex gap-2.5">
                  <span className="text-purple-400">10:02</span>
                  <span>Invoice assets INV-102 loaded into database memory.</span>
                </div>
                <div className="flex gap-2.5">
                  <span className="text-purple-400">10:03</span>
                  <span>High-priority cash-flow gap threat risk calculated.</span>
                </div>
                <div className="flex gap-2.5">
                  <span className="text-purple-400">10:04</span>
                  <span>Recommended term optimization thresholds generated (Target 60d).</span>
                </div>
                <div className="flex gap-2.5">
                  <span className="text-purple-400">10:05</span>
                  <span>Negotiation strategy session initiated (Round {negotiation.round}).</span>
                </div>
                {negotiation.approval_status === 'APPROVED' && (
                  <div className="flex gap-2.5 text-emerald-400">
                    <span>10:07</span>
                    <span>AI strategy message approved for dispatch.</span>
                  </div>
                )}
                {negotiation.buyer_latest_offer && (
                  <div className="flex gap-2.5 text-indigo-400">
                    <span>10:08</span>
                    <span>Buyer counteroffer analyzed ({negotiation.buyer_latest_offer} days). Category: COUNTEROFFER.</span>
                  </div>
                )}
                {negotiation.status === 'CLOSED' && (
                  <div className="flex gap-2.5 text-emerald-400">
                    <span>10:10</span>
                    <span>Simulated outcome recorded. Invoice INV-102 set to Paid. ABC Industries buyer profile statistics successfully updated.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right panel: Communication log & Approvals */}
          <div className="space-y-6">
            
            {/* Conversation Log & Message Draft */}
            <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] space-y-4 flex flex-col justify-between min-h-[300px]">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-[#12121A] pb-3">
                  <MessageSquare size={14} className="text-purple-400" />
                  Buyer Conversation Log
                </h3>

                <div className="space-y-4">
                  {/* Outgoing Message Draft */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-bold tracking-wider mb-2">
                      <span className="text-purple-400 uppercase font-mono">Drafted Message (To Buyer)</span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">AI GENERATED — HUMAN REVIEW REQUIRED</span>
                    </div>
                    <div className="p-4 bg-[#12121A] border border-[#1A1A26] rounded-xl text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {negotiation.message.split('--- Round')[0]}
                    </div>
                  </div>

                  {/* Message Audit Log */}
                  {negotiation.message.includes('--- Round') && (
                    <div className="p-4 bg-[#0A0A10] border border-dashed border-[#1B1B26] rounded-xl text-[11px] text-gray-400 whitespace-pre-wrap leading-relaxed">
                      {negotiation.message.substring(negotiation.message.indexOf('--- Round'))}
                    </div>
                  )}
                </div>
              </div>

              {/* Human Approval buttons */}
              {negotiation.approval_status === 'PENDING' && (
                <div id="tour-human-approval" className="pt-6 border-t border-[#12121A] flex flex-wrap gap-2.5">
                  <button 
                    onClick={() => handleUpdateApproval('APPROVED')}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-[0_2px_10px_rgba(168,85,247,0.25)] transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck size={14} />
                    Approve & Continue
                  </button>
                  
                  <button 
                    onClick={() => handleUpdateApproval('EDITED')}
                    className="px-4 py-2 bg-[#12121A] hover:bg-[#1C1C28] border border-[#232332] rounded-xl text-xs font-semibold text-white transition cursor-pointer"
                  >
                    Edit Message
                  </button>

                  <button 
                    onClick={() => handleUpdateApproval('REJECTED')}
                    className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 rounded-xl text-xs font-semibold text-rose-400 transition cursor-pointer"
                  >
                    Reject Strategy
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Response Classification Simulator */}
            {negotiation.approval_status === 'APPROVED' && negotiation.status !== 'CLOSED' && (
              <div id="tour-simulate-response" className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={14} className="text-purple-400" />
                  Classify Buyer Counteroffer
                </h3>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Enter the buyer's response text to test the system classifier and decision guardrails.
                </p>

                {/* Templates Helper */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button 
                    onClick={() => {
                      loadTemplate("We can only offer 75 days.");
                      setOutcomeAgreedTerm(75);
                      setOutcomePaymentDays(64);
                    }}
                    className="px-2.5 py-1 bg-[#12121A] hover:bg-[#1A1A26] border border-[#1C1D26] hover:border-purple-500/40 rounded-lg text-[10px] text-gray-300 hover:text-purple-300 transition cursor-pointer font-medium"
                  >
                    Simulate: "We can only offer 75 days." (Primary Demo)
                  </button>
                  <button 
                    onClick={() => {
                      loadTemplate("Yes, we can agree to 60 days terms.");
                      setOutcomeAgreedTerm(60);
                      setOutcomePaymentDays(62);
                    }}
                    className="px-2.5 py-1 bg-[#12121A] hover:bg-[#1A1A26] border border-[#1C1D26] hover:border-purple-500/40 rounded-lg text-[10px] text-gray-300 hover:text-purple-300 transition cursor-pointer font-medium"
                  >
                    Accept 60 Days (Target)
                  </button>
                  <button 
                    onClick={() => {
                      loadTemplate("Our company policy strictly requires 90 days.");
                      setOutcomeAgreedTerm(90);
                      setOutcomePaymentDays(90);
                    }}
                    className="px-2.5 py-1 bg-[#12121A] hover:bg-[#1A1A26] border border-[#1C1D26] hover:border-rose-500/40 rounded-lg text-[10px] text-gray-300 hover:text-rose-300 transition cursor-pointer font-medium"
                  >
                    Reject 90 Days (Boundary)
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    rows={2}
                    value={buyerMessageInput}
                    onChange={(e) => setBuyerMessageInput(e.target.value)}
                    placeholder="Type buyer reply here..."
                    className="w-full bg-[#12121A] border border-[#1C1D26] rounded-xl p-3 text-xs text-gray-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 leading-relaxed"
                  />
                  <button 
                    onClick={handleAnalyzeBuyerResponse}
                    disabled={analyzingResponse || !buyerMessageInput.trim()}
                    className="absolute right-3.5 bottom-3.5 p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition disabled:opacity-50 cursor-pointer"
                  >
                    <Send size={12} />
                  </button>
                </div>

                {/* Analysis results Display */}
                {analysisResult && (
                  <div className="p-4 bg-purple-950/20 border border-purple-500/25 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-center text-[10px] font-bold font-mono tracking-wider text-purple-300">
                      <span>CLASSIFICATION RESULT</span>
                      <span>{analysisResult.category}</span>
                    </div>
                    
                    <div className="text-[11px] text-gray-300 font-semibold">
                      Action Recommendation: <span className="text-white">{analysisResult.recommended_action}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 leading-relaxed font-sans">
                      {analysisResult.reasoning}
                    </div>

                    {/* Outcome Recorder panel when outcome is detected */}
                    {(analysisResult.negotiation_status === 'AGREED' || analysisResult.negotiation_status === 'REJECTED' || analysisResult.negotiation_status === 'ESCALATE' || analysisResult.negotiation_status === 'CLOSED') && (
                      <div id="tour-record-outcome" className="pt-3.5 border-t border-[#312255] mt-2 space-y-3.5">
                        <div className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Record Transaction Result</div>
                        
                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-[9px] text-gray-500 uppercase tracking-wider block">Agreed Term Days</label>
                            <input 
                              type="number"
                              value={outcomeAgreedTerm}
                              onChange={(e) => setOutcomeAgreedTerm(Number(e.target.value))}
                              className="w-full bg-[#12121A] border border-[#1C1D26] rounded-lg px-2 py-1 text-xs text-white font-mono mt-1"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] text-gray-500 uppercase tracking-wider block">Actual Payment Days</label>
                            <input 
                              type="number"
                              value={outcomePaymentDays}
                              onChange={(e) => setOutcomePaymentDays(Number(e.target.value))}
                              className="w-full bg-[#12121A] border border-[#1C1D26] rounded-lg px-2 py-1 text-xs text-white font-mono mt-1"
                            />
                          </div>
                        </div>

                        <button 
                          onClick={handleRecordOutcome}
                          disabled={recordingOutcome}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-[0_2px_8px_rgba(16,185,129,0.3)] transition cursor-pointer"
                        >
                          {recordingOutcome ? 'Saving outcomes...' : 'Record Outcome & Close'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Outcome Success score showcase */}
            {recordedOutcomeResult && (
              <div id="tour-learning-loop" className="p-6 rounded-2xl bg-gradient-to-br from-[#0A1612] via-[#050B09] to-[#040907] border border-emerald-500/25 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle size={16} />
                  <h3 className="text-xs font-bold font-mono tracking-wider uppercase">Outcome Recorded Successfully</h3>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-gray-500 font-mono">TERMWISE OUTCOME SCORE</div>
                    <div className="text-3xl font-black text-white mt-1 font-mono">{recordedOutcomeResult.termwise_outcome_score}/100</div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-[10px] text-gray-500 font-mono">DAYS IMPROVED</div>
                    <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">+{recordedOutcomeResult.days_improved} Days</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#0F3127]/60">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">Score Breakdown reasons</div>
                  <ul className="space-y-1.5 text-[10px] text-gray-400 leading-relaxed">
                    {recordedOutcomeResult.score_reasons.map((reason, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-emerald-400">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button 
                  onClick={() => navigate('/outcomes')}
                  className="w-full py-2 bg-[#12121A] hover:bg-[#1A1A26] border border-[#1C1D26] rounded-xl text-xs font-semibold text-emerald-400 transition cursor-pointer flex items-center justify-center gap-1"
                >
                  View Performance Dashboard
                  <ArrowLeft className="rotate-180" size={12} />
                </button>
              </div>
            )}

          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
