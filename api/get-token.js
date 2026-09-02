// Vercel 서버리스 함수 (배포 시엔 /api/get-token 경로로 자동 연결되고, 로컬에선 dev-server.mjs가
// 같은 파일을 그대로 불러와 http://localhost:3000/api/get-token 으로 흉내낸다).
//
// 진짜 Azure Speech Key는 이 서버 쪽 코드(환경 변수)에만 있고 브라우저로는 절대 내려보내지 않는다.
// 대신 이 함수가 Azure의 "임시 토큰 발급" API를 대신 호출해서, 10분 동안만 유효한 토큰을 받아와
// 그 토큰만 브라우저에 돌려준다 (llm-wiki/10-음성인식-기술-선택.md의 API 키 보관 원칙).
// 브라우저는 이후 이 토큰으로 Azure의 TTS(speak)와 발음 평가(assessRecording) API를 직접 호출한다.
export default async function handler(req, res) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  // .env.local(로컬) 또는 Vercel 환경 변수(배포)에 키가 등록돼 있지 않으면 여기서 바로 멈춘다
  if (!key || !region) {
    res.status(500).json({ error: '서버에 Azure 키가 설정되지 않았습니다.' });
    return;
  }

  try {
    // Azure STS(보안 토큰 서비스)에 진짜 키를 실어 보내 임시 토큰을 발급받는다.
    // 이 요청은 서버(Node.js)에서만 실행되므로 진짜 키가 브라우저 네트워크 탭에 노출되지 않는다.
    const tokenResponse = await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': key },
      }
    );

    if (!tokenResponse.ok) {
      res.status(502).json({ error: 'Azure 토큰 발급에 실패했습니다.' });
      return;
    }

    // 발급받은 토큰과 지역(region)을 브라우저에 그대로 돌려준다.
    // 브라우저는 이 토큰+지역만 가지고 있으면 되고, 원래 키가 뭐였는지는 알 필요도 없고 알 수도 없다.
    const token = await tokenResponse.text();
    res.status(200).json({ token, region });
  } catch (err) {
    res.status(500).json({ error: '토큰 발급 중 오류가 발생했습니다.' });
  }
}
