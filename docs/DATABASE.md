# Database di TaskFlow

TaskFlow usa **MongoDB**, un database a documenti, e **Mongoose** per descrivere i dati. Ci sono quattro collezioni: `users`, `projects`, `tasks`, `messages`. I modelli sono in `src/models/`.

## Schema delle relazioni

```
User ──< Project.owner        (un utente può creare molti progetti)
User >──< Project.members     (molti utenti partecipano a molti progetti)
Project ──< Task.project      (un progetto ha molti task)
User ──< Task.assignee        (un utente può avere molti task assegnati)
Project ──< Message.project   (un progetto ha molti messaggi)
User ──< Message.user         (un utente scrive molti messaggi)
```

In MongoDB le relazioni si fanno salvando l'`_id` dell'altro documento. Mongoose, con `populate`, sostituisce l'id con i dati veri (per esempio il nome dell'utente).

## User (`src/models/User.js`)

| Campo | Tipo | Note |
| --- | --- | --- |
| `name` | String | obbligatorio |
| `email` | String | obbligatorio, **unico**, salvata in minuscolo |
| `password` | String | obbligatorio, salvata come **hash bcrypt**; `select: false` quindi non viene letta se non richiesta |
| `role` | String | `user` (default) oppure `admin` |
| `blocked` | Boolean | `false` di default; se `true` l'utente non può accedere |
| `createdAt` | Date | data di registrazione |

## Project (`src/models/Project.js`)

| Campo | Tipo | Note |
| --- | --- | --- |
| `title` | String | obbligatorio |
| `description` | String | facoltativa |
| `category` | String | per esempio Web, Mobile, Dati, Gioco, Altro (default `Altro`) |
| `technologies` | [String] | salvate in minuscolo, per il filtro di "Esplora" |
| `visibility` | String | `public` (default) oppure `private` |
| `coverImage` | String | URL di un'immagine, facoltativo |
| `owner` | ObjectId → User | il proprietario, obbligatorio |
| `members` | [ObjectId → User] | tutti i partecipanti, **il proprietario incluso** |
| `archived` | Boolean | `false` di default |
| `createdAt` | Date | data di creazione |

Il proprietario è inserito anche in `members`: così per sapere se un utente può vedere task e chat basta controllare `members`, senza casi speciali.

## Task (`src/models/Task.js`)

| Campo | Tipo | Note |
| --- | --- | --- |
| `title` | String | obbligatorio |
| `description` | String | facoltativa |
| `project` | ObjectId → Project | obbligatorio |
| `assignee` | ObjectId → User | facoltativo (`null` = non assegnato); deve essere membro del progetto |
| `dueDate` | Date | facoltativa |
| `priority` | String | `low`, `medium` (default), `high` |
| `status` | String | `todo` (default), `doing`, `done` |
| `createdAt` | Date | data di creazione |

## Message (`src/models/Message.js`)

| Campo | Tipo | Note |
| --- | --- | --- |
| `project` | ObjectId → Project | obbligatorio |
| `user` | ObjectId → User | l'autore, obbligatorio |
| `message` | String | testo (senza spazi iniziali e finali), obbligatorio |
| `createdAt` | Date | data di invio |

## Cosa succede quando si cancella qualcosa

MongoDB non cancella da solo i documenti collegati: lo facciamo noi nel codice.

- **Elimina progetto** (`deleteProject`): vengono eliminati anche tutti i suoi task e messaggi.
- **Rimuovi o lascia progetto**: l'utente esce da `members` e i task che aveva assegnati tornano senza assegnatario (`assignee: null`).
- Gli utenti non vengono mai eliminati: l'admin può solo bloccarli.

## Interrogazioni più importanti

| Cosa serve | Query (semplificata) |
| --- | --- |
| Progetti pubblici | `Project.find({ visibility: 'public', archived: false })` |
| Progetti di cui sono proprietario | `Project.find({ owner: userId })` |
| Progetti di cui sono solo membro | `Project.find({ members: userId, owner: { $ne: userId } })` |
| Task assegnati a me | `Task.find({ assignee: userId })` |
| Task di un progetto | `Task.find({ project: projectId })` |
| Ultimi messaggi di un progetto | `Message.find({ project: projectId }).sort({ createdAt: -1 }).limit(50)` |

## Dati demo

`npm run seed` ricrea il database con 3 utenti (un admin e due utenti), 5 progetti (uno privato e uno archiviato), 11 task e 3 messaggi di chat.
