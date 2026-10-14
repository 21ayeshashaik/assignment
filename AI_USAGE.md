# AI Usage & Approach

## AI Usage

AI assistance was used to review the existing Shipping Bill implementation, inspect validation and payload behavior, diagnose lint output, and make the focused buyer-validation and payload changes. The form and payload mapper were inspected before changing the buyer requirement and serialization. No dependencies or broad rewrites were introduced.

AI suggestions were treated as review input, not authoritative customs or backend guidance. Payload fields and regulatory rules should be confirmed against the complete assignment specification and backend contract.

## Engineering Approach

- Kept the existing React and shared form architecture, with repeated invoices, goods, containers, documents, and licences represented by field arrays.
- Kept form values and Shipping Bill payload mapping in `src/shipping-bills/model.ts`.
- Kept Promise-based mock loading and save operations in `src/shipping-bills/shipping-bill-form-service.ts`, with demo persistence in `src/shipping-bills/demo-store.ts`.
- Required a buyer when it differs from the consignee; used blank-aware number conversion so incomplete drafts do not serialize a missing buyer or address as ID `0`.
- Preserved the existing loading, retry, success, empty, and error UI states. Mock data calls use Promise-based latency; failures are handled by the UI, but the mock services do not provide deterministic failure injection.

## Verification

- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed.
- Runtime assertions for blank buyer IDs, a distinct buyer, and same-buyer consignee mapping: passed.
- Focused ESLint: no errors in `shipping-bill-form-sections.tsx`; its eight warnings are spelling warnings. `model.ts` has two existing lint errors and four warnings, unchanged from the reviewed baseline.
- Repository-wide ESLint: 104 errors and 364 warnings. The errors are in existing code, including `shipping-bill-service.ts` (100), `demo-store.ts` (2), and `model.ts` (2). The changed form component has no errors.
- `pnpm lint-check` could not run because its Bash wrapper is unavailable in the Windows environment. Direct ESLint checks were run instead.
- Prettier's repository-wide check reports 128 files out of format. Focused checks passed for this document and the form component; `model.ts` was already reported by the repository-wide check before its payload change.
- No test script is defined in the root package manifest.

## Limits

The workspace README ends with an empty `# assignment` heading, and no complete assignment brief was available for comparison. The implementation and payload mapping therefore still need review against the actual assignment and backend contract.
