/**
 * NotesAPI 클래스
 * 이 클래스는 로컬 스토리지(localStorage)와의 모든 상호작용을 처리합니다.
 * 노트 데이터를 저장하고, 불러오고, 삭제하는 역할을 합니다.
 * 'static' 키워드는 클래스의 인스턴스를 생성하지 않고도 메서드를 호출할 수 있게 해줍니다.
 * 예: NotesAPI.get_all_notes();
 */
class NotesAPI {
    /**
     * 로컬 스토리지에서 모든 노트를 가져옵니다.
     * @returns {Array<Object>} 노트 객체의 배열. 각 객체는 id, title, body, updated 속성을 가집니다.
     */
    static get_all_notes() {
        // "notesapp-notes" 키로 저장된 노트들을 가져옵니다. 만약 데이터가 없으면 빈 배열 "[]"을 사용합니다.
        const notes = JSON.parse(localStorage.getItem("notesapp-notes") || "[]");

        // 노트 정렬: 1. 중요 표시(favorite)된 노트를 위로, 2. 같은 중요도 내에서는 최신순으로
        return notes.sort((a, b) => {
            if (a.favorite && !b.favorite) return -1;
            if (!a.favorite && b.favorite) return 1;
            return new Date(a.updated) > new Date(b.updated) ? -1 : 1;
        });
    }

    /**
     * 노트를 저장합니다. 기존에 있는 노트이면 업데이트하고, 없으면 새로 생성합니다.
     * @param {Object} note_to_save - 저장할 노트 객체. id가 있으면 기존 노트를 업데이트합니다.
     */
    static save_note(note_to_save) {
        const notes = NotesAPI.get_all_notes();
        const existing = notes.find(note => note.id == note_to_save.id);

        // 기존 노트가 있으면 (Edit/Update)
        if (existing) {
            existing.title = note_to_save.title;
            existing.body = note_to_save.body;
            existing.category = note_to_save.category; // 카테고리 저장
            existing.favorite = note_to_save.favorite; // 중요표시 저장
            existing.pin = note_to_save.pin; // PIN 저장
            existing.updated = new Date().toISOString(); // 현재 시간을 ISO 형식의 문자열로 저장
        } else {
            // 새로운 노트이면 (Create)
            note_to_save.id = Math.floor(Math.random() * 1000000); // 임의의 ID 생성
            note_to_save.updated = new Date().toISOString();
            note_to_save.category = note_to_save.category || "일정"; // 기본 카테고리
            note_to_save.favorite = note_to_save.favorite || false; // 기본 중요표시
            note_to_save.pin = note_to_save.pin || null; // 기본 PIN
            notes.push(note_to_save); // 배열에 새 노트 추가
        }

        // 변경된 노트 배열을 다시 로컬 스토리지에 저장합니다.
        // JSON.stringify는 JavaScript 객체를 JSON 문자열로 변환합니다.
        localStorage.setItem("notesapp-notes", JSON.stringify(notes));
    }

    /**
     * ID를 기준으로 노트를 삭제합니다.
     * @param {number} id - 삭제할 노트의 ID
     */
    static delete_note(id) {
        const notes = NotesAPI.get_all_notes();
        // filter 메서드를 사용하여 주어진 id와 일치하지 않는 노트들만 남깁니다.
        const new_notes = notes.filter(note => note.id != id);

        // 필터링된 새 배열을 로컬 스토리지에 저장합니다.
        localStorage.setItem("notesapp-notes", JSON.stringify(new_notes));
    }
}

/**
 * App 클래스
 * 이 클래스는 애플리케이션의 전체 UI와 사용자 상호작용을 관리합니다.
 */
class App {
    /**
     * App 클래스의 생성자입니다.
     * @param {HTMLElement} root - 앱의 최상위 HTML 요소 (id="app"인 div)
     */
    constructor(root) {
        this.root = root;
        this.notes = []; // 현재 노트 목록을 저장할 배열
        this.active_note = null; // 현재 활성화된(선택된) 노트를 저장할 변수
        this._unlocked_pins = new Set(); // 현재 세션에서 잠금 해제된 노트 ID를 저장

        // 자주 사용하는 HTML 요소들을 미리 찾아 변수에 저장해 둡니다.
        this.elements = {
            notes_list: root.querySelector(".notes-list"),
            notes_title: root.querySelector(".notes-title"),
            notes_body: root.querySelector(".notes-body"),
            notes_toolbar_checkbox: root.querySelector(".notes-toolbar-checkbox"), // 체크박스 버튼
            notes_toolbar_image: root.querySelector(".notes-toolbar-image"), // 이미지 추가 버튼
            notes_image_upload: root.querySelector(".notes-image-upload"), // 이미지 업로드 input
            notes_preview: root.querySelector(".notes-preview"),
            notes_add_button: root.querySelector(".notes-add"),
            notes_delete_button: root.querySelector(".notes-delete"),
            notes_favorite_button: root.querySelector(".notes-favorite"), // 중요표시 버튼
            notes_lock_button: root.querySelector(".notes-lock"), // 잠금 버튼
            notes_search: root.querySelector(".notes-search"), // 검색창
            notes_category_filter: root.querySelector(".notes-category-filter"), // 카테고리 필터
            notes_category_selector: root.querySelector(".notes-category-selector"), // 카테고리 선택
            theme_toggle_button: root.querySelector(".theme-toggle"), // 테마 토글 버튼
            notes_no_active_note: root.querySelector(".notes-no-active-note"),
            notes_back_button: root.querySelector(".notes-back"), // 뒤로가기 버튼
            notes_save_button: root.querySelector(".notes-save"), // 저장 버튼
            notes_toolbar_fontsize: root.querySelector(".notes-toolbar-fontsize"), // 글씨 크기 선택
            notes_toolbar_color: root.querySelector(".notes-toolbar-color") // 글씨 색상 선택
        };

        this._set_event_listeners(); // 이벤트 리스너 설정
        this._load_theme(); // 저장된 테마 불러오기
        this._refresh_notes(); // 노트 목록을 화면에 표시
    }

    /**
     * 앱에서 사용되는 모든 이벤트 리스너를 설정합니다.
     * 이벤트 리스너는 사용자의 클릭이나 입력 같은 행동을 감지하는 역할을 합니다.
     * _ (언더스코어)로 시작하는 메서드는 클래스 내부에서만 사용되는 비공개(private) 메서드임을 나타내는 관례입니다.
     */
    _set_event_listeners() {
        // "노트 추가" 버튼 클릭 이벤트
        this.elements.notes_add_button.addEventListener("click", () => {
            this.add_note();
        });

        // 제목과 본문 입력 필드에서 포커스를 잃었을 때 (blur 이벤트) 자동 저장
        this.elements.notes_title.addEventListener("blur", () => {
            this._save_note_changes();
        });

        // 제목 입력 필드에 입력이 있을 때 자동 저장
        this.elements.notes_title.addEventListener("input", () => {
            this._save_note_changes();
        });

        this.elements.notes_body.addEventListener("blur", () => {
            this._save_note_changes();
        });

        // 메인 삭제 버튼 클릭 이벤트
        this.elements.notes_delete_button.addEventListener("click", () => {
            this._delete_active_note();
        });

        // 검색창 입력 이벤트
        this.elements.notes_search.addEventListener("input", () => {
            this._refresh_notes();
        });

        // 카테고리 필터 변경 이벤트
        this.elements.notes_category_filter.addEventListener("change", () => {
            this._refresh_notes();
        });

        // 미리보기의 카테고리 선택 변경 이벤트
        this.elements.notes_category_selector.addEventListener("change", () => {
            this._save_note_changes();
        });

        // 중요표시 버튼 클릭 이벤트
        this.elements.notes_favorite_button.addEventListener("click", () => {
            this._toggle_favorite();
        });

        // 테마 토글 버튼 클릭 이벤트
        this.elements.theme_toggle_button.addEventListener("click", () => {
            this._toggle_theme();
        });

        // 체크박스 추가 버튼 클릭 이벤트
        this.elements.notes_toolbar_checkbox.addEventListener("click", () => {
            this._insert_checkbox();
        });

        // 잠금 버튼 클릭 이벤트
        this.elements.notes_lock_button.addEventListener("click", () => {
            this._handle_lock_click();
        });

        // 이미지 추가 버튼 클릭 이벤트
        this.elements.notes_toolbar_image.addEventListener("click", () => {
            this.elements.notes_image_upload.click();
        });

        // 이미지 파일 선택 이벤트
        this.elements.notes_image_upload.addEventListener("change", (event) => {
            this._handle_image_upload(event);
        });

        // 이미지 삭제 버튼 클릭 이벤트 (이벤트 위임)
        this.elements.notes_body.addEventListener("click", (e) => {
            if (e.target.classList.contains("delete-image-btn")) {
                const image_wrapper = e.target.closest(".image-wrapper");
                if (image_wrapper) {
                    image_wrapper.remove();
                    this._save_note_changes(); // 변경사항 저장
                }
            }
        });

        // 뒤로가기 버튼 클릭 이벤트
        this.elements.notes_back_button.addEventListener("click", () => {
            this._set_active_note(null); // 활성화된 노트 해제
        });

        // 저장 버튼 클릭 이벤트
        this.elements.notes_save_button.addEventListener("click", () => {
            this._save_note_changes(); // 변경사항 저장
        });

        // 글씨 크기 변경 이벤트
        this.elements.notes_toolbar_fontsize.addEventListener("change", (e) => {
            this.elements.notes_body.focus(); // 에디터에 포커스
            document.execCommand('fontSize', false, e.target.value);
            this._save_note_changes();
        });

        // 글씨 색상 변경 이벤트
        this.elements.notes_toolbar_color.addEventListener("input", (e) => {
            this.elements.notes_body.focus(); // 에디터에 포커스
            document.execCommand('foreColor', false, e.target.value);
            this._save_note_changes();
        });
    }

    /**
     * 잠금 버튼 클릭을 처리합니다.
     */
    _handle_lock_click() {
        if (!this.active_note) return;

        // 중요 메모가 아니면 잠글 수 없음
        if (!this.active_note.favorite) {
            alert("중요 표시된 메모만 잠글 수 있습니다.");
            return;
        }

        // PIN이 이미 설정된 경우
        if (this.active_note.pin) {
            const confirm_unlock = confirm("이 메모의 잠금을 해제하시겠습니까? PIN이 삭제됩니다.");
            if (confirm_unlock) {
                this.active_note.pin = null;
                this._unlocked_pins.delete(this.active_note.id);
                this._save_note_changes();
            }
        } else {
            // PIN이 없는 경우, 설정 화면 표시
            this._show_pin_set_screen();
        }
    }

    /**
     * PIN 설정 화면을 표시합니다.
     */
    _show_pin_set_screen() {
        // Hide note content and show PIN set screen
        this.elements.notes_body.innerHTML = `
            <div class="notes-pin-screen">
                <h3>새로운 PIN 설정 (4자리)</h3>
                <input type="password" class="notes-pin-input" maxlength="4" placeholder="4자리 숫자">
                <h3>PIN 확인</h3>
                <input type="password" class="notes-pin-confirm" maxlength="4">
                <button class="notes-pin-submit">PIN 저장</button>
            </div>
        `;

        const pin_input = this.elements.notes_body.querySelector(".notes-pin-input");
        const pin_confirm = this.elements.notes_body.querySelector(".notes-pin-confirm");
        const pin_submit = this.elements.notes_body.querySelector(".notes-pin-submit");

        pin_input.focus();

        pin_submit.addEventListener("click", () => {
            if (pin_input.value.length !== 4 || isNaN(pin_input.value)) {
                alert("PIN은 4자리 숫자여야 합니다.");
                return;
            }
            if (pin_input.value !== pin_confirm.value) {
                alert("PIN이 일치하지 않습니다.");
                return;
            }

            this.active_note.pin = pin_input.value;
            this._unlocked_pins.add(this.active_note.id);
            this._save_note_changes();
        });
    }

    /**
     * 현재 커서 위치에 체크박스를 삽입합니다.
     */
    _insert_checkbox() {
        this.elements.notes_body.focus();
        // execCommand는 오래된 방식이지만 이 앱의 단순성을 위해 사용합니다.
        document.execCommand('insertHTML', false, '<div class="checkbox-wrapper"><input type="checkbox">&nbsp;</div>');
    }

    /**
     * 이미지 파일 업로드를 처리합니다.
     * @param {Event} event 
     */
    _handle_image_upload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 1MB 사이즈 제한
        if (file.size > 1024 * 1024) {
            alert("이미지 파일은 1MB를 초과할 수 없습니다.");
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            const image_data_url = e.target.result;
            this._insert_image(image_data_url);
        };

        reader.readAsDataURL(file);
    }

    /**
     * Base64 인코딩된 이미지 데이터를 에디터에 삽입합니다.
     * @param {string} image_data_url 
     */
    _insert_image(image_data_url) {
        this.elements.notes_body.focus();
        const html_to_insert = `
            <div class="image-wrapper" contenteditable="false">
                <img src="${image_data_url}">
                <button class="delete-image-btn">X</button>
            </div>`;
        document.execCommand('insertHTML', false, html_to_insert);
    }

    /**
     * 현재 활성화된 노트의 중요표시(favorite) 상태를 토글합니다.
     */
    _toggle_favorite() {
        if (!this.active_note) return;

        this.active_note.favorite = !this.active_note.favorite;
        this._save_note_changes();
    }

    /**
     * 현재 활성화된 노트의 변경 사항을 저장합니다.
     */
    _save_note_changes() {
        if (!this.active_note) {
            return; // 활성화된 노트가 없으면 아무것도 하지 않음
        }

        const title = this.elements.notes_title.value.trim(); // trim()으로 앞뒤 공백 제거
        
        // 체크박스 상태를 innerHTML에 반영
        this.elements.notes_body.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            if (checkbox.checked) {
                checkbox.setAttribute('checked', 'checked');
            } else {
                checkbox.removeAttribute('checked');
            }
        });

        const body = this.elements.notes_body.innerHTML;
        const category = this.elements.notes_category_selector.value;
        const favorite = this.active_note.favorite;
        const pin = this.active_note.pin;

        NotesAPI.save_note({
            id: this.active_note.id,
            title,
            body,
            category,
            favorite,
            pin
        });

        this._refresh_notes(); // 변경사항이 저장되었으므로 노트 목록을 새로고침
    }

    /**
     * 현재 활성화된 노트를 삭제합니다.
     */
    _delete_active_note() {
        if (!this.active_note) {
            return;
        }

        const do_delete = confirm("이 노트를 삭제하시겠습니까?"); // 사용자에게 삭제 여부 확인

        if (do_delete) {
            NotesAPI.delete_note(this.active_note.id);
            this._refresh_notes(); // 노트 목록 새로고침
        }
    }

    /**
     * 노트 목록의 각 항목에 대한 HTML 문자열을 생성합니다.
     * @param {number} id
     * @param {string} title
     * @param {string} body
     * @param {string} updated - ISO 형식의 날짜 문자열
     * @returns {string} - 생성된 HTML 문자열
     */
    _create_list_item_html(id, title, body, updated, category, favorite, pin) {
        const MAX_BODY_LENGTH = 60; // 본문 미리보기 최대 길이
        const date_obj = new Date(updated);
        // 날짜 형식을 'YYYY.MM.DD HH:mm'으로 맞춤
        const formatted_date = `${date_obj.getFullYear()}.${(date_obj.getMonth() + 1).toString().padStart(2, '0')}.${date_obj.getDate().toString().padStart(2, '0')} ${date_obj.getHours().toString().padStart(2, '0')}:${date_obj.getMinutes().toString().padStart(2, '0')}`;
        
        const plain_text_body = body.replace(/<[^>]*>/g, ""); // HTML 태그 제거

        return `
            <div class="notes-list-item" data-note-id="${id}">
                <div class="notes-list-item-header">
                    ${pin ? '<span class="notes-list-item-lock">🔒</span>' : ''}
                    ${favorite ? '<span class="notes-list-item-favorite">★</span>' : ''}
                    <span class="notes-list-item-category">${category}</span>
                    <div class="notes-list-item-title">${title}</div>
                    <button class="notes-list-item-delete" data-note-id="${id}">삭제</button>
                </div>
                <div class="notes-list-item-body">
                    ${plain_text_body.substring(0, MAX_BODY_LENGTH)}
                    ${plain_text_body.length > MAX_BODY_LENGTH ? "..." : ""}
                </div>
                <div class="notes-list-item-timestamp">
                    ${formatted_date}
                </div>
            </div>
        `;
    }

    /**
     * 로컬 스토리지에서 노트를 다시 불러와 화면을 새로고침합니다.
     * 검색창에 입력된 값에 따라 노트 목록을 필터링합니다.
     */
    _refresh_notes() {
        const all_notes = NotesAPI.get_all_notes();
        const search_query = this.elements.notes_search.value.toLowerCase();
        const category_filter = this.elements.notes_category_filter.value;

        // 1. 카테고리로 필터링
        const categorized_notes = category_filter === 'all'
            ? all_notes
            : all_notes.filter(note => note.category === category_filter);

        // 2. 검색어로 필터링
        const filtered_notes = categorized_notes.filter(note => {
            const title_match = note.title.toLowerCase().includes(search_query);
            const body_match = note.body.toLowerCase().includes(search_query);
            return title_match || body_match;
        });

        this._set_notes(filtered_notes); // 필터링된 노트 목록으로 UI 업데이트

        // 활성화할 노트를 결정합니다.
        if (filtered_notes.length > 0) {
            // 현재 활성화된 노트가 필터링된 목록에 여전히 있는지 확인
            const active_note_still_exists = filtered_notes.some(note => note.id == (this.active_note ? this.active_note.id : null));

            if (active_note_still_exists) {
                // 있다면, 최신 정보로 업데이트된 노트 객체를 찾아서 활성화
                const fresh_active_note = filtered_notes.find(note => note.id == this.active_note.id);
                this._set_active_note(fresh_active_note);
            } else {
                // 없다면, 필터링된 목록의 첫 번째 노트를 활성화
                this._set_active_note(filtered_notes[0]);
            }
        } else {
            this._set_active_note(null); // 노트가 없으면 활성화된 노트 없음
        }
    }

    /**
     * 노트 목록 UI를 업데이트하고 각 항목에 이벤트 리스너를 추가합니다.
     * @param {Array<Object>} notes - 표시할 노트 객체의 배열
     */
    _set_notes(notes) {
        this.notes = notes;
        this.elements.notes_list.innerHTML = ""; // 기존 목록을 비움

        // 모든 노트에 대해 HTML을 생성하고 목록에 추가
        for (const note of notes) {
            const html = this._create_list_item_html(note.id, note.title, note.body, note.updated, note.category, note.favorite, note.pin);
            this.elements.notes_list.insertAdjacentHTML("beforeend", html);
        }

        // 각 노트 항목에 클릭 이벤트 리스너 추가
        this.elements.notes_list.querySelectorAll(".notes-list-item").forEach(note_list_item => {
            note_list_item.addEventListener("click", () => {
                // 클릭된 노트의 ID를 사용하여 전체 노트 배열에서 해당 노트를 찾아 활성화
                this._set_active_note(this.notes.find(note => note.id == note_list_item.dataset.noteId));
            });
        });

        // 각 노트 항목의 삭제 버튼에 클릭 이벤트 리스너 추가
        this.elements.notes_list.querySelectorAll(".notes-list-item-delete").forEach(delete_button => {
            delete_button.addEventListener("click", (e) => {
                e.stopPropagation(); // 부모 요소(노트 항목)의 클릭 이벤트가 실행되지 않도록 함
                const do_delete = confirm("이 노트를 삭제하시겠습니까?");

                if (do_delete) {
                    NotesAPI.delete_note(delete_button.dataset.noteId);
                    this._refresh_notes();
                }
            });
        });
    }

    /**
     * 특정 노트를 활성화하여 미리보기 영역에 표시합니다.
     * @param {Object} note - 활성화할 노트 객체
     */
    _show_pin_entry_screen() {
        this.elements.notes_body.innerHTML = `
            <div class="notes-pin-screen">
                <h3>PIN 입력</h3>
                <input type="password" class="notes-pin-input" maxlength="4" placeholder="4자리 숫자">
                <button class="notes-pin-submit">잠금 해제</button>
            </div>
        `;

        const pin_input = this.elements.notes_body.querySelector(".notes-pin-input");
        const pin_submit = this.elements.notes_body.querySelector(".notes-pin-submit");

        pin_input.focus();

        pin_submit.addEventListener("click", () => {
            if (pin_input.value === this.active_note.pin) {
                this._unlocked_pins.add(this.active_note.id);
                this._set_active_note(this.active_note); // Re-render the note
            } else {
                alert("PIN이 잘못되었습니다.");
                pin_input.value = "";
            }
        });
    }

    _set_active_note(note) {
        this.active_note = note;
        const is_locked = note && note.pin && !this._unlocked_pins.has(note.id);

        // UI 요소들의 표시 여부 제어
        this.elements.notes_lock_button.classList.toggle("notes-hidden", !note || !note.favorite);
        this.elements.notes_lock_button.classList.toggle("is-locked", note && !!note.pin);
        
        const show_content = note && !is_locked;
        
        this.elements.notes_toolbar_checkbox.parentElement.classList.toggle("notes-hidden", !show_content);
        this.elements.notes_body.classList.toggle("notes-hidden", !show_content);
        this.elements.notes_category_selector.classList.toggle("notes-hidden", !show_content);
        this.elements.notes_favorite_button.classList.toggle("notes-hidden", !show_content);


        if (note) {
            this.elements.notes_preview.classList.remove("notes-hidden");
            this.elements.notes_no_active_note.classList.add("notes-hidden");
            this.elements.notes_delete_button.classList.remove("notes-hidden");
            this.elements.notes_title.value = note.title;

            if (is_locked) {
                this._show_pin_entry_screen();
            } else {
                this.elements.notes_category_selector.value = note.category;
                this.elements.notes_body.innerHTML = note.body;
                this.elements.notes_favorite_button.innerHTML = note.favorite ? "★" : "☆";
                this.elements.notes_favorite_button.classList.toggle("is-favorite", note.favorite);
            }

            // 모든 노트 항목에서 'selected' 클래스를 제거
            this.elements.notes_list.querySelectorAll(".notes-list-item").forEach(item => {
                item.classList.remove("notes-list-item--selected");
            });

            // 현재 활성화된 노트 항목에만 'selected' 클래스를 추가
            const active_list_item = this.elements.notes_list.querySelector(`.notes-list-item[data-note-id="${note.id}"]`);
            if (active_list_item) {
                active_list_item.classList.add("notes-list-item--selected");
            }
        } else {
            // 활성화할 노트가 없으면, 입력 필드를 비우고 미리보기 영역을 숨김
            this.elements.notes_title.value = "";
            this.elements.notes_body.innerHTML = "";
            this.elements.notes_preview.classList.add("notes-hidden");
            this.elements.notes_no_active_note.classList.remove("notes-hidden");
            this.elements.notes_delete_button.classList.add("notes-hidden");
            this.elements.notes_lock_button.classList.add("notes-hidden");
        }
    }

    /**
     * 새로운 노트를 추가합니다.
     */
    add_note() {
        const new_note = {
            title: "새로운 노트",
            body: "",
            category: "일정", // 기본 카테고리 설정
            favorite: false,
            pin: null
        };

        NotesAPI.save_note(new_note);
        this._refresh_notes(); // 새 노트가 추가되었으므로 화면 새로고침
    }

    /**
     * 라이트/다크 모드를 토글합니다.
     */
    _toggle_theme() {
        const is_dark = document.body.classList.toggle("dark-mode");
        localStorage.setItem("notesapp-theme", is_dark ? "dark" : "light");
        this.elements.theme_toggle_button.textContent = is_dark ? "☀️" : "🌙";
    }

    /**
     * 로컬 스토리지에서 테마 설정을 불러와 적용합니다.
     */
    _load_theme() {
        const saved_theme = localStorage.getItem("notesapp-theme");
        if (saved_theme === "dark") {
            document.body.classList.add("dark-mode");
            this.elements.theme_toggle_button.textContent = "☀️";
        }
    }
}

// HTML 문서가 완전히 로드되었을 때 (DOMContentLoaded) 앱을 시작합니다.
// 이렇게 하면 HTML 요소들이 모두 준비된 상태에서 스크립트가 실행되어 오류를 방지할 수 있습니다.
document.addEventListener("DOMContentLoaded", () => {
    const app_root = document.getElementById("app");
    new App(app_root); // App 클래스의 인스턴스를 생성하여 앱을 실행
});
