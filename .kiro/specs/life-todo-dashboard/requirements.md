# Requirements Document

## Introduction

The Life To-Do List Dashboard is a client-side web application built with HTML, CSS, and Vanilla JavaScript. It provides a single-page dashboard that combines a personalized greeting with the current date and time, a configurable Pomodoro focus timer, a persistent to-do list, and a quick-links panel. All user data is stored in the browser's Local Storage — no backend server or build tools are required. The dashboard also supports light/dark mode and a customizable display name to personalize the experience.

## Glossary

- **Dashboard**: The single-page web application that hosts all widgets described in this document.
- **Greeting_Widget**: The UI section that displays the user's name, current time, current date, and a time-of-day greeting message.
- **Focus_Timer**: The Pomodoro-style countdown timer widget with configurable duration.
- **Todo_List**: The task management widget that allows creating, editing, completing, and deleting tasks.
- **Quick_Links**: The widget that displays user-defined shortcut buttons that open external URLs.
- **Local_Storage**: The browser-native Web Storage API used to persist all user data client-side.
- **Theme**: The visual color scheme of the Dashboard; either "light" or "dark".
- **User_Name**: The display name configured by the user and shown in the Greeting_Widget.
- **Task**: A single to-do item containing a text description and a completion state.
- **Link**: A Quick_Links entry containing a label and a URL.
- **Pomodoro_Duration**: The number of minutes configured for a single Focus_Timer session.

---

## Requirements

### Requirement 1: Greeting Widget

**User Story:** As a user, I want to see a personalized greeting with the current time and date, so that I can quickly orient myself when opening the dashboard.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in 24-hour HH:MM format using the browser's local timezone, updated every 60 seconds.
2. THE Greeting_Widget SHALL display the current date in the format "Weekday, DD Month YYYY" (e.g., "Monday, 12 October 2026").
3. IF the current local time is between 05:00 and 11:59, THEN THE Greeting_Widget SHALL display the message "Good Morning".
4. IF the current local time is between 12:00 and 17:59, THEN THE Greeting_Widget SHALL display the message "Good Afternoon".
5. IF the current local time is between 18:00 and 21:59, THEN THE Greeting_Widget SHALL display the message "Good Evening".
6. IF the current local time is between 22:00 and 04:59, THEN THE Greeting_Widget SHALL display the message "Good Night".
7. WHEN a User_Name of 1 to 50 characters has been saved, THE Greeting_Widget SHALL display the greeting in the format "[Greeting], [User_Name]!".
8. WHEN no User_Name has been saved, THE Greeting_Widget SHALL display the greeting without a name (e.g., "Good Morning!").

---

### Requirement 2: Custom Name Setting

**User Story:** As a user, I want to set a custom display name, so that the greeting feels personalized to me.

#### Acceptance Criteria

1. THE Dashboard SHALL provide an input field that allows the user to enter a User_Name of up to 50 characters.
2. WHEN the user saves a valid User_Name (1–50 characters), THE Dashboard SHALL persist the trimmed value to Local_Storage under the key `"userName"`.
3. WHEN the Dashboard loads and a `"userName"` key exists in Local_Storage, THE Dashboard SHALL pre-populate the name input field with the stored value within 100ms.
4. WHEN the user saves a User_Name and it is valid, THE Dashboard SHALL update the Greeting_Widget to display the new name within 100ms.
5. IF the user saves an empty User_Name, THEN THE Dashboard SHALL remove the `"userName"` key from Local_Storage and display the greeting without a name.
6. IF the user attempts to save a User_Name exceeding 50 characters, THEN THE Dashboard SHALL not persist the value and SHALL display a validation error message.
7. IF Local_Storage is unavailable when the Dashboard loads, THEN THE Dashboard SHALL display the greeting without a name and continue functioning without error.

---

### Requirement 3: Focus Timer

**User Story:** As a user, I want a countdown focus timer, so that I can work in focused sessions and track how much time remains.

#### Acceptance Criteria

1. THE Focus_Timer SHALL display the remaining time in MM:SS format, showing the configured Pomodoro_Duration as the initial value before the countdown has started.
2. WHEN the user clicks the Start button and the timer is in a stopped or reset state, THE Focus_Timer SHALL begin counting down from the configured Pomodoro_Duration.
3. WHEN the user clicks the Start button and the timer is in a paused state, THE Focus_Timer SHALL resume counting down from the current remaining time.
4. WHEN the user clicks the Stop button while the Focus_Timer is running, THE Focus_Timer SHALL pause the countdown at the current remaining time.
5. WHEN the user clicks the Reset button, THE Focus_Timer SHALL stop the countdown and reset the display to the configured Pomodoro_Duration.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and display a completion notification that remains visible until the user clicks the Reset button or starts a new session.
7. WHILE the Focus_Timer is running, THE Focus_Timer SHALL disable the Start button and enable the Stop button.
8. WHILE the Focus_Timer is stopped or paused, THE Focus_Timer SHALL enable the Start button and disable the Stop button.

---

### Requirement 4: Configurable Pomodoro Duration

**User Story:** As a user, I want to change the Pomodoro timer duration, so that I can adapt focus sessions to my preferred working style.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a numeric input that accepts a Pomodoro_Duration between 1 and 120 minutes (inclusive).
2. WHEN the user submits via a save action a Pomodoro_Duration that is valid (1–120 minutes), THE Dashboard SHALL persist the value to Local_Storage under the key `"pomodoroDuration"`.
3. WHEN the Dashboard loads, THE Dashboard SHALL read the `"pomodoroDuration"` key from Local_Storage and apply it as the initial Focus_Timer countdown value.
4. IF no Pomodoro_Duration has been saved, THEN THE Focus_Timer SHALL default to 25 minutes.
5. WHILE the Focus_Timer is running, WHEN the user saves a new Pomodoro_Duration, THE Focus_Timer SHALL immediately stop, discard the current session's elapsed time, and reset the countdown to the new duration.
6. IF the user enters a Pomodoro_Duration outside the range of 1 to 120, THEN THE Dashboard SHALL display a validation error message indicating the valid range (1–120 minutes) and not save the value; THE Dashboard SHALL dismiss the error message when the user modifies the input.

---

### Requirement 5: To-Do List — Task Creation

**User Story:** As a user, I want to add tasks to a list, so that I can track what I need to accomplish.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a text input field and an "Add Task" button for creating new tasks.
2. WHEN the user enters a task description and clicks "Add Task", THE Todo_List SHALL create a new Task with the entered text trimmed of leading and trailing whitespace and a default completion state of false.
3. WHEN the user presses the Enter key while the task input field is focused, THE Todo_List SHALL create a new Task with the entered text trimmed of leading and trailing whitespace.
4. WHEN a Task is created, THE Todo_List SHALL clear the task input field.
5. WHEN a Task is created, THE Todo_List SHALL persist all tasks to Local_Storage under the key `"tasks"`.
6. IF Local_Storage is unavailable or the write operation fails, THEN THE Todo_List SHALL display an error message indicating that the task could not be saved and SHALL retain the newly created Task in the current session's displayed list.
7. IF the user attempts to add a Task with an empty or whitespace-only description, THEN THE Todo_List SHALL not create the Task and SHALL display a validation message indicating that a description is required.
8. WHEN the user modifies the task input field after a validation message is displayed, THE Todo_List SHALL remove the validation message.
9. THE Todo_List SHALL accept task descriptions of 1 to 200 characters after trimming; IF the trimmed description exceeds 200 characters, THEN THE Todo_List SHALL not create the Task and SHALL display a validation message indicating the character limit.

---

### Requirement 6: To-Do List — Task Display and Editing

**User Story:** As a user, I want to view and edit my tasks, so that I can keep the list accurate and up to date.

#### Acceptance Criteria

1. THE Todo_List SHALL display all saved tasks in the order they were created, up to a maximum of 100 tasks.
2. WHEN the Dashboard loads, THE Todo_List SHALL read all tasks from Local_Storage and render them in the task list within 1 second.
3. THE Todo_List SHALL display each Task with its description text (truncated with ellipsis at 200 characters if needed), a completion checkbox, an edit button, and a delete button.
4. WHEN the user clicks the edit button on a Task, THE Todo_List SHALL replace the task description with an editable text input pre-filled with the current description; only one Task may be in edit mode at a time.
5. WHEN the user confirms an edit by pressing Enter or clicking a save button, THE Todo_List SHALL update the Task description with the trimmed input value and persist the updated tasks to Local_Storage.
6. IF the user confirms an edit with an empty or whitespace-only description, THEN THE Todo_List SHALL not save the change and SHALL display a validation message adjacent to the input for a minimum of 3 seconds.
7. WHEN the user cancels an edit by pressing Escape or clicking a cancel button, THE Todo_List SHALL discard the changes and restore the original task description display.

---

### Requirement 7: To-Do List — Task Completion and Deletion

**User Story:** As a user, I want to mark tasks as done and delete tasks I no longer need, so that I can manage my list efficiently.

#### Acceptance Criteria

1. WHEN the user checks the completion checkbox on a Task, THE Todo_List SHALL set that Task's completion state to true, apply a strikethrough style to the task text, and persist the updated tasks to Local_Storage.
2. WHEN the user unchecks the completion checkbox on a Task, THE Todo_List SHALL set that Task's completion state to false, remove the strikethrough style, and persist the updated tasks to Local_Storage.
3. WHEN the user clicks the delete button on a Task, THE Todo_List SHALL remove that Task from the list and persist the updated tasks to Local_Storage.
4. WHEN the last Task is deleted, THE Todo_List SHALL display an empty-state message indicating that no tasks exist.

---

### Requirement 8: Quick Links

**User Story:** As a user, I want to save and access quick links to my favorite websites, so that I can open them with a single click from the dashboard.

#### Acceptance Criteria

1. THE Quick_Links widget SHALL provide a form with a label input (max 50 characters) and a URL input (max 2048 characters) for adding a new Link.
2. WHEN the user submits a new Link, THE Quick_Links widget SHALL validate that: the label is non-empty, the label does not exceed 50 characters, and the URL begins with `http://` or `https://` and does not exceed 2048 characters.
3. IF any validation check in criterion 2 fails, THEN THE Quick_Links widget SHALL display a specific validation error for each failing field and not save the Link.
4. WHEN a valid Link is saved, THE Quick_Links widget SHALL persist all links to Local_Storage under the key `"quickLinks"`.
5. WHEN the Dashboard loads, THE Quick_Links widget SHALL read all links from Local_Storage and render each Link as a button displaying its label (truncated to 30 characters with ellipsis if the label exceeds 30 characters).
6. WHEN the user clicks a Link button, THE Quick_Links widget SHALL open the associated URL in a new browser tab.
7. WHEN the user clicks the delete control on a Link, THE Quick_Links widget SHALL remove the Link and persist the updated links to Local_Storage.

---

### Requirement 9: Light / Dark Mode

**User Story:** As a user, I want to toggle between light and dark modes, so that I can use the dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a toggle control that switches between "light" and "dark" Theme values.
2. WHEN the user activates the dark Theme, THE Dashboard SHALL set `data-theme="dark"` on the root HTML element, causing all UI components to render with the dark color scheme.
3. WHEN the user activates the light Theme, THE Dashboard SHALL set `data-theme="light"` on the root HTML element, causing all UI components to render with the light color scheme.
4. WHEN the user toggles the Theme, THE Dashboard SHALL persist the selected Theme value to Local_Storage under the key `"theme"`.
5. WHEN the Dashboard loads, THE Dashboard SHALL read the `"theme"` key from Local_Storage and apply the stored Theme to the root HTML element before any content is rendered.
6. IF no Theme has been saved, THEN THE Dashboard SHALL default to the "light" Theme.

---

### Requirement 10: Data Persistence Integrity

**User Story:** As a user, I want my data to survive page reloads, so that I do not lose my tasks, links, or settings when I revisit the dashboard.

#### Acceptance Criteria

1. WHEN a Task is created, updated, or deleted, THE Dashboard SHALL serialize all Task data as a JSON array and write it to Local_Storage under the key `"tasks"`.
2. WHEN a Link is created or deleted, THE Dashboard SHALL serialize all Link data as a JSON array and write it to Local_Storage under the key `"quickLinks"`.
3. WHEN the Dashboard loads, THE Dashboard SHALL deserialize Task and Link data from Local_Storage and restore the UI to its last saved state.
4. IF Local_Storage data for any key is malformed or unparseable JSON, THEN THE Dashboard SHALL discard the corrupted value, initialize that data set to an empty default, and continue loading without throwing any error to the browser console and without displaying an error to the user.

---

### Requirement 11: Technical Constraints

**User Story:** As a developer, I want the project to follow a clean file structure and use only standard web technologies, so that the codebase is easy to maintain and deploy without any build tools.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using only HTML, CSS, and Vanilla JavaScript; no external frameworks, libraries, or CDN-loaded scripts are permitted.
2. THE Dashboard SHALL contain exactly one CSS file located at `css/style.css`.
3. THE Dashboard SHALL contain exactly one JavaScript file located at `js/app.js`.
4. THE Dashboard SHALL function correctly in the latest stable versions of Chrome, Firefox, Edge, and Safari without polyfills.
5. THE Dashboard SHALL be openable as a standalone file via `file://` protocol without requiring a local server.
