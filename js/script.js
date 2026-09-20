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


// =====================================================
// UTILISATEUR ACTUEL
// =====================================================

// Pour l'instant nous sommes en mode test.
// Plus tard, cette valeur viendra du compte connecté.

const currentUser = "Sacha";


// =====================================================
// DONNÉES
// =====================================================

let appointments =
    JSON.parse(
        localStorage.getItem("unPtitRDV_appointments")
    ) || [];


let activities =
    JSON.parse(
        localStorage.getItem("unPtitRDV_activities")
    ) || [];


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
    event => {

        event.preventDefault();


        const appointment = {

            id: Date.now(),

            title: titleInput.value.trim(),

            date: dateInput.value,

            time: timeInput.value,

            description:
                descriptionInput.value.trim(),

            createdBy: currentUser,

            createdAt: Date.now()

        };


        appointments.push(appointment);


        saveAppointments();


        // Créer automatiquement une activité.

        addActivity({

            type: "appointment_created",

            user: currentUser,

            appointmentTitle: appointment.title,

            appointmentId: appointment.id

        });


        appointmentForm.reset();

        closeAppointmentModal();

        renderAppointments();

        renderActivities();

        updateNotificationBadge();

        showPage("appointmentsPage");

    }
);


// =====================================================
// SAUVEGARDE
// =====================================================

function saveAppointments() {

    localStorage.setItem(

        "unPtitRDV_appointments",

        JSON.stringify(appointments)

    );

}

// =====================================================
// SUPPRESSION D'UN RENDEZ-VOUS
// =====================================================

function deleteAppointment(appointmentId) {

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


    // Supprimer le rendez-vous

    appointments = appointments.filter(
        appointment => appointment.id !== appointmentId
    );


    saveAppointments();


    // Ajouter une activité

    addActivity({

        type: "appointment_deleted",

        user: currentUser,

        appointmentTitle: appointment.title,

        appointmentId: appointment.id

    });


    // Actualiser l'affichage

    renderAppointments();

    renderActivities();

    updateNotificationBadge();

}


// =====================================================
// ACTIVITÉS
// =====================================================

function addActivity(data) {

    const activity = {

        id: Date.now(),

        ...data,

        createdAt: Date.now()

    };


    activities.unshift(activity);


    localStorage.setItem(

        "unPtitRDV_activities",

        JSON.stringify(activities)

    );

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


    const hasNew =
        activities.some(
            activity =>
                activity.createdAt > lastVisit
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
        à ${first.time}`;


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

                ${appointment.time}

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
// INITIALISATION
// =====================================================

renderAppointments();

renderActivities();

updateNotificationBadge();