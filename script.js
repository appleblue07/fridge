/**
 * ==========================================================================
 * FridgeChef AI - 클라이언트 메인 스크립트 (script.js)
 * 1단계: 이미지 입력, 클라이언트 압축, OpenRouter AI 식재료 자동 인식 및 수동 편집
 * ==========================================================================
 */

// 전역 오염 방지를 위해 IIFE(즉시 실행 함수 표현식) 패턴 사용
(() => {
  'use strict';

  /* --------------------------------------------------------------------------
     1. DOM 요소 캐싱 (UI Elements)
     -------------------------------------------------------------------------- */
  // 드롭존 및 프롬프트/미리보기 컨테이너
  const dropZone = document.getElementById('drop-zone');
  const uploadPrompt = document.getElementById('upload-prompt');
  const previewContainer = document.getElementById('preview-container');
  const previewImage = document.getElementById('preview-image');
  const fileNameEl = document.getElementById('file-name');
  const fileSizeEl = document.getElementById('file-size');

  // 작업 버튼 요소
  const btnCamera = document.getElementById('btn-camera');
  const btnGallery = document.getElementById('btn-gallery');
  const btnReselect = document.getElementById('btn-reselect');
  const btnAnalyze = document.getElementById('btn-analyze');

  // AI 분석 로딩 상태 및 결과 영역
  const analyzeLoading = document.getElementById('analyze-loading');
  const resultContainer = document.getElementById('result-container');
  const ingredientCountEl = document.getElementById('ingredient-count');
  const confidenceNoteEl = document.getElementById('confidence-note');
  const ingredientsListEl = document.getElementById('ingredients-list');

  // 식재료 직접 수동 추가 폼
  const addIngredientForm = document.getElementById('add-ingredient-form');
  const inputIngredientName = document.getElementById('input-ingredient-name');

  // 2단계 이동 버튼
  const btnToRecipe = document.getElementById('btn-to-recipe');

  // 숨김 파일 입력 필드 (카메라용, 파일 선택용)
  const inputCamera = document.getElementById('input-camera');
  const inputFile = document.getElementById('input-file');

  /* --------------------------------------------------------------------------
     2. 앱 내부 상태 관리 (State)
     -------------------------------------------------------------------------- */
  const state = {
    selectedFile: null,       // 현재 선택된 원본 File 객체
    compressedBase64: null,   // 압축된 Base64 이미지 데이터 (API 전송용)
    previewUrl: null,         // ObjectURL 캐시 (메모리 해제용)
    isAnalyzing: false,       // 분석 진행 중 플래그
    ingredients: [],          // 인식 및 편집된 식재료 배열 [{ id, name, category, condition, isUserAdded }]
    confidenceNote: ''        // AI 분석 요약 코멘트
  };

  /* --------------------------------------------------------------------------
     3. 헬퍼 유틸리티 함수 (Helper Functions)
     -------------------------------------------------------------------------- */
  /**
   * 고유 ID 생성 (식재료 항목 구분용)
   * @returns {string} 고유 식별자 문자열
   */
  function generateId() {
    return 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
  }

  /**
   * 파일 바이트 크기를 사람이 읽기 쉬운 단위(KB, MB)로 변환합니다.
   * @param {number} bytes - 파일 크기 (바이트 단위)
   * @returns {string} 형식화된 문자열 (예: "1.45 MB")
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 업로드된 파일이 유효한 이미지인지 검사합니다.
   * @param {File} file - 검사할 파일 객체
   * @returns {boolean} 유효 여부
   */
  function validateImageFile(file) {
    if (!file) return false;

    // 이미지 MIME 타입 체크
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const isImage = validTypes.includes(file.type) || file.type.startsWith('image/');
    if (!isImage) {
      alert('이미지 파일(JPG, PNG, WEBP 등)만 업로드할 수 있습니다.');
      return false;
    }

    // 파일 크기 20MB 제한 체크
    const maxSizeInBytes = 20 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      alert('파일 크기가 너무 큽니다. 20MB 이하의 이미지를 선택해주세요.');
      return false;
    }

    return true;
  }

  /* --------------------------------------------------------------------------
     4. 클라이언트 이미지 최적화 및 압축 모듈 (Canvas API)
     -------------------------------------------------------------------------- */
  /**
   * 대용량 이미지를 HTML5 Canvas를 이용해 최대 1280px 이하로 리사이징하고
   * JPEG 0.8 품질의 Base64 Data URL로 압축 인코딩합니다.
   * @param {File} file - 원본 이미지 파일
   * @param {number} maxWidth - 최대 허용 가로 픽셀 (기본 1280)
   * @param {number} maxHeight - 최대 허용 세로 픽셀 (기본 1280)
   * @param {number} quality - JPEG 품질 (0.1 ~ 1.0, 기본 0.8)
   * @returns {Promise<string>} 압축된 Base64 Data URL 문자열
   */
  function compressAndEncodeImage(file, maxWidth = 1280, maxHeight = 1280, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;

          // 가로/세로 비율 유지하며 최대 해상도 축소 계산
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // Canvas 생성 및 이미지 그리기
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // JPEG 형식 및 0.8 품질로 Base64 추출
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          console.log(`[FridgeChef] 이미지 압축 완료: 원본(${img.width}x${img.height}) -> 압축(${width}x${height}), 품질: ${quality}`);
          resolve(compressedDataUrl);
        };

        img.onerror = (err) => reject(new Error('이미지 로드 중 오류가 발생했습니다: ' + err));
        img.src = e.target.result;
      };

      reader.onerror = (err) => reject(new Error('파일 읽기 오류: ' + err));
      reader.readAsDataURL(file);
    });
  }

  /* --------------------------------------------------------------------------
     5. 이미지 미리보기 렌더링 및 초기화 로직
     -------------------------------------------------------------------------- */
  /**
   * 선택된 이미지 파일을 화면 미리보기에 표시합니다.
   * @param {File} file - 표시할 이미지 파일 객체
   */
  function displayImagePreview(file) {
    // 기존 ObjectURL 메모리 누수 방지 해제
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
    }

    state.selectedFile = file;
    state.previewUrl = URL.createObjectURL(file);
    state.compressedBase64 = null; // 새 파일 선택 시 압축 캐시 초기화

    // 이미지 태그 및 메타정보 갱신
    previewImage.src = state.previewUrl;
    fileNameEl.textContent = file.name || '촬영된 사진';
    fileSizeEl.textContent = formatFileSize(file.size);

    // UI 상태 전환: 업로드 안내 숨김 -> 미리보기 영역 노출
    uploadPrompt.classList.add('hidden');
    previewContainer.classList.remove('hidden');

    // 이전 분석 결과 숨김 초기화
    resultContainer.classList.add('hidden');
    state.ingredients = [];
  }

  /**
   * 선택된 이미지를 취소하고 초기 업로드 안내 화면으로 되돌립니다.
   */
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

    // 파일 인풋 필드 값 초기화
    inputCamera.value = '';
    inputFile.value = '';

    // UI 상태 복원: 미리보기 및 결과 숨김 -> 업로드 안내 노출
    previewContainer.classList.add('hidden');
    analyzeLoading.classList.add('hidden');
    resultContainer.classList.add('hidden');
    uploadPrompt.classList.remove('hidden');
  }

  /**
   * 파일 선택 또는 드롭 시 진입하는 단일 처리 핸들러
   * @param {File} file - 전달받은 파일 객체
   */
  function handleFileSelected(file) {
    if (!validateImageFile(file)) {
      return;
    }
    displayImagePreview(file);
    console.log('[FridgeChef] 이미지가 성공적으로 로드되었습니다:', file.name, formatFileSize(file.size));
  }

  /* --------------------------------------------------------------------------
     6. 식재료 태그 목록 렌더링 및 편집 인터랙션 (Tags UI)
     -------------------------------------------------------------------------- */
  /**
   * 현재 상태(state.ingredients)에 기반하여 식재료 태그 칩을 동적 렌더링합니다.
   */
  function renderIngredients() {
    ingredientsListEl.innerHTML = '';
    ingredientCountEl.textContent = state.ingredients.length;

    if (state.ingredients.length === 0) {
      ingredientsListEl.innerHTML = '<p class="empty-hint" style="color:#94a3b8; font-size:13px; padding:10px 0;">인식된 식재료가 없습니다. 아래 폼에서 직접 추가해주세요.</p>';
      return;
    }

    // 각 식재료별 태그 칩 생성
    state.ingredients.forEach((item) => {
      const chip = document.createElement('div');
      chip.className = `ingredient-chip ${item.isUserAdded ? 'user-added' : ''}`;
      chip.dataset.id = item.id;

      // 카테고리 배지, 식재료 이름, 상태 텍스트
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

      // 개별 삭제(X) 버튼
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
  }

  /**
   * 특정 식재료를 목록에서 삭제합니다.
   * @param {string} id - 삭제할 식재료 고유 ID
   */
  function removeIngredient(id) {
    state.ingredients = state.ingredients.filter((item) => item.id !== id);
    renderIngredients();
  }

  /**
   * 사용자가 직접 입력한 식재료를 목록에 추가합니다.
   * @param {string} rawName - 사용자가 입력한 식재료명
   */
  function addManualIngredient(rawName) {
    const trimmed = rawName.trim();
    if (!trimmed) return;

    // 중복 체크
    const isDuplicate = state.ingredients.some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      alert(`'${trimmed}'(은)는 이미 목록에 존재합니다.`);
      return;
    }

    // 새 식재료 객체 생성
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
     7. OpenRouter Gemma AI 식재료 분석 연동 (API Call)
     -------------------------------------------------------------------------- */
  /**
   * 선택된 냉장고 이미지를 압축하여 /api/recognize 서버리스 함수로 전송하고 결과를 수신합니다.
   */
  async function analyzeFridgeImage() {
    if (!state.selectedFile) {
      alert('분석할 이미지를 먼저 선택해주세요.');
      return;
    }

    if (state.isAnalyzing) return;
    state.isAnalyzing = true;

    // UI 상태 전환: 로딩 상태 표시 & 버튼 비활성화
    btnAnalyze.disabled = true;
    analyzeLoading.classList.remove('hidden');
    resultContainer.classList.add('hidden');

    try {
      // 1) 클라이언트 이미지 압축 (1280px 이하, JPEG 0.8)
      console.log('[FridgeChef] 이미지 압축 시작...');
      const base64Image = await compressAndEncodeImage(state.selectedFile);
      state.compressedBase64 = base64Image;

      // 2) 백엔드 Vercel 서버리스 함수 호출
      console.log('[FridgeChef] /api/recognize 호출 중...');
      const response = await fetch('/api/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: base64Image })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `서버 응답 오류 (HTTP ${response.status})`);
      }

      // 3) 식재료 데이터 바인딩
      state.ingredients = (data.ingredients || []).map((item) => ({
        id: generateId(),
        name: item.name,
        category: item.category || '기타',
        condition: item.condition || '',
        isUserAdded: false
      }));

      state.confidenceNote = data.confidence_note || '식재료 분석이 완료되었습니다.';
      confidenceNoteEl.textContent = state.confidenceNote;

      // 4) 결과 UI 렌더링
      renderIngredients();
      resultContainer.classList.remove('hidden');

      // 분석 결과 영역으로 부드럽게 스크롤 이동
      resultContainer.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
      console.error('[FridgeChef] AI 분석 중 오류:', error);

      // 사용자 친화적 에러 처리 및 테스트 모드(Fallback) 제안
      const userWantsMock = confirm(
        `AI 분석 중 오류가 발생했습니다:\n[${error.message}]\n\n※ API 키 미설정 또는 네트워크 오류 시에도 UI를 확인하실 수 있도록 '샘플 냉장고 식재료 목록'을 불러오시겠습니까?`
      );

      if (userWantsMock) {
        // 테스트용 샘플 식재료 데이터 주입
        state.ingredients = [
          { id: generateId(), name: '대파', category: '채소/과일', condition: '신선함', isUserAdded: false },
          { id: generateId(), name: '계란', category: '유제품/계란', condition: '6개 남음', isUserAdded: false },
          { id: generateId(), name: '스팸', category: '가공식품/기타', condition: '미개봉', isUserAdded: false },
          { id: generateId(), name: '양파', category: '채소/과일', condition: '1개 남음', isUserAdded: false },
          { id: generateId(), name: '김치', category: '양념/소스', condition: '숙성됨', isUserAdded: false }
        ];
        state.confidenceNote = '테스트용 샘플 데이터가 성공적으로 로드되었습니다.';
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
     8. 이벤트 리스너 등록 (Event Listeners)
     -------------------------------------------------------------------------- */
  // 1) "카메라 촬영" 버튼 클릭 -> 카메라 input 실행
  btnCamera.addEventListener('click', (e) => {
    e.stopPropagation();
    inputCamera.click();
  });

  // 2) "사진 선택" 버튼 클릭 -> 파일 탐색기 input 실행
  btnGallery.addEventListener('click', (e) => {
    e.stopPropagation();
    inputFile.click();
  });

  // 3) 숨김 input들의 파일 변경(change) 이벤트
  inputCamera.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleFileSelected(file);
  });

  inputFile.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleFileSelected(file);
  });

  // 4) "다른 사진 선택" 버튼 클릭 -> 초기화 후 파일 탐색기 열기
  btnReselect.addEventListener('click', (e) => {
    e.stopPropagation();
    resetImageSelection();
    inputFile.click();
  });

  // 5) 드롭존 자체를 클릭했을 때의 동작
  dropZone.addEventListener('click', () => {
    if (!state.selectedFile) {
      inputFile.click();
    }
  });

  // 키보드 접근성(Enter/Space 키로 드롭존 열기)
  dropZone.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !state.selectedFile) {
      e.preventDefault();
      inputFile.click();
    }
  });

  // 6) 드래그 앤 드롭 이벤트 처리
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
    if (file) {
      handleFileSelected(file);
    }
  });

  // 7) "AI 식재료 분석 시작" 버튼 클릭
  btnAnalyze.addEventListener('click', (e) => {
    e.stopPropagation();
    analyzeFridgeImage();
  });

  // 8) 식재료 수동 직접 추가 폼 전송(submit)
  addIngredientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addManualIngredient(inputIngredientName.value);
  });

  // 9) 2단계 레시피 추천으로 이동 버튼 클릭
  btnToRecipe.addEventListener('click', () => {
    if (state.ingredients.length === 0) {
      alert('최소 1개 이상의 식재료가 등록되어 있어야 레시피를 추천받을 수 있습니다.');
      return;
    }

    // 2단계 전달을 위해 로컬 스토리지에 확정된 식재료 배열 영속화
    try {
      localStorage.setItem('fridge_ingredients', JSON.stringify(state.ingredients));
      console.log('[FridgeChef] 2단계 연계를 위해 식재료 데이터 저장 완료:', state.ingredients);
      alert(`[2단계 준비 완료]\n${state.ingredients.length}개의 식재료(${state.ingredients.map(i => i.name).join(', ')})가 2단계 레시피 추천용 데이터로 저장되었습니다!`);
    } catch (err) {
      console.error('[FridgeChef] 로컬스토리지 저장 실패:', err);
    }
  });

  console.log('[FridgeChef] 1단계 전체 모듈(이미지 입력/압축/AI인식/편집) 초기화 완료.');
})();
