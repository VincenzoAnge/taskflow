# Guida di studio di TaskFlow

Questa guida serve a **capire** il progetto per poterlo spiegare all'esame. Ogni argomento rimanda ai file veri: apri il file mentre leggi.

Indice:

1. [Come funziona Node.js nel progetto](#1-come-funziona-nodejs-nel-progetto)
2. [Cos'è Express](#2-cosè-express)
3. [Come funzionano le route](#3-come-funzionano-le-route)
4. [Cosa sono i controller](#4-cosa-sono-i-controller)
5. [Cosa sono i middleware](#5-cosa-sono-i-middleware)
6. [Come funziona JWT](#6-come-funziona-jwt)
7. [Come funziona bcrypt](#7-come-funziona-bcrypt)
8. [Come funziona MongoDB](#8-come-funziona-mongodb)
9. [Come funziona Mongoose](#9-come-funziona-mongoose)
10. [Relazione tra User, Project e Task](#10-relazione-tra-user-project-e-task)
11. [Come vengono gestiti gli errori](#11-come-vengono-gestiti-gli-errori)
12. [Cosa sono i codici HTTP](#12-cosa-sono-i-codici-http)
13. [Come funziona Socket.IO](#13-come-funziona-socketio)
14. [Come funziona la board](#14-come-funziona-la-board)
15. [Come comunicano frontend e backend](#15-come-comunicano-frontend-e-backend)
16. [Come viene protetto un endpoint](#16-come-viene-protetto-un-endpoint)
17. [Come funziona il ruolo admin](#17-come-funziona-il-ruolo-admin)
18. [Come spiegare il progetto all'esame](#18-come-spiegare-il-progetto-allesame)
19. [Domande che il professore potrebbe farmi](#domande-che-il-professore-potrebbe-farmi)
20. [Percorso consigliato per studiare il codice](#percorso-consigliato-per-studiare-il-codice)

---

## 1. Come funziona Node.js nel progetto

Node.js permette di eseguire JavaScript **fuori dal browser**, sul computer o su un server. In TaskFlow è il motore del backend: `node server.js` avvia il programma che ascolta le richieste dei browser.

Idee da ricordare:

- Node è **asincrono**: mentre aspetta una risposta del database può gestire altre richieste. Per questo nel codice trovi `async` e `await` (per esempio `await User.findOne(...)`: il programma "aspetta" il risultato senza bloccare tutto).
- I pacchetti si installano con **npm** e sono elencati in `package.json`. Nel codice si importano con `require('express')`.
- Ogni file è un **modulo**: esporta ciò che serve con `module.exports` e gli altri file lo importano con `require`.
- Le variabili segrete (porta, database, segreto JWT) stanno in `.env` e si leggono con `process.env.NOME`. Il pacchetto `dotenv` carica il file all'avvio.

File da guardare: `package.json` (script `dev`, `start`, `seed`) e `server.js`.

## 2. Cos'è Express

Express è un **framework** per Node: semplifica la creazione di un server web. Senza Express dovremmo gestire a mano ogni dettaglio delle richieste HTTP.

In `server.js`:

```js
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/api/auth', require('./src/routes/authRoutes'));
```

- `express.json()`: legge il body JSON delle richieste e lo mette in `req.body`
- `express.static('public')`: serve le pagine HTML, CSS e JS della cartella `public`
- `cors()`: permette richieste da altre origini
- `app.use('/api/auth', ...)`: tutte le URL che iniziano con `/api/auth` vanno al file di route indicato

Ogni funzione di Express riceve `req` (la richiesta) e `res` (la risposta). Con `res.json(...)` si risponde con JSON.

## 3. Come funzionano le route

Una **route** collega un **metodo HTTP + un URL** a una funzione. Sono in `src/routes/`. Esempio da `authRoutes.js`:

```js
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);
```

- `POST /api/auth/login` esegue la funzione `login`
- `GET /api/auth/me` esegue prima il middleware `protect` e poi `me`

I metodi HTTP indicano l'intenzione: `GET` legge, `POST` crea, `PUT` modifica, `PATCH` modifica una parte, `DELETE` elimina.

Gli URL possono avere **parametri**: in `/api/projects/:id` il valore di `:id` si legge con `req.params.id`. I filtri dopo il `?` (per esempio `?category=Web`) si leggono con `req.query`.

Le route dei task sono "annidate": in `projectRoutes.js` la riga `router.use('/:id/tasks', loadProject, requireMember, require('./taskRoutes'))` dice che tutti gli URL `/api/projects/:id/tasks/...` passano prima dai due middleware e poi da `taskRoutes.js`. Così il controllo "sei membro del progetto?" è scritto una sola volta.

Attenzione all'ordine: `/public` è dichiarata prima di `/:id`, altrimenti Express penserebbe che "public" sia un id.

## 4. Cosa sono i controller

Un **controller** è la funzione che fa il lavoro di un endpoint. Le route decidono *quale* funzione chiamare, il controller decide *cosa fare*. Sono in `src/controllers/`.

Struttura tipica (da `taskController.js`):

```js
async function createTask(req, res) {
  const { title, description, assignee, dueDate, priority, status } = req.body;

  if (!title) {
    throw new AppError('Il titolo è obbligatorio', 400);
  }
  checkAssignee(req.project, assignee);

  const task = await Task.create({ ... });
  notify(req, 'taskCreated', task);

  res.status(201).json({ success: true, data: task });
}
```

Passi: 1) leggere i dati da `req.body`, 2) controllarli, 3) usare i modelli Mongoose, 4) rispondere con `res`. Separare route e controller rende il codice più ordinato: le route sono un "indice", i controller la logica.

## 5. Cosa sono i middleware

Un **middleware** è una funzione che si trova *tra* la richiesta e il controller. Riceve `req`, `res` e `next`. Può:

- bloccare la richiesta (lanciando un errore),
- aggiungere informazioni a `req` (per esempio `req.user`),
- passare il controllo al prossimo con `next()`.

Quelli del progetto:

| Middleware | File | Cosa fa |
| --- | --- | --- |
| `protect` | `middleware/authMiddleware.js` | verifica il token e mette l'utente in `req.user` |
| `adminOnly` | `middleware/authMiddleware.js` | accetta solo `role === 'admin'` |
| `loadProject` | `middleware/projectMiddleware.js` | carica il progetto e calcola `req.isOwner` e `req.isMember` |
| `requireMember` | `middleware/projectMiddleware.js` | accetta solo i membri |
| `requireOwner` | `middleware/projectMiddleware.js` | accetta solo il proprietario |
| `errorHandler` | `middleware/errorMiddleware.js` | trasforma gli errori in risposte JSON |

L'ordine conta: in `router.put('/:id', loadProject, requireOwner, controller.updateProject)` prima si carica il progetto, poi si controlla il proprietario, infine si modifica.

## 6. Come funziona JWT

**JWT (JSON Web Token)** è una stringa che il server consegna dopo il login e che il browser rimanda a ogni richiesta, per dire "sono io". Il server non deve ricordare chi è collegato: basta controllare il token.

Un token ha tre parti separate da punti: intestazione, **payload** (nel nostro caso `{ id: <id utente> }`) e **firma**. La firma è creata con `JWT_SECRET`: se qualcuno modifica il payload, la firma non corrisponde più e il token viene rifiutato.

Nel codice (`authController.js`):

```js
jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
```

Crea un token valido 7 giorni. Il frontend lo salva nel `localStorage` e lo invia nell'header `Authorization: Bearer <token>`. Il middleware `protect` lo controlla con `jwt.verify(...)`: se è scaduto o falso lancia un errore che diventa 401.

Nota: il payload è leggibile da chiunque (non è cifrato), per questo non ci mettiamo mai la password.

## 7. Come funziona bcrypt

Le password non si salvano mai in chiaro. **bcrypt** ne calcola un **hash**: una stringa illeggibile e non reversibile.

```js
const hashedPassword = await bcrypt.hash(password, 10);          // registrazione
const ok = await bcrypt.compare(password, user.password);         // login
```

- `10` è il *costo* (salt rounds): più è alto più l'hash è lento da calcolare, e quindi più difficile da attaccare.
- bcrypt aggiunge un **salt** casuale: due utenti con la stessa password hanno hash diversi.
- Al login non si "decifra" nulla: `compare` calcola l'hash della password inserita e lo confronta con quello salvato.

Nello schema `User` la password ha `select: false`: le query normali non la restituiscono. Solo il login la chiede esplicitamente con `.select('+password')`.

## 8. Come funziona MongoDB

MongoDB è un database **NoSQL a documenti**. Invece di tabelle e righe ha **collezioni** e **documenti**, simili a oggetti JSON:

```json
{ "_id": "65f...", "title": "Sito portfolio", "category": "Web", "members": ["65a...", "65b..."] }
```

- Ogni documento ha un `_id` univoco creato da MongoDB.
- I documenti della stessa collezione non devono avere per forza la stessa struttura (ma noi la fissiamo con Mongoose).
- Non esistono `JOIN` come in SQL: i collegamenti si fanno salvando l'`_id` di un altro documento (un **riferimento**).
- Una collezione per ogni tipo di dato: `users`, `projects`, `tasks`, `messages`.

## 9. Come funziona Mongoose

Mongoose è la libreria che collega Node a MongoDB e permette di descrivere i dati con uno **schema**. Esempio da `Task.js`:

```js
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['todo', 'doing', 'done'], default: 'todo' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  ...
});
module.exports = mongoose.model('Task', taskSchema);
```

Lo schema dà: tipi, campi obbligatori (`required`), valori ammessi (`enum`), valori di partenza (`default`), pulizia (`trim`, `lowercase`) e validazione automatica (un valore sbagliato produce un errore 400).

Operazioni usate nel progetto:

| Operazione | Significato |
| --- | --- |
| `Model.create(dati)` | crea un documento |
| `Model.find(filtro)` | restituisce tutti i documenti che corrispondono |
| `Model.findById(id)` / `findOne(filtro)` | ne restituisce uno |
| `documento.save()` | salva le modifiche |
| `documento.deleteOne()` / `Model.deleteMany(filtro)` | eliminano |
| `.populate('assignee', 'name')` | sostituisce l'id con i dati dell'altro documento |
| `.sort(...)`, `.limit(...)` | ordinamento e limite |

## 10. Relazione tra User, Project e Task

```
User ──owner──> Project <──members── User
                  │
                  └──project── Task ──assignee──> User
```

- Un **Project** ha un `owner` (un utente) e una lista `members` (molti utenti, proprietario compreso).
- Un **Task** appartiene a un `project` e ha un `assignee` (un membro, facoltativo).
- Un **Message** appartiene a un `project` e ha un `user` autore.

Esempi di cosa ne consegue:

- "I miei progetti" = `Project.find({ owner: userId })`
- "Progetti a cui partecipo" = `Project.find({ members: userId, owner: { $ne: userId } })`
- Per vedere task e chat serve essere in `members`.
- Se elimino un progetto devo eliminare a mano anche task e messaggi (MongoDB non lo fa da solo): lo fa `deleteProject`.

## 11. Come vengono gestiti gli errori

Gli errori sono gestiti in un **unico posto**: `src/middleware/errorMiddleware.js`.

1. Nel controller, se qualcosa non va, si lancia un errore con codice: `throw new AppError('Task non trovato', 404)`. `AppError` (in `utils/AppError.js`) è una piccola classe che aggiunge `statusCode` a un errore normale.
2. Express 5 intercetta anche gli errori delle funzioni `async` e li manda al middleware degli errori (per questo non servono `try/catch`).
3. `errorHandler` sceglie il codice e il messaggio:
   - errore di validazione Mongoose → 400
   - id non valido (`CastError`) → 400
   - token non valido o scaduto → 401
   - `AppError` → il suo `statusCode`
   - qualsiasi altro errore → 500, con messaggio generico (il dettaglio resta solo nel log del server, per non rivelare informazioni interne)
4. La risposta ha sempre la forma `{ success: false, message: "..." }`.

Anche le URL `/api/...` inesistenti finiscono qui con il middleware `notFound` (404). Nel frontend la funzione `api()` lancia un errore con quel `message`, e le pagine lo mostrano in un toast.

## 12. Cosa sono i codici HTTP

Il codice numerico dice al client com'è andata la richiesta.

| Codice | Nome | Quando lo usiamo |
| --- | --- | --- |
| 200 | OK | richiesta riuscita |
| 201 | Created | qualcosa è stato creato (registrazione, nuovo progetto, nuovo task) |
| 400 | Bad Request | dati mancanti o non validi |
| 401 | Unauthorized | non sei autenticato (token mancante, falso o scaduto) |
| 403 | Forbidden | sei autenticato ma non hai il permesso (non sei il proprietario, account bloccato) |
| 404 | Not Found | la risorsa non esiste |
| 500 | Internal Server Error | errore imprevisto nel server |

Differenza da ricordare: **401 = "chi sei?"**, **403 = "so chi sei, ma non puoi"**.

## 13. Come funziona Socket.IO

HTTP funziona a domanda e risposta: il server non può scrivere al browser di sua iniziativa. **Socket.IO** mantiene una connessione sempre aperta (WebSocket) in cui **entrambi** possono inviare eventi in qualsiasi momento.

Concetti chiave:

- **Evento**: un messaggio con un nome (`chatMessage`, `taskCreated`...) e dei dati. Si invia con `emit` e si ascolta con `on`.
- **Stanza (room)**: un gruppo di connessioni. In TaskFlow ogni progetto ha la stanza `project:<id>`; mandare un evento alla stanza lo fa arrivare a tutti i membri collegati e solo a loro.
- **Autenticazione**: il client si collega con `io({ auth: { token } })` e il server controlla il token in `io.use(...)`.

Come funziona la chat (`src/socket/socketServer.js`):

1. Il client apre la pagina del progetto e invia `joinProject`; il server controlla che sia membro e lo mette nella stanza.
2. L'utente scrive: il client invia `chatMessage`.
3. Il server **salva il messaggio nel database** e poi fa `io.to(stanza).emit('newMessage', messaggio)`.
4. Tutti i browser nella stanza ricevono `newMessage` e lo aggiungono alla chat.

Gli aggiornamenti dei task funzionano allo stesso modo: i controller chiamano `notify(...)`, che esegue `io.to(stanza).emit('taskMoved', ...)`. Il frontend, quando riceve l'evento, ricarica i task e mostra un toast (solo se l'azione l'ha fatta un altro utente).

## 14. Come funziona la board

La board è la parte centrale di `public/project.html` e `public/js/project.js`.

- I task del progetto si leggono con `GET /api/projects/:id/tasks`.
- `renderBoard()` li divide per `status` (`todo`, `doing`, `done`) e li disegna nelle tre colonne.
- Ogni card ha un **pulsante veloce** che porta il task allo stato successivo (Da fare → In corso → Completato, e "Riapri" per tornare indietro). L'oggetto `NEXT_STEP` dice quale stato viene dopo. Il click chiama `changeStatus()`, che invia `PATCH .../tasks/:taskId/status`.
- In più c'è il **drag and drop**: ogni card è `draggable`, le colonne ascoltano gli eventi `dragover` e `drop`; al rilascio si chiama la stessa funzione `changeStatus()`. Quindi trascinare o usare il pulsante fa esattamente la stessa cosa.
- Il pulsante con la matita apre la finestra del task: lì si modificano tutti i campi, anche lo stato, e c'è il pulsante Elimina.
- Accanto alla board ci sono la chat e l'elenco dei membri, così tutto il progetto si vede in una sola pagina.
- Dopo la modifica il server manda l'evento `taskMoved` e gli altri membri vedono la board aggiornarsi.

## 15. Come comunicano frontend e backend

Il frontend (HTML + JavaScript nel browser) parla con il backend in due modi:

1. **REST con `fetch`**: la funzione `api()` in `public/js/common.js` aggiunge il token, invia la richiesta a `/api/...` e restituisce `data` (oppure lancia un errore con `message`).
2. **Socket.IO**: nella pagina del progetto per chat e aggiornamenti in tempo reale.

Flusso tipico di una pagina (`dashboard.js`): al caricamento `requireLogin()` controlla che ci sia il token, poi `api('/users/me/dashboard')` scarica i dati e il codice costruisce l'HTML con le card.

Il token è nel `localStorage`: sopravvive alla chiusura della pagina. Il logout lo cancella.

Per sicurezza il testo degli utenti passa sempre dalla funzione `esc()` prima di finire nell'HTML (altrimenti qualcuno potrebbe scrivere codice HTML o JavaScript nel titolo di un progetto).

## 16. Come viene protetto un endpoint

Un endpoint si protegge **sul server**, con una catena di middleware. Esempio: eliminare un progetto.

```js
router.delete('/:id', loadProject, requireOwner, controller.deleteProject);
```

con `router.use(protect)` all'inizio del file. La richiesta passa da:

1. `protect`: c'è un token valido? l'utente esiste e non è bloccato? Se no → 401 o 403.
2. `loadProject`: il progetto esiste? Se no → 404.
3. `requireOwner`: l'utente è il proprietario? Se no → 403.
4. `deleteProject`: solo ora viene eseguita l'azione.

I pulsanti nascosti nel frontend non sono una protezione: chi usa Postman può chiamare l'URL direttamente. Per questo ogni controllo è ripetuto lato server.

## 17. Come funziona il ruolo admin

- Nel modello `User` il campo `role` vale `user` (default) oppure `admin`. Chi si registra è sempre `user`: il ruolo admin esiste solo negli utenti creati dal seed.
- Tutte le route in `adminRoutes.js` hanno `router.use(protect, adminOnly)`: prima il login, poi il controllo del ruolo (403 per gli utenti normali).
- L'admin può: vedere gli utenti, **bloccarli/sbloccarli** (campo `blocked`), vedere tutti i progetti e **archiviarli/ripristinarli**. Un progetto archiviato non compare più in "Esplora".
- Un utente bloccato non può fare login e il token che ha già viene rifiutato da `protect` (403 "Account bloccato"); inoltre le sue connessioni Socket.IO vengono chiuse.
- Un admin non può bloccare un altro admin.
- Nel frontend `admin.html` rimanda alla dashboard chi non è admin, e il link "Admin" nella navbar compare solo agli admin: sono comodità, la vera protezione è sul server.

## 18. Come spiegare il progetto all'esame

Una traccia di 5 minuti:

1. **Cos'è**: "TaskFlow è una piattaforma per gestire progetti in gruppo, con board Kanban, chat in tempo reale e pannello admin."
2. **Stack**: Node.js + Express per il server, MongoDB + Mongoose per i dati, JWT e bcrypt per la sicurezza, Socket.IO per il tempo reale, Bootstrap per la grafica.
3. **Architettura**: mostra lo schema `Browser → Route → Middleware → Controller → Mongoose → MongoDB` (in `docs/ARCHITECTURE.md`) e spiega che il tempo reale passa da un canale separato.
4. **Dati**: quattro modelli (User, Project, Task, Message) e le loro relazioni.
5. **Sicurezza**: password con bcrypt, token JWT, middleware per ruoli e permessi, errori centralizzati.
6. **Demo**: login con due utenti in due finestre, sposta un task e fai vedere il toast nell'altra finestra, scrivi in chat.
7. **Limiti e miglioramenti**: è un progetto didattico (vedi sezione miglioramenti nel README).

Consigli: sappi aprire e spiegare **un flusso completo** (per esempio "cambio stato di un task", dal click al database e ritorno) e sappi dire **perché** hai scelto ogni strumento. Se non ricordi un dettaglio, parti dalla struttura delle cartelle: aiuta a ritrovarlo.

---

## Domande che il professore potrebbe farmi

**1. Che cos'è Node.js?**
Un ambiente che esegue JavaScript fuori dal browser, basato sul motore V8 di Chrome. Qui serve per il backend.

**2. Perché hai usato Express?**
Perché semplifica la gestione di route, middleware, JSON e file statici rispetto al modulo `http` di Node.

**3. Che differenza c'è tra route e controller?**
La route associa metodo e URL a una funzione; il controller è quella funzione e contiene la logica.

**4. Che cos'è un middleware?**
Una funzione con `req`, `res`, `next` eseguita tra la richiesta e il controller: può controllare, modificare la richiesta o bloccarla.

**5. A cosa serve `next()`?**
A passare il controllo al middleware o controller successivo. Se non si chiama (e non si risponde) la richiesta resta ferma.

**6. Che cos'è un'API REST?**
Un modo di esporre i dati tramite URL (risorse) e metodi HTTP (GET, POST, PUT, PATCH, DELETE), scambiando di solito JSON.

**7. Qual è la differenza tra PUT e PATCH?**
PUT modifica la risorsa (qui più campi insieme), PATCH una sola parte; da noi `PATCH` serve per cambiare lo stato di un task o archiviare.

**8. Che cos'è JWT e come lo usi?**
Un token firmato con `JWT_SECRET` che contiene l'id dell'utente. Lo creo al login, il browser lo rimanda nell'header `Authorization` e il middleware `protect` lo verifica.

**9. Dove salvi il token nel browser e quali sono i rischi?**
Nel `localStorage`. Il rischio è che un attacco XSS lo legga; per questo escapo il testo degli utenti. Un'alternativa più sicura sono i cookie `httpOnly`.

**10. Perché non salvi le password in chiaro?**
Se il database venisse rubato, le password sarebbero leggibili. Con bcrypt si salva un hash non reversibile con salt.

**11. Che cos'è il salt?**
Una stringa casuale aggiunta alla password prima dell'hash: due password uguali producono hash diversi e le tabelle di hash precalcolate non funzionano.

**12. Come fa il login a confrontare la password se l'hash non si può invertire?**
`bcrypt.compare` calcola l'hash della password inserita con lo stesso salt e confronta i due hash.

**13. Che differenza c'è tra autenticazione e autorizzazione?**
Autenticazione = verificare chi sei (login, token). Autorizzazione = verificare cosa puoi fare (ruolo, proprietario, membro).

**14. Differenza tra 401 e 403?**
401: non sei autenticato. 403: sei autenticato ma non hai il permesso.

**15. Che cos'è MongoDB e in cosa differisce da SQL?**
È un database a documenti (JSON-like) senza tabelle e JOIN. I dati collegati si referenziano con gli `_id`.

**16. A cosa serve Mongoose?**
Definisce schemi e modelli, valida i dati e offre metodi comodi (`find`, `create`, `populate`...).

**17. Che cos'è `populate`?**
Sostituisce un riferimento (id) con il documento collegato, per esempio l'id dell'assegnatario con il suo nome.

**18. Come hai rappresentato i membri di un progetto?**
Con un array `members` di riferimenti agli utenti, che include anche il proprietario.

**19. Come fai a sapere se un utente può vedere i task di un progetto?**
Il middleware `loadProject` calcola `req.isMember` controllando se il suo id è in `project.members`; `requireMember` risponde 403 altrimenti.

**20. Chi può modificare o eliminare un progetto?**
Solo il proprietario (`requireOwner`). L'admin può solo archiviarlo.

**21. Cosa succede se elimino un progetto?**
Il controller elimina anche i suoi task e messaggi, perché MongoDB non lo fa in automatico.

**22. Come gestisci gli errori?**
Lancio `AppError` con il codice HTTP e un middleware centrale (`errorHandler`) produce la risposta JSON. Gli errori imprevisti diventano un 500 con messaggio generico.

**23. Perché nei controller non ci sono `try/catch`?**
Express 5 intercetta le promesse rifiutate delle funzioni `async` e le manda al middleware degli errori.

**24. Che differenza c'è tra HTTP e WebSocket?**
HTTP è a richiesta/risposta e parte sempre dal client; WebSocket mantiene una connessione aperta in cui anche il server può inviare dati.

**25. Che cos'è Socket.IO e perché non usi solo WebSocket?**
Una libreria costruita sopra WebSocket che aggiunge eventi con nome, stanze, riconnessione automatica e alternative se WebSocket non è disponibile.

**26. Cos'è una room e come la usi?**
Un gruppo di connessioni. Ogni progetto ha la stanza `project:<id>`: gli eventi inviati alla stanza arrivano solo ai membri di quel progetto.

**27. Come garantisci che la chat sia accessibile solo ai membri?**
Prima di far entrare nella stanza controllo `members` nel database, e prima di accettare un messaggio ricontrollo che l'utente sia ancora membro. Anche lo storico via REST richiede `requireMember`.

**28. Come funziona il flusso di un messaggio di chat?**
Il client invia `chatMessage` → il server lo salva in MongoDB → lo invia con `newMessage` a tutta la stanza.

**29. Come vengono aggiornati in tempo reale i task?**
Dopo ogni modifica il controller emette un evento (`taskCreated`, `taskMoved`...) alla stanza del progetto; i client ricaricano la board e mostrano un toast.

**30. Come funziona il drag and drop della board?**
Le card hanno `draggable="true"`; alla `dragstart` salvo l'id, alla `drop` su una colonna chiamo la stessa funzione `changeStatus()` usata dal pulsante della card.

**31. Come hai protetto il frontend dall'iniezione di HTML (XSS)?**
Il testo scritto dagli utenti passa dalla funzione `esc()`, che sostituisce `<`, `>`, `&` e gli apici prima di inserirlo nella pagina.

**32. Perché il controllo dei permessi è sul server e non solo nel frontend?**
Perché il frontend si può aggirare (Postman, console del browser). Il server è l'unico posto di cui ci si può fidare.

**33. Come si distingue un admin da un utente normale?**
Dal campo `role` dell'utente. Il middleware `adminOnly` rifiuta con 403 chi non è admin.

**34. Cosa fa il blocco di un utente?**
Imposta `blocked: true`: il login viene rifiutato (403), `protect` rifiuta anche i token già emessi e le connessioni Socket.IO dell'utente vengono chiuse.

**35. A cosa serve il file `.env` e perché non va su Git?**
Contiene configurazioni e segreti (database, `JWT_SECRET`). Se fosse pubblico chiunque potrebbe falsificare token o accedere al database. Su Git c'è solo `.env.example`.

**36. Cosa miglioreresti del progetto?**
Paginazione, notifiche anche fuori dalla pagina, commenti sui task, recupero password, validazione più completa e test più estesi (vedi README).

**37. Come hai realizzato il tema scuro?**
Con la modalità scura già inclusa in Bootstrap 5.3: l'attributo `data-bs-theme="dark"` sul tag `<html>`. In `style.css` ho solo cambiato alcune variabili CSS (sfondo, bordi, colore principale), senza librerie in più.

---

## Percorso consigliato per studiare il codice

Leggi i file in quest'ordine: dal più semplice al più complesso, seguendo il percorso dei dati.

1. `package.json`: dipendenze e script
2. `.env.example` e `src/config/db.js`: configurazione e connessione al database
3. `src/models/User.js`, `Project.js`, `Task.js`, `Message.js`: i dati
4. `server.js`: come tutto si collega (middleware, route, Socket.IO)
5. `src/utils/AppError.js` e `src/middleware/errorMiddleware.js`: come si gestiscono gli errori
6. `src/routes/authRoutes.js` → `src/controllers/authController.js`: registrazione e login (bcrypt + JWT)
7. `src/middleware/authMiddleware.js`: `protect` e `adminOnly`
8. `src/middleware/projectMiddleware.js`: `loadProject`, `requireMember`, `requireOwner`
9. `src/routes/projectRoutes.js` → `src/controllers/projectController.js`: progetti, membri, "Esplora"
10. `src/routes/taskRoutes.js` → `src/controllers/taskController.js`: task e invio degli eventi
11. `src/controllers/userController.js`: dashboard
12. `src/socket/socketServer.js` e `src/controllers/messageController.js`: chat e stanze
13. `src/controllers/adminController.js` e `src/routes/adminRoutes.js`: pannello admin
14. `src/utils/seed.js`: dati demo
15. `public/js/common.js`: funzione `api()`, sessione, navbar, `esc()`, card dei progetti
16. `public/js/index.js`, `auth.js`, `dashboard.js`, `explore.js`, `admin.js`: pagine semplici (ogni `nome.html` usa `js/nome.js`)
17. `public/js/project.js`: la pagina più ricca (board, chat, socket)
18. `public/css/style.css`: colori del tema scuro e stili di board e chat (l'indice è all'inizio del file)
19. `docs/API.md`, `docs/DATABASE.md`, `docs/ARCHITECTURE.md`: ripasso finale

Per fissare i concetti: avvia il progetto, apri Postman con la collection in `docs/` e, per ogni richiesta, trova nel codice la route, i middleware e il controller che la gestiscono.
