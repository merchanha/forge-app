# FORGE — Product Design Prompt
For Claude (Anthropic) and GPT (OpenAI). Paste as a single brief. Follow every section. Do not invent a different product.

---

## How to use this brief
- Treat the **North Star**, **Hard constraints**, and **Must-show journeys** as non-negotiable.
- If a later section conflicts with a hard constraint, the hard constraint wins.
- Design a connected product, not a moodboard of disconnected screens.
- Prefer one original design system over copying Hevy, MetconRX, Nike Training Club, Strava, or The WOD Timer.
- If you must reduce scope, keep: onboarding → dashboard → multi-section builder → timer → results comparison → AI Coach.

---

## North Star
Design **FORGE**, a premium mobile-first Progressive Web App for hybrid athletes (CrossFit, HYROX, Running, Functional Fitness, Strength, Conditioning).

FORGE is a personal training platform, not a gym-admin dashboard and not a single-purpose timer.

Athletes can:
1. Build reusable multi-section routines
2. Execute them with format-specific timers
3. Save every session as history
4. Compare performance with the correct metric
5. Use AI to generate routines they can edit before saving

Tagline: **Build your training. Track your progress. Become stronger.**

It must work for a beginner and for a competitive athlete programming their own training.

---

## Hard constraints
1. Product name is FORGE. Do not rename it.
2. Dark mode is default. Include an optional light theme in settings and show it at least once.
3. Mobile-first. Large tap targets, thumb reach, high contrast for gym and outdoor light. Desktop uses a collapsible sidebar with the same IA.
4. A routine is a reusable template. Every execution is a separate history record. Never overwrite the template with a result.
5. A routine can contain multiple independent sections. Each section has its own format, exercises, config, and timer.
6. Compare workouts with the metric that matches the format. Never compare everything by time.
7. Do not auto-save or auto-start AI-generated routines.
8. Do not include WhatsApp, email dispatch, or other external notification integrations.
9. Do not use generic fitness-dashboard chrome, stock gym photography as the whole identity, or lorem ipsum.
10. Rx / Scaled is visible during workout execution.
11. Reference videos open in a sheet. The timer keeps running.
12. Empty, loading, error, and confirmation states exist for core flows.

---

## Role
Senior mobile product designer. Design a high-fidelity, interactive, production-quality UI. Think like a frontend engineer: real components, real states, realistic data, no orphan screens.

---

## Brand and visual system
Create an original FORGE identity.

Meaning: strength, discipline, progression, performance, consistency, athletic intelligence.

Look:
- Premium sports tech + athlete performance platform
- Dark-first, optional light
- Strong type hierarchy, tight spacing, little decoration
- Rounded cards, segmented controls, bottom sheets, status badges
- One signature accent used only for live timers, PRs, and primary CTAs. Choose one: forge orange, neon lime, or electric cyan. Do not use all three as equals.
- Charts must be readable in dark mode
- Subtle motion only: timer ticks, sheet enter, round increment, PR badge

Logo:
- Minimal FORGE wordmark
- Abstract mark that reads as forging, progression, or force
- Must work as a square app icon

References for UX quality, not visual copying:
- Hevy — exercise logging
- MetconRX / The WOD Timer — timer readability
- Nike Training Club — beginner clarity
- Strava — history and charts

---

## Sample data to design against
Use this data everywhere. Do not invent a different athlete as the default.

**Maya — beginner runner**
- 3 days/week, first 5k goal
- 5k: 22:10 → 21:45

**Andres — competitive CrossFit**
- Fran: 8:45 → 8:12 → 7:58
- Routine: Monday Engine Builder
  - Section 1 Warm-up — For Time, 8:00 — 400m easy run, 20 air squats, 10 push-ups
  - Section 2 Strength — Back squat 5×5 @ 80 kg, 2:00 rest
  - Section 3 Metcon — AMRAP 12 — 10 wall balls, 10 box jumps, 200m run
  - Section 4 Cooldown — Custom 5:00 mobility
- Last Engine Builder: 18:42 → 17:56 (−46s)

**Lucia — HYROX**
- Total time plus station and run splits
- Ask AI for a 30-min session based on her 10k pace

Units: kg default, lb available in settings.

---

## Information architecture
Mobile bottom nav: **Dashboard · My Training · Explore · Progress · AI Coach**
Profile / Settings from the avatar.

Persistent quick actions:
- Create Routine
- Start Fast Workout (single-section session, skips the full builder)
- Re-enter the live timer if a workout is in progress

Desktop: collapsible sidebar, same destinations, wider cards and charts.

---

## Screens and product spec

### 1. Auth and onboarding
- Login, register, forgot password, reset
- Email + optional Google
- Short onboarding only:
  - Experience: Beginner / Intermediate / Advanced
  - Interests: CrossFit, HYROX, Running, Functional Fitness, Strength (multi-select, one primary)
  - Goal: General fitness / Endurance / Strength / Competition
  - Days per week
  - Optional target event
- Personalize dashboard and AI from these answers
- Keep it few steps. Show progress. Optional fields can be skipped.

### 2. Dashboard — Athlete Hub
Next action first. Do not pack the screen with secondary stats.

- Greeting, current goal, weekly streak
- Today’s training: featured routine, category, duration, section count, format tags, primary Start Workout
- Weekly strip: workouts, time, running distance, 7-day viz
- Recent progress cards with the right metric
  - `5k Run  22:10 → 21:45`
  - `Fran  −47s`
  - Strength: load or volume
  - AMRAP: rounds + reps
  - PR badge when earned
- One AI suggestion that opens in the builder, not auto-saved
- Empty state: guided first routine, not a blank hub

### 3. My Training — library
Routine = template.

- Tabs: All, CrossFit, HYROX, Running, Functional, Strength
- Search, sort, favorites, recently performed
- Card: name, category, format tags, duration, difficulty, section count, exercise summary, last date, last result, PR
- Actions: create, edit, duplicate, favorite, archive, delete with confirm

### 4. Routine builder — core
This is the most important create-flow.

Routine fields: name, description, category, difficulty, objective, estimated duration, equipment, notes.

Sections:
- Add, remove, reorder (drag), edit
- Each section picks its own format
- Preview the full routine before save
- Progressive disclosure: basics first, RPE / time cap / scaling / extra equipment later

Format-specific fields (show only what that format needs):

| Format | Fields |
|---|---|
| AMRAP | duration, movements, reps, rounds+reps scoring |
| EMOM | duration or rounds, interval length, movement per minute, optional rest |
| For Time | movements, reps or distance, rounds, optional cap |
| Rounds for Time | round count, movements + reps, optional cap |
| Tabata | work, rest, rounds |
| Intervals | work, rest, rounds, movement setup |
| Strength | exercise, sets, reps, weight, rest, RPE |
| Running | distance, duration, target pace, intervals, splits |
| Custom | free blocks + optional timer |

Movement row:
- Name, e.g. Power Clean
- Parameters for the selected format
- Paste YouTube/Vimeo → thumbnail beside the title, tap to preview
- Exercise detail opens in a sheet. Builder context is not lost.

### 5. Exercise library and Explore
Each exercise: name, category, muscles, equipment, difficulty, description, video, cues, mistakes, beginner scale, advanced variation.

Users can search, filter, add to a section, create custom, attach video.

Explore: discover exercises and featured routines by discipline, then save to My Training.

### 6. Workout execution — timer
Walk sections in order. Each section owns its timer. Readable from the floor. One glance = current state.

Always visible:
- Routine name, current section, format badge
- Rx / Scaled
- Section progress
- Pause / resume / stop whole routine
- Next section / Finish
- Audio + optional haptic on phase change

Format UI:
- AMRAP: countdown + giant **+1 Round** and **+1 Rep**
- EMOM: interval clock, current and next movement, work/rest color shift
- For Time: count-up, cap, **Finish & Save**, splits
- Rounds for Time: count-up, current round, movement progression, cap
- Tabata / Intervals: work/rest countdown, round index, phase color
- Strength: set logger, load, rest timer, next set
- Running: clock, distance, pace, splits vs target
- Custom: countdown or stopwatch

Live video: floating control on the current movement. Sheet over the timer. Clock does not pause.

Fast Workout uses this same engine with one section.

### 7. Results and history
After Finish, show summary, then require Save.

Show: total time, per-section time, movements, rounds/reps, load, distance, pace, notes, PRs.

Delta vs last execution of the same template, using the right metric:
- For Time / HYROX: time + station splits (`18:42 → 17:56`)
- AMRAP: rounds and reps
- Strength: load and volume
- Running: distance, pace, time

### 8. Progress
Overview: workouts, hours, consistency, monthly activity.

Discipline views:
- CrossFit: WODs, AMRAP, For Time, strength, benchmarks, PRs
- HYROX: run, stations, total, splits
- Running: distance, pace, mileage, PRs
- Functional / Strength: conditioning, load, consistency

Routine compare: pick Fran (or any template) and list every attempt with chart, delta, and log. Date filters on.

### 9. AI Coach
Chat + suggested prompts.

Prompts to show:
- Recommend a CrossFit session for today
- Suggest a scale for today’s workout
- Build a 30-min HYROX piece from my 10k pace
- I have 45 minutes. Give me a functional workout
- How do I improve my running pace?
- Analyze last month
- Create a beginner strength block

AI returns routine cards in the same multi-section schema as the builder. User can edit, then Save to My Training.

### 10. Profile
Identity, experience, interests, goals, preferred disciplines, kg/lb, dark/light, account.

---

## UX rules
1. Beginner-clear, athlete-powerful.
2. Disclose complexity only when needed.
3. Start workout in as few taps as possible.
4. Timer visibility beats extra chrome.
5. History is one step from any completed workout.
6. AI is a proposal, not an automatic write.
7. Mobile, tablet, and desktop share one system.

---

## Must-show journeys
Design these as clickable paths with realistic data. Not isolated artboards.

1. Register → onboarding → personalized dashboard
2. Start today’s workout from the hub
3. Browse / filter / favorite a routine in My Training
4. Create Monday Engine Builder with four different section formats
5. Add Power Clean + video thumbnail without leaving the builder
6. Run the workout: Rx/Scaled, AMRAP +1 controls, video sheet while the clock runs
7. Finish, see 18:42 → 17:56, save
8. Open Fran history: 8:45, 8:12, 7:58
9. Ask AI Coach, edit the generated routine, save
10. Toggle light theme; system still holds

---

## Component inventory
Build once, reuse:
Navigation, workout cards, exercise rows, section cards, builder forms, format pickers, timer variants, PR/status badges, charts, filters, sheets, dialogs, empty/loading/error states, FAB / quick actions.

---

## Output
Produce a complete high-fidelity interactive prototype.

Show mobile as the primary canvas. Also show desktop for Dashboard, Builder, and Progress.

Every screen belongs to a journey above. Use Maya, Andres, and Lucia data. Include at least one empty state, one error, one confirmation, one PR, and one live timer.

When you start, lock the visual system first (type, color, radius, iconography, logo), then design the journeys in the order listed.

End state: a dark-first FORGE that can build mixed-format training, run it on a gym-readable timer, and prove the athlete got stronger.
