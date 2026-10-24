# Setup di TaskFlow

Guida passo passo per far partire il progetto su un computer nuovo.

## 1. Cosa serve

- **Node.js 18 o superiore** (controlla con `node -v`)
- **Git** (facoltativo, serve per clonare il repository)
- **MongoDB**: ne basta uno tra
  - MongoDB Community installato sul computer, oppure
  - un database gratuito su MongoDB Atlas (la stringa di connessione si copia dal sito)

## 2. Scaricare il progetto

```bash
git clone <indirizzo-del-repository>
cd taskflow-nodejs
```

## 3. Installare le dipendenze

```bash
npm install
```

Viene creata la cartella `node_modules/` con tutti i pacchetti elencati in `package.json`.

## 4. Configurare l'ambiente

```bash
cp .env.example .env
```

Apri `.env` e imposta:

```
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/taskflow
JWT_SECRET=una-frase-lunga-e-difficile-da-indovinare
```

- Con MongoDB Atlas sostituisci `MONGODB_URI` con la stringa che ti fornisce il sito (ricordati di inserire utente e password del database).
- `JWT_SECRET` serve a firmare i token: scegline uno tuo e non condividerlo.

## 5. Inserire i dati demo (facoltativo)

```bash
npm run seed
```

Attenzione: lo script **cancella** tutti i dati del database indicato in `MONGODB_URI` e inserisce admin, utenti, progetti, task e messaggi di esempio. Le credenziali stampate a fine script sono anche nel README.

## 6. Avviare il server

```bash
npm run dev
```

Se tutto va bene vedrai:

```
MongoDB connesso
Server avviato su http://localhost:3000
```

Apri il browser su http://localhost:3000.

## 7. Provare le API con Postman

1. In Postman scegli **Import** e seleziona `docs/TaskFlow.postman_collection.json`.
2. Esegui `Auth > Login (utente demo)`: il token viene salvato da solo nella variabile `token`.
3. Esegui `Projects > Crea progetto`: salva `projectId`.
4. Esegui `Tasks > Crea task`: salva `taskId`.
5. Per la cartella `Admin` esegui prima `Admin > Login admin`.

La variabile `baseUrl` è `http://localhost:3000/api`: se cambi porta modificala nelle variabili della collection.

## 8. Eseguire i test

Con il server in funzione e i dati demo caricati:

```bash
npm test
```

## Problemi comuni

| Problema | Causa probabile | Soluzione |
| --- | --- | --- |
| `Mancano MONGODB_URI o JWT_SECRET` | manca il file `.env` | crea `.env` copiando `.env.example` |
| Il server resta bloccato senza scrivere "MongoDB connesso" | MongoDB non è avviato o l'indirizzo è sbagliato | avvia MongoDB e controlla `MONGODB_URI` |
| `EADDRINUSE` | la porta è già usata | cambia `PORT` nel file `.env` |
| La grafica non si vede bene | manca internet (Bootstrap è caricato da CDN) | collegati a internet |
| Login con utenti demo non funziona | il seed non è stato eseguito | esegui `npm run seed` |
