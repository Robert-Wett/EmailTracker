var mongoose          = require('mongoose')
  , userRequestSchema = require('./UserRequest.js').userRequestSchema
  , campaignEmailSchema
  , CampaignEmail;


campaignEmailSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  //email: { type: String, required: true },
  sendTime: { type: Date, default: Date.now() },
  openTime: { type: Date },
  submitTime : { type: Date },
  requests: [userRequestSchema],
  consumed: { type: Boolean, default: false },
  opened: { type: Number, default: 0}
}, {collection: 'CampaignEmail'});

CampaignEmail = mongoose.model('CampaignEmail', campaignEmailSchema);
module.exports = {
  CampaignEmail: CampaignEmail,
  campaignEmailSchema: campaignEmailSchema
};