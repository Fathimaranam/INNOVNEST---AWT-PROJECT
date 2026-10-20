// ===============================
// SIGNUP PAGE
// ===============================

const signupForm = document.getElementById("signupForm");

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput =
    document.getElementById("confirmPassword");

const nameError = document.getElementById("nameError");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const confirmPasswordError =
    document.getElementById("confirmPasswordError");

const signupMessage =
    document.getElementById("signupMessage");

const signupSubmit =
    document.getElementById("signupSubmit");

const signupSubmitLabel =
    document.getElementById("signupSubmitLabel");


// ===============================
// PASSWORD SHOW / HIDE
// ===============================

const passwordToggles =
    document.querySelectorAll("[data-password-toggle]");

passwordToggles.forEach((button) => {

    button.addEventListener("click", () => {

        const inputId =
            button.getAttribute("data-password-toggle");

        const input =
            document.getElementById(inputId);

        if (input.type === "password") {

            input.type = "text";

            button.setAttribute(
                "aria-label",
                "Hide password"
            );

            button.setAttribute(
                "aria-pressed",
                "true"
            );

        } else {

            input.type = "password";

            button.setAttribute(
                "aria-label",
                "Show password"
            );

            button.setAttribute(
                "aria-pressed",
                "false"
            );
        }
    });
});


// ===============================
// SIGNUP FORM
// ===============================

signupForm.addEventListener("submit", (event) => {

    event.preventDefault();

    // Clear previous errors
    nameError.textContent = "";
    emailError.textContent = "";
    passwordError.textContent = "";
    confirmPasswordError.textContent = "";
    signupMessage.textContent = "";

    nameInput.removeAttribute("aria-invalid");
    emailInput.removeAttribute("aria-invalid");
    passwordInput.removeAttribute("aria-invalid");
    confirmPasswordInput.removeAttribute("aria-invalid");

    let isValid = true;


    // ===============================
    // NAME VALIDATION
    // ===============================

    const name = nameInput.value.trim();

    if (!name) {

        nameError.textContent =
            "Please enter your name.";

        nameInput.setAttribute(
            "aria-invalid",
            "true"
        );

        isValid = false;
    }


    // ===============================
    // EMAIL VALIDATION
    // ===============================

    const email = emailInput.value.trim();

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

    const password = passwordInput.value;

    if (!password) {

        passwordError.textContent =
            "Please enter a password.";

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
    // CONFIRM PASSWORD
    // ===============================

    const confirmPassword =
        confirmPasswordInput.value;

    if (!confirmPassword) {

        confirmPasswordError.textContent =
            "Please confirm your password.";

        confirmPasswordInput.setAttribute(
            "aria-invalid",
            "true"
        );

        isValid = false;

    } else if (password !== confirmPassword) {

        confirmPasswordError.textContent =
            "Passwords do not match.";

        confirmPasswordInput.setAttribute(
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

    signupSubmit.disabled = true;

    signupSubmit.setAttribute(
        "aria-busy",
        "true"
    );

    signupSubmitLabel.textContent =
        "Creating account...";


    // For now we are only testing the frontend.
    // Backend connection will be added next.

    setTimeout(() => {

        signupSubmit.disabled = false;

        signupSubmit.removeAttribute(
            "aria-busy"
        );

        signupSubmitLabel.textContent =
            "Create account";

        signupMessage.classList.add(
            "is-success"
        );

        signupMessage.textContent =
            "Signup form is working successfully.";

    }, 1000);
});