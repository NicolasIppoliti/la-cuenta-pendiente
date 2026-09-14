# Complaint Intake Specification

## Purpose

Provide a bounded local/synthetic intake for an anonymous citizen complaint while keeping every accepted submission private and in the initial `Pending` state. This specification defines observable intake, validation, storage, privacy, map, failure, and compatibility behavior only.

## Requirements

### Requirement: Anonymous local synthetic intake

The system MUST allow an anonymous user to submit a local/synthetic complaint without authentication, account creation, or identity verification. The system MUST keep the existing warning that it is not an official municipal channel visible and unweakened.

#### Scenario: Anonymous submission is accepted within the retained slice

- GIVEN a local/synthetic intake session with no authenticated identity
- WHEN the user supplies all required complaint information and submits it
- THEN the system processes the complaint without requiring authentication or identity verification
- AND the warning that the application is not an official municipal channel remains visible

#### Scenario: Real or official intake is not represented

- GIVEN the intake is used outside the approved local/synthetic scope or presented as an official channel
- WHEN the system evaluates the submission context
- THEN this change MUST NOT claim to accept real complaints or act as an official municipal submission channel

### Requirement: Pending non-public persistence

Every accepted complaint MUST be durably persisted with status `Pending`. Pending data MUST remain non-public: complaint records, coordinates, descriptions, WhatsApp values, and original photos MUST NOT be exposed through a public read path, public map, public list, public detail, or public aggregate.

`Pending` MUST NOT imply that the complaint was moderated, reviewed, approved, rejected, validated by an authority, published, or sent to the municipality.

#### Scenario: Accepted complaint remains private and Pending

- GIVEN a submission passes all intake validation and both required durable writes complete
- WHEN the system reports acceptance
- THEN the complaint has status `Pending`
- AND its complaint data and original photo are not publicly readable

#### Scenario: No publication or lifecycle workflow is introduced

- GIVEN a complaint is stored as `Pending`
- WHEN any consumer requests public complaints, statuses, markers, lists, details, or counts
- THEN the system does not provide that complaint data through this change
- AND no moderation, review, approval, rejection, or publication transition is performed

### Requirement: Exactly one private photo

A submission MUST contain exactly one photo. The photo MUST be no larger than 15 MB and MUST be in JPG/JPEG, PNG, WebP, HEIC, or HEIF format. The original MUST be retained privately. Accepting an image format MUST NOT imply that the original is decoded, converted, sanitized, stripped of metadata, safe to publish, or suitable for derivatives.

HEIC and HEIF originals MUST be retained as opaque private content, without conversion or derivative generation in this slice.

#### Scenario: Valid photo evidence is required

- GIVEN a submission contains exactly one photo of an allowed format and no more than 15 MB
- WHEN the submission is validated
- THEN the photo requirement passes and the original is eligible for private retention

#### Scenario: Missing, multiple, oversized, or disallowed photo is rejected

- GIVEN a submission has no photo, more than one photo, a photo larger than 15 MB, or a photo in a disallowed format
- WHEN the server validates the submission
- THEN the submission is rejected as a non-success
- AND no successful complaint acceptance is reported

#### Scenario: HEIC and HEIF remain opaque private originals

- GIVEN a valid submission contains a HEIC or HEIF photo
- WHEN the submission is accepted
- THEN the original bytes remain private and opaque
- AND the system does not claim conversion, decoding, sanitization, metadata removal, derivative generation, or publication suitability

### Requirement: Optional private fields

The description MAY be omitted; when present, it MUST contain no more than 500 characters. WhatsApp MAY be omitted and, when supplied, MUST remain private complaint data. An overlong description MUST be rejected by the server.

#### Scenario: Optional fields obey their boundaries

- GIVEN a submission has no description, no WhatsApp value, or both
- WHEN the server validates it
- THEN omission of either optional field does not by itself cause rejection

#### Scenario: Description exceeds the limit

- GIVEN a submission contains a description longer than 500 characters
- WHEN the server validates the submission
- THEN the submission is rejected as a non-success
- AND no successful complaint acceptance is reported

#### Scenario: WhatsApp remains private

- GIVEN a submission includes a WhatsApp value
- WHEN the complaint is accepted or an error is returned
- THEN the WhatsApp value is not exposed in public UI, public responses, URLs, logs, or error details

### Requirement: Explicitly confirmed point within the pinned territory

The user MUST manually select and explicitly confirm the complaint point before submission. The authoritative territory MUST be the pinned official IGN polygon for Partido de Coronel de Marina Leonardo Rosales, CODINDEC `06182`, represented in EPSG:4326 and accompanied by its source and retrieval metadata.

Territory validation MUST use `covers` semantics: a point in the polygon interior or on its boundary MUST be accepted, while a point exterior to the polygon MUST be rejected. Any numerical tolerance MUST address floating-point robustness only and MUST NOT intentionally expand the territory.

#### Scenario: Interior point is accepted after confirmation

- GIVEN the user manually selects and explicitly confirms a point in the interior of the pinned CODINDEC `06182` polygon
- WHEN the server validates the submission
- THEN the location requirement passes

#### Scenario: Boundary point is accepted

- GIVEN the user manually selects and explicitly confirms a point on the boundary of the pinned CODINDEC `06182` polygon
- WHEN the server validates the submission
- THEN the location requirement passes

#### Scenario: Exterior point is rejected

- GIVEN the user manually selects and explicitly confirms a point outside the pinned CODINDEC `06182` polygon
- WHEN the server validates the submission
- THEN the submission is rejected as a non-success
- AND no successful complaint acceptance is reported

#### Scenario: Manual confirmation is mandatory

- GIVEN a point is absent or has not been explicitly confirmed by the user
- WHEN the user submits the complaint
- THEN the submission is rejected as a non-success, even if browser GPS supplied a coordinate

### Requirement: Optional nonblocking GPS assistance

Browser GPS MAY assist the user in selecting a point, but GPS MUST NOT be required for intake. GPS denial, unavailability, timeout, disabled support, or other GPS failure MUST NOT prevent manual selection and explicit confirmation.

#### Scenario: GPS failure does not block manual intake

- GIVEN browser GPS is denied, unavailable, times out, or fails
- AND the user manually selects and explicitly confirms a point covered by the pinned territory
- WHEN the user submits otherwise valid data
- THEN the submission is not rejected because GPS assistance failed

### Requirement: Local-only mapped basemap policy

The map MAY use standard OpenStreetMap raster tiles only for constrained, human-driven local development. The map MUST display visible `© OpenStreetMap contributors` attribution and MUST comply with the applicable OpenStreetMap tile policy. Standard OpenStreetMap tiles MUST NOT be treated as or authorized as a production basemap dependency.

The local map MUST NOT bulk-download, prefetch, use offline tiles, bypass caching policy, or hide required attribution. This change MUST NOT introduce or authorize a production tile provider.

#### Scenario: Local map shows attribution

- GIVEN the local intake map displays standard OpenStreetMap tiles
- WHEN the map is shown to the user
- THEN visible OpenStreetMap contributor attribution is present

#### Scenario: Production map usage is excluded

- GIVEN the application is considered for production or real-data operation
- WHEN a basemap provider is selected
- THEN this change provides no production tile authorization or provider

### Requirement: Server-side trust-boundary validation

The server MUST enforce the required photo count, photo size and format, description length, explicit manual confirmation, and territory rules for every submission. Client-side validation MAY provide earlier feedback but MUST NOT replace server enforcement.

#### Scenario: Client bypass cannot create an invalid accepted complaint

- GIVEN a client omits or bypasses browser validation
- WHEN the server receives missing, malformed, oversized, disallowed, unconfirmed, or out-of-territory data
- THEN the server rejects the submission as a non-success
- AND it does not report the invalid submission as accepted

### Requirement: Truthful durable success

The system MUST report success only after the Pending complaint record is durably stored in D1 and its private original photo is durably stored in R2. Validation failures, storage failures, and partial writes MUST be reported as non-success and MUST NOT be represented as a successful submission. Failure responses MUST NOT expose private complaint data, contact values, or photo content.

#### Scenario: Both durable records precede success

- GIVEN a submission passes server validation
- WHEN the D1 complaint record and private R2 original photo are both durably stored
- THEN the system reports successful acceptance of one non-public `Pending` complaint

#### Scenario: Partial durability is not success

- GIVEN either the complaint data or private original photo is not durably stored
- WHEN the intake operation completes or fails
- THEN the system reports a non-success outcome
- AND it does not claim that the submission was successfully accepted

### Requirement: Idempotent retry after a lost response

A retry of the same logical submission MUST converge on the original outcome and MUST NOT create a duplicate complaint or duplicate private photo object, including when the first request completed storage but its response was lost. Retry behavior MUST remain safe after an observable partial failure.

#### Scenario: Lost success response does not duplicate data

- GIVEN a submission's complaint data and private photo were durably stored
- AND the client did not receive the response
- WHEN the client retries the same logical submission
- THEN the system returns the original successful outcome
- AND exactly one Pending complaint and one private original correspond to that submission

#### Scenario: Partial-failure retry does not duplicate data

- GIVEN an initial attempt experienced a partial storage failure or returned non-success
- WHEN the client retries the same logical submission
- THEN the system either completes or truthfully reports the same logical submission outcome
- AND it does not create duplicate complaint data or duplicate private photo objects

### Requirement: Preserve existing API compatibility behavior

The existing health endpoint MUST remain available with its existing JSON response and process-liveness semantics. It MUST NOT be changed to claim D1 or private R2 readiness. Unknown API routes MUST continue to return the existing JSON API-error behavior rather than being treated as intake success or as a public complaint read.

#### Scenario: Health behavior remains process liveness

- GIVEN a client requests the existing health endpoint
- WHEN the Worker handles the request
- THEN the endpoint retains its existing JSON response and liveness meaning
- AND it does not assert D1 or private R2 readiness

#### Scenario: Unknown API behavior remains JSON

- GIVEN a client requests an unknown API route
- WHEN the Worker handles the request
- THEN the response retains the existing JSON API-error behavior
- AND the response does not expose complaint data

## Explicit Exclusions

This change MUST NOT introduce or claim any of the following:

- moderation, review, approval, rejection, or other complaint lifecycle behavior beyond initial `Pending`;
- publication or public complaint maps, lists, details, markers, statuses, or aggregate counts;
- Turnstile, real anti-automation protection, production credentials, rate limiting, or broader abuse controls;
- image derivatives, thumbnails, conversion, decoding guarantees, sanitization, metadata removal, or publication;
- production guarantees about IGN boundary freshness;
- authentication, accounts, authorization roles, identity verification, or real-person/real-complaint intake;
- production basemap authorization, Cloudflare provisioning, remote schema application, deployment, paid services, or production operations.
