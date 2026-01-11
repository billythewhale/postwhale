## Julio

### Improve streaming performance

- [ ] SSE endpoint should close once the turn is over (backend streamEndpoint fn returns).
- [ ] Frontend should reconnect when sending each message. This avoids polling redis when we don't need to.
    - [ ] update useSSE to return a "reconnect" hook that is a no-op if already connected
    - [ ] move message sending logic from Composer to ChatSessionContext, in a callback called "sendMessage"
        - [ ] ChatSessionContext also returns a function called onSendMessage,
              which registers callbacks to be invoked whenever sendMessage is called
        - [ ] EventsStream gets onSendMessage from useChatSession and registers ()=>reconnect();
    - [ ] Composer calls sendMessage from chat session context instead of calling sendChatMessage directly
    - [ ] Make sure we pass the latest event id or the latest timestamp we have to the backend each time when calling /stream/<sessionId>
        - [ ] Backend should not return events that happened before the latest timestamp (i think we're already doing this)

## Mike

### Work on Canvas

- [ ] Use figma, make it look like it's supposed to
- [ ] Show skeleton when reasoning items or tool call items are added with no content/summary
- [ ] Should be closed by default
- [ ] Should be able to close it with an X in the top right
- [ ] Canvas should only open when clicking on the `Thinking` message, not the whole turn
- [ ] If Canvas is open and user sends a message, Canvas should switch to the Turn that was just created

### Other UI eye sores

- [ ] Fix display of User name and Moby name -- better icons, follow figma design
- [ ] Make `Thinking` message __shiny__
- [ ] Any other aesthetic changes you see that need doing or things to match the figma

## Both/either

### Add more event types and streams

- [ ] Handle ReasoningItemSummaryPartAdded and ReasoningItemSummaryPartDone instead of just ReponseOutputItemAdded with type reasoning
    - [ ] Maksim can explain further
    - [ ] This will mean frontend and backend changes
    - [ ] `Thinking` message on the left should display:
            - the shortContent (between **<shortContent**\n\n) in the reasoning summary text for the most recent sumamry part
            - Then below that should display the first sentence of the rest of the summary text of the most recent part
            - Whole summary content is in the Canvas -- all parts
            - This is identical to ChatGPT behavior
- [ ] Add event handling logic for function calls
    - [ ] Display info about it in the Canvas
- [ ] Add event handling logic for sub-agent calls (like JokeAgent)
    - [ ] See figma for designs
- [ ] Special display for output charts like in the Figma. Create a new Message type, and it should be an object right on the messages array.
- [ ] Start handling the annotations in the response output items content. Show underlines on the left and highlight sources or whatever on the right.
    - [ ] Maybe create a component that can wrap annotated parts of the message with a \<span\> tag.
    - [ ] See Figma for more info



