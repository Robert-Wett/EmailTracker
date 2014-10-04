var mongoose = require('mongoose')
  , userSchema
  , User;


userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String, trim: true }
}, {collection: 'User'});

User = mongoose.model('User', userSchema);
module.exports = {
  User: User,
  userSchema: userSchema
}