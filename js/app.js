(function () {
  'use strict';

  // ─── Theme Pre-render Initialisation ─────────────────────────────────────
  // Must run before anything else to avoid a flash of the wrong theme.
  document.documentElement.setAttribute('data-theme', storageGet('theme', 'light'));

  // ─── Storage Layer ────────────────────────────────────────────────────────

  /**
   * Reads a value from localStorage and JSON-parses it.
   * Returns `fallback` on SecurityError, QuotaExceededError, or JSON parse failure.
   * @param {string} key
   * @param {*} fallback
   * @returns {*}
   */
  function storageGet(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  /**
   * JSON-stringifies `value` and writes it to localStorage.
   * Returns true on success, false on any error (e.g. QuotaExceededError, SecurityError).
   * @param {string} key
   * @param {*} value
   * @returns {boolean}
   */
  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Removes a key from localStorage.
   * Silently swallows SecurityError or any other error.
   * @param {string} key
   */
  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // SecurityError or similar — nothing to do
    }
  }

  // ─── State Layer ──────────────────────────────────────────────────────────

  /** Application-wide in-memory state. */
  const state = {
    tasks: [],
    links: [],
    userName: '',
    pomodoroDuration: 25,
    theme: 'light',
    editingTaskId: null,
  };

  /** Focus Timer in-memory state. */
  const timerState = {
    intervalId: null,
    remainingSeconds: 1500,
    totalSeconds: 1500,
    isRunning: false,
  };

  // ─── Theme Functions ──────────────────────────────────────────────────────

  /**
   * Sets `data-theme` on the root element and updates `state.theme`.
   * @param {'light'|'dark'} theme
   */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    state.theme = theme;
  }

  /**
   * Reads the saved theme from Local Storage (defaulting to "light")
   * and applies it via `applyTheme()`.
   */
  function loadTheme() {
    var saved = storageGet('theme', 'light');
    applyTheme(saved);
  }

  /**
   * Flips the current theme between "light" and "dark",
   * applies it, persists the choice to Local Storage, and keeps the
   * #theme-toggle checkbox's aria-checked attribute in sync (Req 9.4).
   */
  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var newTheme = current === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    storageSet('theme', newTheme);

    // Keep aria-checked in sync for the checkbox toggle (accessibility)
    var toggle = document.getElementById('theme-toggle');
    if (toggle && toggle.type === 'checkbox') {
      toggle.setAttribute('aria-checked', newTheme === 'dark' ? 'true' : 'false');
    }
  }

  // ─── Theme Event Binding ──────────────────────────────────────────────────

  (function initThemeToggle() {
    var toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    // Use 'change' as the primary event for checkbox inputs.
    // 'click' is attached only for non-checkbox fallback controls
    // (e.g. a plain button). Guard prevents double-firing on checkboxes.
    if (toggle.type === 'checkbox') {
      toggle.addEventListener('change', toggleTheme);
    } else {
      toggle.addEventListener('click', toggleTheme);
    }
  }());

  // ─── Greeting Widget ──────────────────────────────────────────────────────

  /** Full English weekday names, Sunday-indexed. */
  var WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /** Full English month names, January-indexed. */
  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

  /**
   * Returns the greeting phrase for a given hour (0–23).
   * - 05–11 → "Good Morning"
   * - 12–17 → "Good Afternoon"
   * - 18–21 → "Good Evening"
   * - 22–04 (wraps midnight) → "Good Night"
   * @param {number} hour  Integer 0–23
   * @returns {string}
   */
  function getGreetingPhrase(hour) {
    if (hour >= 5 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    if (hour >= 18 && hour <= 21) return 'Good Evening';
    return 'Good Night'; // 22–23 and 0–4
  }

  /**
   * Reads the current local time, updates #time-display, #date-display,
   * and #greeting-message.
   * Requirements: 1.1, 1.2, 1.3–1.6, 1.7, 1.8
   */
  function updateClock() {
    var now = new Date();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    var day = now.getDate();
    var weekday = WEEKDAY_NAMES[now.getDay()];
    var month = MONTH_NAMES[now.getMonth()];
    var year = now.getFullYear();

    // Req 1.1 – HH:MM, zero-padded
    var hh = hours < 10 ? '0' + hours : '' + hours;
    var mm = minutes < 10 ? '0' + minutes : '' + minutes;
    var timeEl = document.getElementById('time-display');
    if (timeEl) timeEl.textContent = hh + ':' + mm;

    // Req 1.2 – "Weekday, DD Month YYYY"
    var dd = day < 10 ? '0' + day : '' + day;
    var dateEl = document.getElementById('date-display');
    if (dateEl) dateEl.textContent = weekday + ', ' + dd + ' ' + month + ' ' + year;

    // Req 1.3–1.6 – greeting phrase based on hour
    var phrase = getGreetingPhrase(hours);

    // Req 1.7 / 1.8 – append name when present
    var name = (state.userName || '').trim();
    var greetingText = name.length > 0 ? phrase + ', ' + name + '!' : phrase + '!';
    var greetingEl = document.getElementById('greeting-message');
    if (greetingEl) greetingEl.textContent = greetingText;
  }

  /**
   * Calls updateClock() once immediately, then repeats every 60 000 ms.
   * Requirement 1.1 – display updated every 60 seconds.
   */
  function startClockTick() {
    updateClock();
    setInterval(updateClock, 60000);
  }

  // ─── Custom Name Setting ──────────────────────────────────────────────────

  /**
   * Shows or hides the #name-error element.
   * @param {string} message  Non-empty string shows the error; empty string hides it.
   */
  function setNameError(message) {
    var el = document.getElementById('name-error');
    if (!el) return;
    el.textContent = message;
    el.style.display = message ? 'block' : 'none';
  }

  /**
   * Reads "userName" from Local Storage, populates state.userName,
   * and pre-fills #name-input with the stored value.
   * Requirements: 2.3, 2.7
   */
  function loadUserName() {
    var saved = storageGet('userName', '');
    state.userName = typeof saved === 'string' ? saved : '';
    var input = document.getElementById('name-input');
    if (input) input.value = state.userName;
  }

  /**
   * Reads #name-input, validates length, persists or removes the value,
   * updates state.userName, then refreshes the greeting via updateClock().
   * Requirements: 2.1, 2.2, 2.4, 2.5, 2.6
   */
  function saveUserName() {
    var input = document.getElementById('name-input');
    if (!input) return;

    var trimmed = input.value.trim();

    // Req 2.6 – name exceeds 50 chars: show error, do not persist
    if (trimmed.length > 50) {
      setNameError('Name must be 50 characters or fewer.');
      return;
    }

    // Clear any existing error on a valid save attempt
    setNameError('');

    if (trimmed.length === 0) {
      // Req 2.5 – empty save: remove from storage and clear state
      storageRemove('userName');
      state.userName = '';
    } else {
      // Req 2.2 – valid name: persist trimmed value and update state
      storageSet('userName', trimmed);
      state.userName = trimmed;
    }

    // Req 2.4 – update greeting within 100 ms (synchronous call satisfies this)
    updateClock();
  }

  // ─── Name Setting Event Binding ───────────────────────────────────────────

  (function initNameSetting() {
    var saveBtn = document.getElementById('name-save-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveUserName);

    // Clear validation error as soon as the user starts editing again
    var nameInput = document.getElementById('name-input');
    if (nameInput) {
      nameInput.addEventListener('input', function () {
        setNameError('');
      });
    }
  }());

  // ─── Focus Timer ──────────────────────────────────────────────────────────

  /**
   * Reads "pomodoroDuration" from Local Storage (defaulting to 25),
   * validates it is in the range 1–120, converts to seconds, and
   * sets both timerState.remainingSeconds and timerState.totalSeconds.
   * Requirements: 4.3, 4.4
   */
  function loadPomodoroDuration() {
    var saved = storageGet('pomodoroDuration', 25);

    // Coerce to a number and fall back to 25 if the value is not a valid integer
    var minutes = parseInt(saved, 10);
    if (isNaN(minutes) || minutes < 1 || minutes > 120) {
      minutes = 25;
    }

    var seconds = minutes * 60;
    timerState.remainingSeconds = seconds;
    timerState.totalSeconds = seconds;
    state.pomodoroDuration = minutes;
  }

  /**
   * Formats timerState.remainingSeconds as a zero-padded MM:SS string
   * and writes it to #timer-display.
   * Also updates the disabled state of #timer-start-btn and #timer-stop-btn
   * according to the button-state rules:
   *   - Running  → Start disabled, Stop enabled
   *   - Stopped / Paused / Reset → Start enabled, Stop disabled
   * Requirement: 3.1
   */
  function renderTimer() {
    var totalSecs = timerState.remainingSeconds;
    var mm = Math.floor(totalSecs / 60);
    var ss = totalSecs % 60;
    var mmStr = mm < 10 ? '0' + mm : '' + mm;
    var ssStr = ss < 10 ? '0' + ss : '' + ss;

    var display = document.getElementById('timer-display');
    if (display) display.textContent = mmStr + ':' + ssStr;

    var startBtn = document.getElementById('timer-start-btn');
    var stopBtn  = document.getElementById('timer-stop-btn');
    if (startBtn) startBtn.disabled = timerState.isRunning;
    if (stopBtn)  stopBtn.disabled  = !timerState.isRunning;
  }

  // ─── Timer Core Functions ─────────────────────────────────────────────────

  /**
   * Memainkan suara notifikasi saat timer selesai.
   */
  function playAlarm() {
    // URL ini bisa diganti dengan path file MP3/WAV lokal kamu, misalnya 'audio/bell.mp3'
    var alarmSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    
    // catch() digunakan untuk mencegah error di console jika browser memblokir autoplay
    alarmSound.play().catch(function(error) {
      console.log('Audio autoplay dicegah oleh browser:', error);
    });
  }

  /**
   * Called once per second while the timer is running.
   * Decrements remainingSeconds; stops the timer and shows the completion
   * notification when the countdown reaches 0.
   * Requirements: 3.6
   */
  function onTimerTick() {
    timerState.remainingSeconds -= 1;

    if (timerState.remainingSeconds <= 0) {
      timerState.remainingSeconds = 0;
      stopTimer();
      var notification = document.getElementById('timer-notification');
      if (notification) notification.hidden = false;
      
      // Memicu suara saat timer mencapai angka 0
      playAlarm();
    }

    renderTimer();
  }

  /**
   * Starts (or resumes) the countdown from the current remainingSeconds.
   * Creates a 1-second interval, marks the timer as running, and updates the UI.
   * Requirements: 3.2, 3.3, 3.7
   */
  function startTimer() {
    if (timerState.isRunning) return; // Guard against double-start
    timerState.intervalId = setInterval(onTimerTick, 1000);
    timerState.isRunning = true;
    renderTimer();
  }

  /**
   * Pauses the countdown by clearing the interval.
   * Does not reset remainingSeconds, allowing the timer to be resumed.
   * Requirements: 3.4, 3.8
   */
  function stopTimer() {
    if (timerState.intervalId !== null) {
      clearInterval(timerState.intervalId);
      timerState.intervalId = null;
    }
    timerState.isRunning = false;
    renderTimer();
  }

  /**
   * Stops the countdown and resets the display to the configured duration.
   * Hides the completion notification if it is visible.
   * Requirements: 3.5, 3.6
   */
  function resetTimer() {
    stopTimer();
    timerState.remainingSeconds = timerState.totalSeconds;
    var notification = document.getElementById('timer-notification');
    if (notification) notification.hidden = true;
    renderTimer();
  }

  // ─── Duration Setting ─────────────────────────────────────────────────────

  /**
   * Shows or hides the #duration-error element.
   * @param {string} message  Non-empty string shows the error; empty string hides it.
   */
  function setDurationError(message) {
    var el = document.getElementById('duration-error');
    if (!el) return;
    el.textContent = message;
    el.style.display = message ? 'block' : 'none';
  }

  /**
   * Reads #duration-input, validates the range 1–120, persists the value,
   * and resets the timer to the new duration.
   * If the timer is currently running, it is stopped first.
   * Requirements: 4.1, 4.2, 4.5, 4.6
   */
  function saveDuration() {
    var input = document.getElementById('duration-input');
    if (!input) return;

    var parsed = parseInt(input.value, 10);

    // Req 4.1 / 4.6 – reject values outside 1–120
    if (isNaN(parsed) || parsed < 1 || parsed > 120) {
      setDurationError('Please enter a duration between 1 and 120 minutes.');
      return;
    }

    // Valid input – clear any existing error
    setDurationError('');

    // Req 4.2 – persist to Local Storage
    storageSet('pomodoroDuration', parsed);
    state.pomodoroDuration = parsed;

    var newSeconds = parsed * 60;

    // Req 4.5 – if timer is running, stop it immediately and reset to new duration
    if (timerState.isRunning) {
      stopTimer();
    }

    timerState.totalSeconds = newSeconds;
    timerState.remainingSeconds = newSeconds;

    // Hide the completion notification in case it was showing
    var notification = document.getElementById('timer-notification');
    if (notification) notification.hidden = true;

    renderTimer();
  }

  // ─── Timer Event Binding ──────────────────────────────────────────────────

  (function initTimer() {
    var startBtn    = document.getElementById('timer-start-btn');
    var stopBtn     = document.getElementById('timer-stop-btn');
    var resetBtn    = document.getElementById('timer-reset-btn');
    var saveDurBtn  = document.getElementById('duration-save-btn');
    var durInput    = document.getElementById('duration-input');

    if (startBtn)   startBtn.addEventListener('click', startTimer);
    if (stopBtn)    stopBtn.addEventListener('click', stopTimer);
    if (resetBtn)   resetBtn.addEventListener('click', resetTimer);
    if (saveDurBtn) saveDurBtn.addEventListener('click', saveDuration);

    // Req 4.6 – dismiss duration error as soon as the user modifies the input
    if (durInput) {
      durInput.addEventListener('input', function () {
        setDurationError('');
      });
    }
  }());

  // ─── To-Do List — Load and Render ────────────────────────────────────────

  /**
   * Reads the "tasks" key from Local Storage (defaulting to an empty array)
   * and assigns the parsed array to `state.tasks`.
   * Requirements: 6.2, 10.3
   */
  function loadTasks() {
    var saved = storageGet('tasks', []);
    // Guard: if the stored value is not an array, fall back to an empty list
    state.tasks = Array.isArray(saved) ? saved : [];
  }

  /**
   * Rebuilds the #task-list <ul> element from the current `state.tasks`.
   *
   * Each <li data-id="…"> contains:
   *   - <input type="checkbox" class="task-checkbox"> reflecting `completed`
   *   - <span class="task-text[ completed]"> with description (truncated at 200 chars)
   *   - <button class="task-edit-btn">
   *   - <button class="task-delete-btn">
   *   - <span class="task-edit-error"> for inline edit validation messages
   *
   * When `state.tasks` is empty, renders an empty-state message instead.
   * Requirements: 6.1, 6.2, 6.3, 7.4
   */
  function renderTasks() {
    var list = document.getElementById('task-list');
    if (!list) return;

    // Clear existing content
    list.innerHTML = '';

    // Req 7.4 – show empty-state message when no tasks exist
    if (state.tasks.length === 0) {
      var emptyItem = document.createElement('li');
      emptyItem.className = 'task-empty-state';
      emptyItem.textContent = 'No tasks yet. Add one above!';
      list.appendChild(emptyItem);
      return;
    }

    // Req 6.1 – render tasks in creation order (up to 100, enforced at add time)
    for (var i = 0; i < state.tasks.length; i++) {
      var task = state.tasks[i];

      // <li data-id="…">
      var li = document.createElement('li');
      li.setAttribute('data-id', task.id);

      // Completion checkbox – Req 6.3
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked = !!task.completed;
      checkbox.setAttribute('aria-label', 'Mark task complete');

      // Task text span – Req 6.3 + truncation at 200 chars – Req 6.3 / 5.9
      var textSpan = document.createElement('span');
      textSpan.className = task.completed ? 'task-text completed' : 'task-text';
      var rawText = typeof task.description === 'string' ? task.description : '';
      textSpan.textContent = rawText.length > 200
        ? rawText.slice(0, 200) + '\u2026'   // ellipsis character
        : rawText;

      // Edit button – Req 6.3
      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'task-edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.setAttribute('aria-label', 'Edit task');

      // Delete button – Req 6.3
      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'task-delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('aria-label', 'Delete task');

      // Inline edit-error span – Req 6.6
      var errorSpan = document.createElement('span');
      errorSpan.className = 'task-edit-error';
      errorSpan.setAttribute('aria-live', 'polite');
      errorSpan.textContent = '';

      li.appendChild(checkbox);
      li.appendChild(textSpan);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      li.appendChild(errorSpan);

      list.appendChild(li);
    }
  }

  // ─── To-Do List — Add Task ────────────────────────────────────────────────

  /**
   * Shows or hides the #task-input-error element.
   * @param {string} message  Non-empty string shows the error; empty string hides it.
   */
  function setTaskInputError(message) {
    var el = document.getElementById('task-input-error');
    if (!el) return;
    el.textContent = message;
    el.style.display = message ? 'block' : 'none';
  }

  /**
   * Validates `description`, creates a task object, pushes it to `state.tasks`,
   * persists via storageSet, clears the input field, and re-renders the task list.
   *
   * Validation rules:
   *   - Empty / whitespace-only description → show error, abort  (Req 5.1)
   *   - Trimmed length > 200 → show char-limit error, abort       (Req 5.2)
   *   - state.tasks.length >= 100 → show limit error, abort       (Req 5.5)
   *
   * On success (Req 5.3, 5.4, 5.6, 5.7, 5.8, 5.9, 6.1):
   *   - Task object: { id, description (trimmed), completed: false, createdAt }
   *   - Push to state.tasks; persist via storageSet
   *   - If storageSet returns false, show save-failure notice but keep task in session
   *   - Clear #task-input and call renderTasks()
   *
   * @param {string} description  Raw value from the input field.
   */
  function addTask(description) {
    var trimmed = (typeof description === 'string' ? description : '').trim();

    // Req 5.1 – empty / whitespace-only
    if (trimmed.length === 0) {
      setTaskInputError('Please enter a task description.');
      return;
    }

    // Req 5.2 – exceeds 200-character limit
    if (trimmed.length > 200) {
      setTaskInputError('Task description must be 200 characters or fewer.');
      return;
    }

    // Req 5.5 – hard cap of 100 tasks
    if (state.tasks.length >= 100) {
      setTaskInputError('You have reached the maximum of 100 tasks. Delete some tasks before adding new ones.');
      return;
    }

    // Clear any previous error before a successful add
    setTaskInputError('');

    // Req 5.3 – create the task object
    var newTask = {
      id: crypto.randomUUID(),
      description: trimmed,
      completed: false,
      createdAt: Date.now(),
    };

    // Req 5.4 – push to in-memory state
    state.tasks.push(newTask);

    // Req 5.6 – persist; Req 5.7 – on failure keep task but notify user
    var saved = storageSet('tasks', state.tasks);
    if (!saved) {
      setTaskInputError('Task added for this session, but could not be saved to storage.');
    }

    // Req 5.8 – clear the input field
    var input = document.getElementById('task-input');
    if (input) input.value = '';

    // Req 5.9 / 6.1 – re-render the list
    renderTasks();
  }

  // ─── To-Do List — Toggle and Delete ─────────────────────────────────────

  /**
   * Flips the `completed` state of the task with the given `id`,
   * persists the updated array to Local Storage, and re-renders the list.
   * Requirements: 7.1, 7.2
   * @param {string} id  UUID of the task to toggle.
   */
  function toggleTask(id) {
    for (var i = 0; i < state.tasks.length; i++) {
      if (state.tasks[i].id === id) {
        state.tasks[i].completed = !state.tasks[i].completed;
        break;
      }
    }
    storageSet('tasks', state.tasks);
    renderTasks();
  }

  /**
   * Removes the task with the given `id` from `state.tasks`,
   * persists the updated array, and re-renders the list.
   * Requirements: 7.3, 7.4
   * @param {string} id  UUID of the task to delete.
   */
  function deleteTask(id) {
    state.tasks = state.tasks.filter(function (task) {
      return task.id !== id;
    });
    storageSet('tasks', state.tasks);
    renderTasks();
  }

  // ─── To-Do List — Edit Mode ───────────────────────────────────────────────

  /**
   * Puts the task identified by `id` into inline edit mode.
   * If another task is already being edited, that edit is cancelled first so
   * only one task can be in edit mode at a time.
   * Requirements: 6.4
   * @param {string} id  UUID of the task to edit.
   */
  function enterEditMode(id) {
    // Cancel any open edit before entering a new one
    if (state.editingTaskId !== null && state.editingTaskId !== id) {
      cancelEdit(state.editingTaskId);
    }

    state.editingTaskId = id;

    var li = document.querySelector('#task-list li[data-id="' + id + '"]');
    if (!li) return;

    // Find the task object for the pre-fill value
    var task = null;
    for (var i = 0; i < state.tasks.length; i++) {
      if (state.tasks[i].id === id) {
        task = state.tasks[i];
        break;
      }
    }
    if (!task) return;

    // Replace the .task-text span with an <input>
    var textSpan = li.querySelector('.task-text');
    if (textSpan) li.removeChild(textSpan);

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-edit-input';
    input.value = task.description;
    input.setAttribute('aria-label', 'Edit task description');

    // Save and cancel buttons for the edit row
    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'task-edit-save-btn';
    saveBtn.textContent = 'Save';
    saveBtn.setAttribute('aria-label', 'Save edit');

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'task-edit-cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.setAttribute('aria-label', 'Cancel edit');

    // Hide the static edit/delete buttons so they don't conflict
    var editBtn = li.querySelector('.task-edit-btn');
    if (editBtn) editBtn.style.display = 'none';
    var deleteBtn = li.querySelector('.task-delete-btn');
    if (deleteBtn) deleteBtn.style.display = 'none';

    // Insert input and action buttons before the error span
    var errorSpan = li.querySelector('.task-edit-error');
    li.insertBefore(input, errorSpan);
    li.insertBefore(saveBtn, errorSpan);
    li.insertBefore(cancelBtn, errorSpan);

    input.focus();
  }

  /**
   * Validates the edited value and, if valid, updates the task's description,
   * persists, and re-renders. If empty/whitespace, shows the inline error for
   * at least 3 seconds without mutating state.
   * Requirements: 6.5, 6.6
   * @param {string} id     UUID of the task being edited.
   * @param {string} value  Raw value from the edit input.
   */
  function confirmEdit(id, value) {
    var trimmed = (typeof value === 'string' ? value : '').trim();

    if (trimmed.length === 0) {
      // Show inline error for ≥ 3 seconds without changing state
      var li = document.querySelector('#task-list li[data-id="' + id + '"]');
      if (li) {
        var errorSpan = li.querySelector('.task-edit-error');
        if (errorSpan) {
          errorSpan.textContent = 'Task description cannot be empty.';
          errorSpan.style.display = 'inline';
          setTimeout(function () {
            // Only hide if this error span still belongs to the same edit session
            errorSpan.style.display = 'none';
            errorSpan.textContent = '';
          }, 3000);
        }
      }
      return; // Do NOT mutate state
    }

    // Update the task in state
    for (var i = 0; i < state.tasks.length; i++) {
      if (state.tasks[i].id === id) {
        state.tasks[i].description = trimmed;
        break;
      }
    }

    state.editingTaskId = null;
    storageSet('tasks', state.tasks);
    renderTasks();
  }

  /**
   * Exits edit mode without saving, restoring the original task view.
   * Requirements: 6.7
   * @param {string} id  UUID of the task whose edit is being cancelled.
   */
  function cancelEdit(id) {
    state.editingTaskId = null;
    renderTasks();
  }

  // ─── To-Do List — Task-List Delegated Event Listeners ────────────────────

  (function initTaskListDelegation() {
    var taskList = document.getElementById('task-list');
    if (!taskList) return;

    // Req 7.1 / 7.2 – checkbox change → toggle completion
    taskList.addEventListener('change', function (event) {
      var target = event.target;
      if (!target.classList.contains('task-checkbox')) return;
      var li = target.closest('li[data-id]');
      if (!li) return;
      toggleTask(li.getAttribute('data-id'));
    });

    // Req 6.4 / 6.5 / 6.7 – delegated click handler for edit, save, cancel, delete
    taskList.addEventListener('click', function (event) {
      var target = event.target;
      var li = target.closest('li[data-id]');
      if (!li) return;
      var id = li.getAttribute('data-id');

      if (target.classList.contains('task-delete-btn')) {
        // Req 7.3 / 7.4 – delete button → remove task
        deleteTask(id);
      } else if (target.classList.contains('task-edit-btn')) {
        // Req 6.4 – edit button → enter edit mode
        enterEditMode(id);
      } else if (target.classList.contains('task-edit-save-btn')) {
        // Req 6.5 – save button → confirm edit
        var input = li.querySelector('.task-edit-input');
        confirmEdit(id, input ? input.value : '');
      } else if (target.classList.contains('task-edit-cancel-btn')) {
        // Req 6.7 – cancel button → cancel edit
        cancelEdit(id);
      }
    });

    // Req 6.5 / 6.7 – keydown on edit inputs (Enter = confirm, Escape = cancel)
    taskList.addEventListener('keydown', function (event) {
      var target = event.target;
      if (!target.classList.contains('task-edit-input')) return;
      var li = target.closest('li[data-id]');
      if (!li) return;
      var id = li.getAttribute('data-id');

      if (event.key === 'Enter') {
        confirmEdit(id, target.value);
      } else if (event.key === 'Escape') {
        cancelEdit(id);
      }
    });
  }());

  // ─── To-Do List — Input Event Binding ────────────────────────────────────

  (function initTaskInput() {
    var addBtn    = document.getElementById('task-add-btn');
    var taskInput = document.getElementById('task-input');

    // Req 5.8 – clicking Add Task button
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        var input = document.getElementById('task-input');
        addTask(input ? input.value : '');
      });
    }

    if (taskInput) {
      // Req 5.8 – pressing Enter inside the input
      taskInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          addTask(taskInput.value);
        }
      });

      // Req 5.1 / 5.2 – dismiss error on next input event
      taskInput.addEventListener('input', function () {
        setTaskInputError('');
      });
    }
  }());

  // ─── Quick Links — Load and Render ───────────────────────────────────────

  /**
   * Reads the "quickLinks" key from Local Storage (defaulting to an empty array)
   * and assigns the parsed array to `state.links`.
   * Requirements: 8.5
   */
  function loadLinks() {
    var saved = storageGet('quickLinks', []);
    // Guard: if the stored value is not an array, fall back to an empty list
    state.links = Array.isArray(saved) ? saved : [];
  }

  /**
   * Rebuilds the #links-list container from the current `state.links`.
   *
   * Each entry (role="listitem") contains:
   *   - <button class="link-btn"> — displays label (truncated at 30 chars with
   *     ellipsis if longer), opens URL in a new tab on click
   *   - <button class="link-delete-btn"> — removes the link (handled by task 10.2)
   *
   * The parent <div role="listitem"> carries data-id="…" so the delegated
   * delete listener (task 10.2) can read the id.
   *
   * When `state.links` is empty, renders an empty-state message instead.
   * Requirements: 8.5, 8.6
   */
  function renderLinks() {
    var container = document.getElementById('links-list');
    if (!container) return;

    // Clear existing content
    container.innerHTML = '';

    // Show empty-state message when no links exist (mirrors renderTasks pattern)
    if (state.links.length === 0) {
      var emptyEl = document.createElement('p');
      emptyEl.className = 'links-empty-state';
      emptyEl.textContent = 'No links yet. Add one above!';
      container.appendChild(emptyEl);
      return;
    }

    for (var i = 0; i < state.links.length; i++) {
      var link = state.links[i];

      // Wrapper element carries the data-id for delegated event handling
      var item = document.createElement('div');
      item.setAttribute('role', 'listitem');
      item.setAttribute('data-id', link.id);

      // Req 8.5 – label truncated at 30 chars with ellipsis
      var rawLabel = typeof link.label === 'string' ? link.label : '';
      var displayLabel = rawLabel.length > 30
        ? rawLabel.slice(0, 30) + '\u2026'  // ellipsis character
        : rawLabel;

      // Req 8.6 – clicking opens the URL in a new tab
      var linkBtn = document.createElement('button');
      linkBtn.type = 'button';
      linkBtn.className = 'link-btn';
      linkBtn.textContent = displayLabel;
      linkBtn.setAttribute('aria-label', 'Open ' + rawLabel + ' in a new tab');
      (function (url) {
        linkBtn.addEventListener('click', function () {
          window.open(url, '_blank', 'noopener,noreferrer');
        });
      }(link.url));

      // Delete button – wired in task 10.2 via delegated listener on #links-list
      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'link-delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('aria-label', 'Delete link ' + rawLabel);

      item.appendChild(linkBtn);
      item.appendChild(deleteBtn);
      container.appendChild(item);
    }
  }

  // ─── Quick Links — Add and Delete ───────────────────────────────────────

  /**
   * Shows or hides the #link-label-error element.
   * @param {string} message  Non-empty string shows the error; empty string hides it.
   */
  function setLinkLabelError(message) {
    var el = document.getElementById('link-label-error');
    if (!el) return;
    el.textContent = message;
    el.style.display = message ? 'block' : 'none';
  }

  /**
   * Shows or hides the #link-url-error element.
   * @param {string} message  Non-empty string shows the error; empty string hides it.
   */
  function setLinkUrlError(message) {
    var el = document.getElementById('link-url-error');
    if (!el) return;
    el.textContent = message;
    el.style.display = message ? 'block' : 'none';
  }

  /**
   * Validates `label` and `url`, creates a new Link object, persists it,
   * renders the updated list, and clears the input fields.
   *
   * Validation rules (both checks always run independently):
   *   - Label: non-empty AND ≤ 50 chars → shows #link-label-error if invalid
   *   - URL: starts with http:// or https:// AND ≤ 2048 chars → shows #link-url-error if invalid
   *
   * On success (Req 8.4):
   *   - Link object: { id, label (trimmed), url (trimmed) }
   *   - Push to state.links; persist via storageSet("quickLinks", state.links)
   *   - Call renderLinks(); clear both inputs
   *
   * Requirements: 8.1, 8.2, 8.3, 8.4
   * @param {string} label  Raw value from #link-label-input
   * @param {string} url    Raw value from #link-url-input
   */
  function addLink(label, url) {
    var trimmedLabel = (typeof label === 'string' ? label : '').trim();
    var trimmedUrl   = (typeof url === 'string'   ? url   : '').trim();

    var labelValid = true;
    var urlValid   = true;

    // Req 8.2 – validate label: non-empty and ≤ 50 chars
    if (trimmedLabel.length === 0) {
      setLinkLabelError('Please enter a label for the link.');
      labelValid = false;
    } else if (trimmedLabel.length > 50) {
      setLinkLabelError('Label must be 50 characters or fewer.');
      labelValid = false;
    } else {
      setLinkLabelError('');
    }

    // Req 8.2 – validate URL: must start with http:// or https:// and be ≤ 2048 chars
    if (trimmedUrl.length === 0) {
      setLinkUrlError('Please enter a URL.');
      urlValid = false;
    } else if (!/^https?:\/\//i.test(trimmedUrl)) {
      setLinkUrlError('URL must start with http:// or https://');
      urlValid = false;
    } else if (trimmedUrl.length > 2048) {
      setLinkUrlError('URL must be 2048 characters or fewer.');
      urlValid = false;
    } else {
      setLinkUrlError('');
    }

    // Req 8.3 – do not save if either validation failed
    if (!labelValid || !urlValid) return;

    // Req 8.4 – create link object and persist
    var newLink = {
      id: crypto.randomUUID(),
      label: trimmedLabel,
      url: trimmedUrl,
    };

    state.links.push(newLink);
    storageSet('quickLinks', state.links);
    renderLinks();

    // Clear inputs after successful add
    var labelInput = document.getElementById('link-label-input');
    var urlInput   = document.getElementById('link-url-input');
    if (labelInput) labelInput.value = '';
    if (urlInput)   urlInput.value   = '';
  }

  /**
   * Removes the link with the given `id` from `state.links`,
   * persists the updated array, and re-renders the list.
   * Requirements: 8.7
   * @param {string} id  UUID of the link to delete.
   */
  function deleteLink(id) {
    state.links = state.links.filter(function (link) {
      return link.id !== id;
    });
    storageSet('quickLinks', state.links);
    renderLinks();
  }

  // ─── Quick Links — Event Binding ─────────────────────────────────────────

  (function initQuickLinks() {
    // Req 8.1 / 8.2 / 8.4 – Add Link button
    var addLinkBtn = document.getElementById('link-add-btn');
    if (addLinkBtn) {
      addLinkBtn.addEventListener('click', function () {
        var labelInput = document.getElementById('link-label-input');
        var urlInput   = document.getElementById('link-url-input');
        addLink(
          labelInput ? labelInput.value : '',
          urlInput   ? urlInput.value   : ''
        );
      });
    }

    // Dismiss label/url errors as the user edits the respective fields
    var labelInput = document.getElementById('link-label-input');
    if (labelInput) {
      labelInput.addEventListener('input', function () {
        setLinkLabelError('');
      });
    }

    var urlInput = document.getElementById('link-url-input');
    if (urlInput) {
      urlInput.addEventListener('input', function () {
        setLinkUrlError('');
      });
    }

    // Req 8.7 – delegated delete listener on #links-list
    var linksList = document.getElementById('links-list');
    if (linksList) {
      linksList.addEventListener('click', function (event) {
        var target = event.target;
        if (!target.classList.contains('link-delete-btn')) return;
        var item = target.closest('[data-id]');
        if (!item) return;
        deleteLink(item.getAttribute('data-id'));
      });
    }
  }());

  // ─── Application Initialisation ───────────────────────────────────────────

  /**
   * Bootstraps the entire application in the correct order:
   *
   * 1. Theme — loadTheme() re-applies the persisted theme (the pre-render line
   *    at the top of the IIFE already set the attribute; this call also updates
   *    state.theme and syncs the toggle checkbox).
   * 2. User name — populates state.userName and pre-fills #name-input.
   * 3. Pomodoro duration — reads storage and sets timerState seconds.
   * 4. Tasks / Links — populates state arrays from storage.
   * 5. Render calls — push state into the DOM so the UI matches state on load.
   * 6. Clock — starts the 60-second tick (calls updateClock() immediately).
   * 7. Post-load sync — aligns any controls whose visual state depends on
   *    the loaded data (theme checkbox, duration input value).
   *
   * All event listeners are attached by the self-invoking init blocks earlier
   * in this file (initThemeToggle, initNameSetting, initTimer,
   * initTaskListDelegation, initTaskInput, initQuickLinks), so no listener
   * wiring is needed here.
   *
   * Requirements: 2.3, 4.3, 6.2, 9.5, 10.3
   */
  function init() {
    // 1. Theme (pre-render already ran; this syncs state.theme)
    loadTheme();

    // 2. User name
    loadUserName();

    // 3. Pomodoro duration
    loadPomodoroDuration();

    // 4. Tasks and Quick Links
    loadTasks();
    loadLinks();

    // 5. Render all widgets
    renderTimer();
    renderTasks();
    renderLinks();

    // 6. Start the clock ticker (calls updateClock() once immediately)
    startClockTick();

    // 7. Post-load sync ────────────────────────────────────────────────────

    // Sync the duration input field to the loaded value so the input does not
    // show a stale default when the user has previously saved a custom duration.
    var durInput = document.getElementById('duration-input');
    if (durInput) {
      durInput.value = state.pomodoroDuration;
    }

    // Sync the theme-toggle checkbox checked state and aria-checked attribute
    // to the theme that was actually loaded from storage (Req 9.5).
    var themeToggle = document.getElementById('theme-toggle');
    if (themeToggle && themeToggle.type === 'checkbox') {
      var isDark = state.theme === 'dark';
      themeToggle.checked = isDark;
      themeToggle.setAttribute('aria-checked', isDark ? 'true' : 'false');
    }
  }

  // Kick everything off.
  init();

})();