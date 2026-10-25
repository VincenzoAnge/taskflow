# Architettura di TaskFlow

TaskFlow è un'applicazione **client-server**: il browser mostra le pagine e chiede i dati al server Node.js, che parla con MongoDB. Ci sono due canali di comunicazione: le **API REST** (richiesta e risposta) e **Socket.IO** (comunicazione in tempo reale).

## 1. Il percorso di una richiesta REST

```
Browser
   ↓   richiesta HTTP (fetch)
Express Routes        src/routes/       sceglie la funzione in base a metodo e URL
   ↓
Middleware            src/middleware/   controlli: login, ruolo, appartenenza al progetto
   ↓
Controller            src/controllers/  la logica vera e propria
   ↓
Mongoose              src/models/       legge e scrive i documenti
   ↓
MongoDB               il database
```

La risposta fa lo stesso percorso al contrario: il controller restituisce JSON e il browser lo mostra.

### Un esempio concreto: cambiare lo stato di un task

Richiesta: `PATCH /api/projects/65f.../tasks/66a.../status` con body `{ "status": "doing" }`.

1. **Route** (`projectRoutes.js` → `taskRoutes.js`): trova la route `PATCH /:taskId/status`.
2. **Middleware** in sequenza:
   - `protect`: legge il token JWT, carica l'utente, rifiuta se manca o è bloccato (401/403)
   - `loadProject`: carica il progetto dall'`id` nell'URL (404 se non esiste) e calcola se l'utente è proprietario o membro
   - `requireMember`: rifiuta con 403 chi non è membro
3. **Controller** (`taskController.changeStatus`): cerca il task, cambia lo stato, salva, avvisa i client con Socket.IO e risponde.
4. **Mongoose** salva il documento in MongoDB (se lo stato non è valido, la validazione fallisce con 400).

### Cosa succede se qualcosa va storto

Qualunque errore (per esempio `throw new AppError('Task non trovato', 404)`) finisce nel **middleware degli errori** (`src/middleware/errorMiddleware.js`), registrato per ultimo in `server.js`. È l'unico punto che trasforma un errore in una risposta `{ success: false, message }` con il codice HTTP giusto. Express 5 inoltra da solo gli errori delle funzioni `async`, quindi nei controller non servono blocchi `try/catch`.

## 2. Il percorso in tempo reale con Socket.IO

```
Browser
   ↔  connessione Socket.IO (WebSocket), con il token JWT
Server  (src/socket/socketServer.js)
   ↔  stanza "project:<id>" con tutti gli utenti connessi a quel progetto
```

- Alla connessione il server controlla il token (stessa funzione `getUserFromToken` usata dal middleware `protect`).
- Il client invia `joinProject`: il server verifica che sia membro e lo mette nella **stanza** del progetto.
- **Chat**: il client invia `chatMessage` → il server salva il messaggio in MongoDB → lo rimanda con `newMessage` a tutta la stanza.
- **Task**: quando un controller crea, modifica, sposta o elimina un task, chiama `io.to(stanza).emit(...)`. I browser dei membri ricevono l'evento, ricaricano la board e mostrano un toast.

Le due parti sono collegate: `server.js` crea `io` e lo salva con `app.set('io', io)`, così i controller lo ritrovano con `req.app.get('io')`.

## 3. Struttura del codice

| Cartella / file | Ruolo |
| --- | --- |
| `server.js` | crea l'app Express, registra middleware e route, avvia server e Socket.IO |
| `src/config/db.js` | connessione a MongoDB |
| `src/models/` | forma dei dati (User, Project, Task, Message) |
| `src/routes/` | associa URL e metodi ai controller e ai middleware |
| `src/controllers/` | auth, progetti, task, messaggi, dashboard, admin |
| `src/middleware/authMiddleware.js` | `protect` (login obbligatorio) e `adminOnly` |
| `src/middleware/projectMiddleware.js` | `loadProject`, `requireMember`, `requireOwner` |
| `src/middleware/errorMiddleware.js` | route non trovata ed errori centralizzati |
| `src/socket/socketServer.js` | autenticazione, stanze, chat |
| `src/utils/AppError.js` | errore con codice HTTP |
| `src/utils/seed.js` | dati demo |
| `public/` | frontend: pagine HTML, `css/style.css`, `js/` |

## 4. Il frontend

Il frontend è fatto di pagine HTML statiche servite da Express (`express.static('public')`). Ogni pagina ha un suo file JavaScript in `public/js/` e tutte usano `common.js`, che contiene:

- `api()`: funzione che chiama le API aggiungendo il token JWT
- gestione della sessione (token salvato nel `localStorage`)
- navbar condivisa, toast, card dei progetti

Ogni pagina `nome.html` ha il suo script `js/nome.js` (login e registrazione condividono `auth.js`).

Il tema scuro è quello già incluso in Bootstrap 5.3: basta l'attributo `data-bs-theme="dark"` sul tag `<html>`. Il file `css/style.css` cambia solo alcuni colori (variabili CSS all'inizio del file) e aggiunge lo stile di board, chat e card.

Il browser non ricarica mai tutta la pagina per i dati: usa `fetch`, riceve JSON e aggiorna l'HTML con JavaScript.

## 5. Sicurezza in breve

- Le password sono salvate solo come hash bcrypt.
- Ogni richiesta protetta è verificata sul **server**; i controlli nel frontend servono solo a mostrare o nascondere i pulsanti.
- I ruoli sono controllati da middleware (`adminOnly`, `requireOwner`, `requireMember`).
- Il testo scritto dagli utenti viene "escapato" prima di essere inserito nell'HTML (funzione `esc()` in `common.js`), per evitare l'iniezione di codice.
- I segreti stanno nel file `.env`, che non finisce su Git.
