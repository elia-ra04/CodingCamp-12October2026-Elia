# Implementation Plan: Life To-Do List Dashboard

## Overview

Implement a fully client-side single-page dashboard using HTML, CSS, and Vanilla JavaScript — no build tools, no frameworks, no CDN scripts. The app opens via `file://` and persists all user data to `localStorage`. Implementation proceeds in layers: scaffolding → storage → state & greeting → timer → to-do list → quick links → theme → styling → testing.

## Tasks

- [~] 1. Scaffold project files and HTML skeleton
  - Create `index.html` with semantic HTML structure: `<header>` for greeting, `<main>` with sections for each widget, `<footer>` if needed
  - Add `<link>` to `css/style.css` and `<script defer>` to `js/app.js` in `<head>`
  - Add `data-theme="light"` attribute to the `<html>` root element as the default (will be overwritten by JS before render)
  - Create empty `css/style.css` file
  - Create `js/app.js` with the IIFE wrapper: `(function () { 'use strict'; /* … */ })();`
  - Include all widget DOM elements with correct IDs: `#time-display`, `#date-display`, `#greeting-message`, `#name-input`, `#name-save-btn`, `#name-error`, `#timer-display`, `#timer-start-btn`, `#timer-stop-btn`, `#timer-reset-btn`, `#timer-notification`, `#duration-input`, `#duration-save-btn`, `#duration-error`, `#task-input`, `#task-add-btn`, `#task-input-error`, `#task-list`, `#link-label-input`, `#link-url-input`, `#link-add-btn`, `#link-label-error`, `#link-url-error`, `#links-list`, `#theme-toggle`
  - Add `aria-live="polite"` to all validation error elements
  - _Requirements: 11.1, 11.2, 11.3, 11.5_

- [x] 2. Implement Storage Layer
  - [x] 2.1 Implement `storageGet(key, fallback)`
    - Wrap `localStorage.getItem` and `JSON.parse` in a `try/catch` block
    - Return `fallback` on `SecurityError`, `QuotaExceededError`, or any JSON parse failure
    - _Requirements: 10.4, 2.7, 4.3_

  - [x] 2.2 Implement `storageSet(key, value)`
    - Wrap `localStorage.setItem` and `JSON.stringify` in a `try/catch` block
    - Return `true` on success, `false` on any error
    - _Requirements: 10.1, 10.2, 5.5_

  - [x] 2.3 Implement `storageRemove(key)`
    - Wrap `localStorage.removeItem` in a `try/catch` block
    - _Requirements: 2.5_

  - [ ]* 2.4 Write property test for `storageGet` graceful fallback (Property 10)
    - **Property 10: Malformed Local Storage data is discarded gracefully**
    - Generate arbitrary non-JSON strings for each of the five known keys; assert `storageGet()` returns the fallback value without throwing
    - Tag: `// Feature: life-todo-dashboard, Property 10: Malformed Local Storage data is discarded gracefully`
    - **Validates: Requirements 10.4**

- [x] 3. Implement State Object and Theme Initialisation
  - [x] 3.1 Define in-memory `state` and `timerState` objects inside the IIFE
    - `state`: `{ tasks: [], links: [], userName: '', pomodoroDuration: 25, theme: 'light', editingTaskId: null }`
    - `timerState`: `{ intervalId: null, remainingSeconds: 1500, totalSeconds: 1500, isRunning: false }`
    - _Requirements: 11.1_

  - [x] 3.2 Implement theme pre-render initialisation
    - As the very first executable statement in the IIFE, call `storageGet("theme", "light")` and immediately call `document.documentElement.setAttribute('data-theme', value)` before any other logic
    - Implement `applyTheme(theme)`, `loadTheme()`, and `toggleTheme()` functions
    - Attach `toggleTheme` to the `#theme-toggle` change/click event
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 4. Implement Greeting Widget
  - [x] 4.1 Implement `updateClock()` and `startClockTick()`
    - `updateClock()` reads `new Date()`, formats HH:MM for `#time-display`, formats "Weekday, DD Month YYYY" for `#date-display`
    - Derives greeting phrase from hour ranges (05–11 → "Good Morning", 12–17 → "Good Afternoon", 18–21 → "Good Evening", 22–04 → "Good Night")
    - Reads `state.userName` and builds the full greeting string for `#greeting-message` per Requirements 1.7 and 1.8
    - `startClockTick()` calls `updateClock()` once immediately, then schedules it every 60 000 ms via `setInterval`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ]* 4.2 Write property test for greeting phrase coverage (Property 1)
    - **Property 1: Greeting phrase covers every hour of the day**
    - Generate all 24 hour values (0–23); assert exactly one of the four greeting strings is returned for each; assert no gaps and no overlaps across the four ranges
    - Tag: `// Feature: life-todo-dashboard, Property 1: Greeting phrase covers every hour of the day`
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**

  - [ ]* 4.3 Write property test for timer display formatting (Property 3)
    - **Property 3: Timer display always reflects remaining seconds**
    - Generate `remainingSeconds` in 0–7200; assert `renderTimer()` output parses back (MM * 60 + SS) to the same value
    - Tag: `// Feature: life-todo-dashboard, Property 3: Timer display always reflects remaining seconds`
    - **Validates: Requirements 3.1**

- [x] 5. Implement Custom Name Setting
  - [ ] 5.1 Implement `loadUserName()` and `saveUserName()`
    - `loadUserName()` reads `"userName"` via `storageGet`, sets `state.userName`, pre-populates `#name-input`
    - `saveUserName()` trims the input value; if empty, calls `storageRemove("userName")` and clears `state.userName`; if 1–50 chars, writes to storage and updates `state.userName`; if > 50 chars, shows `#name-error` and does not persist
    - After any valid save, calls `updateClock()` to refresh the greeting within 100 ms
    - Attach `saveUserName` to the `#name-save-btn` click event
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 5.2 Write property test for user name persistence round-trip (Property 2)
    - **Property 2: User name persistence round-trip**
    - Generate strings of 1–50 trimmed characters; assert `storageGet("userName", "")` after `storageSet` returns a value equal to the trimmed input
    - Tag: `// Feature: life-todo-dashboard, Property 2: User name persistence round-trip`
    - **Validates: Requirements 2.2, 2.3**

- [x] 6. Implement Focus Timer and Pomodoro Duration
  - [x] 6.1 Implement `loadPomodoroDuration()` and `renderTimer()`
    - `loadPomodoroDuration()` reads `"pomodoroDuration"` via `storageGet` (default 25), validates 1–120 range, converts to seconds, sets `timerState.remainingSeconds` and `timerState.totalSeconds`
    - `renderTimer()` formats `timerState.remainingSeconds` as zero-padded MM:SS and writes to `#timer-display`; updates `#timer-start-btn` and `#timer-stop-btn` disabled states per the button-state rules
    - _Requirements: 3.1, 4.3, 4.4_

  - [x] 6.2 Implement `startTimer()`, `stopTimer()`, `resetTimer()`, and `onTimerTick()`
    - `startTimer()` creates the `setInterval` calling `onTimerTick` every 1000 ms, sets `timerState.intervalId` and `isRunning = true`, calls `renderTimer()`
    - `stopTimer()` clears the interval, nulls `timerState.intervalId`, sets `isRunning = false`, calls `renderTimer()`
    - `resetTimer()` calls `stopTimer()`, resets `remainingSeconds` to `totalSeconds`, hides `#timer-notification`, calls `renderTimer()`
    - `onTimerTick()` decrements `remainingSeconds`; if 0, calls `stopTimer()` and shows `#timer-notification`
    - Attach event handlers: `startTimer` → `#timer-start-btn`, `stopTimer` → `#timer-stop-btn`, `resetTimer` → `#timer-reset-btn`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 6.3 Implement `saveDuration()`
    - Reads `#duration-input` value, parses as integer; if outside 1–120, shows `#duration-error` and returns without saving
    - Dismisses `#duration-error` on the next `input` event on `#duration-input`
    - On valid input: writes to `"pomodoroDuration"` via `storageSet`; if timer is running (`timerState.isRunning`), calls `stopTimer()` then updates `timerState.totalSeconds` and `remainingSeconds` to new value in seconds, calls `renderTimer()`
    - Attach `saveDuration` to `#duration-save-btn` click event
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_

  - [ ]* 6.4 Write property test for Pomodoro duration range enforcement (Property 11)
    - **Property 11: Pomodoro duration range enforcement**
    - Generate numbers outside 1–120 (e.g., 0, negatives, 121, large integers, floats); assert `saveDuration()` leaves the stored `"pomodoroDuration"` key unchanged and does not modify `timerState`
    - Tag: `// Feature: life-todo-dashboard, Property 11: Pomodoro duration range enforcement`
    - **Validates: Requirements 4.1, 4.6**

- [x] 7. Checkpoint — Core widgets complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement To-Do List — Task Creation and Display
  - [x] 8.1 Implement `loadTasks()` and `renderTasks()`
    - `loadTasks()` reads `"tasks"` via `storageGet` (default `[]`), assigns to `state.tasks`
    - `renderTasks()` rebuilds the `#task-list` `<ul>` from `state.tasks`; each `<li data-id="…">` contains: completion checkbox (`.task-checkbox`), text span (`.task-text`), edit button (`.task-edit-btn`), delete button (`.task-delete-btn`), and inline error span (`.task-edit-error`)
    - When `state.tasks` is empty, shows an empty-state message inside `#task-list`
    - Truncates displayed text at 200 characters with ellipsis
    - _Requirements: 6.1, 6.2, 6.3, 7.4_

  - [x] 8.2 Implement `addTask(description)`
    - Trim `description`; if empty or whitespace-only, show `#task-input-error` and return
    - If trimmed length > 200, show `#task-input-error` with character-limit message and return
    - Dismiss `#task-input-error` on next `input` event on `#task-input`
    - Enforce 100-task maximum: if `state.tasks.length >= 100`, do not add and show appropriate message
    - Create task object: `{ id: crypto.randomUUID(), description: trimmed, completed: false, createdAt: Date.now() }`
    - Push to `state.tasks`; call `storageSet("tasks", state.tasks)`; if `storageSet` returns `false`, display save-failure message while keeping task in the session list
    - Clear `#task-input` and call `renderTasks()`
    - Attach `addTask` to `#task-add-btn` click and `keydown` Enter on `#task-input`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 6.1_

  - [ ]* 8.3 Write property test for adding a task (Property 4)
    - **Property 4: Adding a task grows the task list by one**
    - Generate task lists of length 0–99 and valid descriptions (1–200 trimmed chars); assert `addTask()` increases `state.tasks.length` by 1, the last element has `completed = false`, and its `description` equals the trimmed input
    - Tag: `// Feature: life-todo-dashboard, Property 4: Adding a task grows the task list by one`
    - **Validates: Requirements 5.2, 5.3**

  - [ ]* 8.4 Write property test for whitespace-only description rejection (Property 5)
    - **Property 5: Whitespace-only and empty descriptions are rejected**
    - Generate strings composed entirely of whitespace characters (including empty string); assert `addTask()` leaves `state.tasks` unchanged and does not call `storageSet`
    - Tag: `// Feature: life-todo-dashboard, Property 5: Whitespace-only and empty descriptions are rejected`
    - **Validates: Requirements 5.7**

  - [ ]* 8.5 Write property test for task persistence round-trip (Property 6)
    - **Property 6: Task persistence round-trip**
    - Generate arrays of valid Task objects; assert that `JSON.parse(JSON.stringify(tasks))` produces a structurally equal array (same ids, descriptions, completion states, and order)
    - Tag: `// Feature: life-todo-dashboard, Property 6: Task persistence round-trip`
    - **Validates: Requirements 5.5, 10.1, 10.3**

- [x] 9. Implement To-Do List — Editing, Completion, and Deletion
  - [x] 9.1 Implement `toggleTask(id)`, `deleteTask(id)`
    - `toggleTask(id)` finds task by id, flips `completed`, persists with `storageSet("tasks", state.tasks)`, calls `renderTasks()`
    - `deleteTask(id)` filters task out of `state.tasks`, persists, calls `renderTasks()`
    - Wire up via delegated event listeners on `#task-list` for `.task-checkbox` change and `.task-delete-btn` click, reading `data-id` from the parent `<li>`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 9.2 Implement `enterEditMode(id)`, `confirmEdit(id, value)`, `cancelEdit(id)`
    - `enterEditMode(id)` sets `state.editingTaskId = id`; replaces the task's `.task-text` span with an `<input class="task-edit-input">` pre-filled with the current description; only one task can be in edit mode at a time (exit any existing edit mode first)
    - `confirmEdit(id, value)` trims value; if empty/whitespace, shows `.task-edit-error` for ≥ 3 seconds and does not mutate state; otherwise updates `description`, clears `state.editingTaskId`, persists, calls `renderTasks()`
    - `cancelEdit(id)` clears `state.editingTaskId` and calls `renderTasks()` to restore the original view
    - Wire `enterEditMode` to `.task-edit-btn` click, `confirmEdit` to Enter keydown and a save button click on `.task-edit-input`, `cancelEdit` to Escape keydown and a cancel button on the edit row
    - _Requirements: 6.4, 6.5, 6.6, 6.7_

  - [ ]* 9.3 Write property test for task completion toggle (Property 7)
    - **Property 7: Task completion toggle is an involution**
    - Generate tasks with arbitrary `completed` boolean values; assert that calling `toggleTask` twice returns the task to its original `completed` state
    - Tag: `// Feature: life-todo-dashboard, Property 7: Task completion toggle is an involution`
    - **Validates: Requirements 7.1, 7.2**

- [x] 10. Implement Quick Links
  - [x] 10.1 Implement `loadLinks()` and `renderLinks()`
    - `loadLinks()` reads `"quickLinks"` via `storageGet` (default `[]`), assigns to `state.links`
    - `renderLinks()` rebuilds `#links-list`; each entry has a `.link-btn` (label truncated at 30 chars with ellipsis, `target="_blank"` behaviour on click) and a `.link-delete-btn`
    - _Requirements: 8.5, 8.6_

  - [x] 10.2 Implement `addLink(label, url)` and `deleteLink(id)`
    - `addLink` validates: label non-empty and ≤ 50 chars; URL starts with `http://` or `https://` and ≤ 2048 chars; shows `#link-label-error` or `#link-url-error` per failing field; on valid input creates `{ id: crypto.randomUUID(), label, url }`, persists `storageSet("quickLinks", state.links)`, calls `renderLinks()`, clears inputs
    - `deleteLink(id)` filters link out of `state.links`, persists, calls `renderLinks()`
    - Attach `addLink` to `#link-add-btn` click; wire `deleteLink` via delegated listener on `#links-list`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7_

  - [ ]* 10.3 Write property test for quick link validation (Property 8)
    - **Property 8: Quick link validation rejects invalid inputs**
    - Generate invalid label–URL pairs (empty label, label > 50 chars, URL without `http://`/`https://` prefix, URL > 2048 chars); assert `addLink()` leaves `state.links` unchanged and does not call `storageSet`
    - Tag: `// Feature: life-todo-dashboard, Property 8: Quick link validation rejects invalid inputs`
    - **Validates: Requirements 8.2, 8.3**

  - [ ]* 10.4 Write property test for quick link persistence round-trip (Property 9)
    - **Property 9: Quick link persistence round-trip**
    - Generate arrays of valid Link objects; assert `JSON.parse(JSON.stringify(links))` produces a structurally equal array (same ids, labels, URLs, and order)
    - Tag: `// Feature: life-todo-dashboard, Property 9: Quick link persistence round-trip`
    - **Validates: Requirements 8.4, 10.2, 10.3*

- [x] 11. Wire application initialisation
  - [x] 11.1 Create `init()` function and call it inside the IIFE
    - Theme pre-render (already done at top of IIFE before `init`)
    - `loadTheme()`, `loadUserName()`, `loadPomodoroDuration()`, `loadTasks()`, `loadLinks()`
    - `startClockTick()`
    - `renderTimer()`, `renderTasks()`, `renderLinks()`
    - All event listener attachments (collect any not yet wired in earlier tasks)
    - _Requirements: 2.3, 4.3, 6.2, 9.5, 10.3_

- [x] 12. Implement CSS styling
  - [ ] 12.1 Define CSS custom properties for light and dark themes
    - Scope colour tokens under `[data-theme="light"]` and `[data-theme="dark"]` selectors on `:root` / `html`
    - Include tokens for: background, surface, text-primary, text-secondary, accent, border, error
    - _Requirements: 9.2, 9.3_

  - [x] 12.2 Style layout and widgets
    - Responsive single-column or grid layout for the five widget sections
    - Style each widget card with padding, border-radius, and surface background
    - Apply strikethrough (`.task-text.completed` or via the `completed` data attribute) to completed tasks per Requirements 7.1
    - Style disabled button states for timer Start/Stop buttons
    - Style validation error paragraphs (colour, font-size) and `aria-live` regions
    - Style `#timer-notification` hidden/visible states
    - Ensure legibility and usable contrast in both light and dark themes
    - _Requirements: 7.1, 3.7, 3.8, 9.2, 9.3_

- [ ] 13. Checkpoint — Full application wired and styled
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests use **fast-check** with a minimum of 100 iterations per property
- All property test files should be co-located or in a `tests/` directory alongside `js/app.js`
- Checkpoints ensure incremental validation before moving to the next phase
- The theme pre-render line must be the very first statement in `app.js` to prevent any flash of wrong theme

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 1, "tasks": ["2.4", "3.1"] },
    { "id": 2, "tasks": ["3.2", "4.1", "5.1", "6.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "5.2", "6.2", "6.3", "8.1", "10.1"] },
    { "id": 4, "tasks": ["6.4", "8.2", "9.1", "10.2"] },
    { "id": 5, "tasks": ["8.3", "8.4", "8.5", "9.2", "10.3", "10.4"] },
    { "id": 6, "tasks": ["9.3", "11.1"] },
    { "id": 7, "tasks": ["12.1"] },
    { "id": 8, "tasks": ["12.2"] }
  ]
}
```
