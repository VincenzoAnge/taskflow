# TaskFlow

Progetto finale Node.js: una piattaforma collaborativa per gestire progetti e task, con board Kanban, chat di progetto e aggiornamenti in tempo reale.

## Cos'è TaskFlow

Ogni utente può registrarsi, creare progetti, invitare altre persone e organizzare il lavoro in task. I task si vedono su una board con tre colonne (**Da fare**, **In corso**, **Completato**). Chi lavora sullo stesso progetto parla in una chat e riceve una notifica quando qualcun altro cambia un task. I progetti pubblici si possono scoprire dalla pagina "Esplora".

## Funzionalità

- Registrazione, login e logout con token JWT; password cifrate con bcrypt
- Ruoli `user` e `admin`
- Creazione, modifica, archiviazione ed eliminazione dei progetti (solo il proprietario)
- Gestione dei membri: il proprietario aggiunge e rimuove, chiunque può entrare in un progetto pubblico
- Task con titolo, descrizione, assegnatario, scadenza e priorità
- Board Kanban: stato cambiato con il pulsante della card (Inizia / Completa / Riapri), trascinando la card o dalla finestra del task
- Pagina progetto divisa in schede (Board, Chat, Membri), barra di avanzamento, ricerca e filtro "solo i miei task"
- Dashboard personale con riepilogo, task ordinati per scadenza e spunta veloce per completarli
- Pagina "Esplora progetti" con ricerca, filtri per categoria e tecnologia e ordinamento per data (si aggiornano da soli)
- Chat realtime per ogni progetto (solo membri) con Socket.IO
- Notifiche (toast) quando un task viene creato, modificato, spostato, assegnato o eliminato
- Pannello admin: riepilogo, ricerca, blocco/sblocco utenti, archiviazione progetti
- Gestione centralizzata degli errori e risposte JSON sempre nello stesso formato

## Tecnologie

| Parte | Strumenti |
| --- | --- |
| Backend | Node.js, Express, MongoDB, Mongoose |
| Sicurezza | jsonwebtoken (JWT), bcrypt, cors |
| Realtime | Socket.IO |
| Configurazione | dotenv |
| Frontend | HTML, CSS, JavaScript semplice, Bootstrap 5, Bootstrap Icons |

## Installazione

Servono Node.js 20.19 o superiore e un MongoDB raggiungibile (locale oppure MongoDB Atlas).

```bash
npm install
cp .env.example .env
```

Su Windows, nel Prompt dei comandi (cmd) usa `copy .env.example .env`; in PowerShell `cp` funziona come sopra.

Poi apri `.env` e controlla i valori (vedi la sezione successiva).

## Configurazione

Il file `.env` contiene:

| Variabile | Significato | Esempio |
| --- | --- | --- |
| `PORT` | porta del server | `3000` |
| `MONGODB_URI` | indirizzo del database | `mongodb://127.0.0.1:27017/taskflow` |
| `JWT_SECRET` | stringa segreta per firmare i token | una frase lunga a tua scelta |

Il file `.env` non va mai caricato su Git (è già nel `.gitignore`).

## Avvio

```bash
npm run seed   # facoltativo: inserisce i dati demo (cancella il database!)
npm run dev    # avvio con riavvio automatico (nodemon)
```

In alternativa `npm start` avvia il server senza riavvio automatico. Poi apri http://localhost:3000.

## Struttura delle cartelle

```
taskflow-nodejs/
├── server.js              avvio di Express, Socket.IO e database
├── package.json
├── .env.example           esempio di configurazione
├── src/
│   ├── config/            connessione a MongoDB
│   ├── models/            User, Project, Task, Message (Mongoose)
│   ├── routes/            quali URL esistono e quali middleware usano
│   ├── controllers/       la logica di ogni endpoint
│   ├── middleware/        login, ruolo admin, ruolo nel progetto, errori
│   ├── socket/            chat e stanze di Socket.IO
│   └── utils/             AppError e script seed
├── public/                frontend (HTML, css/, js/)
├── tests/                 test automatici dei flussi principali
├── docs/                  documentazione e collection Postman
├── STUDY_GUIDE.md         guida per studiare il progetto
└── FINAL_REPORT.md        riepilogo finale
```

## API principali

Tutte le risposte hanno la forma `{ "success": true, "data": ... }` oppure `{ "success": false, "message": "..." }`.

| Metodo | URL | Descrizione |
| --- | --- | --- |
| POST | `/api/auth/register` | registrazione |
| POST | `/api/auth/login` | login, restituisce il token |
| GET | `/api/auth/me` | utente corrente |
| GET | `/api/users/me/dashboard` | dati della dashboard |
| GET | `/api/projects/public` | progetti pubblici (con filtri) |
| POST | `/api/projects` | crea progetto |
| GET / PUT / DELETE | `/api/projects/:id` | leggi, modifica, elimina |
| GET / POST | `/api/projects/:id/tasks` | lista e creazione task |
| PATCH | `/api/projects/:id/tasks/:taskId/status` | cambia stato |
| GET | `/api/admin/users` | elenco utenti (admin) |

L'elenco completo, con body e codici HTTP, è in [docs/API.md](docs/API.md). Nella cartella `docs/` c'è anche la collection Postman `TaskFlow.postman_collection.json`.

## Account demo

Creati da `npm run seed`. **Solo per sviluppo**, non usarli mai in un ambiente pubblico.

| Ruolo | Email | Password |
| --- | --- | --- |
| Admin | `admin@taskflow.dev` | `Admin123!` |
| Utente | `mario@taskflow.dev` | `User123!` |
| Utente | `giulia@taskflow.dev` | `User123!` |

## Screenshot

Aggiungi qui le immagini prima della consegna (salvale in `docs/screenshots/`):

- ![Home](docs/screenshots/home.png) *(da inserire)*
- ![Dashboard](docs/screenshots/dashboard.png) *(da inserire)*
- ![Board Kanban](docs/screenshots/board.png) *(da inserire)*
- ![Pannello admin](docs/screenshots/admin.png) *(da inserire)*

## Test

Con il server avviato e il database popolato con `npm run seed`:

```bash
npm test
```

## Documentazione

- [docs/SETUP.md](docs/SETUP.md): installazione passo passo
- [docs/API.md](docs/API.md): tutti gli endpoint
- [docs/DATABASE.md](docs/DATABASE.md): modelli e relazioni
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): come è organizzato il codice
- [STUDY_GUIDE.md](STUDY_GUIDE.md): guida per studiare e preparare l'esame

## Possibili miglioramenti futuri

- Notifiche anche quando l'utente non è sulla pagina del progetto
- Commenti sui singoli task e allegati
- Recupero password via email
- Paginazione dei progetti e dei messaggi
- Validazione più completa dei dati in ingresso
- Test automatici più estesi e distribuzione online
