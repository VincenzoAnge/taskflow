# API di TaskFlow

Tutti gli URL partono da `/api`. Le richieste con un body usano JSON (`Content-Type: application/json`).

## Formato delle risposte

Successo:

```json
{ "success": true, "data": { } }
```

Errore:

```json
{ "success": false, "message": "Messaggio di errore" }
```

## Autenticazione e ruoli

Gli endpoint protetti richiedono l'header:

```
Authorization: Bearer <token>
```

Il token si ottiene con login o registrazione. Nelle schede sotto:

- **Autenticazione**: *no* = pubblico, *sì* = serve il token
- **Ruolo richiesto**: *utente* = qualsiasi utente loggato, *membro* = membro del progetto, *proprietario* = owner del progetto, *admin* = ruolo admin

Errori comuni a tutti gli endpoint protetti:

| Codice | Quando |
| --- | --- |
| 401 | token mancante, non valido o scaduto |
| 403 | account bloccato oppure permessi insufficienti |
| 400 | ID non valido o dati non validi |
| 404 | risorsa non trovata |
| 500 | errore imprevisto del server |

## Codici HTTP usati

| Codice | Significato |
| --- | --- |
| 200 | OK |
| 201 | Creato |
| 400 | Richiesta non valida |
| 401 | Non autenticato |
| 403 | Non autorizzato |
| 404 | Non trovato |
| 500 | Errore interno |

---

## Auth

### POST `/api/auth/register`

- **Autenticazione**: no
- **Ruolo richiesto**: nessuno
- **Body**:
  ```json
  { "name": "Mario Rossi", "email": "mario@example.com", "password": "secret123" }
  ```
- **Risposta**:
  ```json
  { "success": true, "data": { "token": "eyJ...", "user": { "id": "...", "name": "Mario Rossi", "email": "mario@example.com", "role": "user" } } }
  ```
- **Codici**: 201 creato; 400 campi mancanti, password sotto i 6 caratteri o email già registrata

### POST `/api/auth/login`

- **Autenticazione**: no
- **Ruolo richiesto**: nessuno
- **Body**: `{ "email": "mario@taskflow.dev", "password": "User123!" }`
- **Risposta**: come la registrazione (`token` e `user`)
- **Codici**: 200 ok; 400 campi mancanti; 401 email o password errate; 403 account bloccato

### GET `/api/auth/me`

- **Autenticazione**: sì
- **Ruolo richiesto**: utente
- **Body**: nessuno
- **Risposta**: `{ "success": true, "data": { "id": "...", "name": "...", "email": "...", "role": "user" } }`
- **Codici**: 200; 401; 403

---

## Users

### GET `/api/users/me/dashboard`

- **Autenticazione**: sì
- **Ruolo richiesto**: utente
- **Body**: nessuno
- **Risposta**:
  ```json
  {
    "success": true,
    "data": {
      "stats": { "projects": 4, "todo": 1, "doing": 3, "done": 1 },
      "createdProjects": [ ],
      "memberProjects": [ ],
      "tasks": [ ]
    }
  }
  ```
  `createdProjects` sono i progetti di cui sei proprietario, `memberProjects` quelli di altri a cui partecipi, `tasks` i task assegnati a te ordinati per scadenza (quelli senza scadenza in fondo).
- **Codici**: 200; 401; 403

---

## Projects

I campi di un progetto sono descritti in [DATABASE.md](DATABASE.md).

### GET `/api/projects/public`

- **Autenticazione**: no
- **Ruolo richiesto**: nessuno
- **Query string** (tutte facoltative): `category=Web`, `technology=node`, `sort=newest` oppure `sort=oldest`
- **Risposta**: lista dei progetti pubblici non archiviati, con `owner.name`
- **Codici**: 200

### POST `/api/projects`

- **Autenticazione**: sì
- **Ruolo richiesto**: utente (diventa il proprietario)
- **Body**:
  ```json
  {
    "title": "Il mio progetto",
    "description": "Cosa fa",
    "category": "Web",
    "technologies": ["node", "express"],
    "visibility": "public",
    "coverImage": ""
  }
  ```
  Solo `title` è obbligatorio.
- **Risposta**: il progetto creato
- **Codici**: 201; 400 titolo mancante o `visibility` non valida; 401

### GET `/api/projects/:id`

- **Autenticazione**: sì
- **Ruolo richiesto**: utente (un progetto privato solo per membri e admin)
- **Risposta**: il progetto con `owner` e `members` (nome ed email) più i campi `isOwner` e `isMember` calcolati per l'utente corrente
- **Codici**: 200; 400 ID non valido; 403 progetto privato; 404

### PUT `/api/projects/:id`

- **Autenticazione**: sì
- **Ruolo richiesto**: proprietario
- **Body**: uno o più tra `title`, `description`, `category`, `technologies`, `visibility`, `coverImage`
- **Risposta**: il progetto aggiornato
- **Codici**: 200; 400 dati non validi; 403 non sei il proprietario; 404

### DELETE `/api/projects/:id`

- **Autenticazione**: sì
- **Ruolo richiesto**: proprietario
- **Effetto**: elimina anche tutti i task e i messaggi del progetto
- **Risposta**: `{ "success": true, "data": { "message": "Progetto eliminato" } }`
- **Codici**: 200; 403; 404

### PATCH `/api/projects/:id/archive`

- **Autenticazione**: sì
- **Ruolo richiesto**: proprietario
- **Effetto**: inverte il valore di `archived` (archivia o ripristina). Un progetto archiviato non compare in "Esplora" e non si può più entrare.
- **Risposta**: il progetto aggiornato
- **Codici**: 200; 403; 404

### POST `/api/projects/:id/members`

- **Autenticazione**: sì
- **Ruolo richiesto**: proprietario
- **Body**: `{ "email": "giulia@taskflow.dev" }`
- **Risposta**: la lista aggiornata dei membri (`_id`, `name`, `email`)
- **Codici**: 201; 400 email mancante o utente già membro; 403; 404 nessun utente con quell'email

### DELETE `/api/projects/:id/members/:userId`

- **Autenticazione**: sì
- **Ruolo richiesto**: proprietario
- **Effetto**: toglie l'utente dai membri, svuota l'assegnatario dei suoi task e lo esce dalla chat in corso
- **Risposta**: la lista aggiornata dei membri
- **Codici**: 200; 400 se si prova a rimuovere il proprietario; 403; 404

### POST `/api/projects/:id/join`

- **Autenticazione**: sì
- **Ruolo richiesto**: utente
- **Effetto**: l'utente entra da solo in un progetto pubblico e non archiviato
- **Risposta**: il progetto
- **Codici**: 200; 400 già membro; 403 progetto privato o archiviato; 404

### POST `/api/projects/:id/leave`

- **Autenticazione**: sì
- **Ruolo richiesto**: membro (non proprietario)
- **Risposta**: `{ "success": true, "data": { "message": "Hai lasciato il progetto" } }`
- **Codici**: 200; 400 non sei membro oppure sei il proprietario; 404

### GET `/api/projects/:id/messages`

- **Autenticazione**: sì
- **Ruolo richiesto**: membro
- **Risposta**: gli ultimi 50 messaggi della chat, dal più vecchio al più recente, con `user.name`
- **Codici**: 200; 403; 404

---

## Tasks

Tutti gli endpoint dei task richiedono di essere **membri** del progetto.

### GET `/api/projects/:id/tasks`

- **Autenticazione**: sì
- **Ruolo richiesto**: membro
- **Risposta**: lista dei task del progetto con `assignee.name`
- **Codici**: 200; 403; 404

### POST `/api/projects/:id/tasks`

- **Autenticazione**: sì
- **Ruolo richiesto**: membro
- **Body**:
  ```json
  {
    "title": "Scrivere la home",
    "description": "Prima versione",
    "assignee": "<id di un membro>",
    "dueDate": "2026-12-31",
    "priority": "medium",
    "status": "todo"
  }
  ```
  Solo `title` è obbligatorio. `assignee` deve essere un membro del progetto (oppure vuoto). `priority`: `low`, `medium`, `high`. `status`: `todo`, `doing`, `done`.
- **Risposta**: il task creato
- **Codici**: 201; 400 titolo mancante, valori non validi o assegnatario non membro; 403; 404
- **Realtime**: evento `taskCreated`

### PUT `/api/projects/:id/tasks/:taskId`

- **Autenticazione**: sì
- **Ruolo richiesto**: membro
- **Body**: uno o più tra `title`, `description`, `assignee`, `dueDate`, `priority` (stringa vuota in `assignee` o `dueDate` li svuota)
- **Risposta**: il task aggiornato
- **Codici**: 200; 400; 403; 404
- **Realtime**: `taskAssigned` se cambia l'assegnatario, altrimenti `taskUpdated`

### PATCH `/api/projects/:id/tasks/:taskId/status`

- **Autenticazione**: sì
- **Ruolo richiesto**: membro
- **Body**: `{ "status": "doing" }`
- **Risposta**: il task aggiornato
- **Codici**: 200; 400 stato non valido; 403; 404
- **Realtime**: evento `taskMoved`

### DELETE `/api/projects/:id/tasks/:taskId`

- **Autenticazione**: sì
- **Ruolo richiesto**: membro
- **Risposta**: `{ "success": true, "data": { "message": "Task eliminato" } }`
- **Codici**: 200; 403; 404
- **Realtime**: evento `taskDeleted`

---

## Admin

Tutte le route sotto `/api/admin` richiedono il token di un utente con ruolo `admin`: un utente normale riceve 403.

### GET `/api/admin/users`

- **Autenticazione**: sì
- **Ruolo richiesto**: admin
- **Risposta**: lista di tutti gli utenti (la password non viene mai inviata)
- **Codici**: 200; 401; 403

### PATCH `/api/admin/users/:id/block`

- **Autenticazione**: sì
- **Ruolo richiesto**: admin
- **Effetto**: blocca o sblocca l'utente. Un utente bloccato non può più fare login e le sue connessioni Socket.IO vengono chiuse.
- **Risposta**: l'utente aggiornato
- **Codici**: 200; 400 se si prova a bloccare un admin; 403; 404

### GET `/api/admin/projects`

- **Autenticazione**: sì
- **Ruolo richiesto**: admin
- **Risposta**: tutti i progetti (anche privati e archiviati) con `owner.name` e `owner.email`
- **Codici**: 200; 401; 403

### PATCH `/api/admin/projects/:id/archive`

- **Autenticazione**: sì
- **Ruolo richiesto**: admin
- **Effetto**: archivia o ripristina il progetto. Un progetto archiviato sparisce da "Esplora", quindi è "nascosto" al pubblico.
- **Risposta**: il progetto aggiornato
- **Codici**: 200; 403; 404

---

## Eventi Socket.IO

Il client si collega passando il token:

```js
const socket = io({ auth: { token } });
```

Senza token valido la connessione viene rifiutata (`connect_error`).

### Dal client al server

| Evento | Dati | Cosa succede |
| --- | --- | --- |
| `joinProject` | `projectId` | se l'utente è membro entra nella stanza `project:<id>` |
| `chatMessage` | `{ projectId, message }` | il messaggio viene salvato nel database e inviato a tutta la stanza |

### Dal server al client

| Evento | Dati | Quando |
| --- | --- | --- |
| `joined` | `projectId` | dopo `joinProject` riuscito |
| `errorMessage` | testo | non sei membro, messaggio non inviato, ID non valido |
| `newMessage` | messaggio con `user.name` | nuovo messaggio di chat |
| `taskCreated` | `{ task, by }` | task creato |
| `taskUpdated` | `{ task, by }` | task modificato |
| `taskMoved` | `{ task, by }` | stato del task cambiato |
| `taskAssigned` | `{ task, by }` | assegnatario cambiato |
| `taskDeleted` | `{ task, by }` | task eliminato |

`by` contiene `id` e `name` di chi ha fatto l'azione.
