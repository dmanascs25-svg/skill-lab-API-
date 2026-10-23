# Student Management System - Task 6

A small student record app with a **login page**, **client + server validation**, a **table of records**,
**local storage** for accounts, and a **mock REST API** for the student data. A second page shows the
same table written with **Vue 3**, so the two framework styles can be compared.

---

## 1. How to run

```bash
node server.js
```

Then open the URL printed in the terminal, normally **http://localhost:3000**

`server.js` uses only Node's built-in `http` module, so there is **nothing to install**.
If port 3000 is already busy, it automatically tries 3001, 3002 ... and prints the port it used.

First time use:

1. Click **Register**, create an account (for example `admin` / `admin123`).
2. Log in with the same username and password.
3. The dashboard loads the records from the API.

You can also run `npm start`, which is the same command.

---

## 2. Where each requirement lives

| Requirement | Where it is |
| --- | --- |
| API call (mock API) | `server.js` exposes `/api/students`; `script.js` calls it with `fetch` inside `apiRequest()` |
| Specific HTTP methods | `GET`, `POST`, `PUT`, `DELETE` - see the table in section 4 |
| Login page | `index.html` -> `#loginSection`, handled in `script.js` section 6 |
| Form validation of login | `script.js` section 6 (empty fields, password length, wrong credentials) |
| Registration validation | `script.js` section 5 (username length, email pattern, password match, duplicates) |
| Table displayed | `index.html` -> `<table>`; rows built in `displayStudents()` (section 11) |
| Local storage | Accounts (`users`) and the session (`loggedInUser`) - section 2 |
| Buttons with events | Login, Register, Create Account, Login link, Add/Update Student, Cancel Edit, Edit, Delete, Refresh, Logout - section 6 |
| Different framework experiment | `framework-demo.html` - Vue 3 from a CDN, same API |
| Search and filter | `displayStudents()` filters the fetched array by text and branch |

Files:

```
server.js            mock API + serves the pages (no npm packages)
db.json              the "database" the API reads and writes
index.html           login, register and dashboard pages
script.js            all frontend logic
style.css            styling
framework-demo.html  the same table built with Vue 3
package.json         only so `npm start` works
```

---

## 3. How the app flows

1. The page opens and reads `localStorage.getItem("loggedInUser")`.
   If a session exists, the dashboard opens straight away; otherwise the login page shows.
2. Logging in checks the typed username and password against the `users` array from local storage.
3. On success the username is saved in local storage and the dashboard is shown.
4. The dashboard calls `GET /api/students` and draws one table row per record.
5. Adding, editing or deleting a row sends a request to the API, then re-runs the `GET`
   so the table always shows what the server actually stored.

---

## 4. The API and its methods

| Method | URL | Purpose | Success | Errors |
| --- | --- | --- | --- | --- |
| `GET` | `/api/students` | read every student | 200 | - |
| `GET` | `/api/students/:id` | read one student | 200 | 404 not found |
| `POST` | `/api/students` | create a student | 201 | 400 bad data, 409 duplicate USN |
| `PUT` | `/api/students/:id` | update a student | 200 | 404, 400, 409 |
| `DELETE` | `/api/students/:id` | delete a student | 200 | 404 not found |

Try them by hand (the port may differ):

```bash
curl http://localhost:3000/api/students

curl -X POST http://localhost:3000/api/students \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test\",\"usn\":\"1RV25CS999\",\"branch\":\"CSE\",\"marks\":70}"

curl -X PUT http://localhost:3000/api/students/5 \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Updated\",\"usn\":\"1RV25CS999\",\"branch\":\"ISE\",\"marks\":95}"

curl -X DELETE http://localhost:3000/api/students/5
```

The API validates on its own side too (`validateStudent()`): name, USN and branch are required,
and marks must be between 0 and 100. A browser check alone could be skipped with DevTools, so the
server checks again - that is the rule "never trust the client".

### Three layers of validation

1. **HTML5 attributes** (`required`, `minlength`, `type="email"`, `min`/`max` on marks) - the browser
   stops an empty or badly formed submit and shows its own tooltip. Nothing is sent to the server.
2. **JavaScript checks** in `script.js` - catch what HTML5 cannot: a password shorter than 6 characters
   on the login form, a password that does not match the confirmation, an unknown username/password,
   a duplicate USN, a duplicate username or email. These write a message in red into the page.
3. **Server checks** in `validateStudent()` - the final gate, returning `400` or `409`.

To show all three in a demo: press **Login** with both fields empty (browser tooltip), then type a
wrong password (the red message from `script.js`), then send a bad request with `curl` (the JSON error
from `server.js`).

---

## 5. What is stored where, and why

| Data | Storage | Reason |
| --- | --- | --- |
| Student records | `db.json` through the API | shared data that a server should own |
| Accounts | `localStorage["users"]` | this demo has no auth backend, so accounts stay in the browser |
| Logged in user | `localStorage["loggedInUser"]` | keeps you logged in after a refresh |

Local storage only holds strings, so arrays are saved with `JSON.stringify()` and read back with
`JSON.parse()`.

Note: passwords are stored in plain text because this is a learning demo. A real app would send
them to a server and store only a hash.

---

## 6. Every button and its event

| Button | Event | What happens | HTTP method |
| --- | --- | --- | --- |
| `Login` | `submit` on `#loginForm` | validates, checks the account, saves the session | - |
| `Register` (link) | `click` | hides login, shows the register page | - |
| `Create Account` | `submit` on `#registerForm` | validates, saves the account in local storage | - |
| `Login` (link) | `click` | hides register, shows the login page | - |
| `Add Student` | `submit` on `#studentForm` | validates, creates the record, reloads the table | `POST` |
| `Update Student` | same form, in edit mode | replaces the edited record, reloads the table | `PUT` |
| `Cancel Edit` | `click` | leaves edit mode and clears the form | - |
| `Edit` (per row) | `click` | copies that row into the form and switches to update mode | - |
| `Delete` (per row) | `click` | asks for confirmation, removes the record, reloads the table | `DELETE` |
| `Refresh` | `click` | re-reads the records from the API | `GET` |
| `Logout` | `click` | clears `loggedInUser` and returns to the login page | - |

Search and branch filter are not buttons: they use the `input` and `change` events.

---

## 7. The two framework versions

**Vanilla version (`index.html` + `script.js`)** - you write the flow yourself:

```js
const row = document.createElement("tr");
row.appendChild(createCell(student.usn));
...
studentTableBody.appendChild(row);
```

**Vue version (`framework-demo.html`)** - you describe the result and Vue keeps it in sync:

```html
<tr v-for="student in filteredStudents" :key="student.id">
    <td>{{ student.usn }}</td>
    ...
</tr>
```

Differences worth saying out loud:

- Vanilla: every change means building DOM nodes again by hand (`innerHTML = ""` then recreate rows).
- Vue: `students` is state and `filteredStudents` is a `computed` property. When the state changes,
  Vue re-renders the rows itself.
- Vanilla listens with `addEventListener`; Vue binds with `@click="deleteStudent(student.id)"`.
- Both call exactly the same API, so the data layer does not change with the framework.

The Vue version needs an internet connection the first time because Vue is loaded from unpkg.
The vanilla version has no dependencies at all - that is the trade-off being demonstrated.

---

## 8. Quick answers for a viva

**What is the difference between PUT and POST?** `POST /api/students` creates a new record and does
not need an id. `PUT /api/students/:id` replaces an existing record, so the id must be in the URL.

**Why re-run `GET` after `POST` or `DELETE`?** So the screen shows the server's data, not a copy the
browser guessed. That keeps the two in sync.

**How is the login validated?** The HTML `required`/`minlength` attributes catch empty or short values
first, then `script.js` checks for empty fields, password length and a matching account, and every
failure writes a message into `#loginMessage`.

**Where does the user stay logged in?** In `localStorage["loggedInUser"]`. `script.js` reads it on load
and opens the dashboard directly; `Logout` removes it.

**How is duplicate data prevented?** The browser checks the loaded array (`USN already exists`) and the
API checks again before saving, returning `409 Conflict`.

**Why is marks validated twice?** Marks must be 0-100 for the data to make sense. The browser check is
for quick feedback, the server check is the one that actually protects the data.
