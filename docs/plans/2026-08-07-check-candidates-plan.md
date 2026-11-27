# Plan: Check Candidates

**Goal**: Let players validate that every empty cell’s candidates still contain its solution and receive animated, colored feedback.
**Architecture**: Use a pure checker, a generalized bottom-right toast adapter, and local transient feedback state in `GameControls`.
**Tech Stack**: React 19, TypeScript, Vitest, Testing Library, CSS.

## Step 1: Add failing UI behavior tests

**File**: `src/App.test.tsx`

- Assert Check Candidates renders immediately below the number pad.
- Assert incomplete/incorrect candidate coverage produces a red alert and shake class.
- Assert complete solution coverage produces a green status toast and nod/sparkle class.
- Run `vitest run src/App.test.tsx` and verify failures are caused by the missing feature.

## Step 2: Implement validation and typed toasts

**Files**: `src/game/checkCandidates.ts`, `src/game/errorToast.ts`

- Return success only when at least one empty editable cell exists and every such cell includes its solution digit.
- Add success/error toast tones while preserving `showErrorToast` callers.

## Step 3: Add the control and animation state

**Files**: `src/components/GameControls.tsx`, `src/styles.css`

- Render the control under `.number-pad`.
- Replay success or failure motion on every attempt.
- Add green sparkle/nod and red shake treatments with reduced-motion overrides.
- Run the targeted tests until green.

## Step 4: End-to-end verification

- Run the full Vitest suite.
- Run the TypeScript project check.
- Run the production build.

| Group | Steps | Dependencies | Can Parallelize |
|---|---|---|---|
| 1 | 1 | None | No |
| 2 | 2–3 | Step 1 | No; shared UI contract |
| 3 | 4 | All prior steps | No |
