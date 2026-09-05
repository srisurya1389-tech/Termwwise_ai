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
    title: '1. Executive Cash Position',
    description: 'NovaCraft Manufacturing has ₹8.25L in outstanding invoices. Observe the expected inflows in the 7-day and 30-day buckets.',
    path: '/dashboard',
    targetId: 'tour-cash-position',
    actionText: 'Review Cash Assets'
  },
  {
    title: '2. Cash-Flow Gap Detected',
    description: 'The forecast engine projects a critical cash gap due to upcoming expense obligations. Review the alert panel.',
    path: '/dashboard',
    targetId: 'tour-gap-alert',
    actionText: 'Inspect Pressure Period'
  },
  {
    title: '3. Priorities Queue',
    description: 'NovaCraft needs to prioritize. Open the Priorities Queue. Invoice INV-102 is ranked #1 due to its high impact.',
    path: '/priorities',
    targetId: 'tour-priority-queue',
    actionText: 'Open Action Queue'
  },
  {
    title: '4. Buyer Health Profile',
    description: 'Let\'s check ABC Industries. Click on them in the Buyers list. Notice they historically pay in 62 days despite the 90-day agreement.',
    path: '/buyers/1',
    targetId: 'tour-buyer-profile',
    actionText: 'Analyze Buyer Speed'
  },
  {
    title: '5. Term Recommendation & Sim',
    description: 'Open invoice INV-102. Review the recommended Target Term of 60 days and simulate net term impact scenarios.',
    path: '/receivables/INV-102',
    targetId: 'tour-term-optimizer',
    actionText: 'Optimize Payment Terms'
  },
  {
    title: '6. AI Negotiation strategy',
    description: 'Click "Initiate AI Negotiation" on INV-102 to compile an email draft and negotiation strategy.',
    path: '/receivables/INV-102',
    targetId: 'tour-initiate-negotiation',
    actionText: 'Prepare Strategy'
  },
  {
    title: '7. Simulate Buyer Response',
    description: 'In the negotiation workspace, select a template counteroffer reply like "We can only offer 75 days." and click Analyze.',
    path: '/negotiations',
    targetId: 'tour-simulate-response',
    actionText: 'Simulate Buyer reply'
  },
  {
    title: '8. Human Review & Approval',
    description: 'As a credit manager, review the counteroffer classification recommendation and click Approve.',
    path: '/negotiations',
    targetId: 'tour-human-approval',
    actionText: 'Approve Counteroffer'
  },
  {
    title: '9. Record Negotiated Outcome',
    description: 'Record final outcomes (agreed: 60 days, actual payment: 64 days) and compute the TermWise success score.',
    path: '/negotiations',
    targetId: 'tour-record-outcome',
    actionText: 'Record Settlement'
  },
  {
    title: '10. Close the Loop',
    description: 'Visit outcomes dashboard to observe the TermWise Learning Loop updating ABC\'s profiles for future runs.',
    path: '/outcomes',
    targetId: 'tour-learning-loop',
    actionText: 'View Success Stats'
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
    const elements = document.querySelectorAll('.tour-highlight');
    elements.forEach(el => el.classList.remove('tour-highlight'));
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
        Start Guided Demo
      </button>
    );
  }

  const currentStepInfo = TOUR_STEPS[activeStep];

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-[#0E0E14] border border-purple-500/40 rounded-2xl shadow-2xl p-4 z-40 text-left space-y-3.5 animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 text-purple-400">
          <Sparkles size={14} className="animate-pulse" />
          <span className="text-[10px] font-bold font-mono uppercase tracking-wider">NovaCraft Demo Walkthrough</span>
        </div>
        <button onClick={stopTour} className="text-gray-500 hover:text-white transition cursor-pointer">
          <X size={14} />
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
        <span>Target: <span className="font-mono text-white">{currentStepInfo.actionText}</span></span>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-2 border-t border-[#1C1D2A] text-xs">
        <span className="text-[10px] text-gray-500 font-mono">Step {activeStep + 1} of {TOUR_STEPS.length}</span>
        
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
