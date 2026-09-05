export interface Buyer {
  id: number;
  name: string;
  created_at: string;
}

export interface BuyerIntelligence {
  invoice_count: number;
  average_payment_days: number;
  median_payment_days: number;
  late_payment_percentage: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  outstanding_amount: number;
  predicted_payment_days: number | null;
  predicted_payment_window: string | null;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH' | null;
}

export interface BuyerDetail extends Buyer {
  intelligence: BuyerIntelligence;
}

export interface Invoice {
  id: number;
  invoice_id: string;
  buyer_id: number;
  buyer_name: string;
  amount: number;
  invoice_date: string;
  agreed_payment_days: number;
  due_date: string;
  actual_payment_date: string | null;
  payment_status: 'Paid' | 'Outstanding' | 'Overdue' | 'Partially Paid';
  created_at: string;
}


export interface ScenarioComparison {
  proposed_term: number;
  expected_payment_date: string;
  cash_within_60_days: number;
  max_cash_flow_gap: number;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface TermAnalysis {
  invoice_id: string;
  current_agreed_term_days: number;
  recommended_target_term_days: number;
  recommended_fallback_term_days: number;
  maximum_acceptable_term_days: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  evidence: string[];
  scenario_comparison: ScenarioComparison[];
}

export interface Negotiation {
  id: number;
  invoice_id: string;
  buyer_id: number;
  round: number;
  status: string; // INITIAL, WAITING_FOR_RESPONSE, AGREED, REJECTED, BOUNDARY_EXCEEDED, etc.
  target_term: number;
  fallback_term: number;
  boundary_term: number;
  buyer_latest_offer: number | null;
  strategy: string;
  message: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EDITED';
  created_at: string;
  updated_at: string;
}

export interface ActionDetails {
  action: string;
  reason: string;
  evidence: string;
  risk: string;
  review_instructions: string;
}

export interface ResponseAnalysis {
  category: string;
  detected_term_days: number | null;
  negotiation_status: string;
  recommended_action: string;
  action_details: ActionDetails;
  reasoning: string;
}

export interface Outcome {
  id: number;
  negotiation_id: number;
  invoice_id: string;
  buyer_id: number;
  final_agreed_term: number | null;
  actual_payment_date: string | null;
  actual_payment_days: number | null;
  predicted_payment_days: number | null;
  prediction_error: number | null;
  outcome: string;
  cash_flow_gap_before: number | null;
  cash_flow_gap_after: number | null;
  days_improved: number;
  cash_flow_gap_improvement: number | null;
  termwise_outcome_score: number;
  score_reasons: string[];
  created_at: string;
}

export interface DashboardSummary {
  total_outstanding: number;
  expected_cash_7_days: number;
  expected_cash_30_days: number;
  potential_cash_flow_gap: number;
  high_risk_amount: number;
  high_priority_invoice_count: number;
  active_negotiations: number;
  successful_negotiations: number;
  average_prediction_error: number;
  average_payment_term_improvement: number;
}

export interface PriorityItem {
  invoice_id: string;
  buyer_name: string;
  invoice_amount: number;
  due_date: string;
  predicted_payment_date: string;
  payment_status: 'Outstanding' | 'Overdue';
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  cash_impact_score: number;
  cash_impact_level: 'LOW' | 'MEDIUM' | 'HIGH';
  opportunity_score: number;
  priority_score: number;
  recommended_action: string;
  action_explanation: string;
  why_explanation: string[];
  contributes_to_gap: boolean;
}

export interface PrioritySummary {
  total_outstanding: number;
  high_risk_outstanding: number;
  num_high_priority_invoices: number;
  potential_opportunity_amount: number;
  buyers_requiring_action: number;
}

export interface PrioritiesResponse {
  summary: PrioritySummary;
  queue: PriorityItem[];
}

export interface CashInflowScenarios {
  within_7_days: number;
  within_15_days: number;
  within_30_days: number;
  within_60_days: number;
}

export interface CashFlowForecastResponse {
  total_outstanding: number;
  expected_cash_7_days: number;
  expected_cash_15_days: number;
  expected_cash_30_days: number;
  expected_cash_60_days: number;
  scenarios: {
    optimistic: CashInflowScenarios;
    base: CashInflowScenarios;
    pessimistic: CashInflowScenarios;
  };
  potential_gaps: Array<{
    expense_name: string;
    expense_date: string;
    gap_amount: number;
    cumulative_expenses: number;
    cumulative_inflow: number;
    reason: string;
  }>;
}

export interface Payment {
  id: number;
  payment_id: string;
  invoice_id: string;
  buyer_id: number;
  buyer_name: string;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PENDING';
  payment_date: string;
  created_at: string;
  source: 'RAZORPAY' | 'DEMO';
}

export interface PaymentTimelineItem {
  payment_id: string;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PENDING';
  payment_date: string;
  source: 'RAZORPAY' | 'DEMO';
}

export interface PaymentTimeline {
  invoice_id: string;
  invoice_amount: number;
  total_received: number;
  outstanding_amount: number;
  payment_status: string;
  payments: PaymentTimelineItem[];
}

export interface BuyerPaymentAnalysis {
  buyer_id: number;
  buyer_name: string;
  total_paid: number;
  total_outstanding: number;
  average_payment_days: number;
  median_payment_days: number;
  late_payment_count: number;
  late_payment_percentage: number;
  partial_payment_count: number;
  successful_payment_count: number;
  recent_payments: Payment[];
}

export interface RazorpayStatus {
  configured: boolean;
  mode: 'LIVE' | 'DEMO' | 'MOCK_LIVE';
  message: string;
  key_id?: string | null;
}

export interface PaymentImportResponse {
  status: string;
  imported_count: number;
  reconciled_invoices_count: number;
  mode: string;
  source: string;
  message: string;
}

export interface AuditLog {
  id: number;
  event_type: string;
  payment_id?: string | null;
  invoice_id?: string | null;
  message: string;
  status: string;
  created_at: string;
}

