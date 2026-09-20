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


// ---------------- DONNÉES ----------------

let appointments = JSON.parse(
    localStorage.getItem("unPtitRDV_appointments")
) || [];


// ---------------- NAVIGATION ----------------

function showPage(pageId) {

    pages.forEach(page => {
        page.classList.toggle("active", page.id === pageId);
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
}


navItems.forEach(item => {

    item.addEventListener("click", () => {
        showPage(item.dataset.page);
    });

});


viewAllButton.addEventListener("click", () => {
    showPage("appointmentsPage");
});


// ---------------- MODALE ----------------

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


addButton.addEventListener("click", openModal);

closeModal.addEventListener("click", closeAppointmentModal);

modalOverlay.addEventListener("click", closeAppointmentModal);


// ---------------- FORMULAIRE ----------------

appointmentForm.addEventListener("submit", event => {

    event.preventDefault();

    const appointment = {

        id: Date.now(),

        title: titleInput.value.trim(),

        date: dateInput.value,

        time: timeInput.value,

        description: descriptionInput.value.trim()

    };


    appointments.push(appointment);

    saveAppointments();

    appointmentForm.reset();

    closeAppointmentModal();

    renderAppointments();

    showPage("appointmentsPage");
});


// ---------------- SAUVEGARDE ----------------

function saveAppointments() {

    localStorage.setItem(
        "unPtitRDV_appointments",
        JSON.stringify(appointments)
    );

}


// ---------------- AFFICHAGE ----------------

function renderAppointments() {

    appointments.sort((a, b) => {

        const dateA = new Date(`${a.date}T${a.time}`);

        const dateB = new Date(`${b.date}T${b.time}`);

        return dateA - dateB;

    });


    if (appointments.length === 0) {

        appointmentsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>

                <h3>Rien de prévu pour le moment</h3>

                <p>
                    Créez un rendez-vous pour commencer
                    votre petit calendrier.
                </p>
            </div>
        `;

        allAppointmentsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❤️</div>

                <h3>Votre calendrier est vide</h3>

                <p>
                    Ajoutez votre premier rendez-vous.
                </p>
            </div>
        `;

        nextTitle.textContent = "Aucun rendez-vous";

        nextDate.textContent =
            "Ajoutez votre premier rendez-vous ❤️";

        return;
    }


    const first = appointments[0];

    nextTitle.textContent = first.title;

    nextDate.textContent =
        `${formatDate(first.date)} à ${first.time}`;


    appointmentsList.innerHTML =
        appointments.slice(0, 3)
            .map(createAppointmentCard)
            .join("");


    allAppointmentsList.innerHTML =
        appointments
            .map(createAppointmentCard)
            .join("");

}


function createAppointmentCard(appointment) {

    const date = new Date(`${appointment.date}T${appointment.time}`);

    const day = date
        .getDate()
        .toString()
        .padStart(2, "0");

    const month = date
        .toLocaleDateString("fr-FR", {
            month: "short"
        })
        .replace(".", "")
        .toUpperCase();


    return `
        <article class="appointment-card">

            <div class="appointment-date">
                <strong>${day}</strong>
                <span>${month}</span>
            </div>

            <div class="appointment-info">

                <h3>${escapeHTML(appointment.title)}</h3>

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

        </article>
    `;
}


function formatDate(dateString) {

    const date = new Date(`${dateString}T00:00`);

    return date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });
}


// ---------------- SÉCURITÉ ----------------

function escapeHTML(text) {

    const element = document.createElement("div");

    element.textContent = text;

    return element.innerHTML;
}


// ---------------- INITIALISATION ----------------

renderAppointments();