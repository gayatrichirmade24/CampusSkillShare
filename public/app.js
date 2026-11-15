const API_BASE = "/api";

let currentUser = null;
let currentMatchId = null;
let chatRefreshInterval = null;


// ======================================================
// DOM ELEMENTS
// ======================================================

const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const loginContainer = document.getElementById("login-form");
const signupContainer = document.getElementById("signup-form");

const loginError = document.getElementById("login-error");
const signupError = document.getElementById("signup-error");


// ======================================================
// AUTH HELPERS
// ======================================================

function getToken() {
    return localStorage.getItem("campusSkillShareToken");
}


function saveToken(token) {
    localStorage.setItem(
        "campusSkillShareToken",
        token
    );
}


function removeToken() {
    localStorage.removeItem(
        "campusSkillShareToken"
    );
}


async function apiRequest(
    endpoint,
    options = {}
) {
    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] =
            `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE}${endpoint}`,
        {
            ...options,
            headers
        }
    );

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(
            data.detail ||
            data.message ||
            "Something went wrong."
        );
    }

    return data;
}


// ======================================================
// AUTH SCREEN SWITCHING
// ======================================================

document
    .getElementById("show-signup")
    .addEventListener(
        "click",
        () => {

            loginContainer.classList.add(
                "hidden"
            );

            signupContainer.classList.remove(
                "hidden"
            );

            loginError.textContent = "";
            signupError.textContent = "";
        }
    );


document
    .getElementById("show-login")
    .addEventListener(
        "click",
        () => {

            signupContainer.classList.add(
                "hidden"
            );

            loginContainer.classList.remove(
                "hidden"
            );

            loginError.textContent = "";
            signupError.textContent = "";
        }
    );


// ======================================================
// SIGNUP
// ======================================================

signupForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        signupError.textContent = "";

        const name =
            document
                .getElementById("signup-name")
                .value
                .trim();

        const email =
            document
                .getElementById("signup-email")
                .value
                .trim();

        const password =
            document
                .getElementById("signup-password")
                .value;

        const college =
            document
                .getElementById("signup-college")
                .value
                .trim();

        const branch =
            document
                .getElementById("signup-branch")
                .value
                .trim();

        const year =
            Number(
                document
                    .getElementById("signup-year")
                    .value
            );


        try {

            const data =
                await apiRequest(
                    "/auth/signup",
                    {
                        method: "POST",

                        body: JSON.stringify({
                            name,
                            email,
                            password,
                            college,
                            branch,
                            year
                        })
                    }
                );


            saveToken(
                data.access_token
            );

            currentUser =
                data.user;


            showApp();

            await loadCurrentUser();

            await loadDiscover();

        } catch (error) {

            signupError.textContent =
                error.message;
        }
    }
);


// ======================================================
// LOGIN
// ======================================================

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        loginError.textContent = "";

        const email =
            document
                .getElementById("login-email")
                .value
                .trim();

        const password =
            document
                .getElementById("login-password")
                .value;


        try {

            const data =
                await apiRequest(
                    "/auth/login",
                    {
                        method: "POST",

                        body: JSON.stringify({
                            email,
                            password
                        })
                    }
                );


            saveToken(
                data.access_token
            );

            currentUser =
                data.user;


            showApp();

            await loadCurrentUser();

            await loadDiscover();

        } catch (error) {

            loginError.textContent =
                error.message;
        }
    }
);


// ======================================================
// SHOW APPLICATION
// ======================================================

function showApp() {

    authSection.classList.add(
        "hidden"
    );

    appSection.classList.remove(
        "hidden"
    );

    showSection(
        "discover"
    );
}


// ======================================================
// LOGOUT
// ======================================================

document
    .getElementById("logout-button")
    .addEventListener(
        "click",
        () => {

            removeToken();

            currentUser = null;
            currentMatchId = null;

            if (chatRefreshInterval) {

                clearInterval(
                    chatRefreshInterval
                );

                chatRefreshInterval = null;
            }

            appSection.classList.add(
                "hidden"
            );

            authSection.classList.remove(
                "hidden"
            );

            loginForm.reset();
            signupForm.reset();

            loginContainer.classList.remove(
                "hidden"
            );

            signupContainer.classList.add(
                "hidden"
            );
        }
    );


// ======================================================
// NAVIGATION
// ======================================================

document
    .querySelectorAll(".nav-button")
    .forEach(
        (button) => {

            button.addEventListener(
                "click",
                async () => {

                    const section =
                        button.dataset.section;

                    showSection(
                        section
                    );


                    if (
                        section ===
                        "discover"
                    ) {

                        await loadDiscover();

                    }


                    if (
                        section ===
                        "matches"
                    ) {

                        await loadMatches();

                    }


                    if (
                        section ===
                        "profile"
                    ) {

                        await loadProfile();

                    }
                }
            );
        }
    );


function showSection(
    sectionName
) {

    document
        .querySelectorAll(".app-page")
        .forEach(
            (section) => {

                section.classList.add(
                    "hidden"
                );

            }
        );


    const target =
        document.getElementById(
            `${sectionName}-section`
        );


    if (target) {

        target.classList.remove(
            "hidden"
        );

    }


    document
        .querySelectorAll(".nav-button")
        .forEach(
            (button) => {

                button.classList.toggle(
                    "active",
                    button.dataset.section ===
                    sectionName
                );

            }
        );
}


// ======================================================
// CURRENT USER
// ======================================================

async function loadCurrentUser() {

    try {

        currentUser =
            await apiRequest(
                "/users/me"
            );

    } catch (error) {

        console.error(
            "Could not load user:",
            error
        );

        logoutAutomatically();
    }
}


function logoutAutomatically() {

    removeToken();

    currentUser = null;

    appSection.classList.add(
        "hidden"
    );

    authSection.classList.remove(
        "hidden"
    );
}


// ======================================================
// DISCOVER
// ======================================================

async function loadDiscover() {

    const container =
        document.getElementById(
            "profile-container"
        );


    container.innerHTML =
        `<p class="loading">
            Finding students...
        </p>`;


    try {

        const profiles =
            await apiRequest(
                "/profiles"
            );


        if (!profiles.length) {

            container.innerHTML =
                `<p class="loading">
                    No more students to discover right now.
                </p>`;

            return;
        }


        renderDiscoverProfile(
            profiles[0]
        );

    } catch (error) {

        container.innerHTML =
            `<p class="error">
                ${escapeHtml(
                    error.message
                )}
            </p>`;
    }
}


// ======================================================
// RENDER DISCOVER PROFILE
// ======================================================

function renderDiscoverProfile(
    user
) {

    const container =
        document.getElementById(
            "profile-container"
        );


    const profile =
        user.profile || {};


    const offered =
        profile.skillsOffered || [];


    const wanted =
        profile.skillsWanted || [];


    const interests =
        profile.projectInterests || [];


    const offeredHTML =
        offered.length
            ? offered
                .map(
                    skill =>
                        `<span class="skill">
                            ${escapeHtml(skill)}
                        </span>`
                )
                .join("")
            : `<span class="skill">
                    No skills added
               </span>`;


    const wantedHTML =
        wanted.length
            ? wanted
                .map(
                    skill =>
                        `<span class="skill">
                            ${escapeHtml(skill)}
                        </span>`
                )
                .join("")
            : `<span class="skill">
                    No skills added
               </span>`;


    const interestsHTML =
        interests.length
            ? interests
                .map(
                    interest =>
                        `<span class="skill">
                            ${escapeHtml(
                                interest
                            )}
                        </span>`
                )
                .join("")
            : `<span class="skill">
                    No interests added
               </span>`;


    container.innerHTML = `

        <div class="profile-card">

            <div class="profile-avatar">
                ${escapeHtml(
                    profile.avatar ||
                    getInitials(user.name)
                )}
            </div>


            <div class="profile-info">

                <h2>
                    ${escapeHtml(user.name)}
                </h2>

                <p class="profile-meta">
                    ${escapeHtml(user.branch)}
                    · Year ${user.year}
                </p>


                <span class="match-score">
                    ${user.matchScore || 0}% Match
                </span>


                <p class="profile-bio">
                    ${escapeHtml(
                        profile.bio ||
                        "No bio added yet."
                    )}
                </p>


                <div class="skill-section">

                    <h4>
                        Skills they offer
                    </h4>

                    <div class="skills">
                        ${offeredHTML}
                    </div>

                </div>


                <div class="skill-section">

                    <h4>
                        Skills they want
                    </h4>

                    <div class="skills">
                        ${wantedHTML}
                    </div>

                </div>


                <div class="skill-section">

                    <h4>
                        Project interests
                    </h4>

                    <div class="skills">
                        ${interestsHTML}
                    </div>

                </div>


                <p class="profile-meta">
                    Availability:
                    ${escapeHtml(
                        profile.availability ||
                        "Flexible"
                    )}
                </p>

            </div>


            <div class="profile-actions">

                <button
                    class="pass-button"
                    onclick="handleSwipe(
                        ${user.id},
                        false
                    )"
                >
                    Pass
                </button>

                <button
                    class="connect-button"
                    onclick="handleSwipe(
                        ${user.id},
                        true
                    )"
                >
                    Connect
                </button>

            </div>

        </div>
    `;
}


// ======================================================
// SWIPE
// ======================================================

async function handleSwipe(
    userId,
    liked
) {

    try {

        const result =
            await apiRequest(
                "/swipes",
                {
                    method: "POST",

                    body: JSON.stringify({
                        toUserId: userId,
                        liked
                    })
                }
            );


        if (result.matched) {

            showMatchNotification(
                result.user?.name ||
                "your new teammate"
            );

            playMatchSound();

        }


        await loadDiscover();

        await loadMatches();

    } catch (error) {

        alert(
            error.message
        );
    }
}


// ======================================================
// MATCHES / MESSAGE INBOX
// ======================================================

async function loadMatches() {

    const container =
        document.getElementById(
            "matches-container"
        );


    container.innerHTML =
        `<p class="loading">
            Loading your inbox...
        </p>`;


    try {

        const matches =
            await apiRequest(
                "/matches"
            );


        if (!matches.length) {

            container.innerHTML =
                `<div class="empty-inbox">

                    <div class="empty-inbox-icon">
                        💬
                    </div>

                    <h3>
                        No conversations yet
                    </h3>

                    <p>
                        When you and another student connect,
                        your conversation will appear here.
                    </p>

                </div>`;

            return;
        }


        const inboxItems =
            await Promise.all(
                matches.map(
                    async (match) => {

                        try {

                            const messages =
                                await apiRequest(
                                    `/chats/${match.matchId}/messages`
                                );


                            const unreadCount =
                                messages.filter(
                                    message =>
                                        !message.isRead &&
                                        currentUser &&
                                        message.senderId !==
                                        currentUser.id
                                ).length;


                            const latestMessage =
                                messages.length
                                    ? messages[
                                        messages.length - 1
                                      ]
                                    : null;


                            return {
                                match,
                                latestMessage,
                                unreadCount
                            };


                        } catch (error) {

                            console.error(
                                "Could not load inbox messages:",
                                error
                            );


                            return {
                                match,
                                latestMessage: null,
                                unreadCount: 0
                            };
                        }
                    }
                )
            );


        container.innerHTML =
            inboxItems
                .map(
                    item =>
                        createInboxCard(
                            item.match,
                            item.latestMessage,
                            item.unreadCount
                        )
                )
                .join("");


    } catch (error) {

        container.innerHTML =
            `<p class="error">
                ${escapeHtml(
                    error.message
                )}
            </p>`;
    }
}


// ======================================================
// CREATE INBOX CARD
// ======================================================

function createInboxCard(
    match,
    latestMessage,
    unreadCount
) {

    const user =
        match.user || {};


    const profile =
        user.profile || {};


    const initials =
        profile.avatar ||
        getInitials(
            user.name
        );


    let preview =
        "Start a conversation 👋";


    if (latestMessage) {

        preview =
            latestMessage.senderId ===
            currentUser.id

                ? `You: ${latestMessage.message}`

                : latestMessage.message;
    }


    return `

        <div class="match-card inbox-card">

            <div class="match-avatar">
                ${escapeHtml(initials)}
            </div>


            <div class="inbox-content">

                <div class="inbox-header">

                    <h3>
                        ${escapeHtml(user.name)}
                    </h3>


                    ${
                        unreadCount > 0

                            ? `
                                <span class="unread-badge">
                                    ${unreadCount}
                                </span>
                              `

                            : ""
                    }

                </div>


                <p class="inbox-meta">
                    ${escapeHtml(user.branch)}
                    · Year ${user.year}
                </p>


                <p class="
                    inbox-preview
                    ${
                        unreadCount > 0
                            ? "unread-preview"
                            : ""
                    }
                ">
                    ${escapeHtml(preview)}
                </p>

            </div>


            <button
                class="chat-button"
                onclick="openChat(
                    ${match.matchId},
                    '${escapeJsString(
                        user.name
                    )}'
                )"
            >
                Open Chat
            </button>

        </div>
    `;
}


// ======================================================
// MATCH NOTIFICATION
// ======================================================

function showMatchNotification(
    userName
) {

    let notification =
        document.getElementById(
            "match-notification"
        );


    if (!notification) {

        notification =
            document.createElement(
                "div"
            );


        notification.id =
            "match-notification";


        notification.style.cssText = `

            position: fixed;

            top: 24px;

            right: 24px;

            z-index: 9999;

            width: min(
                360px,
                calc(100vw - 32px)
            );

            padding: 20px;

            border-radius: 18px;

            background: #ffffff;

            box-shadow:
                0 12px 35px
                rgba(0, 0, 0, 0.18);

            border:
                1px solid #e5e7eb;

            transform:
                translateY(-20px);

            opacity: 0;

            transition:
                all 0.25s ease;
        `;


        document.body.appendChild(
            notification
        );
    }


    notification.innerHTML = `

        <div style="
            font-size: 32px;
            margin-bottom: 8px;
        ">
            🎉
        </div>


        <strong style="
            display: block;
            font-size: 20px;
            margin-bottom: 6px;
        ">
            It's a Match!
        </strong>


        <span style="
            display: block;
            color: #555;
            line-height: 1.5;
        ">
            You and ${escapeHtml(
                userName
            )} can now chat.
        </span>


        <button
            type="button"
            onclick="openMatchesFromNotification()"
            style="
                margin-top: 14px;
                border: none;
                border-radius: 10px;
                padding: 9px 14px;
                cursor: pointer;
                font-weight: 600;
            "
        >
            Open Inbox
        </button>
    `;


    requestAnimationFrame(
        () => {

            notification.style.transform =
                "translateY(0)";

            notification.style.opacity =
                "1";
        }
    );


    clearTimeout(
        window.matchNotificationTimer
    );


    window.matchNotificationTimer =
        setTimeout(
            () => {

                notification.style.transform =
                    "translateY(-20px)";

                notification.style.opacity =
                    "0";

            },
            6000
        );
}


// ======================================================
// OPEN INBOX FROM NOTIFICATION
// ======================================================

function openMatchesFromNotification() {

    const matchesButton =
        document.querySelector(
            '.nav-button[data-section="matches"]'
        );


    if (matchesButton) {

        matchesButton.click();

    } else {

        showSection(
            "matches"
        );

        loadMatches();
    }
}


// ======================================================
// MATCH NOTIFICATION SOUND
// ======================================================

function playMatchSound() {

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContext) {
            console.log("Web Audio is not supported.");
            return;
        }

        const audioContext =
            new AudioContext();

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const now =
            audioContext.currentTime;

        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        oscillator.type = "sine";

        // First note
        oscillator.frequency.setValueAtTime(
            523.25,
            now
        );

        // Second note
        oscillator.frequency.setValueAtTime(
            659.25,
            now + 0.15
        );

        // Third note
        oscillator.frequency.setValueAtTime(
            783.99,
            now + 0.30
        );

        gain.gain.setValueAtTime(
            0.001,
            now
        );

        gain.gain.exponentialRampToValueAtTime(
            0.25,
            now + 0.03
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            now + 0.65
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start(now);

        oscillator.stop(
            now + 0.7
        );

        oscillator.addEventListener(
            "ended",
            () => {
                audioContext.close();
            }
        );

    } catch (error) {

        console.error(
            "Could not play match sound:",
            error
        );
    }
}


// ======================================================
// PROFILE
// ======================================================

async function loadProfile() {

    try {

        const user =
            await apiRequest(
                "/users/me"
            );


        currentUser =
            user;


        const profile =
            user.profile || {};


        document
            .getElementById(
                "profile-bio"
            )
            .value =
            profile.bio || "";


        document
            .getElementById(
                "skills-offered"
            )
            .value =
            (
                profile.skillsOffered ||
                []
            ).join(", ");


        document
            .getElementById(
                "skills-wanted"
            )
            .value =
            (
                profile.skillsWanted ||
                []
            ).join(", ");


        document
            .getElementById(
                "project-interests"
            )
            .value =
            (
                profile.projectInterests ||
                []
            ).join(", ");


        document
            .getElementById(
                "availability"
            )
            .value =
            profile.availability ||
            "Flexible";


    } catch (error) {

        console.error(
            error
        );
    }
}


// ======================================================
// SAVE PROFILE
// ======================================================

document
    .getElementById(
        "profileForm"
    )
    .addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const message =
                document.getElementById(
                    "profile-message"
                );


            message.textContent =
                "Saving...";


            message.className =
                "";


            const skillsOffered =
                document
                    .getElementById(
                        "skills-offered"
                    )
                    .value
                    .split(",")
                    .map(
                        item =>
                            item.trim()
                    )
                    .filter(
                        Boolean
                    );


            const skillsWanted =
                document
                    .getElementById(
                        "skills-wanted"
                    )
                    .value
                    .split(",")
                    .map(
                        item =>
                            item.trim()
                    )
                    .filter(
                        Boolean
                    );


            const projectInterests =
                document
                    .getElementById(
                        "project-interests"
                    )
                    .value
                    .split(",")
                    .map(
                        item =>
                            item.trim()
                    )
                    .filter(
                        Boolean
                    );


            try {

                await apiRequest(
                    "/users/me/profile",
                    {
                        method: "PUT",

                        body:
                            JSON.stringify({

                                bio:
                                    document
                                        .getElementById(
                                            "profile-bio"
                                        )
                                        .value
                                        .trim(),

                                skillsOffered,

                                skillsWanted,

                                projectInterests,

                                availability:
                                    document
                                        .getElementById(
                                            "availability"
                                        )
                                        .value

                            })
                    }
                );


                message.textContent =
                    "Profile saved successfully!";


                message.className =
                    "success";


            } catch (error) {

                message.textContent =
                    error.message;


                message.className =
                    "error";
            }
        }
    );


// ======================================================
// CHAT
// ======================================================

async function openChat(
    matchId,
    userName
) {

    currentMatchId =
        matchId;


    document
        .getElementById(
            "chat-user-name"
        )
        .textContent =
        `Chat with ${userName}`;


    showSection(
        "chat"
    );


    await loadMessages();

    await markMessagesAsRead();

    await loadMatches();


    if (chatRefreshInterval) {

        clearInterval(
            chatRefreshInterval
        );
    }


    chatRefreshInterval =
        setInterval(
            async () => {

                await loadMessages();

            },
            3000
        );
}


// ======================================================
// MARK MESSAGES AS READ
// ======================================================

async function markMessagesAsRead() {

    if (!currentMatchId) {
        return;
    }


    try {

        await apiRequest(
            `/chats/${currentMatchId}/read`,
            {
                method: "PATCH"
            }
        );


    } catch (error) {

        console.error(
            "Could not mark messages as read:",
            error
        );
    }
}


// ======================================================
// LOAD MESSAGES
// ======================================================

async function loadMessages() {

    if (!currentMatchId) {
        return;
    }


    const container =
        document.getElementById(
            "messages-container"
        );


    try {

        const messages =
            await apiRequest(
                `/chats/${currentMatchId}/messages`
            );


        if (!messages.length) {

            container.innerHTML =
                `<p class="loading">
                    No messages yet. Say hello! 👋
                </p>`;

            return;
        }


        container.innerHTML =
            messages
                .map(
                    message => {

                        const mine =
                            currentUser &&
                            message.senderId ===
                            currentUser.id;


                        return `

                            <div class="
                                message
                                ${
                                    mine
                                        ? "mine"
                                        : "theirs"
                                }
                            ">

                                ${escapeHtml(
                                    message.message
                                )}

                            </div>

                        `;
                    }
                )
                .join("");


        container.scrollTop =
            container.scrollHeight;


    } catch (error) {

        console.error(
            "Chat error:",
            error
        );
    }
}


// ======================================================
// SEND MESSAGE
// ======================================================

document
    .getElementById(
        "messageForm"
    )
    .addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (!currentMatchId) {
                return;
            }


            const input =
                document.getElementById(
                    "message-input"
                );


            const message =
                input.value.trim();


            if (!message) {
                return;
            }


            try {

                await apiRequest(
                    `/chats/${currentMatchId}/messages`,
                    {
                        method: "POST",

                        body:
                            JSON.stringify({
                                message
                            })
                    }
                );


                input.value =
                    "";


                await loadMessages();

                await loadMatches();


            } catch (error) {

                alert(
                    error.message
                );
            }
        }
    );


// ======================================================
// UTILITY FUNCTIONS
// ======================================================

function getInitials(
    name
) {

    if (!name) {
        return "YU";
    }


    return name
        .split(" ")
        .slice(0, 2)
        .map(
            part =>
                part.charAt(0)
        )
        .join("")
        .toUpperCase();
}


function escapeHtml(
    value
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(value ?? "");


    return div.innerHTML;
}


function escapeJsString(
    value
) {

    return String(value ?? "")
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        )
        .replace(
            /\n/g,
            "\\n"
        )
        .replace(
            /\r/g,
            "\\r"
        );
}


// ======================================================
// AUTO LOGIN
// ======================================================

async function initializeApp() {

    const token =
        getToken();


    if (!token) {
        return;
    }


    try {

        await loadCurrentUser();


        if (currentUser) {

            showApp();

            await loadDiscover();

        }

    } catch (error) {

        removeToken();
    }
}


initializeApp();