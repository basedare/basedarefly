# Nearby now drawer repair — 12 October 2026

The expanded mobile drawer repeated its first activity in the fixed header while the list scrolled. Its side-mounted handle still used the bottom sheet's vertical gesture, and location/zoom controls occupied the same region as the translucent header. Dismissal also left the expanded state set, so a later intent choice could bring back a fully open drawer.

The header now describes the list and its count, leaving activity titles in the scrollable content. A 44px collapse button and rightward swipe collapse the mobile drawer; a leftward swipe reopens its tab. Close and Escape dismiss it and reset expansion. Explicit intent/action choices can reopen it; data refresh does not reset dismissal. The shared selected-place sheet keeps its vertical gestures.

Mobile map navigation controls yield while the drawer occupies their lane, then return to their exact original coordinates. The renderer, camera, data sources, activity ordering, payment rules and authentication remain unchanged.

## Verification

- Production build and TypeScript pass. Targeted ESLint has zero errors and three existing image warnings; new callback dependencies are included. Graphify rebuilt and git diff --check passes.
- At 390px, browser pointer drags collapse/reopen horizontally. Collapse button and Close work. Scrolling the activity list to scrollTop 712.5 keeps a list-level header with no repeated activity title.
- After collapse, navigation bounds remain map-relative x=298, y=64, width=46, height=142, identical to their pre-open position. While expanded, controls are hidden and Close is the direct hit target.
- Closing removes the tray entirely. Reopening through PeeBear returns to the collapsed tab before explicit expansion.
- At 320px the close target is 44×44px, remains inside the viewport and receives the direct hit. Escape removes the drawer. Desktop retains visible map controls, the list-level header and working Close.
- Greenhouse Cafe's selected-place card still expands on an upward drag and collapses on a downward drag. Place-sheet behavior is unchanged.
- Screenshots and live smoke checks are captured with this chat's release artifacts.

## Release and rollback

No schema, environment or asset changes are required. Push to main and verify the exact production deployment plus live dismissal/reopen behavior. Revert this commit if the map controls fail to return, the drawer cannot be dismissed or selected-place dragging regresses.
