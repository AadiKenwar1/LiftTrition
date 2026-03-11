-- Support requests table
CREATE TABLE support_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  subject_type TEXT NOT NULL DEFAULT 'support' CHECK (subject_type IN ('support', 'feature_request')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for querying
CREATE INDEX idx_support_requests_user_id ON support_requests(user_id);
CREATE INDEX idx_support_requests_created_at ON support_requests(created_at DESC);
CREATE INDEX idx_support_requests_subject_type ON support_requests(subject_type);

-- Row Level Security
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- Users can only INSERT their own support requests (no SELECT - you view in Supabase dashboard)
CREATE POLICY "Users can insert own support requests"
  ON support_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);