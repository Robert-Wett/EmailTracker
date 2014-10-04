var mongoose   = require('mongoose')
  , userSchema = require('./User.js').userSchema
  , campaignSchema
  , Campaign;


campaignSchema = new mongoose.Schema({
  name: { type: String, trim: true }
}, {collection: 'Campaign'});

Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = {
  campaignSchema: campaignSchema,
  Campaign: Campaign
}