import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Sparkles, HelpCircle } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  path: string;
  targetId: string;
  actionText: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'STEP 1: Business Cash Position',
    description: 'NovaCraft Manufacturing has ₹8.25L in outstanding receivables. Observe the baseline inflows in the 7-day and 30-day buckets.',
    path: '/dashboard',
    targetId: 'tour-cash-position',
    actionText: 'Inspect Cash Assets'
  },
  {
    title: 'STEP 2: Risk Detected',
    description: 'The forecast engine projects a critical cash-flow gap due to upcoming operational liabilities. Review the gap alert banner.',
    path: '/dashboard',
    targetId: 'tour-gap-alert',
    actionText: 'Review Gap Alert'
  },
  {
    title: 'STEP 3: Priority Invoice',
    description: 'TermWise ranks receivables by financial threat impact. Invoice INV-102 (ABC Industries, ₹3.20L) is ranked #1 priority.',
    path: '/priorities',
    targetId: 'tour-priority-queue',
    actionText: 'Open Priority Queue'
  },
  {
    title: 'STEP 4: Buyer Intelligence',
    description: 'ABC Industries historically pays in ~62 days despite having a 90-day contractual agreement. This behavioral gap creates the opportunity.',
    path: '/buyers/1',
    targetId: 'tour-buyer-profile',
    actionText: 'Analyze Buyer Speed'
  },
  {
    title: 'STEP 5: Payment Prediction',
    description: 'TermWise computes expected cash arrival dates and confidence intervals for INV-102 based on statistical buyer performance.',
    path: '/receivables/INV-102',
    targetId: 'tour-prediction',
    actionText: 'Inspect Inflow Forecast'
  },
  {
    title: 'STEP 6: Term Optimization',
    description: 'The Term Optimizer calculates: Target: 60 days, Fallback: 75 days, Max Acceptable: 90 days, backed by percentiles and cash gap tolerance.',
    path: '/receivables/INV-102',
    targetId: 'tour-term-optimizer',
    actionText: 'Optimize Payment Terms'
  },
  {
    title: 'STEP 7: AI Negotiation',
    description: 'Click "Initiate AI Negotiation" on INV-102 to compile an AI strategy outline and draft a professional, polite buyer communication.',
    path: '/receivables/INV-102',
    targetId: 'tour-initiate-negotiation',
    actionText: 'Prepare Strategy'
  },
  {
    title: 'STEP 8: Buyer Response',
    description: 'In the negotiation workspace, simulate the buyer counteroffer: "We can only offer 75 days." TermWise classifies the response.',
    path: '/negotiations',
    targetId: 'tour-simulate-response',
    actionText: 'Simulate Buyer Reply'
  },
  {
    title: 'STEP 9: Human Approval',
    description: 'Human-in-the-loop governance: The credit manager reviews the AI recommendation and approves the 75-day fallback agreement.',
    path: '/negotiations',
    targetId: 'tour-human-approval',
    actionText: 'Review & Approve'
  },
  {
    title: 'STEP 10: Outcome Measured',
    description: 'Record final settlement outcomes (agreed: 75 days, actual payment: 64 days; predicted: 62d, error: 2d) and calculate TermWise score.',
    path: '/negotiations',
    targetId: 'tour-record-outcome',
    actionText: 'Record Settlement'
  },
  {
    title: 'STEP 11: Learning Loop',
    description: 'The closed-loop engine feeds the recorded outcome back into ABC Industries\' profile to continuously refine future predictions.',
    path: '/outcomes',
    targetId: 'tour-learning-loop',
    actionText: 'Close the Loop'
  }
];

export default function WalkthroughTour() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedStep = localStorage.getItem('termwise_tour_step');
    if (savedStep !== null) {
      setActiveStep(Number(savedStep));
    }
  }, []);

  const startTour = () => {
    setActiveStep(0);
    localStorage.setItem('termwise_tour_step', '0');
    navigate(TOUR_STEPS[0].path);
  };

  const stopTour = () => {
    setActiveStep(null);
    localStorage.removeItem('termwise_tour_step');
    // Clean up highlights
    document.querySelectorAll('.tour-highlight-active').forEach(el => {
      el.classList.remove('tour-highlight-active');
    });
  };

  const handleNext = () => {
    if (activeStep === null) return;
    const nextStep = activeStep + 1;
    if (nextStep < TOUR_STEPS.length) {
      setActiveStep(nextStep);
      localStorage.setItem('termwise_tour_step', String(nextStep));
      navigate(TOUR_STEPS[nextStep].path);
    } else {
      stopTour();
    }
  };

  const handlePrev = () => {
    if (activeStep === null || activeStep === 0) return;
    const prevStep = activeStep - 1;
    setActiveStep(prevStep);
    localStorage.setItem('termwise_tour_step', String(prevStep));
    navigate(TOUR_STEPS[prevStep].path);
  };

  // Add highlighting effects to targets
  useEffect(() => {
    if (activeStep === null) return;
    
    // Tiny delay to allow DOM render
    const timer = setTimeout(() => {
      const step = TOUR_STEPS[activeStep];
      
      // Clean up previous highlights
      document.querySelectorAll('.tour-highlight-active').forEach(el => {
        el.classList.remove('tour-highlight-active');
      });

      const targetElement = document.getElementById(step.targetId);
      if (targetElement) {
        targetElement.classList.add('tour-highlight-active');
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [activeStep, location.pathname]);

  if (activeStep === null) {
    return (
      <button
        onClick={startTour}
        className="fixed bottom-6 left-6 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xl z-40 border border-purple-500/20 cursor-pointer transition active:scale-95"
      >
        <Sparkles size={14} className="animate-pulse" />
        Start Demo
      </button>
    );
  }

  const currentStepInfo = TOUR_STEPS[activeStep];

  return (
    <div className="fixed bottom-6 right-6 w-84 bg-[#0E0E14] border border-purple-500/40 rounded-2xl shadow-2xl p-4 z-40 text-left space-y-3.5 animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 text-purple-400">
          <Sparkles size={14} className="animate-pulse" />
          <span className="text-[10px] font-bold font-mono uppercase tracking-wider">
            DEMO {activeStep + 1} / {TOUR_STEPS.length}
          </span>
        </div>
        <button 
          onClick={stopTour} 
          title="Exit Demo" 
          className="text-gray-500 hover:text-white transition cursor-pointer flex items-center gap-1 text-[10px] font-mono"
        >
          <span>Exit Demo</span>
          <X size={13} />
        </button>
      </div>

      {/* Info */}
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-white leading-tight">{currentStepInfo.title}</h4>
        <p className="text-[11px] text-gray-400 leading-relaxed">{currentStepInfo.description}</p>
      </div>

      {/* Action tip */}
      <div className="text-[9px] text-purple-300 font-semibold bg-purple-950/20 border border-purple-900/30 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
        <HelpCircle size={10} className="shrink-0" />
        <span>Action: <span className="font-mono text-white">{currentStepInfo.actionText}</span></span>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-2 border-t border-[#1C1D2A] text-xs">
        <span className="text-[10px] text-gray-500 font-mono">
          Step {activeStep + 1} of {TOUR_STEPS.length}
        </span>
        
        <div className="flex gap-2">
          <button
            onClick={handlePrev}
            disabled={activeStep === 0}
            className="p-1.5 bg-[#12121A] hover:bg-[#1A1A26] border border-[#1C1D26] text-gray-400 disabled:opacity-30 rounded-lg transition cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>
          
          <button
            onClick={handleNext}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold flex items-center gap-1 transition cursor-pointer active:scale-95 text-[10px]"
          >
            {activeStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
