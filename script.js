// 성경 66권 데이터 (책 이름, 장 수)
const BIBLE_BOOKS = {
  old: [
    { name: '창세기', chapters: 50 },
    { name: '출애굽기', chapters: 40 },
    { name: '레위기', chapters: 27 },
    { name: '민수기', chapters: 36 },
    { name: '신명기', chapters: 34 },
    { name: '여호수아', chapters: 24 },
    { name: '사사기', chapters: 21 },
    { name: '룻기', chapters: 4 },
    { name: '사무엘상', chapters: 31 },
    { name: '사무엘하', chapters: 24 },
    { name: '열왕기상', chapters: 22 },
    { name: '열왕기하', chapters: 25 },
    { name: '역대상', chapters: 29 },
    { name: '역대하', chapters: 36 },
    { name: '에스라', chapters: 10 },
    { name: '느헤미야', chapters: 13 },
    { name: '에스더', chapters: 10 },
    { name: '욥기', chapters: 42 },
    { name: '시편', chapters: 150 },
    { name: '잠언', chapters: 31 },
    { name: '전도서', chapters: 12 },
    { name: '아가', chapters: 8 },
    { name: '이사야', chapters: 66 },
    { name: '예레미야', chapters: 52 },
    { name: '예레미야애가', chapters: 5 },
    { name: '에스겔', chapters: 48 },
    { name: '다니엘', chapters: 12 },
    { name: '호세아', chapters: 14 },
    { name: '요엘', chapters: 3 },
    { name: '아모스', chapters: 9 },
    { name: '오바댜', chapters: 1 },
    { name: '요나', chapters: 4 },
    { name: '미가', chapters: 7 },
    { name: '나훔', chapters: 3 },
    { name: '하박국', chapters: 3 },
    { name: '스바냐', chapters: 3 },
    { name: '학개', chapters: 2 },
    { name: '스가랴', chapters: 14 },
    { name: '말라기', chapters: 4 },
  ],
  new: [
    { name: '마태복음', chapters: 28 },
    { name: '마가복음', chapters: 16 },
    { name: '누가복음', chapters: 28 },
    { name: '요한복음', chapters: 21 },
    { name: '사도행전', chapters: 28 },
    { name: '로마서', chapters: 16 },
    { name: '고린도전서', chapters: 16 },
    { name: '고린도후서', chapters: 13 },
    { name: '갈라디아서', chapters: 6 },
    { name: '에베소서', chapters: 6 },
    { name: '빌립보서', chapters: 4 },
    { name: '골로새서', chapters: 4 },
    { name: '데살로니가전서', chapters: 5 },
    { name: '데살로니가후서', chapters: 3 },
    { name: '디모데전서', chapters: 6 },
    { name: '디모데후서', chapters: 4 },
    { name: '디도서', chapters: 3 },
    { name: '빌레몬서', chapters: 1 },
    { name: '히브리서', chapters: 13 },
    { name: '야고보서', chapters: 5 },
    { name: '베드로전서', chapters: 5 },
    { name: '베드로후서', chapters: 3 },
    { name: '요한일서', chapters: 5 },
    { name: '요한이서', chapters: 1 },
    { name: '요한삼서', chapters: 1 },
    { name: '유다서', chapters: 1 },
    { name: '요한계시록', chapters: 22 },
  ],
};

const TOTAL_CHAPTERS = 1189;

// 로컬 스토리지/세션 스토리지 사용하지 않음.
// 체크 데이터는 Firebase Realtime Database에 저장/로드합니다.
let progress = {};
let currentBook = null;

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAGWMSOU6hlNNIZC1rCagaXF3H5nUymT1M",
  authDomain: "biblecheck-7f0f4.firebaseapp.com",
  databaseURL: "https://biblecheck-7f0f4-default-rtdb.firebaseio.com",
  projectId: "biblecheck-7f0f4",
  storageBucket: "biblecheck-7f0f4.firebasestorage.app",
  messagingSenderId: "711252124347",
  appId: "1:711252124347:web:f101b43f29ecd0081cff9e",
  measurementId: "G-CNVK1696SF"
};

// 단일 사용자/디바이스용 기본 경로(원하면 이후 사용자별로 분리 가능)
const READER_ID = "default";

let db = null;

function initFirebase() {
  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
}

// 오늘 날짜 YYYY-MM-DD
function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getChapterPath(testament, bookIdx, chapter, verseKey) {
  const v = verseKey || "";
  return `reads/${READER_ID}/${testament}/${bookIdx}/${chapter}/${v}`;
}

// Firebase → 메모리 progress로 동기화
function loadProgress() {
  progress = {};
  const rootRef = db.ref(`reads/${READER_ID}`);
  rootRef.on("value", (snap) => {
    const data = snap.val() || {};
    const next = {};

    Object.keys(data).forEach((testament) => {
      const byBook = data[testament] || {};
      Object.keys(byBook).forEach((bookIdxStr) => {
        const byChapter = byBook[bookIdxStr] || {};
        const bookIdx = parseInt(bookIdxStr, 10);
        const key = getBookKey(testament, bookIdx);
        next[key] = [];

        Object.keys(byChapter).forEach((chapterStr) => {
          const byVerseKey = byChapter[chapterStr] || {};
          const chapter = parseInt(chapterStr, 10);
          Object.keys(byVerseKey).forEach((verseKey) => {
            const item = byVerseKey[verseKey] || {};
            next[key].push({
              c: chapter,
              d: item.d || "",
              t: item.t || 0,
              v: verseKey || "",
            });
          });
        });
      });
    });

    Object.keys(next).forEach((k) => next[k].sort((a, b) => a.c - b.c));
    progress = next;
    updateUI();
  });
}

function saveChapterToFirebase(testament, bookIdx, chapter, verseKey) {
  const path = getChapterPath(testament, bookIdx, chapter, verseKey);
  return db.ref(path).set({ d: getTodayStr(), t: Date.now() });
}

function removeChapterFromFirebase(testament, bookIdx, chapter, verseKey) {
  const path = getChapterPath(testament, bookIdx, chapter, verseKey);
  return db.ref(path).remove();
}

// 책 키 생성
function getBookKey(testament, index) {
  return `${testament}-${index}`;
}

// 장/절 체크 토글 (verseKey: "1" or "1-5" or "")
function toggleChapter(testament, bookIdx, chapter, verseKey) {
  const key = getBookKey(testament, bookIdx);
  if (!progress[key]) progress[key] = [];
  const arr = progress[key];
  const v = verseKey || "";
  const existing = arr.find((x) => x.c === chapter && (x.v || "") === v);

  if (existing) {
    arr.splice(arr.indexOf(existing), 1);
  } else {
    arr.push({ c: chapter, d: getTodayStr(), t: Date.now(), v: v });
  }
  arr.sort((a, b) => a.c - b.c);
  updateUI();
}

// 장 읽음 여부
function isChapterRead(testament, bookIdx, chapter) {
  const key = getBookKey(testament, bookIdx);
  return progress[key] && progress[key].some((x) => x.c === chapter);
}

// 책별 읽은 장 수
function getBookProgress(testament, bookIdx) {
  const key = getBookKey(testament, bookIdx);
  const arr = progress[key] || [];
  return arr.length;
}

// 전체 진도
function getTotalProgress() {
  let read = 0;
  Object.values(progress).forEach((arr) => (read += arr.length));
  return { read, total: TOTAL_CHAPTERS, percent: Math.round((read / TOTAL_CHAPTERS) * 100) };
}

// 최근에 체크한 장/절 목록 (최신순)
function getRecentlyChecked(limit = 15) {
  const items = [];
  ['old', 'new'].forEach((testament) => {
    const books = BIBLE_BOOKS[testament];
    Object.keys(progress).forEach((key) => {
      if (!key.startsWith(testament + '-')) return;
      const bookIdx = parseInt(key.split('-')[1], 10);
      const bookName = books[bookIdx]?.name;
      if (!bookName) return;
      (progress[key] || []).forEach((item) => {
        items.push({
          bookName,
          chapter: item.c,
          verse: item.v || '',
          date: item.d || '',
          t: item.t || 0,
        });
      });
    });
  });
  return items.sort((a, b) => b.t - a.t).slice(0, limit);
}

// 기간별 읽은 장 수 합계
function getProgressByDateRange(startDate, endDate) {
  let count = 0;
  Object.values(progress).forEach((arr) => {
    arr.forEach((item) => {
      const d = item.d || '';
      if (d >= startDate && d <= endDate) count++;
    });
  });
  return count;
}

// 전체 읽음
function checkAllChapters(testament, bookIdx) {
  const book = BIBLE_BOOKS[testament][bookIdx];
  const key = getBookKey(testament, bookIdx);
  const today = getTodayStr();
  const now = Date.now();
  progress[key] = Array.from({ length: book.chapters }, (_, i) => ({ c: i + 1, d: today, t: now + i, v: "" }));
  updateUI();
}

// 전체 초기화
function uncheckAllChapters(testament, bookIdx) {
  const key = getBookKey(testament, bookIdx);
  progress[key] = [];
  updateUI();
}

// 전체 진도 초기화
function resetAllProgress() {
  if (confirm('모든 읽기 진도를 초기화할까요?')) {
    progress = {};
    updateUI();
    closeModal();
  }
}

// 현재 progress 전체를 Firebase에 일괄 저장
function saveAllToFirebase() {
  const payload = {};

  Object.keys(progress).forEach((key) => {
    const [testament, bookIdxStr] = key.split('-');
    const bookIdx = bookIdxStr;
    if (!payload[testament]) payload[testament] = {};
    if (!payload[testament][bookIdx]) payload[testament][bookIdx] = {};

    (progress[key] || []).forEach((item) => {
      const chapter = String(item.c);
      const verseKey = item.v || "";
      if (!payload[testament][bookIdx][chapter]) {
        payload[testament][bookIdx][chapter] = {};
      }
      payload[testament][bookIdx][chapter][verseKey] = {
        d: item.d || getTodayStr(),
        t: item.t || Date.now(),
      };
    });
  });

  db.ref(`reads/${READER_ID}`).set(payload)
    .then(() => {
      alert('저장되었습니다.');
    })
    .catch((err) => {
      console.error(err);
      alert('저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    });
}

// UI 업데이트
function updateUI() {
  const { read, total, percent } = getTotalProgress();
  document.getElementById('progressBar').style.width = `${percent}%`;
  document.getElementById('progressText').textContent = `${read.toLocaleString()} / ${total.toLocaleString()} 장 (${percent}%)`;

  // 책 카드 업데이트
  document.querySelectorAll('.book-card').forEach((card) => {
    const [testament, bookIdxStr] = card.dataset.key.split('-');
    const bookIdx = parseInt(bookIdxStr, 10);
    const book = BIBLE_BOOKS[testament][bookIdx];
    const readCount = getBookProgress(testament, bookIdx);
    const prog = card.querySelector('.book-progress');
    prog.textContent = `${readCount} / ${book.chapters} 장`;
    prog.classList.toggle('complete', readCount === book.chapters);
    card.classList.toggle('completed', readCount === book.chapters);
  });

  // 기간별 합계 갱신
  refreshDateRangeResult();

  // 최근 체크 목록 갱신
  renderRecentlyChecked();

  // 모달 내 장 버튼 업데이트
  if (currentBook) {
    const { testament, bookIdx } = currentBook;
    document.querySelectorAll('.chapter-btn').forEach((btn) => {
      const ch = parseInt(btn.dataset.chapter, 10);
      btn.classList.toggle('checked', isChapterRead(testament, bookIdx, ch));
      btn.textContent = ch;
    });
  }
}

// 책 카드 렌더
function renderBooks() {
  const oldGrid = document.getElementById('oldBooks');
  const newGrid = document.getElementById('newBooks');

  function renderSection(testament, grid) {
    const books = BIBLE_BOOKS[testament];
    grid.innerHTML = books
      .map(
        (book, idx) => {
          const readCount = getBookProgress(testament, idx);
          const isComplete = readCount === book.chapters;
          return `
            <div class="book-card ${isComplete ? 'completed' : ''}" 
                 data-key="${testament}-${idx}"
                 data-testament="${testament}"
                 data-book-idx="${idx}">
              <div class="book-name">${book.name}</div>
              <div class="book-progress ${isComplete ? 'complete' : ''}">${readCount} / ${book.chapters} 장</div>
            </div>
          `;
        }
      )
      .join('');
  }

  renderSection('old', oldGrid);
  renderSection('new', newGrid);
}

// 모달 열기
function openModal(testament, bookIdx) {
  const book = BIBLE_BOOKS[testament][bookIdx];
  currentBook = { testament, bookIdx };
  document.getElementById('modalTitle').textContent = book.name;
  const grid = document.getElementById('chaptersGrid');
  grid.innerHTML = Array.from({ length: book.chapters }, (_, i) => {
    const ch = i + 1;
    const checked = isChapterRead(testament, bookIdx, ch);
    return `<button class="chapter-btn ${checked ? 'checked' : ''}" data-chapter="${ch}">${ch}</button>`;
  }).join('');

  document.getElementById('chapterModal').classList.add('active');

  // 절 선택 셀렉트 채우기 (1~176)
  const verseStart = document.getElementById('verseStart');
  const verseEnd = document.getElementById('verseEnd');
  if (verseStart && verseEnd && verseStart.options.length === 0) {
    for (let i = 1; i <= 176; i++) {
      const opt1 = document.createElement('option');
      opt1.value = String(i);
      opt1.textContent = String(i);
      verseStart.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = String(i);
      opt2.textContent = String(i);
      verseEnd.appendChild(opt2);
    }
    verseEnd.value = verseStart.value;
    verseStart.addEventListener('change', () => {
      if (parseInt(verseStart.value, 10) > parseInt(verseEnd.value, 10)) verseEnd.value = verseStart.value;
    });
    verseEnd.addEventListener('change', () => {
      if (parseInt(verseStart.value, 10) > parseInt(verseEnd.value, 10)) verseStart.value = verseEnd.value;
    });
  }
  grid.querySelectorAll('.chapter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const start = verseStart ? parseInt(verseStart.value, 10) : 1;
      const end = verseEnd ? parseInt(verseEnd.value, 10) : start;
      const verseKey = start === end ? String(start) : `${start}-${end}`;
      toggleChapter(testament, bookIdx, parseInt(btn.dataset.chapter, 10), verseKey);
    });
  });

  document.querySelectorAll('.btn-range').forEach((btn) => {
    btn.onclick = () => {
      if (btn.dataset.action === 'check-all') checkAllChapters(testament, bookIdx);
      else uncheckAllChapters(testament, bookIdx);
    };
  });
}

// 모달 닫기
function closeModal() {
  document.getElementById('chapterModal').classList.remove('active');
  currentBook = null;
}

// 필터
function setupFilters() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      document.getElementById('oldTestament').style.display = filter === 'new' ? 'none' : 'block';
      document.getElementById('newTestament').style.display = filter === 'old' ? 'none' : 'block';
    });
  });
}

// 최근 체크 목록 렌더
function renderRecentlyChecked() {
  const listEl = document.getElementById('recentList');
  if (!listEl) return;

  const items = getRecentlyChecked(15);
  if (items.length === 0) {
    listEl.innerHTML = '<p class="recent-empty" id="recentEmpty">아직 체크한 장이 없습니다.</p>';
    return;
  }

  const html = items
    .map((item) => {
      const ref = item.verse
        ? `${item.bookName} ${item.chapter}장 ${item.verse}절`
        : `${item.bookName} ${item.chapter}장`;
      return `<div class="recent-item"><span class="recent-ref">${ref}</span><span class="recent-date">${item.date}</span></div>`;
    })
    .join('');
  listEl.innerHTML = html;
}

// 기간별 합계 결과 갱신 (updateUI에서 호출)
function refreshDateRangeResult() {
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  if (!startInput || !endInput) return;
  const start = startInput.value;
  const end = endInput.value;
  if (!start || !end || start > end) return;
  const count = getProgressByDateRange(start, end);
  const el = document.getElementById('dateRangeCount');
  if (el) el.textContent = count.toLocaleString();
}

// 기간별 합계 조회
function setupDateRange() {
  const today = getTodayStr();
  const startOfMonth = today.slice(0, 8) + '01';

  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  if (startInput) startInput.value = startOfMonth;
  if (endInput) endInput.value = today;

  document.getElementById('calcDateRangeBtn').addEventListener('click', () => {
    const start = startInput.value;
    const end = endInput.value;
    if (!start || !end) {
      alert('시작일과 종료일을 모두 선택해주세요.');
      return;
    }
    if (start > end) {
      alert('시작일이 종료일보다 늦을 수 없습니다.');
      return;
    }
    refreshDateRangeResult();
  });

  refreshDateRangeResult();
}

// 초기화
function init() {
  initFirebase();
  loadProgress();
  renderBooks();
  updateUI();
  setupFilters();
  setupDateRange();

  document.querySelectorAll('.books-grid').forEach((grid) => {
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.book-card');
      if (!card) return;
      const testament = card.dataset.testament;
      const bookIdx = parseInt(card.dataset.bookIdx, 10);
      openModal(testament, bookIdx);
    });
  });

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('chapterModal').addEventListener('click', (e) => {
    if (e.target.id === 'chapterModal') closeModal();
  });
  document.getElementById('resetBtn').addEventListener('click', resetAllProgress);
  document.getElementById('saveBtn').addEventListener('click', saveAllToFirebase);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

init();
