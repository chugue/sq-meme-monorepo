import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase 클라이언트 초기화 완료');
} else {
  console.warn('⚠️  Supabase 환경 변수가 설정되지 않았습니다. 일부 기능이 제한될 수 있습니다.');
}

// 미들웨어
app.use(cors({
  origin: (origin, callback) => {
    // origin이 없는 경우 (같은 origin 또는 직접 요청)
    if (!origin) {
      return callback(null, true);
    }

    // 허용할 origin 목록
    const allowedOrigins = [
    'https://app.memex.xyz',
      'http://app.memex.xyz',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
    ];

    // Chrome Extension origin 체크 (chrome-extension://으로 시작)
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }

    // localhost 체크
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    // 허용된 origin 체크
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // 개발 환경에서는 모든 origin 허용
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    callback(new Error('CORS 정책에 의해 차단되었습니다.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supabase: supabase ? 'connected' : 'not configured'
  });
});

// 댓글 관련 API
app.get('/api/comments/:challengeId', async (req, res) => {
  try {
    const { challengeId } = req.params;

    if (!supabase) {
      return res.status(503).json({ 
        error: 'Supabase가 설정되지 않았습니다.' 
      });
    }

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('댓글 조회 오류:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ comments: data || [] });
  } catch (error) {
    console.error('댓글 조회 예외:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

app.post('/api/comments', async (req, res) => {
  try {
    const { challenge_id, player_address, content } = req.body;

    if (!challenge_id || !player_address || !content) {
      return res.status(400).json({ 
        error: '필수 필드가 누락되었습니다: challenge_id, player_address, content' 
      });
    }

    if (!supabase) {
      return res.status(503).json({ 
        error: 'Supabase가 설정되지 않았습니다.' 
      });
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        challenge_id,
        player_address,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('댓글 작성 오류:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ comment: data });
  } catch (error) {
    console.error('댓글 작성 예외:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

app.delete('/api/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;

    if (!supabase) {
      return res.status(503).json({ 
        error: 'Supabase가 설정되지 않았습니다.' 
      });
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('댓글 삭제 오류:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('댓글 삭제 예외:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 방(Challenge) 관련 API
app.get('/api/challenges', async (req, res) => {
  try {
    const { username, username_tag } = req.query;

    if (!username || !username_tag) {
      return res.status(400).json({ 
        error: 'username과 username_tag가 필요합니다.' 
      });
    }

    if (!supabase) {
      return res.status(503).json({ 
        error: 'Supabase가 설정되지 않았습니다.' 
      });
    }

    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('username', username)
      .eq('username_tag', username_tag)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 레코드가 없음
        return res.json({ challenge: null, exists: false });
      }
      console.error('방 조회 오류:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ challenge: data, exists: true });
  } catch (error) {
    console.error('방 조회 예외:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

app.post('/api/challenges', async (req, res) => {
  try {
    const { username, username_tag, token_address } = req.body;

    if (!username || !username_tag || !token_address) {
      return res.status(400).json({ 
        error: '필수 필드가 누락되었습니다: username, username_tag, token_address' 
      });
    }

    if (!supabase) {
      return res.status(503).json({ 
        error: 'Supabase가 설정되지 않았습니다.' 
      });
    }

    const { data, error } = await supabase
      .from('challenges')
      .insert({
        username,
        username_tag,
        token_address,
      })
      .select()
      .single();

    if (error) {
      console.error('방 생성 오류:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ challenge: data });
  } catch (error) {
    console.error('방 생성 예외:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ error: '엔드포인트를 찾을 수 없습니다.' });
});

// 에러 핸들러
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('서버 오류:', err);
  res.status(500).json({ error: '내부 서버 오류가 발생했습니다.' });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 Squid Meme 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 API 엔드포인트: http://localhost:${PORT}/api`);
});

