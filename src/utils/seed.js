// Inserisce dati demo. ATTENZIONE: cancella tutti i dati presenti nel database.
// Le credenziali qui sotto servono solo per lo sviluppo.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('../config/db');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Message = require('../models/Message');

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Il seed non può essere eseguito in produzione');
    process.exit(1);
  }

  await connectDB();

  await Message.deleteMany();
  await Task.deleteMany();
  await Project.deleteMany();
  await User.deleteMany();

  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const userPassword = await bcrypt.hash('User123!', 10);

  const admin = await User.create({ name: 'Admin', email: 'admin@taskflow.dev', password: adminPassword, role: 'admin' });
  const mario = await User.create({ name: 'Mario Rossi', email: 'mario@taskflow.dev', password: userPassword });
  const giulia = await User.create({ name: 'Giulia Bianchi', email: 'giulia@taskflow.dev', password: userPassword });

  const portfolio = await Project.create({
    title: 'Sito portfolio',
    description: 'Un sito personale per presentare i miei progetti e le mie competenze.',
    category: 'Web',
    technologies: ['html', 'css', 'javascript'],
    owner: mario._id,
    members: [mario._id, giulia._id]
  });

  const meteo = await Project.create({
    title: 'App meteo',
    description: 'Applicazione che mostra le previsioni del tempo usando un servizio esterno.',
    category: 'Mobile',
    technologies: ['javascript', 'api'],
    owner: giulia._id,
    members: [giulia._id, mario._id]
  });

  const vendite = await Project.create({
    title: 'Analisi dati vendite',
    description: 'Script per pulire e analizzare i dati di vendita di un negozio.',
    category: 'Dati',
    technologies: ['python', 'sql'],
    owner: mario._id,
    members: [mario._id]
  });

  await Project.create({
    title: 'Gestionale palestra',
    description: 'Gestione iscritti e abbonamenti di una palestra (progetto privato).',
    category: 'Web',
    technologies: ['node', 'express', 'mongodb'],
    visibility: 'private',
    owner: giulia._id,
    members: [giulia._id]
  });

  await Project.create({
    title: 'Blog di cucina',
    description: 'Vecchio progetto concluso, ora archiviato.',
    category: 'Altro',
    technologies: ['html', 'css'],
    archived: true,
    owner: mario._id,
    members: [mario._id]
  });

  await Task.create([
    { title: 'Disegnare la home page', project: portfolio._id, assignee: giulia._id, status: 'done', priority: 'medium', dueDate: daysFromNow(-2) },
    { title: 'Scrivere la sezione "Chi sono"', project: portfolio._id, assignee: mario._id, status: 'doing', priority: 'high', dueDate: daysFromNow(2) },
    { title: 'Aggiungere la galleria dei progetti', project: portfolio._id, assignee: mario._id, status: 'todo', priority: 'medium', dueDate: daysFromNow(7) },
    { title: 'Rendere il sito responsive', project: portfolio._id, assignee: giulia._id, status: 'todo', priority: 'high', dueDate: daysFromNow(5) },
    { title: 'Pubblicare il sito online', project: portfolio._id, status: 'todo', priority: 'low' },
    { title: 'Scegliere il servizio meteo', project: meteo._id, assignee: giulia._id, status: 'done', priority: 'low', dueDate: daysFromNow(-5) },
    { title: 'Chiamare le API e mostrare i dati', project: meteo._id, assignee: mario._id, status: 'doing', priority: 'high', dueDate: daysFromNow(3) },
    { title: 'Creare le icone del meteo', project: meteo._id, assignee: giulia._id, status: 'todo', priority: 'medium', dueDate: daysFromNow(10) },
    { title: 'Importare il file CSV', project: vendite._id, assignee: mario._id, status: 'done', priority: 'medium', dueDate: daysFromNow(-1) },
    { title: 'Pulire i valori mancanti', project: vendite._id, assignee: mario._id, status: 'doing', priority: 'medium', dueDate: daysFromNow(1) },
    { title: 'Calcolare le vendite per mese', project: vendite._id, status: 'todo', priority: 'high', dueDate: daysFromNow(6) }
  ]);

  await Message.create([
    { project: portfolio._id, user: mario._id, message: 'Ciao Giulia, ho iniziato la sezione "Chi sono".', createdAt: minutesAgo(30) },
    { project: portfolio._id, user: giulia._id, message: 'Perfetto! Io finisco la grafica della home entro domani.', createdAt: minutesAgo(20) },
    { project: portfolio._id, user: mario._id, message: 'Ottimo, poi ci dividiamo la parte responsive.', createdAt: minutesAgo(10) }
  ]);

  console.log('Dati demo inseriti.');
  console.log('Admin:   admin@taskflow.dev  / Admin123!');
  console.log('Utente:  mario@taskflow.dev  / User123!');
  console.log('Utente:  giulia@taskflow.dev / User123!');

  await mongoose.disconnect();
}

seed();
