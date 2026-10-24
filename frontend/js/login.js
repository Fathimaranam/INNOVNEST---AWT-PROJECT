// ===============================
// LOGIN PAGE
// ===============================

const AUTH_API = "http://localhost:5000/api/auth";

document.addEventListener("DOMContentLoaded", () => {
    if (typeof redirectIfAuthenticated === "function") {
        redirectIfAuthenticated("frontpage.html");
    }
});

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const emailError =
    document.getElementById("emailError");

const passwordError =
    document.getElementById("passwordError");

const loginMessage =
    document.getElementById("loginMessage");

const loginSubmit =
    document.getElementById("loginSubmit");

const loginSubmitLabel =
    document.getElementById("loginSubmitLabel");

const passwordToggle =
    document.getElementById("passwordToggle");


// ===============================
// PASSWORD SHOW / HIDE
// ===============================

passwordToggle.addEventListener("click", () => {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";

        passwordToggle.setAttribute(
            "aria-label",
            "Hide password"
        );

        passwordToggle.setAttribute(
            "aria-pressed",
            "true"
        );

    } else {

        passwordInput.type = "password";

        passwordToggle.setAttribute(
            "aria-label",
            "Show password"
        );

        passwordToggle.setAttribute(
            "aria-pressed",
            "false"
        );
    }
});


// ===============================
// LOGIN FORM
// ===============================

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    // Clear previous errors
    emailError.textContent = "";
    passwordError.textContent = "";
    loginMessage.textContent = "";

    loginMessage.classList.remove(
        "is-success"
    );

    emailInput.removeAttribute(
        "aria-invalid"
    );

    passwordInput.removeAttribute(
        "aria-invalid"
    );

    let isValid = true;


    // ===============================
    // EMAIL VALIDATION
    // ===============================

    const email =
        emailInput.value.trim();

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {

        emailError.textContent =
            "Please enter your email address.";

        emailInput.setAttribute(
            "aria-invalid",
            "true"
        );

        isValid = false;

    } else if (!emailRegex.test(email)) {

        emailError.textContent =
            "Please enter a valid email address.";

        emailInput.setAttribute(
            "aria-invalid",
            "true"
        );

        isValid = false;
    }


    // ===============================
    // PASSWORD VALIDATION
    // ===============================

    const password =
        passwordInput.value;

    if (!password) {

        passwordError.textContent =
            "Please enter your password.";

        passwordInput.setAttribute(
            "aria-invalid",
            "true"
        );

        isValid = false;

    } else if (password.length < 8) {

        passwordError.textContent =
            "Password must be at least 8 characters.";

        passwordInput.setAttribute(
            "aria-invalid",
            "true"
        );

        isValid = false;
    }


    // ===============================
    // STOP IF INVALID
    // ===============================

    if (!isValid) {
        return;
    }


    // ===============================
    // CONNECT TO BACKEND API
    // ===============================

    loginSubmit.disabled = true;

    loginSubmit.setAttribute(
        "aria-busy",
        "true"
    );

    loginSubmitLabel.textContent =
        "Logging in...";

    try {
        const response = await fetch(`${AUTH_API}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Invalid email or password");
        }

        // Store JWT token and user info
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        loginMessage.classList.add("is-success");
        loginMessage.textContent = "Login successful! Redirecting...";

        setTimeout(() => {
            window.location.href = "frontpage.html";
        }, 1000);

    } catch (error) {
        loginMessage.classList.remove("is-success");
        loginMessage.textContent = error.message;

        loginSubmit.disabled = false;
        loginSubmit.removeAttribute("aria-busy");
        loginSubmitLabel.textContent = "Log in";
    }
});