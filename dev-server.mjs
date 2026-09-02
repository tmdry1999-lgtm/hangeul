// 로컬 테스트 전용 서버. Vercel CLI(`npx vercel dev`)가 이 컴퓨터에서 실행이 안 돼서
// (컴퓨터 이름이 한글이라 생기는 환경 문제 - 11번 진행상황 문서 참고) 그 대안으로 만든,
// Vercel 없이 순수 Node.js http 모듈만으로 index.html과 api/get-token.js를 흉내내 서빙하는 서버다.
// 실제 배포(Vercel)에서는 이 파일이 전혀 쓰이지 않고, Vercel이 api/get-token.js를 직접 서버리스
// 함수로 실행해준다 - 즉 이 파일은 딱 그 흉내를 로컬에서 내기 위한 용도다.
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import getTokenHandler from './api/get-token.js';

// .env.local 파일(KEY=VALUE 형식, git에는 올라가지 않는 비밀 파일)을 한 줄씩 읽어서
// process.env(환경 변수)에 그대로 넣어준다. Vercel은 이 일을 대시보드 설정으로 자동으로 해주지만,
// 로컬에서는 이 코드가 그 역할을 대신한다.
const envText = await readFile('./.env.local', 'utf-8');
for (const line of envText.split('\n').filter(Boolean)) {
  const [k, ...rest] = line.split('=');
  process.env[k.trim()] = rest.join('=').trim();
}

const server = createServer(async (req, res) => {
  if (req.url === '/api/get-token') {
    // Vercel 서버리스 함수는 res.status(code).json(obj) 같은 편의 메서드를 기본으로 제공하는데,
    // 순수 Node.js의 http 응답 객체(res)에는 그런 메서드가 없다. get-token.js를 수정하지 않고도
    // 그대로 재사용할 수 있도록, 여기서 res에 같은 이름의 메서드를 직접 만들어 붙여준다.
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); };
    await getTokenHandler(req, res);
    return;
  }

  // 그 외 주소 요청은 전부 index.html 하나로 응답한다 (이 앱은 페이지가 하나뿐인 SPA이므로)
  if (req.url === '/' || req.url === '/index.html') {
    const html = await readFile('./index.html');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
    return;
  }

  res.statusCode = 404;
  res.end('Not found');
});

server.listen(3000, () => console.log('로컬 테스트 서버: http://localhost:3000'));
