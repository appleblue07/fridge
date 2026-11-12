/**
 * ==========================================================================
 * FridgeChef AI - 클라이언트 메인 스크립트 (script.js)
 * 1단계: 냉장고 이미지 입력, 압축, OpenRouter AI 식재료 자동 인식 및 수동 편집
 * 2단계: 식재료 기반 필터 조건 설정, AI 맞춤 레시피 생성 및 조리 타이머 연동
 * 3단계: 사용자 프로필/취향(알레르기/맵기) 관리 및 나만의 레시피 보관함/메모
 * ==========================================================================
 */

// 전역 오염 방지를 위해 IIFE(즉시 실행 함수 표현식) 패턴 사용
(() => {
  'use strict';

  /* --------------------------------------------------------------------------
     1. DOM 요소 캐싱 (UI Elements)
     -------------------------------------------------------------------------- */
  // 탭 내비게이션 및 섹션
  const tabStep1 = document.getElementById('tab-step1');
  const tabStep2 = document.getElementById('tab-step2');
  const tabStep3 = document.getElementById('tab-step3');
  const tabSavedCount = document.getElementById('tab-saved-count');
  const step1Section = document.getElementById('step1-section');
  const step2Section = document.getElementById('step2-section');
  const step3Section = document.getElementById('step3-section');

  // [프로필/취향 모달 관련]
  const btnOpenProfile = document.getElementById('btn-open-profile');
  const profileModal = document.getElementById('profile-modal');
  const btnCloseProfileModal = document.getElementById('btn-close-profile-modal');
  const btnSaveProfile = document.getElementById('btn-save-profile');
  const profileNickname = document.getElementById('profile-nickname');
  const profileHousehold = document.getElementById('profile-household');
  const allergyChipsWrap = document.getElementById('allergy-chips-wrap');
  const inputCustomAllergy = document.getElementById('input-custom-allergy');
  const btnAddCustomAllergy = document.getElementById('btn-add-custom-allergy');
  const customAllergyChips = document.getElementById('custom-allergy-chips');
  const profileSpicyRange = document.getElementById('profile-spicy-range');
  const profileSpicyLabel = document.getElementById('profile-spicy-label');
  const profileDiet = document.getElementById('profile-diet');

  // [1단계] 드롭존 및 프롬프트/미리보기 컨테이너
  const dropZone = document.getElementById('drop-zone');
  const uploadPrompt = document.getElementById('upload-prompt');
  const previewContainer = document.getElementById('preview-container');
  const previewImage = document.getElementById('preview-image');
  const fileNameEl = document.getElementById('file-name');
  const fileSizeEl = document.getElementById('file-size');

  // [1단계] 작업 버튼 요소
  const btnCamera = document.getElementById('btn-camera');
  const btnGallery = document.getElementById('btn-gallery');
  const btnReselect = document.getElementById('btn-reselect');
  const btnAnalyze = document.getElementById('btn-analyze');

  // [1단계] AI 분석 로딩 상태 및 결과 영역
  const analyzeLoading = document.getElementById('analyze-loading');
  const resultContainer = document.getElementById('result-container');
  const ingredientCountEl = document.getElementById('ingredient-count');
  const confidenceNoteEl = document.getElementById('confidence-note');
  const ingredientsListEl = document.getElementById('ingredients-list');

  // [1단계] 식재료 직접 수동 추가 폼
  const addIngredientForm = document.getElementById('add-ingredient-form');
  const inputIngredientName = document.getElementById('input-ingredient-name');

  // [1단계 -> 2단계 이동 버튼]
  const btnToRecipe = document.getElementById('btn-to-recipe');

  // 숨김 파일 입력 필드 (카메라용, 파일 선택용)
  const inputCamera = document.getElementById('input-camera');
  const inputFile = document.getElementById('input-file');

  // [2단계] 식재료 확인 바 및 편집 버튼
  const step2IngredientCount = document.getElementById('step2-ingredient-count');
  const step2IngredientsChips = document.getElementById('step2-ingredients-chips');
  const btnEditIngredients = document.getElementById('btn-edit-ingredients');

  // [2단계] 레시피 조건 필터 폼 및 입력값
  const recipeFilterForm = document.getElementById('recipe-filter-form');
  const filterTime = document.getElementById('filter-time');
  const filterCuisine = document.getElementById('filter-cuisine');
  const filterDifficulty = document.getElementById('filter-difficulty');
  const toolStove = document.getElementById('tool-stove');
  const toolMicrowave = document.getElementById('tool-microwave');
  const toolAirfryer = document.getElementById('tool-airfryer');
  const btnGenerateRecipes = document.getElementById('btn-generate-recipes');

  // [2단계] 레시피 생성 로딩 상태 및 결과 컨테이너
  const recipeLoading = document.getElementById('recipe-loading');
  const recipeResultsContainer = document.getElementById('recipe-results-container');
  const recipesCountEl = document.getElementById('recipes-count');
  const recipeCardsListEl = document.getElementById('recipe-cards-list');
  const btnRegenerate = document.getElementById('btn-regenerate');

  // [3단계] 보관함 관련 요소
  const inputSavedSearch = document.getElementById('input-saved-search');
  const savedRecipesList = document.getElementById('saved-recipes-list');
  const savedEmptyState = document.getElementById('saved-empty-state');
  const btnGoToStep2 = document.getElementById('btn-go-to-step2');
  const savedFilterBtns = document.querySelectorAll('.saved-filter-btn');

  // [레시피 상세 모달 UI 요소]
  const recipeDetailModal = document.getElementById('recipe-detail-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnModalBottomClose = document.getElementById('btn-modal-bottom-close');
  const modalCuisineBadge = document.getElementById('modal-cuisine-badge');
  const modalRecipeTitle = document.getElementById('modal-recipe-title');
  const modalRecipeSummary = document.getElementById('modal-recipe-summary');
  const modalTime = document.getElementById('modal-time');
  const modalDifficulty = document.getElementById('modal-difficulty');
  const modalServings = document.getElementById('modal-servings');
  const btnModalBookmark = document.getElementById('btn-modal-bookmark');
  const modalUsedIngredients = document.getElementById('modal-used-ingredients');
  const modalPantryIngredients = document.getElementById('modal-pantry-ingredients');
  const modalStepsContainer = document.getElementById('modal-steps-container');
  const modalChefTip = document.getElementById('modal-chef-tip');

  // [모달 내 3단계 조리 메모 및 별점 요소]
  const starBtns = document.querySelectorAll('.star-btn');
  const ratingText = document.getElementById('rating-text');
  const modalCookedCheckbox = document.getElementById('modal-cooked-checkbox');
  const modalNoteTextarea = document.getElementById('modal-note-textarea');
  const btnSaveNote = document.getElementById('btn-save-note');

  /* --------------------------------------------------------------------------
     2. 앱 내부 상태 관리 (State)
     -------------------------------------------------------------------------- */
  const state = {
    currentTab: 'step1',       // 현재 활성 탭 ('step1' | 'step2' | 'step3')
    selectedFile: null,        // 선택된 원본 File 객체
    compressedBase64: null,    // 압축된 Base64 이미지
    previewUrl: null,          // ObjectURL 캐시
    isAnalyzing: false,        // 1단계 비전 분석 진행 중 여부
    isGeneratingRecipe: false, // 2단계 레시피 생성 진행 중 여부
    ingredients: [],           // 식재료 목록 [{ id, name, category, condition, isUserAdded }]
    confidenceNote: '',        // 1단계 AI 코멘트
    recipes: [],               // 2단계 생성된 추천 레시피 목록
    savedRecipes: [],          // 3단계 보관된 레시피 목록 [{ ...recipe, savedAt, rating, userNote, isCooked }]
    savedFilterType: 'all',    // 보관함 필터 ('all' | 'cooked' | 'rated')
    savedSearchQuery: '',      // 보관함 검색어
    activeRecipe: null,        // 상세 모달에서 열람 중인 레시피 객체
    activeTimers: {},          // 활성 타이머 관리 { [stepIndex]: { intervalId, remainingSeconds, isRunning } }
    
    // 사용자 프로필 및 취향 상태 (3단계)
    userProfile: {
      nickname: '',
      householdSize: 2,
      allergies: [],           // 기본 알레르기 태그 선택 목록
      customAllergies: [],     // 사용자가 직접 입력한 기피 재료 목록
      spicyLevel: 2,           // 1~5
      dietPreference: '일반'
    }
  };

  /* --------------------------------------------------------------------------
     3. 헬퍼 유틸리티 함수 (Helper Functions)
     -------------------------------------------------------------------------- */
  function generateId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatTimerTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function playTimerEndSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.log('[FridgeChef] 오디오 재생 생략:', e);
    }
  }

  function validateImageFile(file) {
    if (!file) return false;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const isImage = validTypes.includes(file.type) || file.type.startsWith('image/');
    if (!isImage) {
      alert('이미지 파일(JPG, PNG, WEBP 등)만 업로드할 수 있습니다.');
      return false;
    }
    const maxSizeInBytes = 20 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      alert('파일 크기가 너무 큽니다. 20MB 이하의 이미지를 선택해주세요.');
      return false;
    }
    return true;
  }

  /* --------------------------------------------------------------------------
     4. 탭 전환 및 화면 제어 모듈 (Tab Navigation)
     -------------------------------------------------------------------------- */
  function switchTab(targetTab) {
    state.currentTab = targetTab;

    // 모든 탭 버튼 비활성화
    tabStep1.classList.remove('active');
    tabStep2.classList.remove('active');
    tabStep3.classList.remove('active');

    // 모든 섹션 숨김
    step1Section.classList.add('hidden');
    step2Section.classList.add('hidden');
    step3Section.classList.add('hidden');

    if (targetTab === 'step1') {
      tabStep1.classList.add('active');
      step1Section.classList.remove('hidden');
    } else if (targetTab === 'step2') {
      tabStep2.classList.add('active');
      step2Section.classList.remove('hidden');
      syncStep2IngredientsView();
    } else if (targetTab === 'step3') {
      tabStep3.classList.add('active');
      step3Section.classList.remove('hidden');
      renderSavedRecipes();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function syncStep2IngredientsView() {
    if (state.ingredients.length === 0) {
      try {
        const cached = localStorage.getItem('fridge_ingredients');
        if (cached) state.ingredients = JSON.parse(cached);
      } catch (e) {
        console.error('식재료 캐시 로드 실패:', e);
      }
    }

    step2IngredientCount.textContent = state.ingredients.length;
    step2IngredientsChips.innerHTML = '';

    if (state.ingredients.length === 0) {
      step2IngredientsChips.innerHTML = '<span style="color:#94a3b8; font-size:13px;">선택된 재료가 없습니다. 1단계에서 재료를 추가해주세요.</span>';
      return;
    }

    state.ingredients.forEach((item) => {
      const chip = document.createElement('span');
      chip.className = 'chip-blue';
      chip.textContent = item.name + (item.condition ? ` (${item.condition})` : '');
      step2IngredientsChips.appendChild(chip);
    });
  }

  /* --------------------------------------------------------------------------
     5. 3단계: 사용자 프로필/취향 관리 모듈 (User Profile)
     -------------------------------------------------------------------------- */
  const spicyDescriptions = {
    1: '1단계: 순한맛 (아이도 먹을 수 있는 맛)',
    2: '2단계: 약간 매콤 (진라면 순한맛~보통맛)',
    3: '3단계: 적당히 매움 (신라면 수준)',
    4: '4단계: 얼큰하고 매움 (열라면 수준)',
    5: '5단계: 극강의 매운맛 (불닭볶음면급)'
  };

  function loadUserProfile() {
    try {
      const saved = localStorage.getItem('user_profile');
      if (saved) {
        state.userProfile = { ...state.userProfile, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('프로필 로드 실패:', e);
    }
    updateProfileModalUI();
  }

  function saveUserProfileToStorage() {
    try {
      localStorage.setItem('user_profile', JSON.stringify(state.userProfile));
      console.log('[FridgeChef] 사용자 프로필 저장 완료:', state.userProfile);
    } catch (e) {
      console.error('프로필 저장 실패:', e);
    }
  }

  function updateProfileModalUI() {
    profileNickname.value = state.userProfile.nickname || '';
    profileHousehold.value = String(state.userProfile.householdSize || 2);
    profileSpicyRange.value = state.userProfile.spicyLevel || 2;
    profileSpicyLabel.textContent = spicyDescriptions[state.userProfile.spicyLevel || 2];
    profileDiet.value = state.userProfile.dietPreference || '일반';

    // 알레르기 칩 활성화 상태 반영
    document.querySelectorAll('.allergy-chip').forEach((chip) => {
      const val = chip.dataset.value;
      if (state.userProfile.allergies.includes(val)) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    // 커스텀 기피 재료 렌더링
    renderCustomAllergyChips();
  }

  function renderCustomAllergyChips() {
    customAllergyChips.innerHTML = '';
    (state.userProfile.customAllergies || []).forEach((item, idx) => {
      const chip = document.createElement('span');
      chip.className = 'chip-blue';
      chip.style.backgroundColor = '#fee2e2';
      chip.style.borderColor = '#fca5a5';
      chip.style.color = '#b91c1c';
      chip.innerHTML = `${item} <button type="button" style="border:none;background:none;color:#b91c1c;cursor:pointer;font-weight:bold;margin-left:4px;">&times;</button>`;
      
      chip.querySelector('button').addEventListener('click', () => {
        state.userProfile.customAllergies.splice(idx, 1);
        renderCustomAllergyChips();
      });

      customAllergyChips.appendChild(chip);
    });
  }

  function openProfileModal() {
    loadUserProfile();
    profileModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeProfileModal() {
    profileModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /* --------------------------------------------------------------------------
     6. 클라이언트 이미지 Canvas 압축 모듈
     -------------------------------------------------------------------------- */
  function compressAndEncodeImage(file, maxWidth = 1280, maxHeight = 1280, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = (err) => reject(new Error('이미지 로드 실패: ' + err));
        img.src = e.target.result;
      };

      reader.onerror = (err) => reject(new Error('파일 읽기 실패: ' + err));
      reader.readAsDataURL(file);
    });
  }

  /* --------------------------------------------------------------------------
     7. 1단계 이미지 미리보기 및 초기화
     -------------------------------------------------------------------------- */
  function displayImagePreview(file) {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);

    state.selectedFile = file;
    state.previewUrl = URL.createObjectURL(file);
    state.compressedBase64 = null;

    previewImage.src = state.previewUrl;
    fileNameEl.textContent = file.name || '촬영된 사진';
    fileSizeEl.textContent = formatFileSize(file.size);

    uploadPrompt.classList.add('hidden');
    previewContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    state.ingredients = [];
  }

  function resetImageSelection() {
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = null;
    }
    state.selectedFile = null;
    state.compressedBase64 = null;
    state.ingredients = [];
    state.confidenceNote = '';

    previewImage.src = '';
    fileNameEl.textContent = '-';
    fileSizeEl.textContent = '-';
    inputCamera.value = '';
    inputFile.value = '';

    previewContainer.classList.add('hidden');
    analyzeLoading.classList.add('hidden');
    resultContainer.classList.add('hidden');
    uploadPrompt.classList.remove('hidden');
  }

  function handleFileSelected(file) {
    if (!validateImageFile(file)) return;
    displayImagePreview(file);
  }

  /* --------------------------------------------------------------------------
     8. 1단계 식재료 목록 렌더링 및 수동 추가/삭제
     -------------------------------------------------------------------------- */
  function renderIngredients() {
    ingredientsListEl.innerHTML = '';
    ingredientCountEl.textContent = state.ingredients.length;

    if (state.ingredients.length === 0) {
      ingredientsListEl.innerHTML = '<p class="empty-hint" style="color:#94a3b8; font-size:13px; padding:10px 0;">인식된 식재료가 없습니다. 아래 폼에서 직접 추가해주세요.</p>';
      return;
    }

    state.ingredients.forEach((item) => {
      const chip = document.createElement('div');
      chip.className = `ingredient-chip ${item.isUserAdded ? 'user-added' : ''}`;
      chip.dataset.id = item.id;

      const categorySpan = document.createElement('span');
      categorySpan.className = 'chip-category';
      categorySpan.textContent = item.category || '기타';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'chip-name';
      nameSpan.textContent = item.name;

      chip.appendChild(categorySpan);
      chip.appendChild(nameSpan);

      if (item.condition) {
        const conditionSpan = document.createElement('span');
        conditionSpan.className = 'chip-condition';
        conditionSpan.textContent = `(${item.condition})`;
        chip.appendChild(conditionSpan);
      }

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'chip-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.setAttribute('aria-label', `${item.name} 삭제`);
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeIngredient(item.id);
      });

      chip.appendChild(removeBtn);
      ingredientsListEl.appendChild(chip);
    });

    syncStep2IngredientsView();
  }

  function removeIngredient(id) {
    state.ingredients = state.ingredients.filter((item) => item.id !== id);
    renderIngredients();
  }

  function addManualIngredient(rawName) {
    const trimmed = rawName.trim();
    if (!trimmed) return;

    const isDuplicate = state.ingredients.some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      alert(`'${trimmed}'(은)는 이미 목록에 존재합니다.`);
      return;
    }

    const newItem = {
      id: generateId(),
      name: trimmed,
      category: '직접 추가',
      condition: '수동 등록',
      isUserAdded: true
    };

    state.ingredients.push(newItem);
    renderIngredients();
    inputIngredientName.value = '';
    inputIngredientName.focus();
  }

  /* --------------------------------------------------------------------------
     9. 1단계 OpenRouter Gemma AI 식재료 분석 연동
     -------------------------------------------------------------------------- */
  async function analyzeFridgeImage() {
    if (!state.selectedFile) {
      alert('분석할 이미지를 먼저 선택해주세요.');
      return;
    }

    if (state.isAnalyzing) return;
    state.isAnalyzing = true;

    btnAnalyze.disabled = true;
    analyzeLoading.classList.remove('hidden');
    resultContainer.classList.add('hidden');

    try {
      const base64Image = await compressAndEncodeImage(state.selectedFile);
      state.compressedBase64 = base64Image;

      const response = await fetch('/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `서버 응답 오류 (HTTP ${response.status})`);
      }

      state.ingredients = (data.ingredients || []).map((item) => ({
        id: generateId(),
        name: item.name,
        category: item.category || '기타',
        condition: item.condition || '',
        isUserAdded: false
      }));

      state.confidenceNote = data.confidence_note || '식재료 분석이 완료되었습니다.';
      confidenceNoteEl.textContent = state.confidenceNote;

      renderIngredients();
      resultContainer.classList.remove('hidden');
      resultContainer.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
      console.error('[FridgeChef] AI 분석 오류:', error);

      const userWantsMock = confirm(
        `AI 식재료 분석 중 오류가 발생했습니다:\n[${error.message}]\n\n※ 테스트를 위해 '샘플 냉장고 식재료 목록'을 불러오시겠습니까?`
      );

      if (userWantsMock) {
        state.ingredients = [
          { id: generateId(), name: '대파', category: '채소/과일', condition: '신선함', isUserAdded: false },
          { id: generateId(), name: '계란', category: '유제품/계란', condition: '6개 남음', isUserAdded: false },
          { id: generateId(), name: '스팸', category: '가공식품/기타', condition: '미개봉', isUserAdded: false },
          { id: generateId(), name: '양파', category: '채소/과일', condition: '1개 남음', isUserAdded: false },
          { id: generateId(), name: '김치', category: '양념/소스', condition: '숙성됨', isUserAdded: false }
        ];
        state.confidenceNote = '테스트용 샘플 데이터가 로드되었습니다.';
        confidenceNoteEl.textContent = state.confidenceNote;
        renderIngredients();
        resultContainer.classList.remove('hidden');
        resultContainer.scrollIntoView({ behavior: 'smooth' });
      }

    } finally {
      state.isAnalyzing = false;
      btnAnalyze.disabled = false;
      analyzeLoading.classList.add('hidden');
    }
  }

  /* --------------------------------------------------------------------------
     10. 2단계 OpenRouter Gemma AI 맞춤 레시피 생성 (3단계 프로필 조건 자동 병합)
     -------------------------------------------------------------------------- */
  async function generateCustomRecipes() {
    if (state.ingredients.length === 0) {
      const goBack = confirm('선택된 식재료가 없습니다. 1단계로 이동하여 재료를 사진으로 인식하거나 직접 추가하시겠습니까?');
      if (goBack) switchTab('step1');
      return;
    }

    if (state.isGeneratingRecipe) return;
    state.isGeneratingRecipe = true;

    // 필터 조건 수집
    const tools = [];
    if (toolStove.checked) tools.push(toolStove.value);
    if (toolMicrowave.checked) tools.push(toolMicrowave.value);
    if (toolAirfryer.checked) tools.push(toolAirfryer.value);

    const filterPayload = {
      maxTimeMinutes: parseInt(filterTime.value, 10),
      cuisineType: filterCuisine.value,
      difficulty: filterDifficulty.value,
      cookingTools: tools
    };

    // 3단계 사용자 취향 프로필 통합 (알레르기 합산 및 맵기 전달)
    const combinedAllergies = [
      ...(state.userProfile.allergies || []),
      ...(state.userProfile.customAllergies || [])
    ];

    const profilePayload = {
      householdSize: state.userProfile.householdSize,
      allergies: combinedAllergies,
      spicyLevel: state.userProfile.spicyLevel,
      dietPreference: state.userProfile.dietPreference
    };

    btnGenerateRecipes.disabled = true;
    recipeLoading.classList.remove('hidden');
    recipeResultsContainer.classList.add('hidden');

    try {
      console.log('[FridgeChef] /api/recipe 호출 중...', { filterPayload, profilePayload });
      const response = await fetch('/api/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: state.ingredients,
          filters: filterPayload,
          userProfile: profilePayload
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `서버 오류 (HTTP ${response.status})`);
      }

      state.recipes = data.recipes || [];
      renderRecipeCards();
      recipeResultsContainer.classList.remove('hidden');
      recipeResultsContainer.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
      console.error('[FridgeChef] 레시피 생성 오류:', error);

      const userWantsMock = confirm(
        `AI 레시피 생성 중 오류가 발생했습니다:\n[${error.message}]\n\n※ 테스트를 위해 실용적인 '추천 샘플 레시피 2종'을 화면에 표시할까요?`
      );

      if (userWantsMock) {
        state.recipes = [
          {
            id: 'mock-1',
            title: '대파 듬뿍 파기름 스팸 볶음밥',
            summary: '냉장고 속 대파와 스팸의 감칠맛을 극대화한 15분 완성 볶음밥',
            cooking_time_minutes: 15,
            difficulty: '쉬움',
            cuisine_type: '한식',
            servings: '1인분',
            used_fridge_ingredients: ['대파', '스팸', '계란'],
            pantry_ingredients: ['식용유 2큰술', '진간장 1큰술', '밥 1공기', '참기름 1작은술'],
            steps: [
              {
                step_number: 1,
                instruction: '대파는 송송 썰고, 스팸은 1cm 크기로 깍둑썰기합니다.',
                tip: '파의 흰 대 부분을 넉넉히 넣으면 풍미가 훨씬 깊어집니다.'
              },
              {
                step_number: 2,
                instruction: '팬에 식용유 2큰술을 두르고 대파를 넣어 중약불에서 2분간 볶아 향긋한 파기름을 냅니다.',
                timer_seconds: 120
              },
              {
                step_number: 3,
                instruction: '파기름에 스팸을 넣고 노릇해질 때까지 2분간 함께 볶아줍니다.',
                timer_seconds: 120
              },
              {
                step_number: 4,
                instruction: '재료를 팬 한쪽으로 밀고, 빈 곳에 진간장 1큰술을 둘러 계란을 깨 넣고 스크램블합니다.',
                timer_seconds: 90
              },
              {
                step_number: 5,
                instruction: '밥 1공기를 넣고 주걱으로 자르듯 섞으며 센 불에서 2분간 볶은 뒤 참기름을 둘러 완성합니다.',
                timer_seconds: 120
              }
            ],
            chef_tip: '식은 밥을 사용할 경우 전자레인지에 30초만 살짝 돌려 넣으면 밥알이 뭉치지 않고 잘 볶아집니다.'
          },
          {
            id: 'mock-2',
            title: '자취생 밥도둑 스팸 김치 짜글이',
            summary: '잘 익은 김치와 으깬 스팸으로 국물까지 싹싹 비우는 든든한 찌개',
            cooking_time_minutes: 25,
            difficulty: '쉬움',
            cuisine_type: '한식',
            servings: '2인분',
            used_fridge_ingredients: ['스팸', '김치', '대파', '양파'],
            pantry_ingredients: ['고춧가루 1큰술', '다진 마늘 1큰술', '설탕 0.5큰술', '물 400ml'],
            steps: [
              {
                step_number: 1,
                instruction: '스팸은 위생백에 넣어 손으로 으깨고, 김치와 양파, 대파는 한 입 크기로 썹니다.',
                tip: '스팸을 으깨서 넣으면 고기처럼 국물에 진한 고소함이 우러납니다.'
              },
              {
                step_number: 2,
                instruction: '냄비에 으깬 스팸과 김치, 양파를 넣고 기름 없이 중불에서 3분간 달달 볶아줍니다.',
                timer_seconds: 180
              },
              {
                step_number: 3,
                instruction: '물 400ml와 고춧가루, 설탕, 다진 마늘을 넣고 센 불에서 5분간 끓입니다.',
                timer_seconds: 300
              },
              {
                step_number: 4,
                instruction: '끓어오르면 중약불로 줄여 국물이 자작해질 때까지 10분간 뭉근하게 끓인 후 대파를 올려 완성합니다.',
                timer_seconds: 600
              }
            ],
            chef_tip: '김치가 너무 시다면 설탕을 반 큰술 더 넣어 신맛을 중화해주세요.'
          }
        ];

        renderRecipeCards();
        recipeResultsContainer.classList.remove('hidden');
        recipeResultsContainer.scrollIntoView({ behavior: 'smooth' });
      }

    } finally {
      state.isGeneratingRecipe = false;
      btnGenerateRecipes.disabled = false;
      recipeLoading.classList.add('hidden');
    }
  }

  /* --------------------------------------------------------------------------
     11. 2단계 추천 레시피 카드 목록 렌더링
     -------------------------------------------------------------------------- */
  function renderRecipeCards() {
    recipeCardsListEl.innerHTML = '';
    recipesCountEl.textContent = state.recipes.length;

    state.recipes.forEach((recipe) => {
      const card = document.createElement('div');
      card.className = 'recipe-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${recipe.title} 레시피 상세보기`);

      const usedCount = recipe.used_fridge_ingredients?.length || 0;
      const pantryCount = recipe.pantry_ingredients?.length || 0;

      // 이미 저장된 레시피인지 여부 확인
      const isSaved = state.savedRecipes.some((r) => r.title === recipe.title);

      card.innerHTML = `
        <div class="recipe-card-header">
          <div>
            <span class="badge-cuisine">${recipe.cuisine_type || '추천 요리'}</span>
            <h4 class="card-title">${recipe.title}</h4>
          </div>
          <span style="font-size:18px;">${isSaved ? '⭐' : '☆'}</span>
        </div>
        <p class="card-summary">${recipe.summary || ''}</p>
        <div class="card-meta-row">
          <span class="meta-pill">⏱️ ${recipe.cooking_time_minutes}분</span>
          <span class="meta-pill">⭐ ${recipe.difficulty}</span>
          <span class="meta-pill">👥 ${recipe.servings || '1인분'}</span>
        </div>
        <div class="card-ingredients-summary">
          <span>🧊 냉장고 재료 ${usedCount}개 활용</span>
          <span>🧂 기본 양념 ${pantryCount}개</span>
        </div>
      `;

      card.addEventListener('click', () => openRecipeDetailModal(recipe));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openRecipeDetailModal(recipe);
        }
      });

      recipeCardsListEl.appendChild(card);
    });
  }

  /* --------------------------------------------------------------------------
     12. 3단계: 내 레시피 보관함 로드 및 렌더링 (Saved Recipes)
     -------------------------------------------------------------------------- */
  function loadSavedRecipesFromStorage() {
    try {
      const stored = localStorage.getItem('saved_recipes');
      state.savedRecipes = stored ? JSON.parse(stored) : [];
      tabSavedCount.textContent = state.savedRecipes.length;
    } catch (e) {
      console.warn('저장된 레시피 로드 실패:', e);
      state.savedRecipes = [];
    }
  }

  function saveSavedRecipesToStorage() {
    try {
      localStorage.setItem('saved_recipes', JSON.stringify(state.savedRecipes));
      tabSavedCount.textContent = state.savedRecipes.length;
    } catch (e) {
      console.error('레시피 목록 저장 실패:', e);
    }
  }

  function renderSavedRecipes() {
    loadSavedRecipesFromStorage();
    savedRecipesList.innerHTML = '';

    // 검색어 및 카테고리 필터링
    let filtered = [...state.savedRecipes];

    if (state.savedSearchQuery.trim()) {
      const q = state.savedSearchQuery.trim().toLowerCase();
      filtered = filtered.filter((r) => {
        const titleMatch = r.title.toLowerCase().includes(q);
        const ingredientMatch = (r.used_fridge_ingredients || []).some((i) => i.toLowerCase().includes(q));
        return titleMatch || ingredientMatch;
      });
    }

    if (state.savedFilterType === 'cooked') {
      filtered = filtered.filter((r) => r.isCooked);
    } else if (state.savedFilterType === 'rated') {
      filtered = filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    // 빈 상태 표시 토글
    if (filtered.length === 0) {
      savedEmptyState.classList.remove('hidden');
      return;
    }

    savedEmptyState.classList.add('hidden');

    filtered.forEach((recipe) => {
      const card = document.createElement('div');
      card.className = 'recipe-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');

      const ratingStars = recipe.rating ? '★'.repeat(recipe.rating) + '☆'.repeat(5 - recipe.rating) : '평가 없음';
      const cookedBadge = recipe.isCooked ? '<span class="badge-cooked">🍳 요리해봄</span>' : '';
      const noteBadge = recipe.userNote ? '<span class="badge-note">📝 메모 있음</span>' : '';

      card.innerHTML = `
        <div class="recipe-card-header">
          <div>
            <span class="badge-cuisine">${recipe.cuisine_type || '보관된 요리'}</span>
            <h4 class="card-title">${recipe.title}</h4>
          </div>
          <button type="button" class="btn-card-delete" title="보관함에서 삭제" aria-label="삭제">&times;</button>
        </div>
        <p class="card-summary">${recipe.summary || ''}</p>
        <div class="card-meta-row">
          <span class="meta-pill">⏱️ ${recipe.cooking_time_minutes}분</span>
          <span class="meta-pill">⭐ ${recipe.difficulty}</span>
          <span class="badge-rating">${ratingStars}</span>
        </div>
        <div class="card-saved-meta">
          <div class="card-saved-badges">
            ${cookedBadge}
            ${noteBadge}
          </div>
          <span>${recipe.savedAt ? new Date(recipe.savedAt).toLocaleDateString() : '저장됨'}</span>
        </div>
      `;

      // 카드 클릭 시 모달 열기
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-card-delete')) return;
        openRecipeDetailModal(recipe);
      });

      // 개별 삭제 버튼
      card.querySelector('.btn-card-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`'${recipe.title}' 레시피를 보관함에서 삭제하시겠습니까?`)) {
          deleteRecipeFromStorage(recipe.title);
        }
      });

      savedRecipesList.appendChild(card);
    });
  }

  function deleteRecipeFromStorage(title) {
    state.savedRecipes = state.savedRecipes.filter((r) => r.title !== title);
    saveSavedRecipesToStorage();
    renderSavedRecipes();
    renderRecipeCards(); // 2단계 별표 표시 동기화
  }

  /* --------------------------------------------------------------------------
     13. 레시피 상세 모달 및 3단계 조리 메모/별점 연동
     -------------------------------------------------------------------------- */
  function openRecipeDetailModal(recipe) {
    state.activeRecipe = recipe;
    clearAllTimers();

    modalCuisineBadge.textContent = recipe.cuisine_type || '맞춤 요리';
    modalRecipeTitle.textContent = recipe.title;
    modalRecipeSummary.textContent = recipe.summary || '';
    modalTime.textContent = `${recipe.cooking_time_minutes}분`;
    modalDifficulty.textContent = recipe.difficulty;
    modalServings.textContent = recipe.servings || '1인분';

    // 저장 여부 확인 및 버튼 라벨 업데이트
    const isAlreadySaved = state.savedRecipes.some((r) => r.title === recipe.title);
    updateBookmarkButtonUI(isAlreadySaved);

    // 재료 준비 목록 바인딩
    modalUsedIngredients.innerHTML = '';
    (recipe.used_fridge_ingredients || []).forEach((name) => {
      const chip = document.createElement('span');
      chip.className = 'chip-blue';
      chip.textContent = name;
      modalUsedIngredients.appendChild(chip);
    });

    modalPantryIngredients.innerHTML = '';
    (recipe.pantry_ingredients || []).forEach((name) => {
      const chip = document.createElement('span');
      chip.className = 'chip-gray';
      chip.textContent = name;
      modalPantryIngredients.appendChild(chip);
    });

    // 단계별 조리 순서 및 타이머
    modalStepsContainer.innerHTML = '';
    (recipe.steps || []).forEach((step, index) => {
      const stepItem = document.createElement('div');
      stepItem.className = 'step-item';

      const stepNum = document.createElement('div');
      stepNum.className = 'step-num';
      stepNum.textContent = step.step_number || index + 1;

      const stepBody = document.createElement('div');
      stepBody.className = 'step-body';

      const stepText = document.createElement('p');
      stepText.className = 'step-text';
      stepText.textContent = step.instruction;
      stepBody.appendChild(stepText);

      if (step.tip) {
        const stepTip = document.createElement('span');
        stepTip.className = 'step-tip';
        stepTip.textContent = '💡 ' + step.tip;
        stepBody.appendChild(stepTip);
      }

      if (step.timer_seconds && step.timer_seconds > 0) {
        const timerWidget = createTimerWidget(index, step.timer_seconds);
        stepBody.appendChild(timerWidget);
      }

      stepItem.appendChild(stepNum);
      stepItem.appendChild(stepBody);
      modalStepsContainer.appendChild(stepItem);
    });

    modalChefTip.textContent = recipe.chef_tip || '특별한 비법 없이도 정성을 담으면 훌륭한 요리가 됩니다!';

    // 3단계 나만의 조리 메모 및 별점 데이터 복원
    const savedEntry = state.savedRecipes.find((r) => r.title === recipe.title) || recipe;
    modalNoteTextarea.value = savedEntry.userNote || '';
    modalCookedCheckbox.checked = Boolean(savedEntry.isCooked);
    updateStarRatingUI(savedEntry.rating || 0);

    recipeDetailModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeRecipeDetailModal() {
    recipeDetailModal.classList.add('hidden');
    document.body.style.overflow = '';
    clearAllTimers();
    state.activeRecipe = null;
  }

  function updateBookmarkButtonUI(isSaved) {
    if (isSaved) {
      btnModalBookmark.innerHTML = '★ 보관함에 저장됨 (저장 해제)';
      btnModalBookmark.style.borderColor = 'var(--primary-color)';
      btnModalBookmark.style.color = 'var(--primary-color)';
    } else {
      btnModalBookmark.innerHTML = '⭐ 레시피 보관함에 저장';
      btnModalBookmark.style.borderColor = '';
      btnModalBookmark.style.color = '';
    }
  }

  function toggleRecipeBookmark() {
    if (!state.activeRecipe) return;

    const existingIndex = state.savedRecipes.findIndex((r) => r.title === state.activeRecipe.title);

    if (existingIndex > -1) {
      // 이미 저장된 경우 -> 해제
      state.savedRecipes.splice(existingIndex, 1);
      saveSavedRecipesToStorage();
      updateBookmarkButtonUI(false);
      renderSavedRecipes();
      renderRecipeCards();
      alert(`'${state.activeRecipe.title}' 레시피가 보관함에서 해제되었습니다.`);
    } else {
      // 저장
      const newEntry = {
        ...state.activeRecipe,
        savedAt: new Date().toISOString(),
        rating: 0,
        userNote: '',
        isCooked: false
      };
      state.savedRecipes.unshift(newEntry);
      saveSavedRecipesToStorage();
      updateBookmarkButtonUI(true);
      renderSavedRecipes();
      renderRecipeCards();
      alert(`⭐ [${state.activeRecipe.title}] 레시피가 보관함에 저장되었습니다!\n(3단계 '내 레시피 보관함'에서 언제든 확인 가능합니다.)`);
    }
  }

  function updateStarRatingUI(rating) {
    starBtns.forEach((btn) => {
      const val = parseInt(btn.dataset.value, 10);
      if (val <= rating) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (rating > 0) {
      ratingText.textContent = `(${rating}점 / 5점)`;
    } else {
      ratingText.textContent = '(평가 전)';
    }
  }

  function saveRecipeUserNoteAndRating() {
    if (!state.activeRecipe) return;

    // 만약 보관함에 아직 없다면 자동 보관 등록
    let savedEntry = state.savedRecipes.find((r) => r.title === state.activeRecipe.title);
    if (!savedEntry) {
      savedEntry = {
        ...state.activeRecipe,
        savedAt: new Date().toISOString(),
        rating: 0,
        userNote: '',
        isCooked: false
      };
      state.savedRecipes.unshift(savedEntry);
      updateBookmarkButtonUI(true);
    }

    savedEntry.userNote = modalNoteTextarea.value.trim();
    savedEntry.isCooked = modalCookedCheckbox.checked;

    saveSavedRecipesToStorage();
    renderSavedRecipes();
    alert('📝 조리 메모와 평가가 성공적으로 저장되었습니다!');
  }

  /* --------------------------------------------------------------------------
     14. 인터랙티브 조리 타이머 위젯 컴포넌트
     -------------------------------------------------------------------------- */
  function createTimerWidget(stepIndex, initialSeconds) {
    const container = document.createElement('div');
    container.className = 'timer-widget';
    container.id = `timer-widget-${stepIndex}`;

    state.activeTimers[stepIndex] = {
      initialSeconds: initialSeconds,
      remainingSeconds: initialSeconds,
      intervalId: null,
      isRunning: false
    };

    const display = document.createElement('span');
    display.className = 'timer-display';
    display.textContent = formatTimerTime(initialSeconds);

    const controls = document.createElement('div');
    controls.className = 'timer-controls';

    const startBtn = document.createElement('button');
    startBtn.type = 'button';
    startBtn.className = 'timer-btn';
    startBtn.textContent = '⏱️ 타이머 시작';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'timer-btn timer-btn-reset';
    resetBtn.textContent = '리셋';

    startBtn.addEventListener('click', () => {
      const timer = state.activeTimers[stepIndex];
      if (!timer) return;

      if (timer.isRunning) {
        clearInterval(timer.intervalId);
        timer.isRunning = false;
        startBtn.textContent = '▶️ 재개';
      } else {
        timer.isRunning = true;
        startBtn.textContent = '⏸️ 일시정지';
        container.classList.remove('timer-pulse');

        timer.intervalId = setInterval(() => {
          timer.remainingSeconds--;
          display.textContent = formatTimerTime(timer.remainingSeconds);

          if (timer.remainingSeconds <= 0) {
            clearInterval(timer.intervalId);
            timer.isRunning = false;
            display.textContent = '00:00 (완료!)';
            startBtn.textContent = '완료';
            container.classList.add('timer-pulse');
            playTimerEndSound();
          }
        }, 1000);
      }
    });

    resetBtn.addEventListener('click', () => {
      const timer = state.activeTimers[stepIndex];
      if (!timer) return;

      clearInterval(timer.intervalId);
      timer.isRunning = false;
      timer.remainingSeconds = timer.initialSeconds;
      display.textContent = formatTimerTime(timer.initialSeconds);
      startBtn.textContent = '⏱️ 타이머 시작';
      container.classList.remove('timer-pulse');
    });

    controls.appendChild(startBtn);
    controls.appendChild(resetBtn);
    container.appendChild(display);
    container.appendChild(controls);

    return container;
  }

  function clearAllTimers() {
    Object.values(state.activeTimers).forEach((timer) => {
      if (timer.intervalId) clearInterval(timer.intervalId);
    });
    state.activeTimers = {};
  }

  /* --------------------------------------------------------------------------
     15. 이벤트 리스너 등록 (Event Listeners)
     -------------------------------------------------------------------------- */
  // 1) 탭 내비게이션
  tabStep1.addEventListener('click', () => switchTab('step1'));
  tabStep2.addEventListener('click', () => switchTab('step2'));
  tabStep3.addEventListener('click', () => switchTab('step3'));

  btnToRecipe.addEventListener('click', () => {
    if (state.ingredients.length === 0) {
      alert('최소 1개 이상의 식재료가 등록되어 있어야 레시피를 추천받을 수 있습니다.');
      return;
    }
    try {
      localStorage.setItem('fridge_ingredients', JSON.stringify(state.ingredients));
    } catch (e) {
      console.warn('저장 실패:', e);
    }
    switchTab('step2');
  });

  btnEditIngredients.addEventListener('click', () => switchTab('step1'));
  btnGoToStep2.addEventListener('click', () => switchTab('step2'));

  // 2) 프로필 모달 이벤트
  btnOpenProfile.addEventListener('click', openProfileModal);
  btnCloseProfileModal.addEventListener('click', closeProfileModal);
  profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) closeProfileModal();
  });

  // 알레르기 칩 토글
  document.querySelectorAll('.allergy-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const val = chip.dataset.value;
      const idx = state.userProfile.allergies.indexOf(val);
      if (idx > -1) {
        state.userProfile.allergies.splice(idx, 1);
        chip.classList.remove('active');
      } else {
        state.userProfile.allergies.push(val);
        chip.classList.add('active');
      }
    });
  });

  // 직접 기피 재료 추가
  btnAddCustomAllergy.addEventListener('click', () => {
    const val = inputCustomAllergy.value.trim();
    if (!val) return;
    if (!state.userProfile.customAllergies.includes(val)) {
      state.userProfile.customAllergies.push(val);
      renderCustomAllergyChips();
    }
    inputCustomAllergy.value = '';
  });

  // 맵기 슬라이더 실시간 라벨
  profileSpicyRange.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    profileSpicyLabel.textContent = spicyDescriptions[val];
    state.userProfile.spicyLevel = val;
  });

  // 프로필 저장 버튼
  btnSaveProfile.addEventListener('click', () => {
    state.userProfile.nickname = profileNickname.value.trim();
    state.userProfile.householdSize = parseInt(profileHousehold.value, 10);
    state.userProfile.dietPreference = profileDiet.value;
    state.userProfile.spicyLevel = parseInt(profileSpicyRange.value, 10);

    saveUserProfileToStorage();
    closeProfileModal();
    alert('👤 취향 및 프로필 설정이 저장되었습니다!\n다음 레시피 추천 시 알레르기 제외 및 맵기가 자동 적용됩니다.');
  });

  // 3) 2단계 레시피 생성 폼 및 재생성
  recipeFilterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    generateCustomRecipes();
  });

  btnRegenerate.addEventListener('click', generateCustomRecipes);

  // 4) 3단계 보관함 검색 및 필터 버튼
  inputSavedSearch.addEventListener('input', (e) => {
    state.savedSearchQuery = e.target.value;
    renderSavedRecipes();
  });

  savedFilterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      savedFilterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.savedFilterType = btn.dataset.filter;
      renderSavedRecipes();
    });
  });

  // 5) 모달 상세 닫기 및 북마크 토글
  btnCloseModal.addEventListener('click', closeRecipeDetailModal);
  btnModalBottomClose.addEventListener('click', closeRecipeDetailModal);
  recipeDetailModal.addEventListener('click', (e) => {
    if (e.target === recipeDetailModal) closeRecipeDetailModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!recipeDetailModal.classList.contains('hidden')) closeRecipeDetailModal();
      if (!profileModal.classList.contains('hidden')) closeProfileModal();
    }
  });

  btnModalBookmark.addEventListener('click', toggleRecipeBookmark);

  // 별점 평가 클릭 이벤트
  starBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.dataset.value, 10);
      updateStarRatingUI(val);

      if (state.activeRecipe) {
        let savedEntry = state.savedRecipes.find((r) => r.title === state.activeRecipe.title);
        if (!savedEntry) {
          savedEntry = {
            ...state.activeRecipe,
            savedAt: new Date().toISOString(),
            rating: val,
            userNote: '',
            isCooked: false
          };
          state.savedRecipes.unshift(savedEntry);
          updateBookmarkButtonUI(true);
        } else {
          savedEntry.rating = val;
        }
        saveSavedRecipesToStorage();
        renderSavedRecipes();
      }
    });
  });

  // 메모 저장 버튼
  btnSaveNote.addEventListener('click', saveRecipeUserNoteAndRating);

  // 요리 완료 체크박스
  modalCookedCheckbox.addEventListener('change', () => {
    if (state.activeRecipe) {
      let savedEntry = state.savedRecipes.find((r) => r.title === state.activeRecipe.title);
      if (savedEntry) {
        savedEntry.isCooked = modalCookedCheckbox.checked;
        saveSavedRecipesToStorage();
        renderSavedRecipes();
      }
    }
  });

  // 6) 1단계 카메라/갤러리/드롭존 이벤트 바인딩
  btnCamera.addEventListener('click', (e) => {
    e.stopPropagation();
    inputCamera.click();
  });

  btnGallery.addEventListener('click', (e) => {
    e.stopPropagation();
    inputFile.click();
  });

  inputCamera.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleFileSelected(file);
  });

  inputFile.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleFileSelected(file);
  });

  btnReselect.addEventListener('click', (e) => {
    e.stopPropagation();
    resetImageSelection();
    inputFile.click();
  });

  dropZone.addEventListener('click', () => {
    if (!state.selectedFile) inputFile.click();
  });

  dropZone.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !state.selectedFile) {
      e.preventDefault();
      inputFile.click();
    }
  });

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const file = dt.files && dt.files[0];
    if (file) handleFileSelected(file);
  });

  btnAnalyze.addEventListener('click', (e) => {
    e.stopPropagation();
    analyzeFridgeImage();
  });

  addIngredientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addManualIngredient(inputIngredientName.value);
  });

  // 초기 로드 시 프로필 및 보관함, 기존 식재료 캐시 확인
  loadUserProfile();
  loadSavedRecipesFromStorage();

  try {
    const cached = localStorage.getItem('fridge_ingredients');
    if (cached) {
      state.ingredients = JSON.parse(cached);
      renderIngredients();
    }
  } catch (e) {
    console.warn('초기 식재료 로드 실패:', e);
  }

  console.log('[FridgeChef] 1~3단계 전체 모듈 통합 초기화 완료.');
})();
