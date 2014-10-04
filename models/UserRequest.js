var mongoose = require('mongoose')
  , userRequestSchema
  , UserRequest;


userRequestSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  campaignId: { type: String, required: true },
  userAgent: { type: String },
  referer: { type: String },
  cookie: { type: String },
  xForwardedProto: { type: String },
  xRegion: { type: String },
  xForwardedFor: { type: String },
  query: { type: String },
  reqType: { type: String },
  time: { type : Date, default: Date.now }
}, {collection:'UserRequest'});

UserRequest = mongoose.model('UserRequest', userRequestSchema);
module.exports = {
  UserRequest: UserRequest,
  userRequestSchema: userRequestSchema
}