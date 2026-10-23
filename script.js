// ==========================================
// 1. SETTINGS AND HTML ELEMENTS
// ==========================================

// The mock API is served by server.js on the same address as this page,
// so a relative URL is enough. The long URL is only used as a fallback
// when index.html is opened straight from the file system (file://).
const API_BASE =
    location.protocol === "file:"
        ? "http://localhost:3000/api/students"
        : "/api/students";

// Pages
const loginSection = document.getElementById("loginSection");
const registerSection = document.getElementById("registerSection");
const dashboardSection = document.getElementById("dashboardSection");

// Login form
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");

// Register form
const registerForm = document.getElementById("registerForm");
const registerUsernameInput = document.getElementById("registerUsername");
const registerEmailInput = document.getElementById("registerEmail");
const registerPasswordInput = document.getElementById("registerPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const registerMessage = document.getElementById("registerMessage");

// Page switching buttons
const showRegisterButton = document.getElementById("showRegisterButton");
const showLoginButton = document.getElementById("showLoginButton");
const logoutButton = document.getElementById("logoutButton");

// Dashboard
const currentUserElement = document.getElementById("currentUser");
const refreshButton = document.getElementById("refreshButton");
const totalStudentsElement = document.getElementById("totalStudents");

// Student form
const studentForm = document.getElementById("studentForm");
const studentNameInput = document.getElementById("studentName");
const studentUSNInput = document.getElementById("studentUSN");
const studentBranchInput = document.getElementById("studentBranch");
const studentMarksInput = document.getElementById("studentMarks");
const studentMessage = document.getElementById("studentMessage");
const submitStudentButton = document.getElementById("submitStudentButton");
const cancelEditButton = document.getElementById("cancelEditButton");

// Table + search
const studentTableBody = document.getElementById("studentTableBody");
const searchInput = document.getElementById("searchInput");
const branchFilter = document.getElementById("branchFilter");
const emptyMessage = document.getElementById("emptyMessage");


// ==========================================
// 2. LOCAL STORAGE DATA
// ==========================================

// Accounts live in Local Storage. This is a college demo, so passwords are
// kept as plain text - a real app would hash them on a server.
let users = JSON.parse(localStorage.getItem("users")) || [];

// "students" always holds the last list we received from the API.
let students = [];

// null  -> the form is adding a new student
// value -> the form is updating the student with this id
let editingId = null;


// ==========================================
// 3. SHOWING AND HIDING THE THREE PAGES
// ==========================================

function showLoginPage() {

    loginSection.hidden = false;
    registerSection.hidden = true;
    dashboardSection.hidden = true;

    currentUserElement.textContent = "";

    loginMessage.textContent = "";
    registerMessage.textContent = "";
    studentMessage.textContent = "";

    exitEditMode();

}

function showRegisterPage() {

    loginSection.hidden = true;
    registerSection.hidden = false;
    dashboardSection.hidden = true;

    loginMessage.textContent = "";
    registerMessage.textContent = "";

}

function showDashboardPage(username) {

    loginSection.hidden = true;
    registerSection.hidden = true;
    dashboardSection.hidden = false;

    currentUserElement.textContent = "Logged in as " + username;

    exitEditMode();

    // Records come from the API, so ask for them now.
    loadStudents();

}


// ==========================================
// 4. PAGE SWITCH BUTTONS
// ==========================================

showRegisterButton.addEventListener("click", showRegisterPage);

showLoginButton.addEventListener("click", showLoginPage);

logoutButton.addEventListener("click", function () {

    // Forget the saved session so a refresh no longer logs us in.
    localStorage.removeItem("loggedInUser");

    loginForm.reset();

    showLoginPage();

});


// ==========================================
// 5. REGISTRATION WITH VALIDATION
// ==========================================

registerForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const username = registerUsernameInput.value.trim();
    const email = registerEmailInput.value.trim();
    const password = registerPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // --- validation rules ---

    if (username.length < 3) {
        showMessage(registerMessage, "Username must contain at least 3 characters.", "red");
        return;
    }

    // A very small email check: something@something.something
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMessage(registerMessage, "Please enter a valid email address.", "red");
        return;
    }

    if (password.length < 6) {
        showMessage(registerMessage, "Password must contain at least 6 characters.", "red");
        return;
    }

    if (password !== confirmPassword) {
        showMessage(registerMessage, "Passwords do not match.", "red");
        return;
    }

    const usernameExists = users.some(function (user) {
        return user.username.toLowerCase() === username.toLowerCase();
    });

    if (usernameExists) {
        showMessage(registerMessage, "Username already exists. Choose another one.", "red");
        return;
    }

    const emailExists = users.some(function (user) {
        return user.email.toLowerCase() === email.toLowerCase();
    });

    if (emailExists) {
        showMessage(registerMessage, "Email is already registered.", "red");
        return;
    }

    // --- save the new account in Local Storage ---

    users.push({ username: username, email: email, password: password });
    localStorage.setItem("users", JSON.stringify(users));

    registerForm.reset();

    showMessage(registerMessage, "Registration successful! You can now log in.", "green");

});


// ==========================================
// 6. LOGIN WITH VALIDATION
// ==========================================

loginForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // --- validation rules ---

    if (username === "" || password === "") {
        showMessage(loginMessage, "Please enter both username and password.", "red");
        return;
    }

    if (password.length < 6) {
        showMessage(loginMessage, "Password must contain at least 6 characters.", "red");
        return;
    }

    const matchedUser = users.find(function (user) {
        return (
            user.username.toLowerCase() === username.toLowerCase() &&
            user.password === password
        );
    });

    if (!matchedUser) {
        showMessage(
            loginMessage,
            "Invalid username or password. Register first if you have no account.",
            "red"
        );
        return;
    }

    // Remember who is logged in, so a page refresh keeps the dashboard open.
    localStorage.setItem("loggedInUser", matchedUser.username);

    loginForm.reset();
    loginMessage.textContent = "";

    showDashboardPage(matchedUser.username);

});


// ==========================================
// 7. THE API HELPER (one function, any method)
// ==========================================

async function apiRequest(url, method, body) {

    const options = {
        method: method || "GET",
        headers: { "Content-Type": "application/json" },
    };

    // GET and DELETE never send a body.
    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // The server always answers with JSON, even for errors (400/404/409).
    const data = await response.json().catch(function () {
        return {};
    });

    if (!response.ok) {
        throw new Error(data.message || "Request failed with status " + response.status);
    }

    return data;
}


// ==========================================
// 8. GET: LOAD STUDENTS FROM THE API
// ==========================================

async function loadStudents() {

    showMessage(studentMessage, "Loading students...", "#1e3a8a");

    try {

        students = await apiRequest(API_BASE, "GET");

        displayStudents();

        showMessage(
            studentMessage,
            students.length + " record(s) loaded from the API.",
            "#1e3a8a"
        );

    } catch (error) {

        students = [];
        displayStudents();

        showMessage(
            studentMessage,
            "Could not reach the API (" + error.message + "). Start it with: node server.js",
            "red"
        );

    }

}


// ==========================================
// 9. POST AND PUT: ADD OR UPDATE A STUDENT
// ==========================================

studentForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const name = studentNameInput.value.trim();
    const usn = studentUSNInput.value.trim().toUpperCase();
    const branch = studentBranchInput.value;
    const rawMarks = studentMarksInput.value.trim();
    const marks = Number(rawMarks);

    // --- validation rules ---

    if (!name || !usn || !branch || rawMarks === "") {
        showMessage(studentMessage, "Please fill in all fields.", "red");
        return;
    }

    if (!Number.isFinite(marks) || marks < 0 || marks > 100) {
        showMessage(studentMessage, "Marks must be between 0 and 100.", "red");
        return;
    }

    // Skip the record we are editing, otherwise it would clash with itself.
    const duplicate = students.some(function (student) {
        return (
            String(student.id) !== String(editingId) &&
            student.usn.toLowerCase() === usn.toLowerCase()
        );
    });

    if (duplicate) {
        showMessage(studentMessage, "A student with this USN already exists.", "red");
        return;
    }

    const studentData = { usn: usn, name: name, branch: branch, marks: marks };

    try {

        let successMessage;

        if (editingId === null) {
            // POST -> create a new record
            await apiRequest(API_BASE, "POST", studentData);
            successMessage = "Student added successfully!";
        } else {
            // PUT -> replace the record with this id
            await apiRequest(API_BASE + "/" + editingId, "PUT", studentData);
            successMessage = "Student updated successfully!";
        }

        exitEditMode();

        // GET again so the table shows exactly what the server stored.
        await loadStudents();

        showMessage(studentMessage, successMessage, "green");

    } catch (error) {

        showMessage(studentMessage, error.message, "red");

    }

});


// ==========================================
// 10. EDIT MODE (Edit button + Cancel button)
// ==========================================

function enterEditMode(student) {

    editingId = student.id;

    // Copy the row values into the form.
    studentNameInput.value = student.name;
    studentUSNInput.value = student.usn;
    studentBranchInput.value = student.branch;
    studentMarksInput.value = student.marks;

    submitStudentButton.textContent = "Update Student";
    cancelEditButton.hidden = false;

    showMessage(
        studentMessage,
        "Editing " + student.usn + ". Change the fields, then press Update Student.",
        "#1e3a8a"
    );

    studentNameInput.focus();

}

function exitEditMode() {

    editingId = null;

    studentForm.reset();

    submitStudentButton.textContent = "Add Student";
    cancelEditButton.hidden = true;

}

cancelEditButton.addEventListener("click", function () {

    exitEditMode();

    showMessage(studentMessage, "Edit cancelled.", "#6b7280");

});


// ==========================================
// 11. DISPLAY, SEARCH AND FILTER
// ==========================================

function displayStudents() {

    const searchText = searchInput.value.trim().toLowerCase();
    const selectedBranch = branchFilter.value;

    // Search and filter happen in the browser, on the data the API returned.
    const filteredStudents = students.filter(function (student) {

        const matchesSearch =
            student.name.toLowerCase().includes(searchText) ||
            student.usn.toLowerCase().includes(searchText);

        const matchesBranch =
            selectedBranch === "ALL" || student.branch === selectedBranch;

        return matchesSearch && matchesBranch;

    });

    studentTableBody.innerHTML = "";

    filteredStudents.forEach(function (student) {

        const row = document.createElement("tr");

        row.appendChild(createCell(student.usn));
        row.appendChild(createCell(student.name));
        row.appendChild(createCell(student.branch));
        row.appendChild(createCell(student.marks));

        const actionCell = document.createElement("td");

        // Edit button -> PUT
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.className = "edit-button";

        editButton.addEventListener("click", function () {
            enterEditMode(student);
        });

        // Delete button -> DELETE
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-button";

        deleteButton.addEventListener("click", function () {
            deleteStudent(student.id);
        });

        actionCell.appendChild(editButton);
        actionCell.appendChild(deleteButton);

        row.appendChild(actionCell);

        studentTableBody.appendChild(row);

    });

    totalStudentsElement.textContent = students.length;

    emptyMessage.hidden = filteredStudents.length !== 0;

}

// Small helper so the row code above stays short.
function createCell(value) {

    const cell = document.createElement("td");
    cell.textContent = value;

    return cell;

}


// ==========================================
// 12. DELETE: DELETE /api/students/:id
// ==========================================

async function deleteStudent(id) {

    const confirmed = confirm("Are you sure you want to delete this student?");

    if (!confirmed) {
        return;
    }

    try {

        await apiRequest(API_BASE + "/" + id, "DELETE");

        if (String(editingId) === String(id)) {
            exitEditMode();
        }

        await loadStudents();

        showMessage(studentMessage, "Student deleted successfully!", "green");

    } catch (error) {

        showMessage(studentMessage, error.message, "red");

    }

}


// ==========================================
// 13. SEARCH, FILTER AND REFRESH EVENTS
// ==========================================

searchInput.addEventListener("input", function () {
    displayStudents();
});

branchFilter.addEventListener("change", function () {
    displayStudents();
});

refreshButton.addEventListener("click", function () {
    loadStudents();
});


// ==========================================
// 14. MESSAGE HELPER
// ==========================================

function showMessage(element, message, color) {

    element.textContent = message;
    element.style.color = color || "";

}


// ==========================================
// 15. WHAT HAPPENS WHEN THE PAGE OPENS
// ==========================================

const savedUser = localStorage.getItem("loggedInUser");

if (savedUser) {
    // A session was saved, so skip the login page.
    showDashboardPage(savedUser);
} else {
    showLoginPage();
}
