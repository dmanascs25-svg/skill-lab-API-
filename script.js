
// ==========================================
// 1. GET HTML ELEMENTS
// ==========================================

const loginSection = document.getElementById("loginSection");
const registerSection = document.getElementById("registerSection");
const dashboardSection = document.getElementById("dashboardSection");

const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");

const registerForm = document.getElementById("registerForm");
const registerUsernameInput = document.getElementById("registerUsername");
const registerEmailInput = document.getElementById("registerEmail");
const registerPasswordInput = document.getElementById("registerPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const registerMessage = document.getElementById("registerMessage");

const showRegisterButton = document.getElementById("showRegisterButton");
const showLoginButton = document.getElementById("showLoginButton");

const logoutButton = document.getElementById("logoutButton");

const studentForm = document.getElementById("studentForm");
const studentNameInput = document.getElementById("studentName");
const studentUSNInput = document.getElementById("studentUSN");
const studentBranchInput = document.getElementById("studentBranch");
const studentMarksInput = document.getElementById("studentMarks");
const studentMessage = document.getElementById("studentMessage");

const studentTableBody = document.getElementById("studentTableBody");
const totalStudentsElement = document.getElementById("totalStudents");

const searchInput = document.getElementById("searchInput");
const branchFilter = document.getElementById("branchFilter");
const emptyMessage = document.getElementById("emptyMessage");


// ==========================================
// 2. LOAD DATA FROM LOCAL STORAGE
// ==========================================

let users = JSON.parse(localStorage.getItem("users")) || [];

let students = JSON.parse(localStorage.getItem("students")) || [];


// ==========================================
// 3. SHOW REGISTRATION PAGE
// ==========================================

showRegisterButton.addEventListener("click", function () {

    loginSection.hidden = true;
    registerSection.hidden = false;
    dashboardSection.hidden = true;

    loginMessage.textContent = "";
    registerMessage.textContent = "";

});


// ==========================================
// 4. RETURN TO LOGIN PAGE
// ==========================================

showLoginButton.addEventListener("click", function () {

    registerSection.hidden = true;
    dashboardSection.hidden = true;
    loginSection.hidden = false;

    registerMessage.textContent = "";
    loginMessage.textContent = "";

});


// ==========================================
// 5. REGISTRATION FUNCTIONALITY
// ==========================================

registerForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const username = registerUsernameInput.value.trim();
    const email = registerEmailInput.value.trim();
    const password = registerPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validate username
    if (username.length < 3) {

        showRegisterMessage(
            "Username must contain at least 3 characters.",
            "red"
        );

        return;
    }

    // Validate password
    if (password.length < 6) {

        showRegisterMessage(
            "Password must contain at least 6 characters.",
            "red"
        );

        return;
    }

    // Check whether passwords match
    if (password !== confirmPassword) {

        showRegisterMessage(
            "Passwords do not match.",
            "red"
        );

        return;
    }

    // Check for duplicate username
    const usernameExists = users.some(function (user) {

        return user.username.toLowerCase() === username.toLowerCase();

    });

    if (usernameExists) {

        showRegisterMessage(
            "Username already exists. Choose another one.",
            "red"
        );

        return;
    }

    // Check for duplicate email
    const emailExists = users.some(function (user) {

        return user.email.toLowerCase() === email.toLowerCase();

    });

    if (emailExists) {

        showRegisterMessage(
            "Email is already registered.",
            "red"
        );

        return;
    }

    // Create new account
    const newUser = {
        username: username,
        email: email,
        password: password
    };

    // Add account to users array
    users.push(newUser);

    // Save accounts in Local Storage
    localStorage.setItem("users", JSON.stringify(users));

    // Clear registration form
    registerForm.reset();

    // Show success message
    showRegisterMessage(
        "Registration successful! You can now log in.",
        "green"
    );

});


// ==========================================
// 6. DISPLAY REGISTRATION MESSAGE
// ==========================================

function showRegisterMessage(message, color) {

    registerMessage.textContent = message;
    registerMessage.style.color = color;

}


// ==========================================
// 7. LOGIN FUNCTIONALITY
// ==========================================

loginForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Find matching account
    const loggedInUser = users.find(function (user) {

        return user.username.toLowerCase() === username.toLowerCase()
            && user.password === password;

    });

    if (loggedInUser) {

        // Hide login and registration
        loginSection.hidden = true;
        registerSection.hidden = true;

        // Show dashboard
        dashboardSection.hidden = false;

        loginMessage.textContent = "";

        // Clear login form
        loginForm.reset();

        // Display student records
        displayStudents();

    } else {

        loginMessage.textContent =
            "Invalid username or password. Please register first if needed.";

        loginMessage.style.color = "red";

    }

});


// ==========================================
// 8. LOGOUT FUNCTIONALITY
// ==========================================

logoutButton.addEventListener("click", function () {

    dashboardSection.hidden = true;
    registerSection.hidden = true;
    loginSection.hidden = false;

    loginForm.reset();

    loginMessage.textContent = "";
    studentMessage.textContent = "";

});


// ==========================================
// 9. ADD STUDENT
// ==========================================

studentForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const name = studentNameInput.value.trim();
    const usn = studentUSNInput.value.trim().toUpperCase();
    const branch = studentBranchInput.value;
    const marks = Number(studentMarksInput.value);

    // Check required fields
    if (
        !name ||
        !usn ||
        !branch ||
        studentMarksInput.value.trim() === ""
    ) {

        showStudentMessage("Please fill in all fields.", "red");
        return;

    }

    // Validate marks
    if (!Number.isFinite(marks) || marks < 0 || marks > 100) {

        showStudentMessage(
            "Marks must be between 0 and 100.",
            "red"
        );

        return;

    }

    // Check for duplicate USN
    const usnExists = students.some(function (student) {

        return student.usn.toLowerCase() === usn.toLowerCase();

    });

    if (usnExists) {

        showStudentMessage(
            "A student with this USN already exists.",
            "red"
        );

        return;

    }

    // Create student object
    const newStudent = {
        id: Date.now(),
        usn: usn,
        name: name,
        branch: branch,
        marks: marks
    };

    // Add student to array
    students.push(newStudent);

    // Save and refresh table
    saveStudents();
    displayStudents();

    // Clear form
    studentForm.reset();

    showStudentMessage(
        "Student added successfully!",
        "green"
    );

});


// ==========================================
// 10. DISPLAY STUDENTS, SEARCH AND FILTER
// ==========================================

function displayStudents() {

    const searchText = searchInput.value.trim().toLowerCase();
    const selectedBranch = branchFilter.value;

    // Filter students based on search and branch
    const filteredStudents = students.filter(function (student) {

        const matchesSearch =
            student.name.toLowerCase().includes(searchText) ||
            student.usn.toLowerCase().includes(searchText);

        const matchesBranch =
            selectedBranch === "ALL" ||
            student.branch === selectedBranch;

        return matchesSearch && matchesBranch;

    });

    // Clear existing table rows
    studentTableBody.innerHTML = "";

    // Create a row for every matching student
    filteredStudents.forEach(function (student) {

        const row = document.createElement("tr");

        const usnCell = document.createElement("td");
        usnCell.textContent = student.usn;

        const nameCell = document.createElement("td");
        nameCell.textContent = student.name;

        const branchCell = document.createElement("td");
        branchCell.textContent = student.branch;

        const marksCell = document.createElement("td");
        marksCell.textContent = student.marks;

        const actionCell = document.createElement("td");

        const deleteButton = document.createElement("button");

        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-button";
        deleteButton.type = "button";

        // Delete button event
        deleteButton.addEventListener("click", function () {

            deleteStudent(student.id);

        });

        actionCell.appendChild(deleteButton);

        row.appendChild(usnCell);
        row.appendChild(nameCell);
        row.appendChild(branchCell);
        row.appendChild(marksCell);
        row.appendChild(actionCell);

        studentTableBody.appendChild(row);

    });

    // Display the total number of students
    totalStudentsElement.textContent = students.length;

    // Show or hide the empty message
    emptyMessage.hidden = filteredStudents.length !== 0;

}


// ==========================================
// 11. DELETE STUDENT
// ==========================================

function deleteStudent(id) {

    const confirmed = confirm(
        "Are you sure you want to delete this student?"
    );

    if (!confirmed) {
        return;
    }

    // Remove the selected student
    students = students.filter(function (student) {

        return student.id !== id;

    });

    // Save changes and update table
    saveStudents();
    displayStudents();

    showStudentMessage(
        "Student deleted successfully!",
        "green"
    );

}


// ==========================================
// 12. SAVE STUDENTS IN LOCAL STORAGE
// ==========================================

function saveStudents() {

    localStorage.setItem(
        "students",
        JSON.stringify(students)
    );

}


// ==========================================
// 13. SEARCH AND FILTER EVENTS
// ==========================================

searchInput.addEventListener("input", function () {

    displayStudents();

});

branchFilter.addEventListener("change", function () {

    displayStudents();

});


// ==========================================
// 14. DISPLAY STUDENT MESSAGES
// ==========================================

function showStudentMessage(message, color) {

    studentMessage.textContent = message;
    studentMessage.style.color = color;

}

