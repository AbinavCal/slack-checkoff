# slack-checkoff
Minimal implementation of a Slack bot to make and fulfill checkoff requests.
Made by Abinav Routhu for CS70 Fall 2020 @ UC Berkeley

## Description 
Adds **checkoff** command to Slack, used as 

```
/checkoff [SID] 'RD'/'AI' @TA
```

where [SID] is a unique identifier for students making checkoff requests, 'RD'/'AI' refers to the requesting student's position 
(either as a 'RD' reader or 'AI' assistant instructor), and @TA is the teaching assistant who will receive and grant the request. 

The bot will ensure that the '@TA' refers to a pre-authorized user before privately sending them the request. 
If the request is granted by the TA, the request will be logged in the specified Google Sheet with entry

|  TIMESTAMP |  GRANTER_NAME  |  GRANTER_EMAIL  |  REQUESTER_NAME  |  REQUESTER_SID  |  REQUESTER_POSITION  |
|------------|----------------|-----------------|------------------|-----------------|----------------------|

This bot acts via a Google Cloud Function using the Google Sheets API for writing to the sheet and the bolt-js Slack API to listen for checkoff related events!

## Known Bugs
- TAs granting requests can accept a request multiple times before the Cloud Function acknowledges and closes the request, causing multiple entries in the sheet for the same request 
- Very rarely, if 2 requests are accepted at the same time, one entry in the sheet may be overwritten 

Both of these issues are concurrency errors. If one really so cared, track which requests have been recorded to ensure no duplicate writes and add a read/write lock to ensure no overwrites. Pull requests appreciated. 
