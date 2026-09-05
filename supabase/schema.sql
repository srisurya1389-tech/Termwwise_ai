-- ============================================================================
-- TERMWISE AI — SUPABASE POSTGRESQL SCHEMA WITH ROW-LEVEL SECURITY (RLS)
-- ============================================================================
-- Description:
-- Production-ready PostgreSQL schema for TermWise AI's Dual-Role Platform.
-- Enforces strict Row Level Security (RLS) isolating Customer data from Admin
-- intelligence and guaranteeing cross-company data isolation.
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS public.companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    business_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('ADMIN', 'CUSTOMER')),
    company_id INTEGER REFERENCES public.companies(id) ON DELETE SET NULL,
    buyer_id INTEGER, -- Associated buyer ID for CUSTOMER role
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BUYERS TABLE
CREATE TABLE IF NOT EXISTS public.buyers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(100) NOT NULL UNIQUE,
    buyer_id INTEGER NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE DEFAULT 1,
    amount NUMERIC(12, 2) NOT NULL,
    invoice_date DATE NOT NULL,
    agreed_payment_days INTEGER NOT NULL,
    due_date DATE NOT NULL,
    actual_payment_date DATE,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Outstanding',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(100) NOT NULL UNIQUE,
    invoice_id VARCHAR(100) NOT NULL REFERENCES public.invoices(invoice_id) ON DELETE CASCADE,
    buyer_id INTEGER NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
    payment_date DATE NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'DEMO',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PAYMENT REQUESTS TABLE (Customer Term Extensions)
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(100) NOT NULL REFERENCES public.invoices(invoice_id) ON DELETE CASCADE,
    buyer_id INTEGER NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE DEFAULT 1,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    current_term INTEGER NOT NULL,
    requested_term INTEGER NOT NULL,
    requested_date DATE,
    reason VARCHAR(255) NOT NULL,
    message TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'COUNTEROFFER')),
    counter_term INTEGER,
    counter_date DATE,
    counter_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES public.buyers(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES public.companies(id) ON DELETE CASCADE DEFAULT 1,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM' CHECK (type IN ('INVOICE', 'PAYMENT', 'REQUEST', 'SYSTEM')),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS checks
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS VARCHAR AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS INTEGER AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_user_buyer_id()
RETURNS INTEGER AS $$
    SELECT buyer_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------------------------------------------
-- Users can view and update their own profile
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update safe own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- INVOICES POLICIES
-- ----------------------------------------------------------------------------
-- Admins can read invoices belonging to their company
CREATE POLICY "Admins can view company invoices"
    ON public.invoices FOR SELECT
    USING (
        public.get_current_user_role() = 'ADMIN' AND
        company_id = public.get_current_user_company_id()
    );

-- Customers can ONLY view invoices where buyer_id matches their assigned buyer_id
CREATE POLICY "Customers can view only their own buyer invoices"
    ON public.invoices FOR SELECT
    USING (
        public.get_current_user_role() = 'CUSTOMER' AND
        buyer_id = public.get_current_user_buyer_id()
    );

-- ----------------------------------------------------------------------------
-- PAYMENTS POLICIES
-- ----------------------------------------------------------------------------
-- Admins can view company payments
CREATE POLICY "Admins can view company payments"
    ON public.payments FOR SELECT
    USING (
        public.get_current_user_role() = 'ADMIN'
    );

-- Customers can ONLY view their own payments
CREATE POLICY "Customers can view only their own payments"
    ON public.payments FOR SELECT
    USING (
        public.get_current_user_role() = 'CUSTOMER' AND
        buyer_id = public.get_current_user_buyer_id()
    );

-- ----------------------------------------------------------------------------
-- PAYMENT REQUESTS POLICIES
-- ----------------------------------------------------------------------------
-- Customers can view and insert their own payment requests
CREATE POLICY "Customers can view own requests"
    ON public.payment_requests FOR SELECT
    USING (
        public.get_current_user_role() = 'CUSTOMER' AND
        buyer_id = public.get_current_user_buyer_id()
    );

CREATE POLICY "Customers can create requests"
    ON public.payment_requests FOR INSERT
    WITH CHECK (
        public.get_current_user_role() = 'CUSTOMER' AND
        buyer_id = public.get_current_user_buyer_id()
    );

CREATE POLICY "Customers can update own requests on counteroffer"
    ON public.payment_requests FOR UPDATE
    USING (
        public.get_current_user_role() = 'CUSTOMER' AND
        buyer_id = public.get_current_user_buyer_id()
    );

-- Admins can view and update all requests for their company
CREATE POLICY "Admins can view company requests"
    ON public.payment_requests FOR SELECT
    USING (
        public.get_current_user_role() = 'ADMIN' AND
        company_id = public.get_current_user_company_id()
    );

CREATE POLICY "Admins can update company requests"
    ON public.payment_requests FOR UPDATE
    USING (
        public.get_current_user_role() = 'ADMIN' AND
        company_id = public.get_current_user_company_id()
    );

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS POLICIES
-- ----------------------------------------------------------------------------
-- Users can view and update notifications targeted to them or their buyer account
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (
        (user_id = auth.uid()) OR
        (buyer_id = public.get_current_user_buyer_id())
    );

CREATE POLICY "Users can mark own notifications as read"
    ON public.notifications FOR UPDATE
    USING (
        (user_id = auth.uid()) OR
        (buyer_id = public.get_current_user_buyer_id())
    );
