// Test dei flussi principali. Richiedono il server in funzione e i dati demo (npm run seed).
// Avvio: npm test  (per un altro indirizzo: TEST_URL=http://localhost:4000 npm test)
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { io } = require('socket.io-client');

const BASE = process.env.TEST_URL || 'http://localhost:3000';
const unique = Date.now();

async function call(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = 'Bearer ' + token;
  }
  const response = await fetch(BASE + '/api' + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json();
  return { status: response.status, json, data: json.data };
}

async function register(name) {
  const result = await call('POST', '/auth/register', {
    name,
    email: `${name.toLowerCase()}${unique}@test.it`,
    password: 'secret123'
  });
  return { token: result.data.token, id: result.data.user.id, email: `${name.toLowerCase()}${unique}@test.it` };
}

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, { auth: { token }, reconnection: false });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

// aspetta che il socket riceva un evento
function waitFor(socket, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Evento non ricevuto: ' + event)), 3000);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

describe('TaskFlow', () => {
  let anna, bruno, carla, admin;
  let projectId;
  const createdProjects = [];

  before(async () => {
    anna = await register('Anna');
    bruno = await register('Bruno');
    carla = await register('Carla');

    const login = await call('POST', '/auth/login', { email: 'admin@taskflow.dev', password: 'Admin123!' });
    assert.equal(login.status, 200, "Admin demo non trovato: esegui prima 'npm run seed'");
    admin = { token: login.data.token };
  });

  after(async () => {
    for (const id of createdProjects) {
      await call('DELETE', '/projects/' + id, null, anna.token);
    }
  });

  describe('Autenticazione', () => {
    it('rifiuta una registrazione con email già usata', async () => {
      const result = await call('POST', '/auth/register', { name: 'Anna', email: anna.email, password: 'secret123' });
      assert.equal(result.status, 400);
      assert.equal(result.json.success, false);
    });

    it('rifiuta una password troppo corta', async () => {
      const result = await call('POST', '/auth/register', { name: 'X', email: `x${unique}@test.it`, password: '123' });
      assert.equal(result.status, 400);
    });

    it('risponde 400 (non 500) a richieste senza body o con dati di tipo sbagliato', async () => {
      assert.equal((await call('POST', '/auth/login')).status, 400);
      assert.equal((await call('POST', '/auth/login', { email: 123, password: 'x' })).status, 400);
      assert.equal((await call('POST', '/auth/login', { email: anna.email, password: 123456 })).status, 400);
      assert.equal((await call('POST', '/auth/login', { email: ['a'], password: 'x' })).status, 400);
      assert.equal((await call('POST', '/auth/register', { name: { a: 1 }, email: 'a@a.it', password: 'secret123' })).status, 400);
    });

    it('accetta l\'email scritta con maiuscole e spazi', async () => {
      const result = await call('POST', '/auth/login', { email: `  ${anna.email.toUpperCase()} `, password: 'secret123' });
      assert.equal(result.status, 200);
    });

    it('rifiuta un login con password sbagliata', async () => {
      const result = await call('POST', '/auth/login', { email: anna.email, password: 'sbagliata' });
      assert.equal(result.status, 401);
    });

    it('restituisce l\'utente corrente con un token valido', async () => {
      const result = await call('GET', '/auth/me', null, anna.token);
      assert.equal(result.status, 200);
      assert.equal(result.data.email, anna.email);
      assert.equal(result.data.role, 'user');
      assert.equal(result.data.password, undefined);
    });

    it('rifiuta le richieste senza token o con token falso', async () => {
      assert.equal((await call('GET', '/auth/me')).status, 401);
      assert.equal((await call('GET', '/auth/me', null, 'token-finto')).status, 401);
    });

    it('risponde 404 JSON per una route inesistente', async () => {
      const result = await call('GET', '/non-esiste');
      assert.equal(result.status, 404);
      assert.equal(result.json.success, false);
    });
  });

  describe('Progetti', () => {
    it('crea un progetto con il proprietario tra i membri', async () => {
      const result = await call('POST', '/projects', {
        title: 'Progetto di test',
        category: 'Web',
        technologies: ['Node', 'Mongo'],
        visibility: 'public'
      }, anna.token);
      assert.equal(result.status, 201);
      assert.deepEqual(result.data.technologies, ['node', 'mongo']);
      assert.equal(result.data.members.length, 1);
      projectId = result.data._id;
      createdProjects.push(projectId);
    });

    it('richiede il titolo', async () => {
      const result = await call('POST', '/projects', {}, anna.token);
      assert.equal(result.status, 400);
    });

    it('permette di modificare solo al proprietario', async () => {
      const denied = await call('PUT', '/projects/' + projectId, { title: 'Hack' }, bruno.token);
      assert.equal(denied.status, 403);

      const allowed = await call('PUT', '/projects/' + projectId, { title: 'Titolo nuovo' }, anna.token);
      assert.equal(allowed.status, 200);
      assert.equal(allowed.data.title, 'Titolo nuovo');
    });

    it('permette di entrare e uscire da un progetto pubblico', async () => {
      assert.equal((await call('POST', `/projects/${projectId}/join`, null, bruno.token)).status, 200);
      assert.equal((await call('POST', `/projects/${projectId}/join`, null, bruno.token)).status, 400);
      assert.equal((await call('POST', `/projects/${projectId}/leave`, null, bruno.token)).status, 200);
      assert.equal((await call('POST', `/projects/${projectId}/leave`, null, bruno.token)).status, 400);
      assert.equal((await call('POST', `/projects/${projectId}/leave`, null, anna.token)).status, 400);
    });

    it('nasconde i progetti privati a chi non è membro', async () => {
      const created = await call('POST', '/projects', { title: 'Segreto', visibility: 'private' }, anna.token);
      createdProjects.push(created.data._id);

      assert.equal((await call('GET', '/projects/' + created.data._id, null, bruno.token)).status, 403);
      assert.equal((await call('GET', '/projects/' + created.data._id, null, anna.token)).status, 200);
      assert.equal((await call('POST', `/projects/${created.data._id}/join`, null, bruno.token)).status, 403);
    });

    it('permette al proprietario di aggiungere e rimuovere membri', async () => {
      const added = await call('POST', `/projects/${projectId}/members`, { email: bruno.email }, anna.token);
      assert.equal(added.status, 201);
      assert.equal(added.data.length, 2);

      assert.equal((await call('POST', `/projects/${projectId}/members`, { email: bruno.email }, anna.token)).status, 400);
      assert.equal((await call('POST', `/projects/${projectId}/members`, { email: 'nessuno@test.it' }, anna.token)).status, 404);
      assert.equal((await call('POST', `/projects/${projectId}/members`, { email: carla.email }, bruno.token)).status, 403);
      assert.equal((await call('DELETE', `/projects/${projectId}/members/${anna.id}`, null, anna.token)).status, 400);
    });

    it('risponde 400 se l\'id non è valido e 404 se non esiste', async () => {
      assert.equal((await call('GET', '/projects/123', null, anna.token)).status, 400);
      assert.equal((await call('GET', '/projects/aaaaaaaaaaaaaaaaaaaaaaaa', null, anna.token)).status, 404);
    });
  });

  describe('Task', () => {
    let taskId;

    it('permette di creare task solo ai membri', async () => {
      const denied = await call('POST', `/projects/${projectId}/tasks`, { title: 'Intruso' }, carla.token);
      assert.equal(denied.status, 403);

      const created = await call('POST', `/projects/${projectId}/tasks`, {
        title: 'Primo task',
        priority: 'high',
        assignee: bruno.id,
        dueDate: '2026-12-31'
      }, anna.token);
      assert.equal(created.status, 201);
      assert.equal(created.data.status, 'todo');
      assert.equal(created.data.assignee.name, 'Bruno');
      taskId = created.data._id;
    });

    it('non permette di assegnare un task a chi non è membro', async () => {
      const result = await call('POST', `/projects/${projectId}/tasks`, { title: 'X', assignee: carla.id }, anna.token);
      assert.equal(result.status, 400);
    });

    it('cambia lo stato e rifiuta stati non validi', async () => {
      const ok = await call('PATCH', `/projects/${projectId}/tasks/${taskId}/status`, { status: 'doing' }, bruno.token);
      assert.equal(ok.status, 200);
      assert.equal(ok.data.status, 'doing');

      const ko = await call('PATCH', `/projects/${projectId}/tasks/${taskId}/status`, { status: 'boh' }, bruno.token);
      assert.equal(ko.status, 400);

      const empty = await call('PATCH', `/projects/${projectId}/tasks/${taskId}/status`, null, bruno.token);
      assert.equal(empty.status, 400);

      const check = await call('GET', `/projects/${projectId}/tasks`, null, bruno.token);
      assert.equal(check.data[0].status, 'doing');
    });

    it('modifica un task e lo elenca', async () => {
      const edited = await call('PUT', `/projects/${projectId}/tasks/${taskId}`, { title: 'Titolo task nuovo', assignee: '' }, anna.token);
      assert.equal(edited.status, 200);
      assert.equal(edited.data.assignee, null);

      const list = await call('GET', `/projects/${projectId}/tasks`, null, anna.token);
      assert.equal(list.data.length, 1);
      assert.equal(list.data[0].title, 'Titolo task nuovo');
    });

    it('mostra i task assegnati nella dashboard', async () => {
      await call('PUT', `/projects/${projectId}/tasks/${taskId}`, { assignee: bruno.id }, anna.token);

      const dashboard = await call('GET', '/users/me/dashboard', null, bruno.token);
      assert.equal(dashboard.status, 200);
      assert.equal(dashboard.data.stats.doing, 1);
      assert.equal(dashboard.data.memberProjects.length, 1);
      assert.equal(dashboard.data.tasks[0].project.title, 'Titolo nuovo');
    });

    it('toglie l\'assegnazione quando il membro viene rimosso', async () => {
      await call('DELETE', `/projects/${projectId}/members/${bruno.id}`, null, anna.token);

      const list = await call('GET', `/projects/${projectId}/tasks`, null, anna.token);
      assert.equal(list.data[0].assignee, null);
      assert.equal((await call('GET', `/projects/${projectId}/tasks`, null, bruno.token)).status, 403);
    });

    it('elimina un task', async () => {
      assert.equal((await call('DELETE', `/projects/${projectId}/tasks/${taskId}`, null, anna.token)).status, 200);
      assert.equal((await call('DELETE', `/projects/${projectId}/tasks/${taskId}`, null, anna.token)).status, 404);
    });
  });

  describe('Esplora progetti', () => {
    it('mostra solo progetti pubblici non archiviati e applica i filtri', async () => {
      const list = await call('GET', '/projects/public?technology=NODE&category=Web');
      assert.equal(list.status, 200);
      assert.ok(list.data.some((p) => p._id === projectId));
      assert.ok(list.data.every((p) => p.visibility === 'public' && p.archived === false));

      const none = await call('GET', '/projects/public?technology=tecnologia-inventata');
      assert.equal(none.data.length, 0);

      const repeated = await call('GET', '/projects/public?technology=node&technology=mongo');
      assert.equal(repeated.status, 200);

      await call('PATCH', `/projects/${projectId}/archive`, null, anna.token);
      const afterArchive = await call('GET', '/projects/public?category=Web');
      assert.ok(!afterArchive.data.some((p) => p._id === projectId));
      await call('PATCH', `/projects/${projectId}/archive`, null, anna.token);
    });
  });

  describe('Admin', () => {
    it('rifiuta gli utenti normali', async () => {
      assert.equal((await call('GET', '/admin/users', null, anna.token)).status, 403);
      assert.equal((await call('GET', '/admin/users')).status, 401);
    });

    it('elenca utenti e progetti senza mostrare le password', async () => {
      const users = await call('GET', '/admin/users', null, admin.token);
      assert.equal(users.status, 200);
      assert.ok(users.data.length >= 4);
      assert.ok(users.data.every((u) => u.password === undefined));

      const projects = await call('GET', '/admin/projects', null, admin.token);
      assert.equal(projects.status, 200);
    });

    it('blocca e sblocca un utente', async () => {
      const blocked = await call('PATCH', `/admin/users/${carla.id}/block`, null, admin.token);
      assert.equal(blocked.data.blocked, true);

      const login = await call('POST', '/auth/login', { email: carla.email, password: 'secret123' });
      assert.equal(login.status, 403);
      assert.equal((await call('GET', '/auth/me', null, carla.token)).status, 403);

      const unblocked = await call('PATCH', `/admin/users/${carla.id}/block`, null, admin.token);
      assert.equal(unblocked.data.blocked, false);
      assert.equal((await call('GET', '/auth/me', null, carla.token)).status, 200);
    });

    it('non permette di bloccare un admin', async () => {
      const users = await call('GET', '/admin/users', null, admin.token);
      const adminUser = users.data.find((u) => u.role === 'admin');
      assert.equal((await call('PATCH', `/admin/users/${adminUser._id}/block`, null, admin.token)).status, 400);
    });

    it('archivia un progetto', async () => {
      const result = await call('PATCH', `/admin/projects/${projectId}/archive`, null, admin.token);
      assert.equal(result.data.archived, true);
      await call('PATCH', `/admin/projects/${projectId}/archive`, null, admin.token);
    });
  });

  describe('Tempo reale (Socket.IO)', () => {
    let annaSocket, brunoSocket, carlaSocket;

    before(async () => {
      await call('POST', `/projects/${projectId}/members`, { email: bruno.email }, anna.token);
      annaSocket = await connectSocket(anna.token);
      brunoSocket = await connectSocket(bruno.token);
      carlaSocket = await connectSocket(carla.token);

      annaSocket.emit('joinProject', projectId);
      brunoSocket.emit('joinProject', projectId);
      await Promise.all([waitFor(annaSocket, 'joined'), waitFor(brunoSocket, 'joined')]);
    });

    after(() => {
      [annaSocket, brunoSocket, carlaSocket].forEach((socket) => socket.close());
    });

    it('rifiuta la connessione con un token non valido', async () => {
      await assert.rejects(connectSocket('token-finto'), /Autenticazione non valida/);
    });

    it('non fa entrare nella stanza chi non è membro', async () => {
      carlaSocket.emit('joinProject', projectId);
      const message = await waitFor(carlaSocket, 'errorMessage');
      assert.match(message, /membro/);
    });

    it('inoltra i messaggi di chat ai membri e li salva', async () => {
      const received = waitFor(brunoSocket, 'newMessage');
      annaSocket.emit('chatMessage', { projectId, message: 'Ciao Bruno!' });

      const message = await received;
      assert.equal(message.message, 'Ciao Bruno!');
      assert.equal(message.user.name, 'Anna');

      const history = await call('GET', `/projects/${projectId}/messages`, null, bruno.token);
      assert.equal(history.data.at(-1).message, 'Ciao Bruno!');
      assert.equal((await call('GET', `/projects/${projectId}/messages`, null, carla.token)).status, 403);
    });

    it('non accetta messaggi da chi non è membro', async () => {
      carlaSocket.emit('chatMessage', { projectId, message: 'Intruso' });
      await waitFor(carlaSocket, 'errorMessage');

      const history = await call('GET', `/projects/${projectId}/messages`, null, anna.token);
      assert.ok(!history.data.some((m) => m.message === 'Intruso'));
    });

    it('avvisa i membri quando un task cambia', async () => {
      const created = waitFor(brunoSocket, 'taskCreated');
      const task = await call('POST', `/projects/${projectId}/tasks`, { title: 'Task realtime' }, anna.token);
      const createdEvent = await created;
      assert.equal(createdEvent.task.title, 'Task realtime');
      assert.equal(createdEvent.by.name, 'Anna');

      const moved = waitFor(brunoSocket, 'taskMoved');
      await call('PATCH', `/projects/${projectId}/tasks/${task.data._id}/status`, { status: 'done' }, anna.token);
      assert.equal((await moved).task.status, 'done');

      const assigned = waitFor(brunoSocket, 'taskAssigned');
      await call('PUT', `/projects/${projectId}/tasks/${task.data._id}`, { assignee: bruno.id }, anna.token);
      assert.equal((await assigned).task.assignee.name, 'Bruno');

      const deleted = waitFor(brunoSocket, 'taskDeleted');
      await call('DELETE', `/projects/${projectId}/tasks/${task.data._id}`, null, anna.token);
      await deleted;
    });

    it('toglie dalla chat chi viene rimosso dal progetto', async () => {
      await call('DELETE', `/projects/${projectId}/members/${bruno.id}`, null, anna.token);

      let received = false;
      brunoSocket.once('taskCreated', () => { received = true; });
      await call('POST', `/projects/${projectId}/tasks`, { title: 'Dopo la rimozione' }, anna.token);
      await new Promise((resolve) => setTimeout(resolve, 400));
      assert.equal(received, false);
    });
  });
});
