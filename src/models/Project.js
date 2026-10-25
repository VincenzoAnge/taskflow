// Modello Project: un progetto ha un proprietario (owner) e una lista di membri

const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'Altro' },
  technologies: [{ type: String, lowercase: true, trim: true }],
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  coverImage: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // il proprietario è sempre anche tra i membri
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  archived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
