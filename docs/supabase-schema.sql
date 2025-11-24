-- Supabase 테이블 생성 스크립트
-- Supabase Dashboard > SQL Editor에서 실행하세요

-- Comments 테이블 생성
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id VARCHAR(255) NOT NULL,
  player_address VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_comments_challenge_id ON comments(challenge_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_player_address ON comments(player_address);

-- Row Level Security (RLS) 활성화 (선택사항)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 댓글을 읽을 수 있도록 정책 추가
CREATE POLICY "Allow public read access" ON comments
  FOR SELECT
  USING (true);

-- 모든 사용자가 댓글을 작성할 수 있도록 정책 추가
CREATE POLICY "Allow public insert access" ON comments
  FOR INSERT
  WITH CHECK (true);

-- 모든 사용자가 자신의 댓글을 삭제할 수 있도록 정책 추가 (선택사항)
CREATE POLICY "Allow public delete own comments" ON comments
  FOR DELETE
  USING (true);

-- 업데이트 트리거 (updated_at 자동 업데이트)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

