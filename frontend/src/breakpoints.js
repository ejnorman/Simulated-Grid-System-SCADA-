// This dashboard is designed to always fit in one viewport with no scrolling,
// so the constraint that actually matters is available HEIGHT, not MUI's
// default width breakpoints (which is why these are custom, not theme.breakpoints).
//
// Four deliberate, hand-tuned tiers instead of a smooth formula: each one is a
// state you can actually resize devtools to and check, rather than trusting
// math to hold at every possible window size. Above bpMd, nothing here
// applies and components render at their full/default size.
export const bpMd = '@media (max-height: 899px)';
export const bpSm = '@media (max-height: 749px)';
export const bpXs = '@media (max-height: 619px)';
