# TaskFlow - Report finale

## Funzionalità completate

**Autenticazione e utenti**
- [x] Registrazione, login, logout
- [x] Token JWT (scadenza 7 giorni) e password cifrate con bcrypt
- [x] Ruoli `user` e `admin`
- [x] Utenti bloccati: login rifiutato e token già emessi non più validi

**Progetti**
- [x] Creazione, visualizzazione, modifica, eliminazione
- [x] Archiviazione / ripristino
- [x] Proprietà tramite campo `owner`; solo il proprietario modifica e gestisce i membri
- [x] Aggiunta e rimozione dei membri (per email)
- [x] Ingresso e uscita autonoma dai progetti pubblici
- [x] Progetti pubblici e privati

**Task e board**
- [x] Creazione, modifica, eliminazione, assegnazione, scadenza e priorità
- [x] Board Kanban a tre colonne: Da fare, In corso, Completato
- [x] Cambio stato con menu a tendina e con drag and drop

**Dashboard ed esplora**
- [x] Dashboard con card riepilogative, progetti creati, progetti a cui si partecipa, task ordinati per scadenza
- [x] Pagina "Esplora progetti" con filtro per categoria e tecnologia e ordinamento per data

**Tempo reale (Socket.IO)**
- [x] Chat di progetto accessibile solo ai membri, messaggi salvati nel database
- [x] Eventi per task creato, modificato, spostato, assegnato, eliminato con toast Bootstrap
- [x] Chi viene rimosso da un progetto esce subito dalla chat

**Amministrazione**
- [x] Pagina admin: utenti, blocco/sblocco, progetti, archiviazione
- [x] Endpoint protetti da middleware

**Qualità e documentazione**
- [x] Middleware centralizzato per gli errori, risposte JSON uniformi, codici HTTP corretti
- [x] Script `npm run seed` con dati demo
- [x] Collection Postman completa
- [x] README, API, DATABASE, ARCHITECTURE, SETUP, STUDY_GUIDE (con 36 domande d'esame)
- [x] 32 test automatici dei flussi principali
- [x] Repository Git con commit progressivi

## Struttura progetto

```
server.js            avvio di Express, Socket.IO e database
src/config/          connessione a MongoDB
src/models/          User, Project, Task, Message
src/routes/          auth, users, projects, tasks, admin
src/controllers/     la logica degli endpoint
src/middleware/      auth (login e admin), project (membro e proprietario), errori
src/socket/          autenticazione, stanze e chat
src/utils/           AppError e seed
public/              frontend: 7 pagine HTML, css/style.css, js/ (un file per pagina + common.js)
tests/               test automatici
docs/                documentazione e collection Postman
```

## Endpoint

Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Users
- `GET /api/users/me/dashboard`

Projects
- `GET /api/projects/public`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`
- `PATCH /api/projects/:id/archive`
- `POST /api/projects/:id/members`
- `DELETE /api/projects/:id/members/:userId`
- `POST /api/projects/:id/join`
- `POST /api/projects/:id/leave`
- `GET /api/projects/:id/messages`

Tasks
- `GET /api/projects/:id/tasks`
- `POST /api/projects/:id/tasks`
- `PUT /api/projects/:id/tasks/:taskId`
- `PATCH /api/projects/:id/tasks/:taskId/status`
- `DELETE /api/projects/:id/tasks/:taskId`

Admin
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/block`
- `GET /api/admin/projects`
- `PATCH /api/admin/projects/:id/archive`

Dettagli (body, risposte, codici) in `docs/API.md`.

## Account demo

Solo per sviluppo, creati da `npm run seed`.

| Ruolo | Email | Password |
| --- | --- | --- |
| Admin | `admin@taskflow.dev` | `Admin123!` |
| Utente | `mario@taskflow.dev` | `User123!` |
| Utente | `giulia@taskflow.dev` | `User123!` |

## Come avviare il progetto

Servono Node.js 20.19 o superiore e MongoDB in funzione.

```bash
npm install
cp .env.example .env     # poi controlla MONGODB_URI e imposta JWT_SECRET
npm run seed             # dati demo (cancella il database indicato)
npm run dev
```

Apri http://localhost:3000.

## Come testare

**A mano**

1. Apri http://localhost:3000 e accedi come `mario@taskflow.dev`.
2. Apri il progetto "Sito portfolio": vedi board, chat e membri.
3. Apri una seconda finestra del browser (o una finestra in incognito) e accedi come `giulia@taskflow.dev`, nello stesso progetto.
4. Da Mario crea un task, cambia il suo stato e trascinalo in "Completato": nella finestra di Giulia la board si aggiorna e compare un toast.
5. Scrivi in chat da una finestra e controlla che il messaggio arrivi nell'altra.
6. Da "Esplora" prova i filtri e apri un progetto pubblico che non è tuo: puoi entrare con "Partecipa al progetto".
7. Accedi come `admin@taskflow.dev`, apri "Admin", blocca Giulia e controlla che non possa più accedere.

**Con Postman**

Importa `docs/TaskFlow.postman_collection.json`. Esegui `Auth > Login (utente demo)`, poi `Projects > Crea progetto`, poi `Tasks > Crea task`: token, `projectId` e `taskId` vengono salvati da soli. Per la cartella `Admin` esegui prima `Admin > Login admin`.

**Con i test automatici**

Con il server avviato e il seed eseguito:

```bash
npm test
```

## Git

Commit creati, in ordine:

1. `a0a9e03` chore: initialize Node.js project
2. `0a93b70` feat: add database configuration and models
3. `fb7791b` feat: implement authentication
4. `de018cc` feat: implement project management
5. `a307ccc` feat: implement task management
6. `ced19c2` feat: add user dashboard
7. `9bfdf65` feat: add public project explorer
8. `c76e881` feat: implement realtime chat with socket.io
9. `527ed41` feat: add admin panel API
10. `38ff76d` feat: add seed script with demo data
11. `9ea859c` feat: create frontend base, home and authentication pages
12. `fbe3000` fix: keep chat messages in chronological order
13. `8cfb789` feat: add dashboard, project board, explore and admin pages
14. `ffe23b6` fix: only members can leave a project
15. `8a4c3a1` docs: add API, database, architecture, setup docs and study guide
16. `cd4743b` test: verify application flows
17. `4183e92` chore: final cleanup
18. `3426bc7` fix: return 400 instead of 500 for missing or invalid request data
19. `b179b74` fix: improve login flow, network errors and overdue date check
20. style: redesign frontend with category covers, avatars and new layout (ultimo commit)

Il file `.env` non è nel repository (è nel `.gitignore`): contiene solo `.env.example` senza segreti.

## GitHub

Il repository **non è stato ancora pubblicato**: GitHub CLI non è autenticata (`gh auth status` segnala un token non valido), quindi tutto il lavoro è nei commit locali.

Per pubblicarlo dal tuo computer:

```bash
gh auth login
gh repo create taskflow-nodejs --private --description "Progetto finale Node.js - piattaforma collaborativa per gestione progetti e task" --source=. --remote=origin --push
```

## Cosa studiare prima dell'esame

1. Cos'è Node.js e come funzionano `async/await` e `require`
2. Express: `app.use`, route, `req` e `res`
3. Il percorso di una richiesta: route → middleware → controller → Mongoose → MongoDB
4. I middleware (`protect`, `adminOnly`, `loadProject`, `requireMember`, `requireOwner`) e l'uso di `next()`
5. JWT: cosa contiene, come si firma e come si verifica
6. bcrypt: hash, salt e `compare`
7. MongoDB e Mongoose: schemi, riferimenti tra documenti, `populate`
8. Il modello dati: User, Project, Task, Message e le loro relazioni
9. Gestione degli errori centralizzata e codici HTTP (soprattutto 401 contro 403)
10. Socket.IO: eventi, stanze, autenticazione e differenza con le API REST

Tutto è spiegato in `STUDY_GUIDE.md`, con le domande d'esame e il percorso di lettura del codice.

## Limitazioni

Funzioni volutamente semplificate rispetto a un prodotto reale:

- Il token JWT è nel `localStorage` (più comodo da spiegare, ma meno sicuro dei cookie `httpOnly`) e non c'è un refresh token.
- Non ci sono recupero password, verifica email, limitazione dei tentativi di login o limiti alle richieste.
- La validazione dei dati è essenziale (campi obbligatori, valori ammessi, password minima di 6 caratteri).
- La board si ricarica per intero a ogni evento realtime, senza aggiornamenti "ottimistici".
- La chat mostra gli ultimi 50 messaggi, senza paginazione.
- "Nascondere" un progetto dall'admin coincide con l'archiviazione: sparisce da "Esplora", ma i membri possono continuare a lavorarci.
- Un utente bloccato viene scollegato dalle chat e rifiutato alla richiesta successiva, non nello stesso istante.
- Bootstrap e Bootstrap Icons sono caricati da CDN, quindi serve internet per vedere la grafica.
- I test automatici coprono API ed eventi realtime; l'interfaccia è stata provata a mano in un browser, senza test automatici del frontend.
- Il progetto non è pubblicato online e non ha configurazione per la produzione.

## Verifiche eseguite

- Tutte le route provate con richieste reali (successo ed errori: 400, 401, 403, 404).
- Permessi: utente non membro, non proprietario, non admin, utente bloccato.
- Test automatici: 32 su 32 superati.
- Interfaccia provata in un browser con due utenti collegati contemporaneamente: login e registrazione, dashboard, creazione di un progetto, board (creazione, modifica, cambio stato con menu e con drag and drop, eliminazione), chat in tempo reale, toast, esplora con filtri, ingresso e uscita da un progetto, pannello admin, vista da telefono.
- Prova da un clone pulito del repository: `npm install`, `.env`, `npm run seed`, avvio e test funzionano.
- Ambiente di prova: Node.js 22 e MongoDB 7.
