// Errore con codice HTTP: il middleware degli errori usa statusCode per rispondere
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
