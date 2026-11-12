/**
 * ==========================================================================
 * FridgeChef AI - 클라이언트 메인 스크립트 (script.js)
 * 1단계: 이미지 선택, 카메라 촬영, 드래그 앤 드롭 및 미리보기 처리 모듈
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

  // 버튼 요소
  const btnCamera = document.getElementById('btn-camera');
  const btnGallery = document.getElementById('btn-gallery');
  const btnReselect = document.getElementById('btn-reselect');

  // 숨김 파일 입력 필드 (카메라용, 파일 선택용)
  const inputCamera = document.getElementById('input-camera');
  const inputFile = document.getElementById('input-file');

  /* --------------------------------------------------------------------------
     2. 앱 내부 상태 관리 (State)
     -------------------------------------------------------------------------- */
  const state = {
    selectedFile: null,       // 현재 선택된 File 객체
    previewUrl: null,         // ObjectURL 캐시 (메모리 해제용)
  };

  /* --------------------------------------------------------------------------
     3. 헬퍼 유틸리티 함수 (Helper Functions)
     -------------------------------------------------------------------------- */
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
     4. 이미지 미리보기 렌더링 및 초기화 로직
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

    // 이미지 태그 및 메타정보 갱신
    previewImage.src = state.previewUrl;
    fileNameEl.textContent = file.name || '촬영된 사진';
    fileSizeEl.textContent = formatFileSize(file.size);

    // UI 상태 전환: 업로드 안내 숨김 -> 미리보기 영역 노출
    uploadPrompt.classList.add('hidden');
    previewContainer.classList.remove('hidden');
  }

  /**
   * 선택된 이미지를 취소하고 초기 업로드 안내 화면으로 되돌립니다.
   */
  function resetImageSelection() {
    // 기존 URL 메모리 해제
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = null;
    }

    state.selectedFile = null;
    previewImage.src = '';
    fileNameEl.textContent = '-';
    fileSizeEl.textContent = '-';

    // 파일 인풋 필드 값 초기화 (동일 파일 재선택 가능하게)
    inputCamera.value = '';
    inputFile.value = '';

    // UI 상태 복원: 미리보기 숨김 -> 업로드 안내 노출
    previewContainer.classList.add('hidden');
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
     5. 이벤트 리스너 등록 (Event Listeners)
     -------------------------------------------------------------------------- */
  // 1) "카메라 촬영" 버튼 클릭 -> 카메라 input 실행
  btnCamera.addEventListener('click', (e) => {
    e.stopPropagation(); // 드롭존 클릭 이벤트 전파 방지
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

  // 5) 드롭존 자체를 클릭했을 때의 동작 (미리보기가 없을 때만 파일 선택 창 오픈)
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
  // 브라우저의 기본 파일 열기 동작 방지
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  // 드래그해서 진입 시 시각적 강조(.drag-over)
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('drag-over');
    });
  });

  // 드래그가 벗어나거나 파일 드롭 시 강조 제거
  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('drag-over');
    });
  });

  // 파일이 실제로 드롭되었을 때 처리
  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const file = dt.files && dt.files[0];
    if (file) {
      handleFileSelected(file);
    }
  });

  console.log('[FridgeChef] 1단계 이미지 입력 컴포넌트 초기화 완료.');
})();
