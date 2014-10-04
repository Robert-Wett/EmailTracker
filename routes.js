var querystring = require('querystring')
  , utilities   = require('./lib/emailutils.js')
  , util        = require('util');


module.exports = {

  // Helper route to remove everything from the MongoDB so we can start from
  // scratch.
  clearCollections: function(req, res) {
    utilities.wipeCollections(function() {
      res.end("Collections cleared out");
    });
  },

  // This route lists all the entries in our mongo collections in JSON form.
  list: function(req, res) {
    var collection = req.query.type;
    switch (collection) {
      // Show all the campaign entries in the DB
      // `/list?type=campaigns`
      case 'campaigns':
        utilities.listAllCampaigns(function(results) {
          res.writeHead(200, {'Content-Type': 'text/json' });
          res.write(JSON.stringify(results));
          res.end();
        });
        break;

      // Show all the users in the DB
      // `/list?type=users`
      case 'users':
        utilities.listAllUsers(function(results) {
          res.writeHead(200, {'Content-Type': 'text/json' });
          res.write(JSON.stringify(results));
          res.end();
        });
        break;

      case 'userrequests':
        // Show all the request objects made
        // `/list?type=userrequests`
        utilities.listAllUserRequests(function(results) {
          res.writeHead(200, {'Content-Type': 'text/json' });
          res.write(JSON.stringify(results));
          res.end();
        });
        break;

      default:
      case 'campaignemails':
        // Show all the CampaignEmail instances, and their requests. This is the
        // most informative route at the moment (AKA, default) as it shows the
        // way this POC logs things and shows opens/submits in the requests.
        // `/list?type=campaignemails`
        utilities.listAllCampaignEmails(function(results) {
          res.writeHead(200, {'Content-Type': 'text/json' });
          res.write(JSON.stringify(results));
          res.end();
        });
        break;
    }
  },

  // Create a campaign using a campaign name. Simple schema example for this.
  createCampaign: function(req, res) {
    var name = req.query.name;
    utilities.createNewCampaign(name, function(err, result) {
      if (err) console.log(err, "// Can't create new campaign");
      else {
          res.writeHead(200, {'Content-Type': 'text/json' });
          res.write(JSON.stringify(result));
          res.end();
      }
    });
  },

  // Create a user using an email and name. Again, super simple schema - no real
  // error checking, and the potential for this user collection is huge as far as
  // bettering the user experience by making smarter decisions based on previously
  // logged settings/data
  createUser: function(req, res) {
    var name  = req.query.name || 'user'
      , email = req.query.email;

    utilities.createNewUser(email, name, function(err, result) {
      if (err) console.log("Can't create a new user!\n", err);
      else {
          res.writeHead(200, {'Content-Type': 'text/json' });
          res.write(JSON.stringify(result));
          res.end();
      }
    });
  },


  // This endpoint creates a unique `CampaignEmail` instance, tied to the
  // campaigns unique ID and the user's unique ID. This method crafts and sends
  // the email.
  // NOTE: The email template is
  createCampaignEmail: function(req, res) {
    var campaignId = req.query.cid
      , userId     = req.query.uid;

    utilities.getUserEmailFromId(userId, function(userEmail) {
      //userId = userId.toString();
      utilities.createNewCampaignEmailEntry(
        campaignId,
        userId,
        function(err, result, message) {
          if (err) {
            res.end(err.toString());
          }
          else if (!message && result) {
            utilities.sendMail(result._id.toString(), userEmail, function(err, info) {
              if (err) console.log('ERROR ', err.toString());
              res.writeHead(200, {'Content-Type': 'text/json' });
              res.write(JSON.stringify(info));
              res.end();
            });
          }
          else if (message && result) {
            utilities.sendMail(result._id.toString(), userEmail, function(err, info) {
              res.end(util.format("Sent another email to %s", userEmail));
            });
          }
        }
      );
    });
  },

  // This endpoint is called anytime a user opens the email on a new client that
  // supports auto-loading images. In GMail, this will be triggered every time a
  // new client opens the email - I.E., it will be triggered when I open it on my
  // desktop client the first time I open the email, never again for any other open
  // because it's cached locally. If I open this same email with a different email
  // client, it will then make another request to trigger another 'open'. The issue
  // with GMail is simply that their internal image caching technique makes the
  // originating requests for image loads on a GMail client come from the GMail
  // image caching server. So we basically lose all information other than the fact
  // that it was opened again on another device/client, and that it's coming from
  // GMail. You can see this via the user-agent string logged:
  // `(via ggpht.com GoogleImageProxy)`
  imageLoad: function(req, res) {
    var campaignId
      , errorMsg
      , userId;

    utilities.getCampaignAndUserFromId(req.query.id, function(err, campEmail) {
      if (err) {
        errorMsg = 'Had a tough time grabbing the corresponding user or campaign ' +
                   'based on this CampaignEmail ID (%s). Please double check the ID!';
        return(console.log(util.format(errorMsg, req.query.id)));
      }
      userId = campEmail.userId.toString();
      campaignId = campEmail.campaignId.toString();

      utilities.logIncomingRequest(userId, campaignId, req);
      utilities.setOpenTime(req.query.id);
      utilities.incrementOpenCount(req.query.id);

      // Send down a super small, transparent image to satisfy the request.
      var buf = new Buffer([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
      0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x2c,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02,
      0x02, 0x44, 0x01, 0x00, 0x3b]);

      res.send(buf, { 'Content-Type': 'image/gif' }, 200);
      res.end();
    });
  },

  // Here's the main endpoint of this whole POC. There's a little bit of logic
  // here to kind of show that things are being tracked, but it could do a lot more
  // with not too much more work - I just spent maybe too much time on getting a
  // decent back-end to facilitate this, because.... I don't know, I like to build
  // things out and find it tough to do a shitty POC.
  result: function(req, res) {
    var campaignId = Object.keys(req.query)[0]
      , responseMessage
      , uid
      , cid;


    utilities.getCampaignAndUserFromId(campaignId, function(campEmail) {
      uid = campEmail.userId;
      cid = campEmail.campaignId;
      utilities.logIncomingRequest(uid, cid, req, "submit");
      utilities.setSubmitTime(campaignId, function(_campEmail) {
        if (_campEmail.consumed) {
          responseMessage = 'Sorry! This offer has been claimed already.\n';
        } else {
          _campEmail.consumed = true;
          responseMessage = 'Congratulations on claiming this offer!\n';
        }

        responseMessage += '(userId: %s, campaignId: %s)\n' +
                           'This email has been opened at least %s times';
        responseMessage = util.format(responseMessage, uid, cid, _campEmail.opened);

        _campEmail.save(function(err, result) {
          res.end(responseMessage);
        });
      });
    });
  },

  // Catch-all route to stop heroku from crashing
  nonRoute: function(req, res) {
    console.log(util.inspect(req));
    res.end("Whoooooa there pilgrim, this ain't a route!");
  }

};