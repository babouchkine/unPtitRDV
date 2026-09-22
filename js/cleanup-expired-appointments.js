// Supprime automatiquement les rendez-vous dont la date et l'heure sont dépassées.
// La vérification est faite côté client et relancée régulièrement afin qu'un
// rendez-vous soit supprimé même si l'application reste ouverte.

const cleanupSupabaseUrl = "https://tuqeyfvggtateqqjqwbd.supabase.co";
const cleanupSupabaseKey = "sb_publishable_oyjYMgXgXSIZ169w6wGBKg_E_Dri91S";
const cleanupDb = window.supabase.createClient(
    cleanupSupabaseUrl,
    cleanupSupabaseKey
);

let cleanupTimer = null;
let cleanupInProgress = false;

function appointmentDate(appointment) {
    return new Date(`${appointment.date}T${appointment.time}`);
}

async function removeExpiredAppointments() {
    if (cleanupInProgress) {
        return;
    }

    cleanupInProgress = true;

    try {
        const { data: appointments, error: loadError } = await cleanupDb
            .from("appointments")
            .select("id, title, date, time");

        if (loadError) {
            console.error("Impossible de vérifier les rendez-vous expirés :", loadError);
            return;
        }

        const now = new Date();
        const expiredAppointments = appointments.filter(appointment => {
            const date = appointmentDate(appointment);
            return !Number.isNaN(date.getTime()) && date < now;
        });

        for (const appointment of expiredAppointments) {
            const { error: deleteError } = await cleanupDb
                .from("appointments")
                .delete()
                .eq("id", appointment.id);

            if (deleteError) {
                console.error(
                    `Impossible de supprimer le rendez-vous « ${appointment.title} » :`,
                    deleteError
                );
            }
        }
    } finally {
        cleanupInProgress = false;
    }
}

function startExpiredAppointmentsCleanup() {
    if (cleanupTimer !== null) {
        return;
    }

    removeExpiredAppointments();
    cleanupTimer = window.setInterval(removeExpiredAppointments, 60 * 1000);
}

function stopExpiredAppointmentsCleanup() {
    if (cleanupTimer === null) {
        return;
    }

    window.clearInterval(cleanupTimer);
    cleanupTimer = null;
}

cleanupDb.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        startExpiredAppointmentsCleanup();
    }
});

cleanupDb.auth.onAuthStateChange(event => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        startExpiredAppointmentsCleanup();
    }

    if (event === "SIGNED_OUT") {
        stopExpiredAppointmentsCleanup();
    }
});
