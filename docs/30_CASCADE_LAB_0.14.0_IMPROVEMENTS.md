# CASCADE LAB 0.14.0 — 30+ improvements

## Release scope

CASCADE LAB stays in OSGARD WORLD → Entertainment (`/games/`). The additions are an inline layer in the single-file HTML game; no third-party CDN or game runtime is required.

## Thirty improvements delivered

1. Version and iframe readiness identity updated to 0.14.0.
2. Direct link back to the official OSGARD games catalogue.
3. Accessible Engineering Console with a keyboard-shortcut reference.
4. Visible undo and redo controls.
5. Up to 50 edits in the current protocol's history.
6. Undo/redo for device placement.
7. Undo/redo for removing the last device.
8. Undo/redo for clearing the construction.
9. Undo/redo for rotation.
10. Undo/redo for drag-and-snap movement.
11. Duplicate selected device with Ctrl/Cmd+D.
12. Delete selected device with Delete/Backspace.
13. Move the selected device with arrow keys.
14. Use Shift+Arrow for larger movement steps.
15. Ctrl/Cmd+S saves progress.
16. Export construction to a versioned JSON file.
17. Import construction from a user-selected local JSON file.
18. Reject imports larger than 128 KB.
19. Check application identity and schema version.
20. Restrict imported devices to tools available in this protocol.
21. Validate coordinates and angle ranges.
22. Check supported platform anchors.
23. Enforce device capacity and non-overlap rules.
24. Keep the previous build undoable after a successful import.
25. Use the native system share sheet when available.
26. Cancelled sharing is not recorded as a completed share.
27. Add fullscreen with cinematic-mode fallback.
28. Navigate between adjacent protocols with [ and ].
29. Persist high-contrast settings.
30. Persist enlarged UI settings.
31. Offer reduced motion and respect the OS default.
32. Automatically pause physics when the tab is hidden (user-configurable).
33. Announce live undo/redo counts with an accessible status.
34. Restore focus after the Engineering Console closes.
35. Consolidate shortcuts in one reference panel.
36. Configure the OSGARD intermission frequency from the game using the catalog's shared preference key.
37. State clearly that +10 LC social rewards are local, self-reported and not proof of publication or money.

## Guardrails

- Import applies only to the current protocol/day. It rejects invalid schema, types, coordinates, unsupported anchors, overlaps and excess devices.
- Undo/redo is tab-local; regular progress continues to use the existing local save.
- OSGARD SELECT is promotion of owned projects, not a third-party ad network.
- A social platform does not return a verified published-post status. No cash payout is offered for the self-confirmed share.
- No payment processing is introduced by this update.
- A passing CI and production-route check, not this document, is the evidence of deployment.

## QA

The existing `npm run qa:games-detail` job checks the published iframe contract, version identity, presence and syntax of the single 0.14.0 layer, JSON import/export guards, history actions, accessibility controls and shared promo frequency.
