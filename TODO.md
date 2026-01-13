# Open

## BUGS

- [ ] for STAGING and PRODUCTION, the protocol is http, not https (01/13/2026)

## QUICK

- [ ] "Add Header" Button should just look like "+ Add" (the + is an icon not the text "+")
- [ ] Star icon should be to the left of the path in the request panel
- [ ] Tooltip should say "Add to Favorites" when hovering star icon in request panel or in left sidebar

## FEATURES

- [ ] User can set Request Query for requests
  - [ ] Need a tab next to Params / Headers / Body
  - [ ] User inputs query items in table format, like our headers currently
  - [ ] If request schema shows query items, pre-populate the query table with these properties

- [ ] Allow for canceling a request in flight
  - [ ] Once "Send Request" Has been hit, show a spinner in the button with "Cancel" next to it
  - [ ] when pressed, cancel the request
  - [ ] When req is done, back to normal "Send Request"

- [ ] Headers can be turned on/off, not just added/deleted
  - [ ] User can toggle a switch next to the header to turn it off, without deleting the value

- [ ] Headers can be adjusted Globally
  - [ ] User can set header(s) and turn them on/off in the global scope, as well as specify headers in the scope of each request, as they do now.

- [ ] Add "Shop" dropdown selector at top, next to env menu
  - [ ] User can pick from previously used values or add a new one
  - [ ] User can also select "None" (for testing when no shop is sent)
    - [ ] Use localstorage to store these
  - [ ] Once a shop is selected, all requests should send the header "x-tw-shop-id" with that value

- [ ] User can save "Requests" nested under each endpoint
  - [ ] A request represents certain params for that endpoint. e.g. maybe I want to be able to test "No shop" where the "x-tw-shop-id" header is turned off
  - [ ] Such saved requests show up as nodes nested under the endpoint in the left sidebar
  - [ ] When editing the request params/query/headers/Body
  - [ ] User can choose to add these requests to the .yml file where the endpoint is described. (FUTURE -- do not implement)

# Done

## BUGS

- [x] "Add Header" button SHOULD NOT be full width, it's ugly, simplify (01/13/2026)
- [x] Blue Star should be NEXT TO the open/close caret on the left sidebar nodes, since normal human UI pattern is to click the caret itself, it shouldn't transform into the star all of a sudden (01/13/2026)
- [x] for STAGING and PRODUCTION, the protocol is http, not https (01/13/2026)
- [x] "Add header" button is still full width. YOU MUST make the button not full width, it looks fucking stupid (01/13/2026)

## QUICK

- [x] Add a star icon next to the request title to star it there (blue/grey if unstarred and gold if starred) (01/13/2026)
