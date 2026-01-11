Here is the visual hierarcy for events stream:

Every single agent have this lifecycle
Moby agent is the main agent, but it can spawn sub-agents, ex: DataAnalystAgent

# turn_status -> signal from OpenAI that request went through

turn_status (started)
│
├── [Step 1: Agent Thinks & Calls Data Analyst]
│ └── response.created ... response.completed 
│ ├── response.output_item.added (type: reasoning)
| │ ├── response.reasoning_summary_part.added
| │ └── response.reasoning_summary_part.done
| │ ├── response.reasoning_summary_part.added
| │ └── response.reasoning_summary_part.done
│ ├── response.output_item.done (type: reasoning) 
│ │
│ ├── response.output_item.added (type: function_call, name: data_analyst)
│ │ └── response.function_call_arguments.done (args: "Compute ROAS...")
│ ├── run_item_stream_event (name: data_analyst)
│ └── response.output_item.done (type: function_call)
|
│
├── [System Executes Tool 1]
│ ├── run_item_stream_event (name: tool_called) # SIGNAL
│ └── run_item_stream_event (name: tool_output) (output: "Query executed...") 
│
├── [Step 2, 3, 4...: The Loop Continues]
│ │ (Agent realizes it needs more data, calls similarity_search,
│ │ get_available_tables, get_table_schema, execute_query, etc.)
│ └── ... repeated response/tool cycles ...
│
├── [Step N: The Dashboard Builder Logic]
│ └── response.created ... response.completed
│ ├── response.output_item.added (type: reasoning)
│ │ │ (New Event Pattern Here!)
│ │ ├── response.reasoning_summary_part.added
│ │ └── response.reasoning_summary_part.done 
│ └── response.output_item.done (type: reasoning)
│
├── [Step N+1: Final Response Streaming]
│ └── response.created ... response.completed
│ ├── response.output_item.added (type: message, role: assistant)
│ │ │
│ │ ├── response.content_part.added (index: 0, type: output_text)
│ │ │
│ │ │ (High Volume Streaming)
│ │ ├── response.output_text.delta ("Last") # we only get delta for main Moby agent
│ │ ├── response.output_text.delta (" full")
│ │ ├── response.output_text.delta (" month")
│ │ │ ... (hundreds of these) ...
│ │ │
│ │ ├── response.output_text.done (The full finalized text string) 
│ │ │
│ │ └── response.content_part.done
│ │
│ └── response.output_item.done (type: message)
│
├── [App Specific Event]
│ └── dashboard.zip_ready (zip_url: "https://.../report.zip")
│
└── turn_status (completed)

We might be able to only use the following events:

response.output_item.* (type: reasoning)
response.reasoning_summary_part.*
run_item_stream_event (function calling - arguments - output and textoutput) <<<< 
