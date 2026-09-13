{
  "schema": "gentle-ai.sdd-preproposal/v1",
  "revision": 7,
  "change_name": "add-pending-complaint-intake",
  "exploration_reference": {
    "path": "openspec/changes/add-pending-complaint-intake/explore.md",
    "revision": 1,
    "digest": "63ca7ce4270db955b5998eebbb076442253a0697f8d1d6d458a426c0a96c255c"
  },
  "research_request": {
    "status": "done",
    "completion_mandatory": true,
    "classes": ["documentation", "open-web"],
    "artifact": {
      "path": "openspec/changes/add-pending-complaint-intake/research.md",
      "revision": 4
    }
  },
  "admission": {
    "research": "done",
    "product_decisions": "confirmed",
    "proposal_ready": true,
    "bounded_evidence_limitations": [
      "The live IGN polygon exposes no exact dataset version; pin a retrieved copy and re-check upstream before production.",
      "Cloudflare Images documents HEIC but not HEIF separately; private HEIF intake does not authorize decoding or derivatives.",
      "OSM standard tiles are authorized only for constrained local development, never as the production basemap dependency."
    ]
  },
  "confirmed_decisions": [
    "The retained slice accepts an anonymous citizen complaint and persists it as non-public Pending data.",
    "The pilot territory is the official IGN Partido de Coronel de Marina Leonardo Rosales polygon, CODINDEC 06182, pinned with retrieval date.",
    "Territory validation uses covers semantics: points in the polygon interior or on its boundary are accepted; exterior points are rejected.",
    "Exactly one photo is required, up to 15 MB, accepting JPG, PNG, WebP, HEIC, and HEIF.",
    "HEIC and HEIF originals are stored as private opaque R2 objects without conversion, sanitization, derivative generation, or publication claims in this slice.",
    "Description is optional and limited to 500 characters; WhatsApp is optional and private.",
    "The citizen confirms a manual map point; optional GPS assistance cannot block manual selection.",
    "MapLibre may use standard OSM tiles only for constrained human-driven local development with visible attribution and policy compliance; no production tile provider is authorized.",
    "Turnstile is deferred from this local/synthetic slice; real anti-automation protection remains a separate production-readiness requirement.",
    "Durable D1 plus private R2 storage must precede success.",
    "Retries, including a lost response after storage, must not create duplicates.",
    "Moderation, publication, public complaint maps or counts, deployment, provisioning, and real-data intake are out of scope."
  ],
  "confirmed_authorizations": [
    "Add the first versioned, reversible local D1 schema and migration for durable Pending complaint persistence.",
    "Add the minimal MapLibre dependency required for local manual point selection.",
    "Pin the retrieved IGN CODINDEC 06182 polygon as a versioned local project fixture with source and retrieval metadata."
  ],
  "deferred_requirements": [
    "Real Turnstile credentials, production Siteverify policy, hostname/action checks, monitoring, and broader abuse controls.",
    "A separately reviewed and authorized production basemap or tile provider.",
    "A proven HEIC/HEIF publication-derivative pipeline that strips and independently verifies EXIF/GPS metadata.",
    "Upstream boundary freshness revalidation before production use."
  ],
  "artifact_authority": {
    "authoritative": "openspec",
    "engram": "auxiliary summaries only"
  },
  "constraints": [
    "Proposal may now be drafted from the confirmed scope and research, but this record does not authorize implementation.",
    "No specification, design, tasks, implementation, paid service usage, Cloudflare provisioning, deployment, commit, or push is authorized by this record alone."
  ]
}
