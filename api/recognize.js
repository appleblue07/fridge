/**
 * ==========================================================================
 * Vercel 서버리스 함수: api/recognize.js
 * 1단계: 냉장고 이미지 Base64 수신 -> OpenRouter Gemma 비전 모델 호출 -> 식재료 JSON 반환
 * ==========================================================================
 */

module.exports = async function handler(req, res) {
  // CORS 및 헤더 설정 (브라우저 요청 허용)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 사전 요청(Preflight) 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST 메서드만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'POST 메서드만 지원합니다.'
    });
  }

  try {
    // 요청 바디에서 base64 이미지 데이터 추출
    const { image } = req.body || {};

    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        success: false,
        error: '이미지 데이터(Base64)가 전달되지 않았습니다.'
      });
    }

    // 환경 변수 검사 (API Key)
    const apiKey = process.env.OPENROUTER_API_KEY;
    // 모델명: 환경변수 지정값 또는 기본값 google/gemma-4-26b-a4b-it:free
    const modelName = process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free';

    // API 키 미설정 시 안내 반환
    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      return res.status(500).json({
        success: false,
        error: 'OPENROUTER_API_KEY가 설정되지 않았습니다. .env.local 파일에 유효한 OpenRouter API 키를 입력해주세요.'
      });
    }

    // Gemma 모델은 별도의 system role보다 user 턴 내에 지침을 결합할 때 인식률이 가장 높습니다.
    const promptText = `[지침]
당신은 냉장고 이미지에서 식재료를 식별하는 전문 비전 AI입니다.
주어진 냉장고 사진 속에서 식별되는 모든 식재료(채소, 과일, 육류, 해산물, 유제품, 가공식품, 양념/소스 등)를 빠짐없이 찾아내세요.
반드시 마크다운 코드블록(\`\`\`json)이나 부가 설명 없이 순수 JSON 규격으로만 응답해야 합니다.

[응답 JSON 스키마 형식]
{
  "ingredients": [
    {
      "name": "식재료 이름 (예: 대파, 계란, 우유)",
      "category": "채소/과일 | 육류/해산물 | 유제품/계란 | 양념/소스 | 가공식품/기타",
      "condition": "추정 상태 또는 잔량 (예: 신선함, 개봉됨, 1/2 남음)"
    }
  ],
  "confidence_note": "식별 신뢰도 및 전반적인 냉장고 상태 1줄 요약 코멘트"
}`;

    const payload = {
      model: modelName,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: promptText
            },
            {
              type: 'image_url',
              image_url: {
                url: image
              }
            }
          ]
        }
      ],
      temperature: 0.2, // 일관성 있는 JSON 추출을 위한 낮은 온도
      max_tokens: 1500
    };

    console.log(`[FridgeChef API] OpenRouter 비전 호출 시작 - 모델: ${modelName}`);

    // OpenRouter API 호출
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fridgechef.vercel.app',
        'X-Title': 'FridgeChef AI'
      },
      body: JSON.stringify(payload)
    });

    // HTTP 에러 응답 처리
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FridgeChef API] OpenRouter 오류 (${response.status}):`, errorText);

      let detailMsg = response.statusText;
      try {
        const errorJson = JSON.parse(errorText);
        detailMsg = errorJson.error?.message || errorJson.message || errorText;
      } catch {
        detailMsg = errorText;
      }

      if (response.status === 429) {
        return res.status(429).json({
          success: false,
          error: 'OpenRouter 무료 모델 호출 한도를 일시적으로 초과했습니다. 1~2분 후 다시 시도해주세요.'
        });
      }

      return res.status(response.status).json({
        success: false,
        error: `OpenRouter 오류 (${response.status}): ${detailMsg}`
      });
    }

    const data = await response.json();
    const rawContent = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

    if (!rawContent) {
      return res.status(502).json({
        success: false,
        error: 'AI 모델로부터 빈 응답을 받았습니다.'
      });
    }

    // AI 응답 텍스트에서 JSON 추출 및 견고한 파싱 (객체 or 배열 모두 대응)
    let parsedResult = null;

    // 1) 순수 JSON 직접 파싱 시도
    try {
      parsedResult = JSON.parse(rawContent.trim());
    } catch {}

    // 2) 마크다운 백틱 및 정규식 추출 ({ ... })
    if (!parsedResult) {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResult = JSON.parse(jsonMatch[0]);
        } catch {}
      }
    }

    // 3) 배열 형태([ ... ])로 응답이 온 경우 방어
    if (!parsedResult) {
      const arrayMatch = rawContent.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          const arr = JSON.parse(arrayMatch[0]);
          parsedResult = { ingredients: arr };
        } catch {}
      }
    }

    if (!parsedResult) {
      throw new Error(`AI 응답에서 유효한 JSON을 파싱하지 못했습니다. (응답: ${rawContent.slice(0, 80)}...)`);
    }

    // 결과 정규화 및 응답 반환
    return res.status(200).json({
      success: true,
      ingredients: Array.isArray(parsedResult.ingredients) ? parsedResult.ingredients : [],
      confidence_note: parsedResult.confidence_note || '식재료 분석이 완료되었습니다.'
    });

  } catch (error) {
    console.error('[FridgeChef API] 예외 발생:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '서버 내부 오류가 발생했습니다.'
    });
  }
};
