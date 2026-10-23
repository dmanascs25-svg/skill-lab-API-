// ==========================================
// MOCK API + STATIC FILE SERVER
// ------------------------------------------
// No npm packages are needed. Node's built-in "http" module is enough.
// Run it with:   node server.js
// Then open:     http://localhost:3000
//
// It does two jobs:
//   1. Serves index.html / style.css / script.js to the browser
//   2. Exposes a REST API for students, storing data inside db.json
//
// Endpoints:
//   GET    /api/students        -> list every student
//   GET    /api/students/1      -> read one student
//   POST   /api/students        -> create a student
//   PUT    /api/students/1      -> update a student
//   DELETE /api/students/1      -> delete a student
// ==========================================

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const dbFile = path.join(__dirname, "db.json");

// ---------- reading and writing the "database" ----------

function readDatabase() {
    return JSON.parse(fs.readFileSync(dbFile, "utf8"));
}

function writeDatabase(database) {
    fs.writeFileSync(dbFile, JSON.stringify(database, null, 2) + "\n");
}

// ---------- small helpers ----------

function sendJson(response, statusCode, data) {
    response.writeHead(statusCode, {
        "Content-Type": "application/json",
        // CORS is not strictly needed because the page is served from this
        // same server, but it keeps the API usable from other tools too.
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    });
    response.end(JSON.stringify(data));
}

// Reads the JSON body sent with POST / PUT requests.
function readBody(request) {
    return new Promise(function (resolve, reject) {
        let raw = "";
        request.on("data", function (chunk) {
            raw += chunk;
        });
        request.on("end", function () {
            if (!raw) {
                resolve({});
                return;
            }
            try {
                resolve(JSON.parse(raw));
            } catch (error) {
                reject(new Error("Request body is not valid JSON."));
            }
        });
        request.on("error", reject);
    });
}

// Server-side validation. The browser also validates, but the API must
// never trust the client, so the same rules are checked again here.
function validateStudent(body) {
    const name = String(body.name || "").trim();
    const usn = String(body.usn || "").trim().toUpperCase();
    const branch = String(body.branch || "").trim();
    const marks = Number(body.marks);

    if (!name || !usn || !branch) {
        throw new Error("Name, USN and branch are required.");
    }
    if (!Number.isFinite(marks) || marks < 0 || marks > 100) {
        throw new Error("Marks must be a number between 0 and 100.");
    }
    return { usn: usn, name: name, branch: branch, marks: marks };
}

// ---------- static file serving ----------

const contentTypes = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".json": "application/json",
    ".ico": "image/x-icon",
};

function serveStatic(response, urlPath) {
    const fileName = urlPath === "/" ? "index.html" : urlPath.slice(1);
    const filePath = path.join(__dirname, fileName);

    // Blocks requests such as /../../secret.txt from escaping the folder.
    if (!filePath.startsWith(__dirname)) {
        sendJson(response, 403, { message: "Forbidden" });
        return;
    }

    fs.readFile(filePath, function (error, content) {
        if (error) {
            sendJson(response, 404, { message: "File not found: " + fileName });
            return;
        }
        response.writeHead(200, {
            "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
        });
        response.end(content);
    });
}

// ---------- the server ----------

const server = http.createServer(async function (request, response) {
    const url = new URL(request.url, "http://localhost:" + PORT);
    const parts = url.pathname.split("/").filter(Boolean); // "/api/students/2" -> ["api","students","2"]

    // Browsers send OPTIONS first when a request comes from another origin.
    if (request.method === "OPTIONS") {
        response.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        });
        response.end();
        return;
    }

    const isStudentApi = parts[0] === "api" && parts[1] === "students";

    // Anything that is not /api/students/* is treated as a file request.
    if (!isStudentApi) {
        if (request.method !== "GET") {
            sendJson(response, 405, { message: "Method not allowed." });
            return;
        }
        serveStatic(response, url.pathname);
        return;
    }

    const id = parts[2];
    const database = readDatabase();

    try {
        // ---------- GET: read ----------
        if (request.method === "GET") {
            if (!id) {
                sendJson(response, 200, database.students);
                return;
            }
            const student = database.students.find((item) => String(item.id) === id);
            if (!student) {
                sendJson(response, 404, { message: "Student not found." });
                return;
            }
            sendJson(response, 200, student);
            return;
        }

        // ---------- POST: create ----------
        if (request.method === "POST") {
            const student = validateStudent(await readBody(request));

            const duplicate = database.students.some(
                (item) => item.usn.toLowerCase() === student.usn.toLowerCase()
            );
            if (duplicate) {
                sendJson(response, 409, { message: "A student with this USN already exists." });
                return;
            }

            const newStudent = Object.assign({ id: String(Date.now()) }, student);
            database.students.push(newStudent);
            writeDatabase(database);
            sendJson(response, 201, newStudent);
            return;
        }

        // ---------- PUT: update ----------
        if (request.method === "PUT") {
            if (!id) {
                sendJson(response, 400, { message: "Student id is required." });
                return;
            }

            const student = validateStudent(await readBody(request));

            const index = database.students.findIndex((item) => String(item.id) === id);
            if (index === -1) {
                sendJson(response, 404, { message: "Student not found." });
                return;
            }

            const duplicate = database.students.some(
                (item, itemIndex) =>
                    itemIndex !== index &&
                    item.usn.toLowerCase() === student.usn.toLowerCase()
            );
            if (duplicate) {
                sendJson(response, 409, { message: "A student with this USN already exists." });
                return;
            }

            database.students[index] = Object.assign({ id: id }, student);
            writeDatabase(database);
            sendJson(response, 200, database.students[index]);
            return;
        }

        // ---------- DELETE: remove ----------
        if (request.method === "DELETE") {
            if (!id) {
                sendJson(response, 400, { message: "Student id is required." });
                return;
            }

            const before = database.students.length;
            database.students = database.students.filter(
                (item) => String(item.id) !== id
            );
            if (database.students.length === before) {
                sendJson(response, 404, { message: "Student not found." });
                return;
            }

            writeDatabase(database);
            sendJson(response, 200, { message: "Student deleted.", id: id });
            return;
        }

        sendJson(response, 405, { message: "Method not allowed." });
    } catch (error) {
        // Validation errors and broken JSON land here -> 400 Bad Request.
        sendJson(response, 400, { message: error.message });
    }
});

// If port 3000 is already busy, try 3001, 3002 ... so the command always works.
let currentPort = PORT;

server.on("error", function (error) {
    if (error.code === "EADDRINUSE" && currentPort < PORT + 10) {
        console.log("Port " + currentPort + " is busy, trying " + (currentPort + 1) + "...");
        currentPort = currentPort + 1;
        server.listen(currentPort);
        return;
    }
    console.error("Could not start the server:", error.message);
    process.exit(1);
});

server.listen(currentPort, function () {
    console.log("Mock API running at http://localhost:" + currentPort);
    console.log("Open http://localhost:" + currentPort + " in your browser.");
});
