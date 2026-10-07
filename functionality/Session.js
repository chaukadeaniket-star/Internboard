(() => {
    const profileKey = "internboard.studentProfile";
    const returnToKey = "internboard.returnTo";
    const accountControlClass = "internboard-account-controls";
    const publicPages = new Set(["home.html", "index.html", "login.html", "register.html"]);
    const allowedPages = new Set([
        "About.html",
        "Apply.html",
        "Browse.html",
        "Contact.html",
        "How_It_Works.html",
        "home.html",
        "index.html",
        "student-dashboard.html",
        "student_profile.html"
    ]);

    function resolvePostLoginDestination(requestedDestination) {
        if (!requestedDestination) {
            return "student_profile.html";
        }

        try {
            const target = new URL(requestedDestination, window.location.href);
            const pagesDirectory = window.location.pathname.slice(
                0,
                window.location.pathname.lastIndexOf("/") + 1
            );
            if (!target.pathname.startsWith(pagesDirectory)) {
                return "student_profile.html";
            }

            const pageName = target.pathname.slice(pagesDirectory.length);
            if (!allowedPages.has(pageName)) {
                return "student_profile.html";
            }

            return `${pageName}${target.search}${target.hash}`;
        } catch (error) {
            console.error("Could not validate the requested InternBoard page.", error);
            return "student_profile.html";
        }
    }

    window.InternBoardSession = {
        getPostLoginDestination() {
            const requestedDestination =
                new URLSearchParams(window.location.search).get("returnTo") ||
                window.localStorage.getItem(returnToKey);
            const destination = resolvePostLoginDestination(requestedDestination);
            window.localStorage.removeItem(returnToKey);
            return destination;
        }
    };

    const currentPage = window.location.pathname.split("/").pop();
    if (!publicPages.has(currentPage)) {
        let hasStudentProfile = false;
        try {
            const savedProfile = window.localStorage.getItem(profileKey);
            if (savedProfile) {
                const profile = JSON.parse(savedProfile);
                hasStudentProfile = Boolean(
                    profile &&
                    typeof profile.name === "string" &&
                    typeof profile.email === "string"
                );
            }
        } catch (error) {
            console.error("Could not verify the InternBoard student sign-in.", error);
        }

        if (!hasStudentProfile) {
            try {
                window.localStorage.setItem(
                    returnToKey,
                    `${window.location.pathname}${window.location.search}${window.location.hash}`
                );
            } catch (error) {
                console.error("Could not save the requested InternBoard page.", error);
            }
            window.location.replace(`login.html?returnTo=${encodeURIComponent(
                `${window.location.pathname}${window.location.search}${window.location.hash}`
            )}`);
            return;
        }
    }

    const style = document.createElement("style");
    style.textContent = `
        .internboard-account-controls {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-left: 12px;
            color: #28734c;
            font: 700 12px/1.3 Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .internboard-account-name {
            max-width: 180px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .internboard-account-name::before {
            content: "";
            display: inline-block;
            width: 8px;
            height: 8px;
            margin-right: 6px;
            border-radius: 50%;
            background: #31a66a;
        }
        .internboard-account-link,
        .internboard-account-logout {
            display: inline-flex;
            min-height: 36px;
            align-items: center;
            justify-content: center;
            padding: 0 11px;
            border: 1px solid #e0e5ef;
            border-radius: 9px;
            background: #fff;
            color: #58647b;
            cursor: pointer;
            font: 700 12px/1.2 Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            text-decoration: none;
            white-space: nowrap;
        }
        .internboard-account-link:hover,
        .internboard-account-logout:hover {
            border-color: #c8c1ff;
            color: #5546f7;
        }
        .internboard-account-controls[hidden] {
            display: none;
        }
        @media (max-width: 650px) {
            .internboard-account-controls { gap: 6px; margin-left: 6px; }
            .internboard-account-name { max-width: 95px; }
            .internboard-account-link,
            .internboard-account-logout { min-height: 32px; padding: 0 8px; font-size: 11px; }
        }
    `;
    document.head.appendChild(style);

    const navActions = document.querySelector(".nav-actions");
    const host = navActions ||
        document.querySelector(".header-inner") ||
        document.querySelector(".nav-container") ||
        document.querySelector(".login-page");
    if (!host) {
        return;
    }

    let controls = host.querySelector(`.${accountControlClass}`);
    if (!controls) {
        controls = document.createElement("div");
        controls.className = accountControlClass;
        controls.hidden = true;
        if (host.classList.contains("login-page")) {
            controls.classList.add("internboard-login-account");
        }
        host.appendChild(controls);
    }

    if (controls.classList.contains("internboard-login-account")) {
        const positionStyle = document.createElement("style");
        positionStyle.textContent = `
            .internboard-login-account {
                position: fixed;
                z-index: 10;
                top: 18px;
                right: 22px;
                margin: 0;
            }
        `;
        document.head.appendChild(positionStyle);
    }

    const originalAuthControls = document.querySelectorAll(
        ".login-btn, .started-btn, .get-started-btn"
    );

    function readStudentProfile() {
        const profileJson = window.localStorage.getItem(profileKey);
        if (!profileJson) {
            return null;
        }

        const profile = JSON.parse(profileJson);
        if (!profile || typeof profile.name !== "string" || typeof profile.email !== "string") {
            throw new Error("The saved student profile is invalid.");
        }

        return profile;
    }

    function renderAccount() {
        let profile;
        try {
            profile = readStudentProfile();
        } catch (error) {
            console.error("Could not read the saved InternBoard student profile.", error);
            controls.hidden = true;
            originalAuthControls.forEach((control) => {
                control.hidden = false;
            });
            return;
        }

        originalAuthControls.forEach((control) => {
            control.hidden = Boolean(profile);
        });

        if (!profile) {
            controls.hidden = true;
            controls.replaceChildren();
            return;
        }

        controls.hidden = false;
        controls.replaceChildren();

        const name = document.createElement("span");
        name.className = "internboard-account-name";
        name.textContent = `Signed in as ${profile.name.trim() || "Student"}`;

        const profileLink = document.createElement("a");
        profileLink.className = "internboard-account-link";
        profileLink.href = "student_profile.html";
        profileLink.textContent = "Student portal";

        const logoutButton = document.createElement("button");
        logoutButton.className = "internboard-account-logout";
        logoutButton.type = "button";
        logoutButton.textContent = "Log out";
        logoutButton.addEventListener("click", () => {
            try {
                window.localStorage.removeItem(profileKey);
                if (window.location.pathname.endsWith("/student_profile.html") ||
                    window.location.pathname.endsWith("/student-dashboard.html")) {
                    window.location.href = "home.html";
                    return;
                }
                renderAccount();
            } catch (error) {
                console.error("Could not log out of InternBoard.", error);
                window.alert("Could not log out because browser storage is unavailable.");
            }
        });

        controls.append(name, profileLink, logoutButton);
    }

    renderAccount();
    window.addEventListener("pageshow", renderAccount);
    window.addEventListener("storage", (event) => {
        if (event.key === profileKey || event.key === null) {
            renderAccount();
        }
    });

    const profileLink = document.querySelector(".brand, .home-link");
    if (profileLink && (window.location.pathname.endsWith("/login.html") ||
        window.location.pathname.endsWith("/register.html"))) {
        try {
            if (readStudentProfile()) {
                window.location.replace(window.InternBoardSession.getPostLoginDestination());
            }
        } catch (error) {
            console.error("Could not check the saved InternBoard student profile.", error);
        }
    }

    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    if (returnTo) {
        const registerLink = document.querySelector('a[href="register.html"]');
        if (registerLink) {
            registerLink.href = `register.html?returnTo=${encodeURIComponent(returnTo)}`;
        }

        const loginLink = document.querySelector('a[href="login.html"]');
        if (loginLink) {
            loginLink.href = `login.html?returnTo=${encodeURIComponent(returnTo)}`;
        }
    }
})();
