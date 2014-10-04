#Email Tracking POC
-------------


#Main Tracking Method
It seems the best we can really do is embed `img` tags targeting an API endpoint we listen to, with the key/value representing the unique request entry. We'd want to track the user on both a campaign level as well as keep a global 'user' database tied to email addresses so that we can store and track user behavior and make smarter decisions based on their logged requests. We first will be (hopefully) notified on mail-open when it makes a call to our `img` API endpoint - here we can capture all the info we need, as well as log a timestamp and estimate "time open" for the email, given they then fill out the form and submit. We then put our logic in the `/submit` endpoint, where we do comparisons against the previous request from this campaign if there is any, or previous data stored about the user if there is any, and decide whether or not we can be confident enough to trust the user.


##Here's what I'm thinking for the structure:

####API Endpoints:
 - ####`/campaign?id=123456&mail=rdwettlaufer@gmail.com`
    - Creates a unique entry in a campaign mapped to the email provided (I'm assuming the same email address won't be able to participate twice).
        -  *NOTE*: We'd obviously want this endpoint to be mapped out a little bit better, this is more to facilitate a demo.
    - The campaign `123456` now has an entry for `rdwettlaufer@gmail.com`
      - Create a unique entry ID for this record, and attach this ID to the email's `<img>` tag's source (`img?id=123456`)
    - When we get the request, we save down any identifying/important information that we can pull out of the request object and map it to the campaign+email composite key.

 - ####`/img?id=12354`
    - Check against our DB to see if this ID is valid and has been created yet. This should *always* be valid - if it's not, then we should assume monkey business.
      - *NOTE:* If the client doesn't support auto-image loading, then we can't assume we actually get this step in the workflow.
    - Save down any relevant info from the request:
      - Time of request
      - user-agent
      - referer
      - cookie
      - x-forwarded-proto (http/https)
      - x-region
      - x-forwarded-for
      - query
      - method
      - etc..
    - Respond with a transparent 1x1 pixel gif (Or potentially the client's logo - looks a bit weird if you click "load images" and nothing actually loads. For the demo, we can do just a 1x1 transparent gif)

 - ####`/submit`
    - This is the main submit endpoint where we would grab the POST data from the form, and make the decision as to whether or not this was legit or we think there's a good enough chance someone tried something funny (like a forward or manually making a request to us with different key values).
    - Rip out relevant info from the request object, and compare it against what we have stored.
        - What was the time between open and submit?
        - Did *any* value we have stored change between requests?
            - Is it the same user/email? The location/region is within acceptable range (300 miles from previous location/region on `img` request? If it's 5 hours later, be weary as the user might travel a lot... if it's 30 minutes later, treat as intruder).
                - Store the entry down as another user-agent/location to be aware of for this user.

***
#Current State
###<small>8/15/2014, 9:45</small>
##API Description
####Viewing collections
This demo was built to be able to do everything with basic GET requests through the browser. You can view every entry in the collections as they currently stand by using the `list` endpoint with the `type` key param, with the value being either `campaignemails`, `campaigns`, `users`, and `userrequests`. Examples:

 * `http://emailtracker.herokuapp.com/list`
  *  (Default route, shows `CampaignEmail` entries)
 * `http://emailtracker.herokuapp.com/list?type=campaignemails`
 * `http://emailtracker.herokuapp.com/list?type=campaigns`
 * `http://emailtracker.herokuapp.com/list?type=users`
 * `http://emailtracker.herokuapp.com/list?type=userrequests`

***
####Creating a 'User'
A user consists of just two values for right now - `name` and `email`. There isn't any real validation logic behind this endpoint right now, so you could potentially create duplicate entries that are unique based on their mongo _id's (hey, it's a demo!). Try to keep the emails unique for right now - add periods to your gmail address to use the same email and create different entries that forward to the same address for best results. Let's recreate this entry as an example:

![Example](http://i.imgur.com/O7no1ih.png)

 * `http://emailtracker.herokuapp.com/user?email=rdwettlaufer@gmail.com&name=Robby`
***

####Creating a 'Campaign'
A campaign consists of a single value for right now, just the name. Again, let's recreate this image:
![Example](http://i.imgur.com/NA2IdvB.png)

 * `http://emailtracker.herokuapp.com/campaign?name=Test Test`
 * `http://emailtracker.herokuapp.com/campaign?name=Test Campaign`
***

####Creating a 'CampaignEmail'
A `CampaignEmail` entry is a unique entry that represents a single campaign, tied to a single user. Now that we have  both the `uid` created in "Robby" and the `cid` created in either `Test Test` or `Test Campaign`, we can create a `CampaignEmail` entry and then send off an email to the user's email through this endpoint. Let's recreate this example:

![Example 3](http://i.imgur.com/20YnBPd.png)

*NOTE: This is an entry that's been run through the full workflow, notice `openTime`, `submitTime`, `opened`, and `consumed`.*

 * `http://emailtracker.herokuapp.com/create?cid=53ee578e84b3b60b00fcc1e8&uid=53ee578084b3b60b00fcc1e7`

  * This creates an entry tied to `Test Test` campaign, and `Robby` user, and sends the tracking email to `Robby`'s email address.

***
####Clearing all current collections
For demo purposes, I provided the endpoint to clear out all documents in every collection.

 * `http://emailtracker.herokuapp.com/clearCollections`

***
###Demo Workflow
1. Create a `User`, with `name` and `email` parameters.
  * Set the `email` value to something you can check on, obviously.
2. Create a `Campaign`, with `name` parameter.
3. Create a `CampaignEmail`, with `cid` and `uid` parameters.
  * Use the previously created `User`'s and `Campaign`'s _id's for the values.
  * This will send the actual email.
4. You can now play around a little bit with the email to check the results. It should track each time you open it and register it as an `open`. You can submit the form to see current stats, and if you are the first to submit it will accept you as the person redeeming the offer (I know, this is mad weak, there would be much more logic to do this in the actual solution). You can forward it to different clients to see if it registers as an `open` on that client, and you can re-submit the form after it's been redeemed to see the different message. All requests will be logged at the `/list` endpoint to see.
