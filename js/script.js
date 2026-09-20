const addButton = document.getElementById("addButton");
const modal = document.getElementById("appointmentModal");
const closeModal = document.getElementById("closeModal");
const modalOverlay = document.getElementById("modalOverlay");

const appointmentForm = document.getElementById("appointmentForm");

const titleInput = document.getElementById("titleInput");
const dateInput = document.getElementById("dateInput");
const timeInput = document.getElementById("timeInput");
const descriptionInput = document.getElementById("descriptionInput");

const appointmentsList = document.getElementById("appointmentsList");
const allAppointmentsList = document.getElementById("allAppointmentsList");

const nextTitle = document.getElementById("nextTitle");
const nextDate = document.getElementById("nextDate");

const viewAllButton = document.getElementById("viewAllButton");

const pages = document.querySelectorAll(".page");
const navItems = document.querySelectorAll(".nav-item");

const notificationButton = document.getElementById("notificationButton");


// Connexion / déconnexion

const appElement = document.getElementById("app");
const authScreen = document.getElementById("authScreen");

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");

const logoutButton = document.getElementById("logoutButton");


// =====================================================
// SUPABASE
// =====================================================

// Ces deux valeurs sont publiques : la sécurité repose sur les
// policies RLS côté Supabase.
//
// ⚠️ Utilise la clé « publishable » (ou « anon »).
// Ne mets JAMAIS la clé « secret » / « service_role » ici.

const SUPABASE_URL = "https://tuqeyfvggtateqqjqwbd.supabase.co";
const SUPABASE_KEY = "sb_publishable_oyjYMgXgXSIZ169w6wGBKg_E_Dri91S";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// =====================================================
// UTILISATEUR ACTUEL
// =====================================================

// Rempli après la connexion (voir startApp).

let currentUserId = null;

let currentUserName = "";


// =====================================================
// DONNÉES
// =====================================================

// Les données vivent maintenant dans Supabase.
// Ces variables sont juste une copie locale pour l'affichage.

let appointments = [];

let activities = [];

let realtimeChannel = null;

let appStarted = false;


function showError(message) {

    alert(message);

}


async function loadAppointments() {

    const { data, error } =
        await db
            .from("appointments")
            .select("*")
            .order("date")
            .order("time");


    if (error) {

        console.error(error);

        showError(
            "Impossible de charger les rendez-vous."
        );

        return;

    }


    appointments = data;

    renderAppointments();

}


async function loadActivities() {

    const { data, error } =
        await db
            .from("activities")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);


    if (error) {

        console.error(error);

        return;

    }


    // On garde le même format qu'avant pour l'affichage.

    activities = data.map(row => ({

        id: row.id,

        type: row.type,

        user: row.user_name,

        appointmentTitle: row.appointment_title,

        createdBy: row.created_by,

        createdAt: new Date(row.created_at).getTime()

    }));


    // Si on est déjà sur la page Activité,
    // les nouveautés sont lues immédiatement.

    if (
        document
            .getElementById("notificationsPage")
            .classList.contains("active")
    ) {

        localStorage.setItem(
            "unPtitRDV_lastActivityVisit",
            Date.now()
        );

    }


    renderActivities();

    updateNotificationBadge();

}


// =====================================================
// NAVIGATION
// =====================================================

function showPage(pageId) {

    pages.forEach(page => {

        page.classList.toggle(
            "active",
            page.id === pageId
        );

    });


    navItems.forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.page === pageId
        );

    });


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    // Lorsqu'on ouvre Activité,
    // on considère les notifications comme lues.

    if (pageId === "notificationsPage") {

        localStorage.setItem(
            "unPtitRDV_lastActivityVisit",
            Date.now()
        );

        updateNotificationBadge();

    }

}


navItems.forEach(item => {

    item.addEventListener("click", () => {

        showPage(item.dataset.page);

    });

});

// =====================================================
// BOUTON NOTIFICATIONS
// =====================================================

notificationButton.addEventListener("click", () => {

    showPage("notificationsPage");

});


viewAllButton.addEventListener("click", () => {

    showPage("appointmentsPage");

});


// =====================================================
// MODALE
// =====================================================

function openModal() {

    modal.classList.remove("hidden");

    document.body.style.overflow = "hidden";

    setTimeout(() => {

        titleInput.focus();

    }, 100);

}


function closeAppointmentModal() {

    modal.classList.add("hidden");

    document.body.style.overflow = "";

}


addButton.addEventListener(
    "click",
    openModal
);


closeModal.addEventListener(
    "click",
    closeAppointmentModal
);


modalOverlay.addEventListener(
    "click",
    closeAppointmentModal
);


// =====================================================
// AJOUT D'UN RENDEZ-VOUS
// =====================================================

appointmentForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const submitButton =
            appointmentForm.querySelector(
                ".submit-button"
            );

        submitButton.disabled = true;


        // created_by et created_at sont remplis
        // automatiquement par la base de données.

        const { data, error } =
            await db
                .from("appointments")
                .insert({

                    title: titleInput.value.trim(),

                    date: dateInput.value,

                    time: timeInput.value,

                    description:
                        descriptionInput.value.trim()

                })
                .select()
                .single();


        submitButton.disabled = false;


        if (error) {

            console.error(error);

            showError(
                "Le rendez-vous n'a pas pu être ajouté."
            );

            return;

        }


        // Créer automatiquement une activité.

        await addActivity({

            type: "appointment_created",

            appointmentTitle: data.title

        });


        appointmentForm.reset();

        closeAppointmentModal();

        await Promise.all([
            loadAppointments(),
            loadActivities()
        ]);

        showPage("appointmentsPage");

    }
);


// =====================================================
// SUPPRESSION D'UN RENDEZ-VOUS
// =====================================================

async function deleteAppointment(appointmentId) {

    const appointment = appointments.find(
        appointment => appointment.id === appointmentId
    );

    if (!appointment) {
        return;
    }


    const confirmed = confirm(
        `Supprimer le rendez-vous « ${appointment.title} » ?`
    );


    if (!confirmed) {
        return;
    }


    // .select() renvoie les lignes réellement supprimées :
    // si la liste est vide, c'est qu'une policy a refusé.

    const { data, error } =
        await db
            .from("appointments")
            .delete()
            .eq("id", appointmentId)
            .select();


    if (error || !data || data.length === 0) {

        console.error(error);

        showError(
            "Le rendez-vous n'a pas pu être supprimé."
        );

        return;

    }


    await addActivity({

        type: "appointment_deleted",

        appointmentTitle: appointment.title

    });


    await Promise.all([
        loadAppointments(),
        loadActivities()
    ]);

}


// =====================================================
// ACTIVITÉS
// =====================================================

async function addActivity({ type, appointmentTitle }) {

    const { error } =
        await db
            .from("activities")
            .insert({

                type: type,

                user_name: currentUserName,

                appointment_title: appointmentTitle

            });


    if (error) {

        console.error(
            "Activité non enregistrée :",
            error
        );

    }

}


function renderActivities() {

    const activityContainer =
        document.getElementById(
            "activityList"
        );


    if (!activityContainer) {
        return;
    }


    if (activities.length === 0) {

        activityContainer.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ❤️
                </div>

                <h3>
                    Rien pour le moment
                </h3>

                <p>
                    Les nouveautés de votre petit monde
                    apparaîtront ici.
                </p>

            </div>

        `;

        return;

    }


    activityContainer.innerHTML =
        activities
            .map(createActivityCard)
            .join("");

}


function createActivityCard(activity) {

    let icon = "❤️";

    let text = "";


    if (
        activity.type ===
        "appointment_created"
    ) {

        text = `
            <strong>
                ${escapeHTML(activity.user)}
                a ajouté un rendez-vous
            </strong>

            <p>
                « ${escapeHTML(activity.appointmentTitle)} »
            </p>
        `;

    }

    if (
    activity.type ===
    "appointment_deleted"
    ) {

        icon = "🗑️";

        text = `
            <strong>
               ${escapeHTML(activity.user)}
                a supprimé un rendez-vous
            </strong>

            <p>
                « ${escapeHTML(activity.appointmentTitle)} »
            </p>
    `;

    }


    return `

        <div class="activity-card">

            <div class="activity-icon">
                ${icon}
            </div>

            <div class="activity-content">

                ${text}

                <span class="activity-time">
                    ${formatRelativeTime(
                        activity.createdAt
                    )}
                </span>

            </div>

        </div>

    `;

}


// =====================================================
// BADGE NOTIFICATION
// =====================================================

function updateNotificationBadge() {

    const button =
        document.getElementById(
            "notificationButton"
        );


    const navActivity =
        document.querySelector(
            '[data-page="notificationsPage"]'
        );


    if (!button || !navActivity) {
        return;
    }


    const lastVisit =
        Number(
            localStorage.getItem(
                "unPtitRDV_lastActivityVisit"
            )
        ) || 0;


    // Seules les actions de l'autre personne comptent :
    // inutile d'être notifié de ce qu'on vient de faire soi-même.

    const hasNew =
        activities.some(
            activity =>
                activity.createdAt > lastVisit &&
                activity.createdBy !== currentUserId
        );


    button.classList.toggle(
        "has-notification",
        hasNew
    );


    navActivity.classList.toggle(
        "has-notification",
        hasNew
    );

}


// =====================================================
// RENDEZ-VOUS
// =====================================================

function renderAppointments() {

    appointments.sort(
        (a, b) => {

            const dateA =
                new Date(
                    `${a.date}T${a.time}`
                );

            const dateB =
                new Date(
                    `${b.date}T${b.time}`
                );

            return dateA - dateB;

        }
    );


    if (appointments.length === 0) {

        appointmentsList.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    📅
                </div>

                <h3>
                    Rien de prévu pour le moment
                </h3>

                <p>
                    Créez un rendez-vous pour commencer
                    votre petit calendrier.
                </p>

            </div>

        `;


        allAppointmentsList.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ❤️
                </div>

                <h3>
                    Votre calendrier est vide
                </h3>

                <p>
                    Ajoutez votre premier rendez-vous.
                </p>

            </div>

        `;


        nextTitle.textContent =
            "Aucun rendez-vous";


        nextDate.textContent =
            "Ajoutez votre premier rendez-vous ❤️";


        return;

    }


    const first = appointments[0];


    nextTitle.textContent =
        first.title;


    nextDate.textContent =
        `${formatDate(first.date)}
        à ${formatTime(first.time)}`;


    appointmentsList.innerHTML =
        appointments
            .slice(0, 3)
            .map(createAppointmentCard)
            .join("");


    allAppointmentsList.innerHTML =
        appointments
            .map(createAppointmentCard)
            .join("");

}

function createAppointmentCard(appointment) {

    const date =
        new Date(
            `${appointment.date}T${appointment.time}`
        );


    const day =
        date
            .getDate()
            .toString()
            .padStart(2, "0");


    const month =
        date
            .toLocaleDateString(
                "fr-FR",
                {
                    month: "short"
                }
            )
            .replace(".", "")
            .toUpperCase();


    return `

        <article class="appointment-card">

            <div class="appointment-date">

                <strong>
                    ${day}
                </strong>

                <span>
                    ${month}
                </span>

            </div>


            <div class="appointment-info">

                <h3>
                    ${escapeHTML(
                        appointment.title
                    )}
                </h3>

                <p>
                    ${escapeHTML(
                        appointment.description ||
                        "Un petit moment à deux ❤️"
                    )}
                </p>

            </div>


            <div class="appointment-time">

                ${formatTime(appointment.time)}

            </div>


            <button
                class="delete-appointment-button"
                onclick="deleteAppointment(${appointment.id})"
                aria-label="Supprimer le rendez-vous"
                title="Supprimer"
            >
                🗑️
            </button>

        </article>

    `;

}

// =====================================================
// DATES
// =====================================================

function formatDate(dateString) {

    const date =
        new Date(
            `${dateString}T00:00`
        );


    return date.toLocaleDateString(
        "fr-FR",
        {
            weekday: "long",
            day: "numeric",
            month: "long"
        }
    );

}


function formatRelativeTime(timestamp) {

    const difference =
        Date.now() - timestamp;


    const seconds =
        Math.floor(
            difference / 1000
        );


    if (seconds < 10) {

        return "À l'instant";

    }


    if (seconds < 60) {

        return `Il y a ${seconds} secondes`;

    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    if (minutes < 60) {

        return `Il y a ${minutes} min`;

    }


    const hours =
        Math.floor(
            minutes / 60
        );


    if (hours < 24) {

        return `Il y a ${hours} h`;

    }


    const days =
        Math.floor(
            hours / 24
        );


    if (days === 1) {

        return "Hier";

    }


    return `Il y a ${days} jours`;

}




// La colonne SQL "time" renvoie « 19:30:00 » : on garde « 19:30 ».

function formatTime(timeString) {

    return timeString.slice(0, 5);

}


// =====================================================
// SÉCURITÉ
// =====================================================

function escapeHTML(text) {

    const element =
        document.createElement("div");


    element.textContent = text;


    return element.innerHTML;

}




// =====================================================
// CONNEXION
// =====================================================

// Le prénom affiché vient du "display_name" du compte Supabase.
// À défaut, on utilise le début de l'adresse email.

function displayNameOf(user) {

    const name = user.user_metadata?.display_name;

    if (name) {
        return name;
    }

    const local = user.email.split("@")[0];

    return local.charAt(0).toUpperCase() + local.slice(1);

}


function showLogin() {

    appElement.hidden = true;

    authScreen.hidden = false;

    passwordInput.value = "";

}


async function startApp(user) {

    if (appStarted) {
        return;
    }

    appStarted = true;


    currentUserId = user.id;

    currentUserName = displayNameOf(user);


    authScreen.hidden = true;

    appElement.hidden = false;


    await Promise.all([
        loadAppointments(),
        loadActivities()
    ]);


    subscribeToChanges();

}


function stopApp() {

    appStarted = false;


    if (realtimeChannel) {

        db.removeChannel(realtimeChannel);

        realtimeChannel = null;

    }


    appointments = [];

    activities = [];

    currentUserId = null;

    currentUserName = "";


    renderAppointments();

    renderActivities();

    updateNotificationBadge();

    showPage("homePage");

    showLogin();

}


loginForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        loginError.textContent = "";

        loginButton.disabled = true;


        const { data, error } =
            await db.auth.signInWithPassword({

                email: emailInput.value.trim(),

                password: passwordInput.value

            });


        loginButton.disabled = false;


        if (error) {

            loginError.textContent =
                "Email ou mot de passe incorrect.";

            return;

        }


        await startApp(data.user);

    }
);


logoutButton.addEventListener(
    "click",
    async () => {

        await db.auth.signOut();

    }
);


// Se déclenche aussi si la session expire.

db.auth.onAuthStateChange(
    event => {

        if (event === "SIGNED_OUT") {

            stopApp();

        }

    }
);


// =====================================================
// TEMPS RÉEL
// =====================================================

// Dès que l'autre personne ajoute ou supprime quelque chose,
// on recharge automatiquement.

function subscribeToChanges() {

    realtimeChannel =
        db
            .channel("unptitrdv")

            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "appointments"
                },
                () => loadAppointments()
            )

            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "activities"
                },
                () => loadActivities()
            )

            .subscribe();

}


// =====================================================
// INITIALISATION
// =====================================================

async function init() {

    if (SUPABASE_KEY.startsWith("COLLE_ICI")) {

        showLogin();

        loginError.textContent =
            "Clé Supabase manquante (js/script.js).";

        return;

    }


    const { data: { session } } =
        await db.auth.getSession();


    if (session) {

        await startApp(session.user);

    } else {

        showLogin();

    }

}


init();