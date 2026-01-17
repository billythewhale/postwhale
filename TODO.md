# TODOS

## IMPORTANT: HOW TO USE THIS DOCUMENT

AGENTS: When you begin working on an open task, change it to `[-]` In progress.
AGENTS: When you think you finish a task, mark it as `[*]` Coding Done (even if you tested it)
AGENTS: When you update a task, always add the date like (MM/DD/YYYY) at the end
AGENTS: NEVER mark a task as `[x]` Done, `[c]` Canceled, `[?]` Needs Research; these statuses are FOR HUMAN USE ONLY

[ ]: Open
[-]: In Progress
[*]: Coding Done, needs testing
[x]: Done
[c]: Canceled
[/]: Blocked
[?]: Blocked (needs further research)

# Open

IMPORTANT CONTEXT:

Terminology: The main app window is broken up like so:

```
+---+--------------+
|   |      B       |
| A +--------------+
|   |      C       |
+---+--------------+
```

- A is the SIDEBAR
- B is the CONFIG section
- C is the REQ/RES section

## BUGS

- [x] B4: When selecting a request in the sidebar, the endpoint the request belongs to SHOULD NOT also be active. Requests are nodes nested under endpoints. EITHER an endpoint (i.e. its anonymous request) OR a request can be active at a time. (01/15/2026)
- [x] B5: When filtering by search term, any children of a node that matches the search should be displayed. So if my search matches a service name, all the endpoints of that service should still be visible, regardless of whether they match or not. (01/16/2026)
- [x] B6: When the name of a Saved Request is very long, the little icon next to the saved request on the sidebar is far too tiny to be visible, needs to always be the same size (01/16/2026)
- [*] B7: When switching from one node to another:
  - [*] Changes to the current config are saved to state (fine, FOR THAT REQUEST/ENDPOINT)
  - [*] Changes are ported to the newly active node (THIS IS BAD, MUST FIX)
  - Understand this context:
    - 1. I select an endpoint node
    - 2. I add a new Query Param
    - 3. I select a Saved Request under that endpoint
      - I notice that the new Query Param is still active in the state: BAD
      - I notice that the "modified" dot appears next to the Saved Request: BAD (I didn't modify this one, I modified the AnonymousRequest on the endpoint node)
    - 4. I select the endpoint node again
      - Now my new Query Param should be visible and active again
  - Fix: Added configLoadedForRef to ensure modified check only runs after config is loaded for the correct node (01/16/2026)
- [*] B8: The "modified" dot is the same color as as active node highlight, so it's not visible on the active node. Should be a different color on all nodes, like a golden color (01/16/2026)
- [*] B9: The "modified" dot does not appear next to an endpoint node when I modified the query params (or any part of the config) (01/16/2026)


## TASKS

- [x] T1: "REQUEST NAME" looks like shit. Should just show the name to the right of the endpoint name. Click to edit behavior should remain the same. (01/15/2026)
- [x] T2: When hovering the request name, show pencil and trash icons. Clicking pencil starts rename (same as just clicking name). Clicking trash deletes after confirmation modal. (01/15/2026)
- [x] T3: When clicking the already-selected shop in the dropdown, that shop should remain the selected shop, rather than de-selecting it (01/15/2026)
- [x] T4: When editing the Name of a request, the text input should be flex={1} i.e. take up all the horizontal space available to it (01/16/2026)


## FEATURES

P1 - Highest
P2
P3 - Lowest

### F1: Query items (P1)

- [*] User can set Query items for requests (01/16/2026)
  - [x] Need a tab next to Params / Headers / Body
  - [x] User inputs query items in table format, like our headers currently
  - [/] If request schema shows query items, pre-populate the query table with these properties

### F2: Cancelling (P1)

- [*] Allow for canceling a request in flight (01/16/2026)
  - [x] Once "Send Request" Has been hit, show a spinner in the button with "Cancel" next to it
  - [?] when pressed, cancel the request
  - [x] When req is done, back to normal "Send Request"

### F3: Headers (P2)

- [x] Headers can be turned on/off, not just added/deleted
  - [x] User can toggle a switch next to the header to turn it off, without deleting the value

- [ ] Headers can be adjusted Globally
  - [ ] User can set header(s) and turn them on/off in the global scope, as well as specify headers in the scope of each request, as they do now.

### F4: Global shop selector (P1)

- [*] Add "Shop" dropdown selector at top, next to env menu (01/16/2026)
  - [x] User can pick from previously used values or add a new one
  - [x] User can also select "None" (for testing when no shop is sent)
    - [x] Use localstorage to store these
  - [x] Once a shop is selected, all requests should send the header "x-tw-shop-id" with that value
  - [/] FUTURE: If an endpoint specifies a spot where the shop goes (i.e. url query or post body) then auto-populate it. Need to figure out how we'd specify that in the microservice code.
  - [x] Dropdown needs to be wider than it is, shop names are long, like `madisonbraids.myshopify.com`

### F5: Save Requests (P1)

- [*] User can save "Requests" nested under each endpoint (01/16/2026)
  - [x] A request represents certain params for that endpoint. e.g. maybe I want to be able to test "No shop" where the "x-tw-shop-id" header is turned off
  - [x] Such saved requests show up as nodes nested under the endpoint in the left sidebar
  - [x] Request name is next to the endpoint name in the CONFIG section, clicking it turns it into a text input where it can be changed
  - [x] When clicking an endpoint in Sidebar, the defualt Request name is "New Request"
  - [x] When name is changed, "Save" button is expandable: - "Save as New" (keep old, save new under new name and new config) - "Update" (overwrite existing, with new name and new config) (01/15/2026)
  - [x] in case user clicks "Save Request" without having added a name, highlight the name field (error message: Name is required) and force user to add a name -- THIS SHOULD HAPPEN WHEN the name is "New Request" (01/15/2026)
  - [x] When trying to save a request and a request with that name already exists under that endpoint: highlight the name field (error message: A request called <Name> already exists) and force user to add a different name (01/15/2026)
  - [x] Drop "Request Name" modal altogether it shouldn't be needed (01/15/2026)
  - [/] User can choose to add these requests to the .yml file where the endpoint is described. (FUTURE -- do not implement)

### F6: More request/response info (P2)

- [ ] Inspect Request/Response once sent/received, similar to the view in Chrome DevTools when a Request is highlighted in the network tab.
  - [ ] The REQ/RES section has tabs, all info is read-only and reflects only this speific request that was sent, doesn't change when CONFIG above is changed, reset to blank when a new request is sent:
    - [ ] Info: Request URL, Request Method, Status Code, Status Message, Remote Address, Referrer Policy
    - [ ] Headers: Subsections (accordion-style): Request, Response -- both show headers in table style
    - [ ] Payload: Subsections (accordion-style): Params (table), Query (table), Body (JSON viewer)
    - [ ] Response: JSON viewer if response was application/json or else raw response (THIS IS THE DEFAULT ACTIVE VIEW WHEN RESPONSE IS RECEIVED)
    - [ ] Raw: Raw response, in case Response tab shows interactive JSON; if Response tab is already raw, hide this
    - [ ] Timing

### F7: New Endpoints and Requests (P2)

- [ ] User can create new Endpoints and Requests on the sidebar
  - [ ] Action item in sidebar context menu "Add Request"
    - [ ] First, opens a modal: Users chooses (existing) repo, chooses existing service in that repo, chooses or adds an endpoint. Checkbox/toggle for `internal` or `public`.
    - [ ] This adds the endpoint to local state first, user configures and sends requests as normal
    - [ ] When user chooses "Save Request", new endpoint info is written to openapi.yml (if public) or openapi.internal.yml (if internal) in the repo.

### F8: Endpoint info (P3)

- [ ] Endpoint displays an information section with info/docs about the endpoint
  - [ ] Add a Tab called "Info" to the Config section, before "Params"
  - [ ] Read documentation data from the openapi yml
  - [ ] When the user double-clicks on the info, she can edit it and then save

### F9: Body JSON editing improvements (P2)

- [ ] The Textarea for the body input should be:
  - [ ] Larger by default (4 lines, expanding up to 6 then scrolling)
  - [ ] Size adjustable
- [ ] On blur the JSON should highlight any syntax errors (can use 3rd party lib maybe??)
- [ ] while editing auto-close wrapper-like chars
  - [ ] example, when I type `"`, the second `"` should appear automatically and the cursor should be between them
  - [ ] same for `{` and `[` ... others??
- [ ] syntax highlighting would be nice: at least: colored brackets, green for strings, blue for numbers, purple for booleans
