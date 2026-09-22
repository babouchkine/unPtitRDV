// Service worker : reçoit les notifications même quand l'app est fermée.

self.addEventListener("install", () => {

    self.skipWaiting();

});

self.addEventListener("activate", event => {

    event.waitUntil(self.clients.claim());

});


self.addEventListener("push", event => {

    let payload = { title: "unPtitRDV", body: "Nouveauté sur vos rendez-vous ❤️" };

    if (event.data) {

        try {
            payload = event.data.json();
        } catch {
            payload.body = event.data.text();
        }

    }

    event.waitUntil(

        Promise.all([

            self.registration.showNotification(
                payload.title,
                {
                    body: payload.body,
                    icon: "apple-touch-icon.png",
                    badge: "favicon.svg",
                    tag: "unptitrdv",
                    renotify: true
                }
            ),

            // Signale aux onglets ouverts qu'une notification vient
            // d'arriver (utile si l'app veut réagir en direct).

            self.clients
                .matchAll()
                .then(clients =>
                    clients.forEach(client =>
                        client.postMessage({
                            type: "push-received",
                            payload
                        })
                    )
                )

        ])

    );

});


// Clic sur la notification : ouvrir l'app (ou la mettre au premier plan
// si elle est déjà ouverte dans un onglet).

self.addEventListener("notificationclick", event => {

    event.notification.close();

    event.waitUntil(

        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then(windows => {

                for (const win of windows) {

                    if ("focus" in win) {
                        return win.focus();
                    }

                }

                if (self.clients.openWindow) {
                    return self.clients.openWindow("./");
                }

            })

    );

});