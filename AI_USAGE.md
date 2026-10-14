# AI Usage & Approach

## AI Usage

AI assistance was used for the final review of the existing Shipping Bill implementation, with attention to validation, field relationships, asynchronous mock services, error states, and submission behavior. The buyer-selection issue documented in this review was checked against the form and payload mapping before it was fixed. No dependencies or broad rewrites were introduced.

AI suggestions were treated as review input rather than as authoritative customs or backend guidance. The developer should confirm payload fields and regulatory rules against the assignment specification and backend contract.

## Engineering Approach

- Kept the existing React and shared form architecture, with repeated invoices, goods, containers, documents, and licences represented by field arrays.
- Kept form values and Shipping Bill payload mapping in `src/shipping-bills/model.ts`.
- Kept Promise-based mock loading and save operations in `src/shipping-bills/shipping-bill-form-service.ts`, with demo persistence in `src/shipping-bills/demo-store.ts`.
- Used form validation for required selections and numeric fields, and explicit loading, retry, success, empty, and error states where the existing flows need them.
- Avoided adding dependencies and changing behavior unrelated to the review findings.
