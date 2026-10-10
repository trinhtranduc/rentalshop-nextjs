# Intent: mobile texts in the app language (#756, #757, #758, #767)

Why: the apps show English API text in the Vietnamese app (paused / cancelled / past-due subscription), a wrong
reason ("Could not tell which store keeps this stock") for an owner of a blocked shop, and Vietnamese reasons in the
English "Collected" list. iOS is the reference; Android follows.

Constraints: no API change (old apps keep reading `description` and the codes); strings in en and vi (web: en and vi
`dashboard.json`); an unknown subscription / plan code never shows the API English text or the raw code.
