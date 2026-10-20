// ===============================
// LOGIN PAGE
// ===============================

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

loginForm.addEventListener("submit", (event) => {

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
    // TEMPORARY SUCCESS
    // ===============================

    loginSubmit.disabled = true;

    loginSubmit.setAttribute(
        "aria-busy",
        "true"
    );

    loginSubmitLabel.textContent =
        "Logging in...";


    // Backend connection will be added next.

    setTimeout(() => {

        loginSubmit.disabled = false;

        loginSubmit.removeAttribute(
            "aria-busy"
        );

        loginSubmitLabel.textContent =
            "Log in";

        loginMessage.classList.add(
            "is-success"
        );

        loginMessage.textContent =
            "Login form is working successfully.";

    }, 1000);
});