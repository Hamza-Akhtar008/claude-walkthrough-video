# Lessons from real use

**Scenes and data**
- One clip per scene, each opening its own browser context, so one scene can be re-recorded alone. Share values between scenes through a small state file (names of the things created).
- Verify each seeded item really exists before recording around it. Random test data can collide with older data and be merged or skipped; check and retry with fresh data.
- Seed data tied to "today" goes stale. Link straight to records (`?id=123`) instead of relying on a list.
- A filter or "live" view that depends on a date can break on a date format. If a list is unexpectedly empty, look at the network response before blaming the page.

**Waiting**
- Wrap anything slow in `think()`: capture is paused, so the video never shows the wait. Keep the cursor still while it waits.
- Log markers with `mark()` at the moment the key thing appears, and re-record after changing a script: marker times change.
- If a scene has to fit very short narration, show only the first of several similar steps and jump-cut to the result, instead of speeding everything up. More than about 2x looks frantic.

**Third-party sites (CRMs, social tools)**
- Save the login once (persistent profile or storage state). Never record the sign-in or 2FA.
- Wait for a locator that proves the page drew; these apps are slow. Close pop-ups with `opts.popups`.
- Many remember the last search. Clear it (and press Enter) before typing the new one.
- Prefer direct links to records over finding them in a long list: lists show only recent items.
- Cover the account name and avatar with `opts.cover` or blur them in `opts.init`.
- Wrap flourishes (zooms, highlights) so one failure cannot stop a scene.

**Slides and captions**
- Keep the bottom 200px of a slide clear; captions sit there.
- Three opening slides work well: the problem, what was done (or audited), the solution and the stack.
- Captions come from `chunks.txt`, so keep each line short and readable on its own.

**Real accounts**
- Never click anything that sends, publishes, schedules or deletes. Hover and explain.
- Check a frame for tokens, emails, phone numbers and notification pop-ups before sharing.
