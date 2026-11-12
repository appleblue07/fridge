/**
 * ==========================================================================
 * Vercel 서버리스 함수: api/recipe.js
 * 2단계: 1단계 식재료 목록 및 필터 조건 -> OpenRouter Gemma 모델 호출 -> 맞춤 레시피 JSON 반환
 * ==========================================================================
 */

module.exports = async function handler(req, res) {
  // CORS 및 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 사전 요청 처리
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
    const { ingredients, filters, userProfile } = req.body || {};

    // 유효성 검사: 식재료가 최소 1개 이상 전달되어야 함
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        error: '최소 1개 이상의 식재료 목록이 필요합니다.'
      });
    }

    // 환경 변수 검사 (API Key & Model)
    const apiKey = process.env.OPENROUTER_API_KEY;
    const modelName = process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free';

    // API 키 미설정 시 안내 반환
    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      return res.status(500).json({
        success: false,
        error: 'OPENROUTER_API_KEY가 설정되지 않았습니다. .env.local 파일에 유효한 OpenRouter API 키를 입력해주세요.'
      });
    }

    // 필터 옵션 기본값 세팅
    const timeLimit = filters?.maxTimeMinutes ? `${filters.maxTimeMinutes}분 이내` : '30분 이내';
    const cuisineType = filters?.cuisineType || '전체(가장 어울리는 스타일)';
    const difficulty = filters?.difficulty || '쉬움';
    const cookingTools = (filters?.cookingTools && filters.cookingTools.length > 0)
      ? filters.cookingTools.join(', ')
      : '가스레인지/인덕션, 전자레인지, 에어프라이어';

    // 식재료 텍스트 정리 (예: "대파(신선함), 계란(6개 남음)")
    const ingredientListText = ingredients.map((item) => {
      const condition = item.condition ? `(${item.condition})` : '';
      return `${item.name}${condition}`;
    }).join(', ');

    // 3단계 연계 사용자 프로필 조건 (알레르기, 맵기 등)
    let profileConditionText = '';
    if (userProfile) {
      const allergyText = (userProfile.allergies && userProfile.allergies.length > 0)
        ? `\n- 절대 사용 금지(알레르기/기피): ${userProfile.allergies.join(', ')}`
        : '';
      const spicyText = userProfile.spicyLevel
        ? `\n- 맵기 선호도: ${userProfile.spicyLevel}단계 (1:안매움 ~ 5:매우매움)`
        : '';
      const servingsText = userProfile.householdSize
        ? `\n- 기준 인원: ${userProfile.householdSize}인분`
        : '';
      profileConditionText = `${allergyText}${spicyText}${servingsText}`;
    }

    // OpenRouter 프롬프트 구성
    const systemPrompt = `당신은 대한민국 최고의 요리 연구가이자 냉장고 파먹기 전문 셰프입니다.
사용자가 가진 [냉장고 식재료]를 최대한 낭비 없이 소진할 수 있는 실용적이고 맛있는 맞춤형 레시피 2~3개를 추천해야 합니다.
반드시 마크다운 코드블록(\`\`\`json)이나 다른 설명 없이 순수한 JSON 형식으로만 응답해야 합니다.

[작성 및 추천 지침]
1. 냉장고 재료를 주재료로 적극 활용하세요.
2. 소금, 설탕, 간장, 식용유, 물, 참기름 등 일반 가정의 기본 상비 양념은 필요 시 pantry_ingredients 항목으로 명시할 수 있습니다.
3. 단계별 조리 과정(steps)은 초보자도 쉽게 따라 할 수 있도록 행동 단위로 상세하고 친절하게 작성하세요.
4. 조리 과정 중 타이머가 필요한 단계(예: "중불에서 5분간 볶기", "약불에서 10분간 뜸들이기")에는 timer_seconds(초 단위 숫자)를 반드시 포함하세요.
5. 2~3가지 레시피는 서로 다른 개성(예: 초간단 볶음 요리 vs 든든한 찌개/국 요리 vs 퓨전/간식)을 갖도록 구성하세요.`;

    const userPrompt = `[보유 냉장고 식재료]: ${ingredientListText}
[조리 희망 조건]:
- 최대 조리시간: ${timeLimit}
- 선호 요리 스타일: ${cuisineType}
- 난이도: ${difficulty}
- 사용 가능 조리도구: ${cookingTools}${profileConditionText}

위 조건에 꼭 맞는 레시피 2~3개를 아래 JSON 스키마 규격으로만 응답해주세요:
{
  "recipes": [
    {
      "id": "recipe-1",
      "title": "요리명 (예: 대파 파기름 계란 볶음밥)",
      "summary": "1줄 매력 소개 및 요약",
      "cooking_time_minutes": 15,
      "difficulty": "쉬움 | 보통 | 고급",
      "cuisine_type": "한식 | 양식 | 일식 | 중식 | 간식/야식",
      "servings": "1인분",
      "used_fridge_ingredients": ["대파", "계란"],
      "pantry_ingredients": ["식용유 1큰술", "진간장 1큰술", "밥 1공기"],
      "steps": [
        {
          "step_number": 1,
          "instruction": "대파는 송송 썰어 준비합니다.",
          "tip": "흰 대와 초록 잎 부분을 골고루 섞어 쓰면 색과 향이 좋아집니다."
        },
        {
          "step_number": 2,
          "instruction": "팬에 식용유를 두르고 썰어둔 대파를 중약불에서 2분간 볶아 향긋한 파기름을 만듭니다.",
          "timer_seconds": 120
        }
      ],
      "chef_tip": "셰프의 특급 팁 또는 대체 재료 조언"
    }
  ]
}`;

    const payload = {
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // 일관성 있고 현실적인 레시피 출력을 위해 적정 온도 설정
      max_tokens: 2500
    };

    console.log(`[FridgeChef API] 레시피 생성 OpenRouter 호출 시작 - 모델: ${modelName}`);

    // OpenRouter API 호출
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fridgechef.local',
        'X-Title': 'FridgeChef AI'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FridgeChef API] OpenRouter 오류 (${response.status}):`, errorText);

      if (response.status === 429) {
        return res.status(429).json({
          success: false,
          error: 'OpenRouter 무료 모델 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
        });
      }

      return res.status(response.status).json({
        success: false,
        error: `OpenRouter API 통신 오류: ${response.statusText}`
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

    // AI 응답 텍스트에서 JSON 추출 및 파싱
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawContent.trim());
    } catch {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('AI 응답에서 유효한 JSON을 찾을 수 없습니다.');
      }
    }

    // 성공 응답 반환
    return res.status(200).json({
      success: true,
      recipes: parsedResult.recipes || []
    });

  } catch (error) {
    console.error('[FridgeChef API] 레시피 생성 중 예외 발생:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '서버 내부 오류가 발생했습니다.'
    });
  }
};
