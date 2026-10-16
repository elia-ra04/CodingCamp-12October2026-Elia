# Design Document

## Overview

The Life To-Do List Dashboard is a fully client-side single-page application (SPA) delivered as a single `index.html` file that references one CSS file (`css/style.css`) and one JavaScript file (`js/app.js`). It requires no build step, no package manager, and no server — it opens directly via the `file://` protocol in any modern browser.

The application is composed of five functional widgets rendered inside a single page:

| Widget | Purpose |
|---|---|
| Greeting Widget | Displays time, date, and a personalised greeting |
| Custom Name Setting | Lets the user configure their display name |
| Focus Timer | Pomodoro-style countdown with Start / Stop / Reset |
| To-Do List | Full CRUD task management |
| Quick Links | Saved shortcut buttons that open URLs in a new tab |

All user data is persisted exclusively in the browser's **Local Storage** using five well-known keys: `"tasks"`, `"quickLinks"`, `"userName"`, `"pomodoroDuration"`, and `"theme"`. No network requests are made at any point.

---

## Architecture

### High-Level Structure

```
index.html          ← markup skeleton + link to CSS and JS
css/
  style.css         ← all visual styling, including CSS custom properties for theming
js/
  app.js            ← all application logic (single file, module pattern)
```

Because the project is constrained to a single JS file and no module bundler, `app.js` uses an **IIFE module pattern** to avoid polluting the global namespace:

```js
(function () {
  'use strict';
  // … entire application …
})();
```

### Architectural Layers (within `app.js`)

The code is organised into three logical layers, separated by clearly commented sections:

1. **Storage Layer** — thin wrappers over `localStorage` that handle serialisation, deserialisation, and error recovery.
2. **State Layer** — plain JavaScript objects that hold the current in-memory application state.
3. **UI Layer** — functions that read from the state layer and write to the DOM; event handlers that update state and call back into the UI layer.

This one-way data flow is illustrated below:

```
User action
    │
    ▼
Event Handler (UI Layer)
    │  mutates
    ▼
State Object (State Layer)
    │  serialises to
    ▼
localStorage (Storage Layer)
    │  render() called
    ▼
DOM updated (UI Layer)
```

There is no virtual DOM or reactive framework — renders are triggered explicitly after each state mutation.

### Theme Application

To prevent a flash of the wrong theme, the very first line executed in `app.js` reads the `"theme"` key from Local Storage and sets `document.documentElement.setAttribute('data-theme', value)` before any other logic runs. All colour tokens are defined as CSS custom properties scoped to `[data-theme="light"]` and `[data-theme="dark"]` selectors on the root element.

### Timer Implementation

The Focus Timer uses `setInterval` internally. A single `timerState` object tracks:
- `intervalId` — the return value of `setInterval` (or `null` when stopped)
- `remainingSeconds` — current countdown value
- `totalSeconds` — the configured duration at the time the session started

This avoids drift caused by relying on a fixed tick count and allows the timer to be paused and resumed cleanly.

---

## Components and Interfaces

Each component is described as a set of DOM responsibilities and the functions in `app.js` that manage it.

### 1. Greeting Widget

**DOM elements** (rendered in `index.html`, updated by JS):
- `#time-display` — current time in HH:MM
- `#date-display` — current date in "Weekday, DD Month YYYY"
- `#greeting-message` — time-of-day greeting plus optional user name

**Functions:**
| Function | Responsibility |
|---|---|
| `updateClock()` | Reads `new Date()`, formats time and date strings, derives the greeting phrase from the hour, updates all three DOM elements |
| `startClockTick()` | Calls `updateClock()` once immediately, then schedules it every 60 000 ms via `setInterval` |

**Greeting derivation logic:**

| Hour range (local) | Message |
|---|---|
| 05:00 – 11:59 | Good Morning |
| 12:00 – 17:59 | Good Afternoon |
| 18:00 – 21:59 | Good Evening |
| 22:00 – 04:59 | Good Night |

---

### 2. Custom Name Setting

**DOM elements:**
- `#name-input` — text input, `maxlength="50"`
- `#name-save-btn` — save button
- `#name-error` — validation error paragraph (hidden by default)

**Functions:**
| Function | Responsibility |
|---|---|
| `loadUserName()` | Reads `"userName"` from storage, pre-populates `#name-input` |
| `saveUserName()` | Validates length; writes to storage; calls `updateClock()` to refresh greeting; shows/hides `#name-error` |

---

### 3. Focus Timer

**DOM elements:**
- `#timer-display` — MM:SS readout
- `#timer-start-btn` — Start / Resume
- `#timer-stop-btn` — Stop / Pause
- `#timer-reset-btn` — Reset
- `#timer-notification` — completion banner (hidden until countdown reaches 0)

**Functions:**
| Function | Responsibility |
|---|---|
| `loadPomodoroDuration()` | Reads `"pomodoroDuration"` from storage (defaulting to 25), converts to seconds, sets initial `timerState.remainingSeconds` |
| `renderTimer()` | Formats `timerState.remainingSeconds` as MM:SS, writes to `#timer-display`, updates button disabled states |
| `startTimer()` | Creates the `setInterval`, updates `timerState.intervalId` |
| `stopTimer()` | Clears the interval, nulls `timerState.intervalId` |
| `resetTimer()` | Stops timer, resets `remainingSeconds` to configured duration, hides notification, calls `renderTimer()` |
| `onTimerTick()` | Called each second: decrements `remainingSeconds`; if 0, stops timer and shows notification |

**Button state rules:**
| Timer state | Start btn | Stop btn |
|---|---|---|
| Stopped / reset | enabled | disabled |
| Running | disabled | enabled |
| Paused | enabled | disabled |

---

### 4. Configurable Pomodoro Duration

**DOM elements:**
- `#duration-input` — numeric input, `min="1"` `max="120"`
- `#duration-save-btn` — save button
- `#duration-error` — validation error paragraph

**Functions:**
| Function | Responsibility |
|---|---|
| `saveDuration()` | Validates range 1–120; writes to `"pomodoroDuration"` in storage; if timer is running, calls `stopTimer()` then `resetTimer()` with new value; hides error on valid input, shows error otherwise |

---

### 5. To-Do List

**DOM elements:**
- `#task-input` — text input for new task description
- `#task-add-btn` — Add Task button
- `#task-input-error` — validation message
- `#task-list` — `<ul>` that contains task items

Each task item (`<li data-id="…">`) contains:
- `<span class="task-text">` or `<input class="task-edit-input">` (mutually exclusive)
- `<input type="checkbox" class="task-checkbox">`
- `<button class="task-edit-btn">`
- `<button class="task-delete-btn">`
- `<span class="task-edit-error">` (shown only during edit validation failure)

**Functions:**
| Function | Responsibility |
|---|---|
| `loadTasks()` | Reads `"tasks"` from storage, populates `state.tasks` |
| `renderTasks()` | Rebuilds `#task-list` DOM from `state.tasks`; shows empty-state message when list is empty |
| `addTask(description)` | Validates, creates task object, pushes to `state.tasks`, persists, calls `renderTasks()` |
| `toggleTask(id)` | Flips `completed` flag on task, persists, calls `renderTasks()` |
| `deleteTask(id)` | Removes task from `state.tasks`, persists, calls `renderTasks()` |
| `enterEditMode(id)` | Replaces text span with input pre-filled with current description; sets `state.editingTaskId` |
| `confirmEdit(id, value)` | Validates; updates description; exits edit mode; persists; calls `renderTasks()` |
| `cancelEdit(id)` | Restores task text span; clears `state.editingTaskId`; calls `renderTasks()` |

---

### 6. Quick Links

**DOM elements:**
- `#link-label-input` — text input, `maxlength="50"`
- `#link-url-input` — text input, `maxlength="2048"`
- `#link-add-btn` — Save Link button
- `#link-label-error`, `#link-url-error` — per-field validation errors
- `#links-list` — container for link buttons

Each link entry contains:
- `<button class="link-btn">` — displays label (truncated at 30 chars with ellipsis), opens URL on click
- `<button class="link-delete-btn">` — removes the link

**Functions:**
| Function | Responsibility |
|---|---|
| `loadLinks()` | Reads `"quickLinks"` from storage, populates `state.links` |
| `renderLinks()` | Rebuilds `#links-list` DOM from `state.links` |
| `addLink(label, url)` | Validates both fields; creates link object; persists; calls `renderLinks()` |
| `deleteLink(id)` | Removes link from `state.links`; persists; calls `renderLinks()` |

---

### 7. Theme Toggle

**DOM elements:**
- `#theme-toggle` — checkbox or button that switches theme

**Functions:**
| Function | Responsibility |
|---|---|
| `applyTheme(theme)` | Sets `data-theme` attribute on `document.documentElement` |
| `loadTheme()` | Reads `"theme"` from storage (defaulting to `"light"`); calls `applyTheme()` |
| `toggleTheme()` | Reads current `data-theme`, flips it, calls `applyTheme()`, persists to storage |

---

## Data Models

All data is stored in Local Storage as serialised JSON strings. The in-memory representations are plain JavaScript objects.

### Task

```js
{
  id: string,          // crypto.randomUUID() or Date.now().toString()
  description: string, // trimmed, 1–200 characters
  completed: boolean,  // default: false
  createdAt: number    // Date.now() timestamp, used to preserve insertion order
}
```

Local Storage key: `"tasks"` — stored as a JSON array of Task objects.

**Constraints:**
- Maximum 100 tasks stored simultaneously.
- Description must be 1–200 characters after trimming.

---

### Link

```js
{
  id: string,   // crypto.randomUUID() or Date.now().toString()
  label: string, // 1–50 characters
  url: string    // must start with http:// or https://, max 2048 characters
}
```

Local Storage key: `"quickLinks"` — stored as a JSON array of Link objects.

---

### Settings (scalar values, individual keys)

| Key | Type | Default | Constraints |
|---|---|---|---|
| `"userName"` | string | `""` (absent = no name) | 1–50 chars when present |
| `"pomodoroDuration"` | number | `25` | Integer 1–120 |
| `"theme"` | string | `"light"` | `"light"` or `"dark"` |

---

### In-Memory State Object

```js
const state = {
  tasks: [],              // Task[]
  links: [],              // Link[]
  userName: '',           // string
  pomodoroDuration: 25,   // number (minutes)
  theme: 'light',         // 'light' | 'dark'
  editingTaskId: null,    // string | null — id of task currently in edit mode
};

const timerState = {
  intervalId: null,       // number | null — setInterval handle
  remainingSeconds: 1500, // number — current countdown
  totalSeconds: 1500,     // number — duration when session started
  isRunning: false,       // boolean
};
```

---

### Storage Layer Interface

```js
// Read a key; parse JSON; return fallback on any error
function storageGet(key, fallback) { … }

// Serialise value to JSON; write to localStorage; return success boolean
function storageSet(key, value) { … }

// Remove a key from localStorage
function storageRemove(key) { … }
```

All three functions wrap their localStorage calls in `try/catch` blocks to handle `SecurityError` (e.g., private browsing mode with storage blocked) and `QuotaExceededError`. On any error, `storageGet` returns `fallback`; `storageSet` returns `false` and, where relevant, the caller displays an error message to the user.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Greeting phrase covers every hour of the day

*For any* local hour value in the range 0–23, the greeting derivation function SHALL return exactly one of the four greeting strings ("Good Morning", "Good Afternoon", "Good Evening", "Good Night"), and the four hour ranges (05–11, 12–17, 18–21, 22–04 wrapping) SHALL partition the full 0–23 range with no gaps and no overlaps.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 2: User name persistence round-trip

*For any* string of 1–50 non-whitespace-trimmed characters, saving the user name and then reading it back from Local Storage SHALL produce a value equal to the trimmed input.

**Validates: Requirements 2.2, 2.3**

---

### Property 3: Timer display always reflects remaining seconds

*For any* countdown state where `remainingSeconds` is in range 0–7200 (0–120 min), the `renderTimer()` function SHALL produce a MM:SS string where the parsed total seconds equals `remainingSeconds`.

**Validates: Requirements 3.1**

---

### Property 4: Adding a task grows the task list by one

*For any* current task list (length 0–99) and any valid task description (1–200 trimmed characters), calling `addTask()` SHALL increase the length of `state.tasks` by exactly 1, and the new task SHALL appear as the last element with `completed = false` and the trimmed description.

**Validates: Requirements 5.2, 5.3**

---

### Property 5: Whitespace-only and empty descriptions are rejected

*For any* string composed entirely of whitespace characters (including the empty string), calling `addTask()` SHALL leave `state.tasks` unchanged and SHALL not write to Local Storage.

**Validates: Requirements 5.7**

---

### Property 6: Task persistence round-trip

*For any* array of valid Task objects, serialising the array to Local Storage and then deserialising it SHALL produce an array that is structurally equal to the original (same ids, descriptions, completion states, and order).

**Validates: Requirements 5.5, 10.1, 10.3**

---

### Property 7: Task completion toggle is an involution

*For any* task, toggling its completion state twice SHALL return the task to its original completion state (i.e., `toggle(toggle(task)).completed === task.completed`).

**Validates: Requirements 7.1, 7.2**

---

### Property 8: Quick link validation rejects invalid inputs

*For any* label–URL pair where the label is empty, exceeds 50 characters, or the URL does not start with `http://` or `https://` or exceeds 2048 characters, calling `addLink()` SHALL leave `state.links` unchanged and SHALL not write to Local Storage.

**Validates: Requirements 8.2, 8.3**

---

### Property 9: Quick link persistence round-trip

*For any* array of valid Link objects, serialising to Local Storage and deserialising SHALL produce a structurally equal array (same ids, labels, URLs, and order).

**Validates: Requirements 8.4, 10.2, 10.3**

---

### Property 10: Malformed Local Storage data is discarded gracefully

*For any* key in `{"tasks", "quickLinks", "userName", "pomodoroDuration", "theme"}`, if the stored string is not valid JSON or does not match the expected type, `storageGet()` SHALL return the specified fallback value and SHALL not throw any exception.

**Validates: Requirements 10.4**

---

### Property 11: Pomodoro duration range enforcement

*For any* numeric input outside the range 1–120 (inclusive), `saveDuration()` SHALL leave the stored `"pomodoroDuration"` key unchanged and SHALL not modify `timerState`.

**Validates: Requirements 4.1, 4.6**

---

## Error Handling

| Scenario | Detection | Response |
|---|---|---|
| Local Storage unavailable (`SecurityError`) | `try/catch` in `storageGet` / `storageSet` | Return fallback / `false`; caller shows per-feature error message where specified |
| Local Storage full (`QuotaExceededError`) | `try/catch` in `storageSet` | Return `false`; task/link stays in memory for the session; user sees save-failure message |
| Malformed JSON in any storage key | `try/catch` around `JSON.parse` in `storageGet` | Return fallback value; silently discard corrupted data; log nothing to console |
| Task description empty or whitespace-only | Validation in `addTask()` / `confirmEdit()` | Show `#task-input-error`; no state mutation |
| Task description exceeds 200 chars | Validation in `addTask()` | Show `#task-input-error`; no state mutation |
| Edit confirmed with empty description | Validation in `confirmEdit()` | Show inline `task-edit-error` for ≥ 3 seconds; no state mutation |
| User name exceeds 50 chars | Validation in `saveUserName()` | Show `#name-error`; no storage write |
| Pomodoro duration out of range | Validation in `saveDuration()` | Show `#duration-error`; dismiss on next input event; no storage write |
| Quick link label empty / too long | Validation in `addLink()` | Show `#link-label-error`; no storage write |
| Quick link URL invalid scheme / too long | Validation in `addLink()` | Show `#link-url-error`; no storage write |
| Timer reaches 0:00 | `onTimerTick()` check | Stop interval; show `#timer-notification`; disable Stop button; enable Start button |

All validation error elements are `aria-live="polite"` regions so screen readers announce them without requiring focus movement.

---

## Testing Strategy

### Unit Tests (example-based)

Unit tests should cover concrete scenarios that cannot be fully expressed as universal properties:

- Greeting widget formats the date string correctly for a known reference date.
- `startTimer()` when timer is paused resumes from the current `remainingSeconds` (not the full duration).
- Saving a new Pomodoro duration while the timer is running stops the timer and resets to the new duration.
- Deleting the last task renders the empty-state message.
- Editing a task and pressing Escape restores the original description.
- `storageGet` returns the fallback value when given a key containing malformed JSON.
- `storageGet` returns the fallback value when `localStorage` throws a `SecurityError`.
- Quick link with a label that is exactly 50 characters is accepted.
- Quick link with a label that is 51 characters is rejected.

### Property-Based Tests

Property-based testing (PBT) is appropriate for this feature because the core logic involves pure functions (greeting derivation, time formatting, input validation, serialisation) with large input spaces where edge cases are difficult to enumerate manually. The recommended library is **fast-check** (JavaScript).

Each property test must run a minimum of **100 iterations**.

Tag format for each test: `// Feature: life-todo-dashboard, Property {N}: {property_text}`

| Property | Test Description |
|---|---|
| Property 1 | Generate all 24 hour values; assert exactly one greeting phrase is returned for each |
| Property 2 | Generate arbitrary strings of 1–50 trimmed chars; assert storage round-trip equality |
| Property 3 | Generate `remainingSeconds` in 0–7200; assert `renderTimer()` output parses back to the same value |
| Property 4 | Generate task lists (0–99 items) and valid descriptions; assert list grows by 1 with correct final element |
| Property 5 | Generate whitespace-only strings; assert `addTask()` leaves state unchanged |
| Property 6 | Generate arrays of valid Task objects; assert JSON round-trip structural equality |
| Property 7 | Generate tasks with arbitrary completion states; assert double-toggle is identity |
| Property 8 | Generate invalid label/URL pairs; assert `addLink()` leaves state unchanged |
| Property 9 | Generate arrays of valid Link objects; assert JSON round-trip structural equality |
| Property 10 | Generate arbitrary non-JSON strings and valid keys; assert `storageGet()` returns fallback without throwing |
| Property 11 | Generate numbers outside 1–120; assert `saveDuration()` does not mutate stored duration or `timerState` |

### Integration / Smoke Tests

Because the application runs via `file://` with no server, integration tests are manual browser checks:

1. Open `index.html` in Chrome, Firefox, Edge, and Safari — verify all widgets render.
2. Set user name, reload page — verify greeting shows saved name.
3. Start Focus Timer, reload page mid-session — verify timer resets to saved duration (not mid-session state, as timer state is not persisted).
4. Add, complete, edit, and delete tasks across a reload — verify all mutations survive.
5. Add and delete Quick Links across a reload — verify all mutations survive.
6. Toggle theme, reload — verify theme is applied before content renders (no flash).
7. Corrupt a Local Storage key (e.g., set `tasks` to `"not json"`) — verify dashboard loads silently without error.
8. Open in private / incognito mode — verify dashboard functions without saving (graceful degradation).
