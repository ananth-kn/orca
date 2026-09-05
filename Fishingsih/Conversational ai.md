- User can either hold the voice button and start speaking, or just text.
- The user's current location along with the query will go to the llm(summary agent), so basically llm will have context about everything in user's screen.
Depending on the query, summary agent willl assign tasks to:
- Weather agent: Its job is just to get the weather of the user's current position from imd
- Satellite agent: To get satellite info from isro/mosdac
- Marine agent: Get info like wave, tide, current from incois
- Geo spatial agent: Info like geo boundaries, routes
- Other data agent: Info like sea depth n all

What are agents?
All these agents run the same llm, say sarvam 105b under the hood
We are not implementing Langgraph or langchain, which is meant for multiagentic softwares.
We will manually call these llms, with relevent context/prompt on the jobs they are assigned to.

Say weather agent, "system prompt": "You are a weather agent, your job is to get weather/ any hazards on the given latitude and longitude and their surrounding area (or whats exactly asked). The actions available are: "Weather" and "hazard info". Return "action" field set to one of these two or both depending on what is asked", "User prompt":(The prompt directly from the user will go here). 
Then we look for what it returned, 
if "action" == "weather":
(call api which will get weather info)
else (call hazard info gathering api)
All the agents will do the same and in the end they all give gathered info to the summarize llm, which will have a prompt to get user relevent data from the data gathered, and finally return it to the user.

Plan is to do speech to text(we need to look for a good model here), then give it to llm in same language(sarvam 105b should work, opensource), then just text to speech
Other option was to translate to english at start again translate from english to user language in the end, which'll add up to the latency, so we ditch it.
