var mongoose            = require('mongoose')
  , CampaignEmail       = require('../models/CampaignEmail.js').CampaignEmail
  , UserRequest         = require('../models/UserRequest.js').UserRequest
  , nodemailer          = require('nodemailer')
  , Campaign            = require('../models/Campaign.js').Campaign
  , Promise             = require('promise')
  , config              = require('../config.js')
  , User                = require('../models/User.js').User
  , util                = require('util')
  , db                  = mongoose.connection;

var connectionUrl = process.env.MONGOLAB_URI || 'mongodb://localhost/v1';
mongoose.connect(connectionUrl);
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() { console.log('DB connection established.');});


// Helper function for demo purposes to clear everything out and start fresh.
function wipeCollections(cb) {
  CampaignEmail.remove({}).exec();
  UserRequest.remove({}).exec();
  Campaign.remove({}).exec();
  User.remove({}).exec();
  cb();
}


/**
 * Create a new, unique entry representing a 1 to 1 relationship between the
 * individual `campaignId` and `userId` input variables.When the User table
 * is built out and thought out a bit more, we'd probably have a list of emails
 * that belong to the same person, with information from vendors to build a
 * more in-depth 'picture' of each user and their behavior.'
 *
 * Callback parameter structure is as follows:
 * index 0 - the error object
 * index 1 - the result, if successful
 * index 2 - no error thrown but no EmailCampaign was created - already in the DB
 */
function createNewCampaignEmailEntry(cid, uid, cb) {
  var campaignEmail;

  CampaignEmail
  .findOne({ campaignId: cid, userId: uid}, function(err, _cEmail) {
    if (err) {
      return cb(err);
    }

    if (!_cEmail) {
      campaignEmail = new CampaignEmail({
        campaignId: cid,
        userId: uid
      });

      campaignEmail.save(function(err, _campaignEmail) {
        if (err) {
          return cb(err);
        }

        return cb(null, _campaignEmail);
      });
    }
    // Re-send the email for the existing CampaignEmail
    else {
      console.log(_cEmail);
      return cb(null, _cEmail, "We've already sent this person an email!");
    }
  });
}

// Create a new user or return the existing entry if it exists.
function createNewUser(email, name, cb) {
  var _email
    , _name
    , _user;

  User.findOne({email: email, name: name}, function(err, user) {
    if (err) {
      cb(err);
    }
    else {
      if (!user) {
        _user = new User({ email: email, name: name });

        _user.save(function(err, result) {
          if (err)
            cb(err);
          else
            cb(null, result);
        });
      } else {
        cb(null, user);
      }
    }
  });
}


function createNewCampaign(name, cb) {
  var _campaign;

  Campaign.findOne({name: name}, function(err, campaign) {
    if (err) {
      cb(err);
    }
    else {
      if (!campaign) {
        _campaign = new Campaign({ name: name });

        _campaign.save(function(err, result) {
          if (err)
            cb(err);
          else
            cb(null, result);
        });
      } else {
        cb(null, campaign);
      }
    }
  });
}

function incrementOpenCount(campaignEmailId) {
  CampaignEmail.update({_id: campaignEmailId}, { $inc: { opened: 1 }}, function(err, cEmail) {
    if (err) console.log(err);
    console.log(cEmail);
  });
}

// Mark this entry as 'Opened'. Done after we get a
// request on our /img endpoint
function setOpenTime(campaignEmailId) {
  CampaignEmail.findOne({_id: campaignEmailId}, function(err, cEmail) {
    if (err) console.log(err);
    else {
      cEmail.openTime = Date.now();
      cEmail.save();
    }
  });
}

// Mark this entry as 'Submitted'. Done after we get a
// request on our /submit endpoint
function setSubmitTime(campaignEmailId, cb) {
  CampaignEmail.findOne({_id: campaignEmailId}, function(err, cEmail) {
    if (err) console.log(err);
    else {
      cEmail.submitTime = Date.now();
      cb(cEmail);
    }
  });
}



function addRequestToCampaignEmailId(campaignId, userReq) {
  CampaignEmail
    .findOne({campaignId: campaignId}, function(err, res) {
      if (err) {
        console.log(err, " // Error adding this request to the campaign email");
      } else {
        res.openTime = Date.now();
        res.requests.push(userReq);
        res.save();
      }
    });
}


function addRequestToCampaignEmail(campaignId, userReq) {
  CampaignEmail
    .find({ campaignId: campaignId })
    .where('userId').equals(userReq.userId)
    .exec(function(err, res) {
      if (err) {
        console.log(err, " // Error adding this request to the campaign email");
      } else {
        res.requests.push(userReq);
      }
    });
}

function listAllCampaignEmails(cb) {
  CampaignEmail.find({}, function(err, results) {
    if (err) console.log(err);
    else cb(results);
  });
}

function listAllCampaigns(cb) {
  Campaign.find({}, function(err, results) {
    if (err) console.log(err);
    else cb(results);
  });
}

function listAllUserRequests(cb) {
  UserRequest.find({}, function(err, results) {
    if (err) console.log(err);
    else cb(results);
  });
}

function listAllUsers(cb) {
  User.find({}, function(err, results) {
    if (err) console.log(err);
    else cb(results);
  });
}

function getCampaignAndUserFromId(campaignEntryId, cb) {
  CampaignEmail.findById(campaignEntryId, function(err, campEmail) {
    if (err)
      cb(err);
    else
      cb(null, campEmail);
  });
}

// Not used yet, but this would enable using the actual names and stuff instead
// of the mongo ID's
function getCampaignAndUserFromId2(campaignEntryId, cb) {
  var userEmail
    , campaignId
    , userId;

  CampaignEmail.findById(campaignEntryId, function(err, campEmail) {
    if (err) cb(err);
    else {
      userId = campEmail.userId;
      campaignId = campEmail.campaignId;

      campEmail
      .populate('userId')
      .exec(function(err, result) {
        if (err) cb(err);
        else {
          userEmail = result.email;
          campEmail
          .populate('campaignId')
          .exec(function(err, result) {
            if (err) cb(err);
            else {
              cb(null, userEmail, result.name, campaignId, userId);
            }
          })
        }
      })
    }
  });
}

function logIncomingRequest(userId, campaignId, req, type) {
  var reqHeaders  = req.headers
    , userReq;

    userReq = new UserRequest({
      userId: userId,
      campaignId: campaignId,
      userAgent: reqHeaders['user-agent'],
      referer: reqHeaders.referer,
      cookie: unescape(reqHeaders.cookie),
      xForwardedProto: reqHeaders['x-forwarded-proto'],
      xRegion: reqHeaders['x-region'],
      query: req.query,
      reqType: type || 'open',
      xForwardedFor: reqHeaders['x-forwarded-for']
    });

    userReq.save(function(err, _userReq) {
      if (err) {
        console.log(err, " // Something went wrong trying to save this UserRequest");
      } else {
        // Add this request to the list of requests that were
        // recieved for this campaign email
        addRequestToCampaignEmailId(campaignId, userReq);
      }
    });
}

function getUserIdFromEmail(email) {
  return new Promise(function(reject, resolve) {
    User.findOne({ email: email }, function(err, result) {
      if (err) reject(err);
      else {
        console.log(result);
        resolve(result._id);
      }
    });
  });
}

function getUserId(email, cb) {
    User.findOne({ email: email }, function(err, result) {
      if (err) console.log(err);
      else {
        //console.log(result);
        return cb(result._id);
      }
  });
}

function getUserEmailFromId(userId, cb) {
  User.findById(userId, function(err, result) {
      if (err) console.log(err);
      else {
        return cb(result.email);
      }
  });
}


function sendMail(campaignEmailId, email, cb) {
  var transporter
    , mailOptions
    , body;
  body = "<form action=\"http://emailtracker.herokuapp.com/result\" method=\"GET\">" +
         "<img src=\"http://emailtracker.herokuapp.com/img?id="+campaignEmailId+"\"></img>" +
         "<fieldset>" +
         "<textarea id=\"textarea\" name=\""+campaignEmailId+"\">testing..testing 1.. 2..</textarea>" +
         "<button type=\"submit\">Click to try and send...</button>"+
         "</fieldset>" +
         "</form>";

  mailOptions = {
    from: config.mailFrom,
    to: email,
    subject: "Email Tracker Demo",
    html: body
  };

  transporter = nodemailer.createTransport({
    service: config.service,
    auth: config.auth
  })
  .sendMail(mailOptions, function(err, info) {
    if (err) {
      cb(err);
    }
    cb(null, info);
  });
}


module.exports = {
  sendMail: sendMail,
  getUserIdFromEmail: getUserIdFromEmail,
  getUserEmailFromId: getUserEmailFromId,
  getUserId: getUserId,
  wipeCollections: wipeCollections,
  incrementOpenCount: incrementOpenCount,
  listAllCampaignEmails: listAllCampaignEmails,
  listAllCampaigns: listAllCampaigns,
  listAllUsers: listAllUsers,
  listAllUserRequests: listAllUserRequests,
  setOpenTime: setOpenTime,
  createNewCampaign: createNewCampaign,
  createNewUser: createNewUser,
  setSubmitTime: setSubmitTime,
  logIncomingRequest: logIncomingRequest,
  createNewCampaignEmailEntry: createNewCampaignEmailEntry,
  getCampaignAndUserFromId: getCampaignAndUserFromId
};