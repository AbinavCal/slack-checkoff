# slack-checkoff
Minimal implementation of a Slack bot to make and fulfill checkoff requests.
Made by Abinav Routhu for CS70 Fall 2020 @ UC Berkeley

## Description 
### Run a serverless Google Cloud Function to listen for and respond to checkoff related events from Slack using Slack API with Google Sheets API v4 for spreadsheet writing.

Adds **checkoff** command to Slack, used as 

```
/checkoff SID 'RD'/'AI' @TA
```

where *SID* is a unique identifier for students making checkoff requests, *'RD'/'AI'* refers to the requesting student's position 
(either as a 'RD' reader or 'AI' assistant instructor), and *TA* is the teaching assistant to Slack mention who will receive the request to accept/deny.

The bot will ensure that the 'TA' mentioned is pre-authorized before privately sending them the request. 
If the request is granted by the TA, the request will be logged in the specified Google Sheet with entry

|  TIMESTAMP |  GRANTER_NAME  |  GRANTER_EMAIL  |  REQUESTER_NAME  |  REQUESTER_SID  |  REQUESTER_POSITION  |
|------------|----------------|-----------------|------------------|-----------------|----------------------|

The data is pulled from the Slack profiles of the Granter/Requester. 

## Implementation 
1. Download the repo.
2. Create a new Slack App and note the signing secret. 
3. Register a bot token with permissions to view user profiles + emails, interact with commands, write direct messages and view direct message histories.
4. Create a new project on Google Cloud Console.
5. Create a service account for the project, generate associated service account credentials, and save it as *'credentials.json'*. 
6. Ensure Google Sheets API v4 is enabled and create a Sheets API key. 
7. Get the Google Sheet ID (alphanumeric string after /d/ in URL) of the Google Sheet that will be used to store checkoff records.
8. Collect the Slack member IDs of users who will be authorized to grant checkoffs *(Profile --> More ---> Copy Member ID)*. 
9. Create a *'config.js'* file to save key parameters.
    - Save the signing secret from (2) as  **SLACK_SIGNING_SECRET**.
    - Save the privileged bot token for your app from (3) as **SLACK_BOT_TOKEN**. 
    - Save the Google Sheets API key from (6) as **key**.
    - Save the Google Sheet ID from (7)  as **sheet**. 
    - Save the list of member IDs of authorized granters from (8) as **TAs**.
10. Zip the repo contents. The only modifications should be the new *'credentials.json'* and  *'config.js'* files.
11. Create a Cloud Function in Google Cloud Console (make sure to use the zip just created as the source code).
12. Go back to the Slack App and use the Cloud Function URL with '/slack/events' appended to the end as the Interactivity URL.  
13. Enable and create a new slash command, "/checkoff" with the Cloud Function URL with 'slack/events/checkoff' appended to the end as the Request URL.
14. Add the Slack App to your Slack workspace. 
15. Celebrate! 

(Optional) Use *deploy.js* and ngrok to share your checkoff Slack App across workspaces!

This process is, as you can see, a bit complicated. If you want to implement this for your own purposes, you will no doubt run into opaque, hair-loss inducing errors. But you don't have to do it alone! I'm always down to help -- reach me at abinavrouthu@berkeley.edu and we'll split the suffering. (:
## Known Bugs
- TAs granting requests can accept a request multiple times before the Cloud Function acknowledges and closes the request, causing multiple entries in the sheet for the same request 
- Very rarely, if 2 requests are accepted at the same time, one entry in the sheet may be overwritten 

Both of these issues are concurrency errors. If one really so cared, track which requests have been recorded to ensure no duplicate writes and add a read/write lock to ensure no overwrites. Pull requests welcome! 
