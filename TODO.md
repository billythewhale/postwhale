# TODOS

[ ]: Open
[-]: In Progress
[*]: Coding Done, needs testing (ATTENTION AGENTS: when you think you finished a task, mark it like this)
[x]: Done
[c]: Canceled
[/]: Blocked
[?]: Blocked (needs further research)


# Open

IMPORTANT CONTEXT:

Terminology: The main app window is broken up like so:

```
+---+--------------+
|   |              |
|   |      B       |
| A +--------------+
|   |      C       |
|   |              |
+---+--------------+
```

- A is the SIDEBAR
- B is the CONFIG section
- C is the REQ/RES section

## BUGS

- [ ] B4: When selecting a request in the sidebar, the endpoint the request belongs to SHOULD NOT also be active. Requests are nodes nested under endpoints. EITHER an endpoint (i.e. its anonymous request) OR a request can be active at a time.
  - This may or may not require a deeper architecture review and refactor so that the idea of the active Request (either saved/anonymous) is a first-class citizen


## TASKS

- [ ] T1: "REQUEST NAME" looks like shit. Should just show the name to the right of the endpoint name. Click to edit behavior should remain the same.
- [ ] T2: When hovering the request name, show pencil and trash icons. Clicking pencil starts rename (same as just clicking name). Clicking trash deletes after confirmation modal.
- [ ] T3: When clicking the already-selected shop in the dropdown, that shop should remain the selected shop, rather than de-selecting it


## FEATURES

### F0

- [ ] Change explicit save to auto-save behavior for existing saved requests:
  - [ ] When changing from a request to another request/endpoint, the updated request config should remain in local state (persist across restarts), even if the User didn't click "Save"
  - [ ] When the User makes changes to a request and then clicks "Save" and then "Save as New", the updated config should become the new request and the original config for the initial request should be restored
  - [ ] When an edpoint is active and the User clicks on a different endpoint or request in the sidebar, the (anonymous) request config should remain in local state (persist across restarts)

### F1

- [-] User can set Query items for requests
  - [x] Need a tab next to Params / Headers / Body
  - [x] User inputs query items in table format, like our headers currently
  - [/] If request schema shows query items, pre-populate the query table with these properties

### F2

- [-] Allow for canceling a request in flight
  - [x] Once "Send Request" Has been hit, show a spinner in the button with "Cancel" next to it
  - [?] when pressed, cancel the request
  - [x] When req is done, back to normal "Send Request"

### F3

- [x] Headers can be turned on/off, not just added/deleted
  - [x] User can toggle a switch next to the header to turn it off, without deleting the value

- [ ] Headers can be adjusted Globally
  - [ ] User can set header(s) and turn them on/off in the global scope, as well as specify headers in the scope of each request, as they do now.

### F4

- [-] Add "Shop" dropdown selector at top, next to env menu
  - [x] User can pick from previously used values or add a new one
  - [x] User can also select "None" (for testing when no shop is sent)
    - [x] Use localstorage to store these
  - [x] Once a shop is selected, all requests should send the header "x-tw-shop-id" with that value
  - [/] FUTURE: If an endpoint specifies a spot where the shop goes (i.e. url query or post body) then auto-populate it. Need to figure out how we'd specify that in the microservice code.
  - [x] Dropdown needs to be wider than it is, shop names are long, like `madisonbraids.myshopify.com`

### F5

- [-] User can save "Requests" nested under each endpoint
  - [x] A request represents certain params for that endpoint. e.g. maybe I want to be able to test "No shop" where the "x-tw-shop-id" header is turned off
  - [x] Such saved requests show up as nodes nested under the endpoint in the left sidebar
  - [x] Request name is next to the endpoint name in the CONFIG section, clicking it turns it into a text input where it can be changed
  - [x] When clicking an endpoint in Sidebar, the defualt Request name is "New Request"
  - [ ] When name is changed, "Save" button is expandable: - "Save as New" (keep old, save new under new name and new config) - "Update" (overwrite existing, with new name and new config)
  - [ ] in case user clicks "Save Request" without having added a name, highlight the name field and force user to add a name
  - [ ] Drop "Request Name" modal altogether it shouldn't be needed
  - [/] User can choose to add these requests to the .yml file where the endpoint is described. (FUTURE -- do not implement)

### F6

- [ ] Inspect Request/Response once sent/received, similar to the view in Chrome DevTools when a Request is highlighted in the network tab.
  - [ ] The REQ/RES section has tabs, all info is read-only and reflects only this speific request that was sent, doesn't change when CONFIG above is changed, reset to blank when a new request is sent:
    - [ ] Info: Request URL, Request Method, Status Code, Status Message, Remote Address, Referrer Policy
    - [ ] Headers: Subsections (accordion-style): Request, Response -- both show headers in table style
    - [ ] Payload: Subsections (accordion-style): Params (table), Query (table), Body (JSON viewer)
    - [ ] Response: JSON viewer if response was application/json or else raw response (THIS IS THE DEFAULT ACTIVE VIEW WHEN RESPONSE IS RECEIVED)
    - [ ] Raw: Raw response, in case Response tab shows interactive JSON; if Response tab is already raw, hide this
    - [ ] Timing

### F7

- [ ] User can create new Endpoints and Requests on the sidebar
  - [ ] Action item in sidebar context menu "Add Request"
    - [ ] First, opens a modal: Users chooses (existing) repo, chooses existing service in that repo, chooses or adds an endpoint. Checkbox/toggle for `internal` or `public`.
    - [ ] This adds the endpoint to local state first, user configures and sends requests as normal
    - [ ] When user chooses "Save Request", new endpoint info is written to openapi.yml (if public) or openapi.internal.yml (if internal) in the repo.
