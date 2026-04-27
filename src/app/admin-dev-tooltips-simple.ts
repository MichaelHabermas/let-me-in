/**
 * Plain-language dev tooltip variants for the Gatekeeper admin surface.
 * Same shape and same keys as {@link ./admin-dev-tooltips-advanced}, but written
 * for a non-specialist reader. Each entry includes a glossary that defines any
 * term the simple text leaves implicit.
 */

import type { DevTooltipSimpleVariant } from './dev-tooltips';
import type { AdminTooltipKey } from './admin-dev-tooltips';

export const SIMPLE: Record<AdminTooltipKey, DevTooltipSimpleVariant> = {
  pageHeader: {
    what: 'The control room for the door-camera system. From here you add people, set how strict the camera should be, and review tricky cases.',
    why: 'Everything an operator needs is on one screen, so they do not have to hunt through menus during a busy moment at the door.',
    decisions: [
      'You have to log in to see anything — when you log out, the page resets.',
      'Each part of the screen is built on its own, so a problem in one box cannot break the others.',
      'One long page instead of separate tabs, so you can keep an eye on everything at once.',
    ],
    tradeoffs: ['A single page is faster to build but a little more crowded than separate tabs.'],
    glossary: [
      {
        term: 'Operator',
        def: 'The person sitting at this admin screen — the one running the door system.',
      },
      {
        term: 'Auth gate',
        def: 'A login check. If you have not signed in, you cannot use the page.',
      },
    ],
  },
  enrolledUsers: {
    what: 'The list of people the camera is allowed to recognize. Each row has a photo, name, role, when they were added, and buttons to edit, retake their photo, or remove them.',
    why: 'The camera can only recognize people it has been shown. This list is the rulebook for who gets in.',
    decisions: [
      'The list is saved in the browser, not on a server, so the photos never travel over the internet.',
      'Bulk import and export live at the top of the section, while edits for one person live on their row.',
      '"Retake" is its own button because retaking a photo is a bigger deal than fixing a typo in a name.',
    ],
    tradeoffs: [
      'Saving in the browser means the list does not sync between devices, but it keeps faces off the network.',
    ],
    glossary: [
      { term: 'Roster', def: 'The full list of people allowed in.' },
      {
        term: 'Browser storage',
        def: 'A small database that lives inside this browser tab. Nothing is sent to a server.',
      },
      {
        term: 'Biometric template',
        def: 'A math summary of a face. The camera compares this to live faces at the door.',
      },
    ],
  },
  matchThresholds: {
    what: 'A slider that decides how sure the camera has to be before it says "yes, that is them." A button next to it snaps the slider back to the recommended setting.',
    why: 'Face recognition is never 100% certain. The operator picks how strict to be: too strict and real people get rejected, too loose and the wrong person gets in.',
    decisions: [
      'The setting is a button on the screen instead of a number buried in a config file, so it can be changed without restarting.',
      'A "0.75" preset acts as the safe default to come back to.',
      'A live read-out next to the slider shows how the current setting is performing.',
    ],
    tradeoffs: [
      'Letting operators adjust this means they can also mis-adjust it; the safe-default button is the safety net.',
    ],
    glossary: [
      {
        term: 'Threshold',
        def: 'The cutoff: how similar two faces have to look before the system calls it a match.',
      },
      { term: 'False accept', def: 'The system says yes to the wrong person.' },
      { term: 'False reject', def: 'The system says no to the right person.' },
      {
        term: 'Cosine similarity',
        def: 'A number between 0 and 1 that says how similar two faces look. 1 = identical, 0 = nothing alike.',
      },
    ],
  },
  reviewInbox: {
    what: 'A pile of "we are not sure" cases the camera punted to a human. Each one shows the picture taken at the door, who the system thinks it might be, how confident it was, and Approve / Reject buttons.',
    why: 'Some faces are too close to call. Instead of guessing wrong at the door, the system saves these for an operator to look at when they have time.',
    decisions: [
      'The pile fills up in the background — the door keeps working while items wait for review.',
      'The number of waiting items shows in the section header so the operator notices it without being nagged.',
      'Operator decisions teach the system, so the slider can be re-tuned over time.',
    ],
    tradeoffs: [
      'Reviewing cases is extra work, but as the slider gets tuned the pile should shrink.',
    ],
    glossary: [
      { term: 'Borderline', def: 'A case the camera could not confidently say yes or no to.' },
      {
        term: 'Three-state design',
        def: 'Instead of just yes/no, the system can also say "not sure — ask a human."',
      },
    ],
  },
  calibrationDetail: {
    what: 'A read-only chart showing how the recent matches scored, where the current cutoff sits on that chart, and how confident the system is in the cutoff.',
    why: 'It is not enough to set a number — the operator needs to see why that number makes sense. This is the picture that explains the choice.',
    decisions: [
      'This box shows information only — you cannot change anything from here. Changes happen in Match Thresholds.',
      'Splitting the explanation from the controls keeps each box focused on one job.',
    ],
    tradeoffs: [
      'Two separate boxes means the operator has to glance at both, but each box stays simple.',
    ],
    glossary: [
      {
        term: 'Calibration',
        def: 'Tuning the cutoff so it works well for your camera, your lighting, and your people.',
      },
      {
        term: 'Distribution',
        def: 'How recent match scores are spread out — most clustered around what number?',
      },
    ],
  },
  enrollPanel: {
    what: 'The form for adding a new person — take a photo or upload one, type their name and role, then save. Same form is used to retake someone’s photo later.',
    why: 'Adding the wrong person is the worst mistake this system can make: that person can walk in any time. So the form is deliberate, with explicit Save and Retake steps.',
    decisions: [
      'Camera capture and uploaded photos use the same preview, so you always see what is about to be saved.',
      'You have to press Save — taking a photo does not auto-save it.',
      'The face is turned into a math summary inside the browser, so the actual photo never leaves the device.',
    ],
    tradeoffs: [
      'Doing the math in the browser is slower on weak laptops, but keeps biometric data local.',
    ],
    glossary: [
      { term: 'Enrollment', def: 'Adding a new person to the allowed list.' },
      {
        term: 'Embedding',
        def: 'A face turned into a list of numbers the system can compare quickly.',
      },
    ],
  },
  enrollModelLoadRetry: {
    what: 'Tries again to download the face-recognition AI files when they failed to load. Only shows up when there has been a problem.',
    why: 'The AI files are downloaded fresh each session. If the download fails, you cannot enroll anyone. A button you press is safer than the system silently retrying forever.',
    decisions: [
      'The retry button is operator-driven, not automatic — failures should be visible.',
      'The button hides itself when there is nothing wrong, so it does not look like a dead control.',
      'The same status box is reused on the door page, just with different labels.',
    ],
    tradeoffs: [
      'One extra click on failure, but you avoid the system masking real problems by retrying behind your back.',
    ],
    glossary: [
      {
        term: 'Model',
        def: 'The AI file that lets the system look at a face. Two are needed: one to find faces in a picture, one to compare them.',
      },
      { term: 'ONNX', def: 'A common file format for AI models that can run inside a browser.' },
    ],
  },
  shadowPreview: {
    what: 'Runs a "what if" calibration on the side. It looks at recent matches and proposes new threshold numbers, but does not change the live ones. The proposal shows up in the box below.',
    why: 'Before changing how the door behaves, the operator should see what would change. A preview lets them check the new numbers and decide if they like them.',
    decisions: [
      'The preview never touches the live thresholds — it only fills in a side proposal.',
      'You can run it as many times as you want; each run starts from scratch.',
      'The proposal is saved, so you can review it later — you do not have to decide on the spot.',
    ],
    tradeoffs: [
      'Two steps (preview, then apply) is a little slower than one button, but a bad threshold change is much worse than one extra click.',
    ],
    glossary: [
      {
        term: 'Shadow mode',
        def: 'A safe rehearsal — the system runs the calculation but does not act on the result.',
      },
      {
        term: 'Proposal',
        def: 'A suggested change waiting for the operator to approve or dismiss it.',
      },
    ],
  },
  shadowApply: {
    what: 'Takes the proposed numbers from the preview and makes them the live ones. From this moment on, the door uses the new settings.',
    why: 'Without an Apply step, "preview" would just be advice nobody acts on. This is the official, recorded moment when the change takes effect.',
    decisions: [
      'Greyed out unless there is a real proposal to apply.',
      'No "are you sure?" pop-up — by now you have already reviewed the proposal, so an extra click would be annoying.',
      'The change is logged with details (when, how many samples, where it came from) so it can be audited later.',
    ],
    tradeoffs: [
      'There is no Undo — to recover, run a fresh calibration or press the safe-default button.',
    ],
    glossary: [
      { term: 'Apply', def: 'Make the proposed change real and active.' },
      {
        term: 'Audit',
        def: 'Being able to look back later and see what was changed, when, and why.',
      },
    ],
  },
  shadowDismiss: {
    what: 'Throws away the current proposal without applying it. The live settings stay the same and the proposal box clears out.',
    why: 'If the operator looks at a proposal and does not like it, they need a clean way to get rid of it without applying it.',
    decisions: [
      'Only the proposal is removed; the live settings are not touched.',
      'You are not stuck — you can press Preview again any time to get a fresh proposal.',
    ],
    tradeoffs: [
      'Dismissed proposals are not saved for history — only applied changes show up in the audit log.',
    ],
    glossary: [
      { term: 'Dismiss', def: 'Throw away without applying. Like clicking Cancel on a dialog.' },
    ],
  },
  applySpec075: {
    what: 'A "panic button" that snaps the strong-match number back to 0.75 — the safe, well-tested default.',
    why: 'After several rounds of tweaking, it is easy to lose track of whether the current numbers are still sensible. This button is the cheapest way to get back to a known-good setting.',
    decisions: [
      '0.75 is the number this system was tested with, so it is hard-coded into the button as a safe anchor.',
      'Only the strong-match floor resets — other settings the operator tuned are left alone.',
      'No "are you sure?" pop-up — this is a recovery button, and slowing it down would defeat the point.',
    ],
    tradeoffs: [
      'Hard-coding 0.75 ties the button to this specific AI model. Fine for now; would be revisited if the system ever uses multiple models.',
      'A one-click reset can hide a deeper problem if you just keep clicking it instead of investigating, but the chart next to it should make that obvious.',
    ],
    glossary: [
      {
        term: 'Strong-match floor',
        def: 'The lowest score that still counts as a confident "yes."',
      },
      { term: 'Spec', def: 'The written-down setting the system was designed and tested with.' },
    ],
  },
};
