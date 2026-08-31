export default async function handler(req, res) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    res.status(500).json({ error: '서버에 Azure 키가 설정되지 않았습니다.' });
    return;
  }

  try {
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

    const token = await tokenResponse.text();
    res.status(200).json({ token, region });
  } catch (err) {
    res.status(500).json({ error: '토큰 발급 중 오류가 발생했습니다.' });
  }
}
