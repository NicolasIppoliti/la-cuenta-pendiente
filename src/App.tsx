import { useRef, useState } from "react";
import { ComplaintMap, type Point } from "./ComplaintMap";

type Receipt = { complaintId: string; status: "Pending" };
type SubmissionState =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "retryable" }
  | { kind: "success"; receipt: Receipt };

const maxPhotoBytes = 15 * 1024 * 1024;
const allowedPhotoTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function newIdempotencyKey() {
  return crypto.randomUUID();
}

function isReceipt(value: unknown): value is Receipt {
  return (
    typeof value === "object" &&
    value !== null &&
    "complaintId" in value &&
    "status" in value &&
    typeof value.complaintId === "string" &&
    value.status === "Pending"
  );
}

export default function App() {
  const form = useRef<HTMLFormElement>(null);
  const [candidate, setCandidate] = useState<Point>();
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [photo, setPhoto] = useState<File>();
  const [description, setDescription] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [submission, setSubmission] = useState<SubmissionState>({ kind: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mapSession, setMapSession] = useState(0);
  const retryableSubmission = useRef(false);
  const submitInFlight = useRef(false);

  function markRetryable() {
    retryableSubmission.current = true;
    setSubmission({ kind: "retryable" });
  }

  function resetRetryForChangedContent() {
    if (!retryableSubmission.current) return;
    retryableSubmission.current = false;
    setIdempotencyKey(newIdempotencyKey());
    setSubmission({ kind: "idle" });
  }

  const updateCandidate = useRef((point: Point) => {
    if (submitInFlight.current) return;
    if (retryableSubmission.current) {
      retryableSubmission.current = false;
      setIdempotencyKey(newIdempotencyKey());
      setSubmission({ kind: "idle" });
    }
    setLocationConfirmed(false);
    setCandidate(point);
  }).current;

  function updatePhoto(file: File | undefined) {
    if (submitInFlight.current) return;
    resetRetryForChangedContent();
    setPhoto(file);
  }

  function updateDescription(value: string) {
    if (submitInFlight.current) return;
    resetRetryForChangedContent();
    setDescription(value);
  }

  function updateWhatsapp(value: string) {
    if (submitInFlight.current) return;
    resetRetryForChangedContent();
    setWhatsapp(value);
  }

  async function submitComplaint() {
    if (submitInFlight.current) return;
    if (!candidate || !locationConfirmed) {
      setSubmission({ kind: "error", message: "Confirmá el punto elegido antes de enviar." });
      return;
    }
    if (!photo) {
      setSubmission({ kind: "error", message: "Adjuntá una foto para continuar." });
      return;
    }
    if (!allowedPhotoTypes.has(photo.type)) {
      setSubmission({ kind: "error", message: "Elegí una foto JPG, PNG, WebP, HEIC o HEIF." });
      return;
    }
    if (photo.size > maxPhotoBytes) {
      setSubmission({ kind: "error", message: "La foto no puede superar los 15 MB." });
      return;
    }
    if (Array.from(description).length > 500) {
      setSubmission({
        kind: "error",
        message: "La descripción no puede superar los 500 caracteres.",
      });
      return;
    }

    const data = new FormData();
    data.set("idempotencyKey", idempotencyKey);
    data.set("longitude", String(candidate.longitude));
    data.set("latitude", String(candidate.latitude));
    data.set("locationConfirmed", "true");
    data.set("photo", photo);
    if (description.trim()) data.set("description", description.trim());
    if (whatsapp.trim()) data.set("whatsapp", whatsapp.trim());

    submitInFlight.current = true;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/complaints", { method: "POST", body: data });
      if (response.status >= 500) {
        markRetryable();
        return;
      }

      const receipt: unknown = await response.json();
      if (!response.ok || !isReceipt(receipt)) {
        setSubmission({
          kind: "error",
          message: "No se pudo enviar el reclamo. Revisá los datos.",
        });
        return;
      }

      setSubmission({ kind: "success", receipt });
      setCandidate(undefined);
      setPhoto(undefined);
      setDescription("");
      setWhatsapp("");
      setLocationConfirmed(false);
      setIdempotencyKey(newIdempotencyKey());
      setMapSession((session) => session + 1);
      form.current?.reset();
    } catch {
      markRetryable();
    } finally {
      submitInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  const hasRequiredFields = Boolean(candidate && locationConfirmed && photo);

  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col px-[24px] py-8 sm:px-12">
      <header className="border-b border-ink pb-6">
        <p className="text-sm font-bold uppercase tracking-widest">Proyecto vecinal</p>
      </header>
      <main className="flex flex-1 flex-col justify-center gap-8 py-16">
        <p className="w-fit rounded-lg bg-ink px-4 py-2 text-sm text-balance font-bold text-paper">
          En desarrollo · Solo demostración local
        </p>
        <h1 className="max-w-3xl text-4xl leading-tight font-bold sm:text-6xl">
          La Cuenta Pendiente
        </h1>
        <p className="max-w-2xl text-2xl text-balance leading-snug">
          Los reclamos de la ciudad, en un solo mapa.
        </p>
        <section aria-labelledby="development" className="max-w-xl border-l-4 border-ink pl-6">
          <h2 id="development" className="text-lg font-bold">
            Enviá un reclamo sintético
          </h2>
          <p className="mt-4 leading-relaxed">
            Esta versión es solo para uso local y sintético. No es un canal oficial municipal.
          </p>
          <form
            aria-busy={isSubmitting}
            className="intake-form mt-6 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void submitComplaint();
            }}
            ref={form}
          >
            <div className="intake-form__mutable" inert={isSubmitting ? true : undefined}>
              <fieldset disabled={isSubmitting} className="space-y-5 border-0 p-0">
                <ComplaintMap key={mapSession} onSelect={updateCandidate} />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="rounded bg-ink px-4 py-2 font-bold text-paper disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!candidate || isSubmitting}
                    type="button"
                    onClick={() => {
                      if (!submitInFlight.current) setLocationConfirmed(true);
                    }}
                  >
                    Confirmar punto
                  </button>
                  {locationConfirmed ? <p>Punto confirmado para el reclamo.</p> : null}
                </div>
                <div>
                  <label htmlFor="photo">Foto</label>
                  <input
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    aria-describedby="photo-help"
                    id="photo"
                    name="photo"
                    required
                    type="file"
                    onChange={(event) => updatePhoto(event.currentTarget.files?.[0])}
                  />
                  <p id="photo-help" className="text-sm">
                    Requerida: una foto JPG, PNG, WebP, HEIC o HEIF de hasta 15 MB.
                  </p>
                </div>
                <div>
                  <label htmlFor="description">Descripción</label>
                  <textarea
                    aria-describedby="description-help"
                    id="description"
                    name="description"
                    value={description}
                    onChange={(event) => updateDescription(event.currentTarget.value)}
                  />
                  <p aria-live="polite" className="text-sm" id="description-help">
                    Opcional, hasta 500 caracteres. {Array.from(description).length}/500 caracteres.
                  </p>
                </div>
                <div>
                  <label htmlFor="whatsapp">WhatsApp (opcional)</label>
                  <input
                    id="whatsapp"
                    name="whatsapp"
                    type="tel"
                    value={whatsapp}
                    onChange={(event) => updateWhatsapp(event.currentTarget.value)}
                  />
                </div>
              </fieldset>
            </div>
            {submission.kind === "error" ? <p role="alert">{submission.message}</p> : null}
            {submission.kind === "retryable" ? (
              <p role="alert">
                No pudimos completar el envío. Podés reintentar sin perder los datos.
              </p>
            ) : null}
            {submission.kind === "success" ? (
              <section aria-live="polite" role="status">
                <p>Reclamo recibido: {submission.receipt.complaintId}</p>
                <p>Estado: {submission.receipt.status}</p>
                <p>No implica revisión, publicación ni envío al municipio.</p>
              </section>
            ) : null}
            <button
              className="rounded bg-ink px-4 py-2 font-bold text-paper disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!hasRequiredFields || isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? "Enviando reclamo"
                : submission.kind === "retryable"
                  ? "Reintentar envío"
                  : "Enviar reclamo"}
            </button>
          </form>
        </section>
      </main>
      <footer className="border-t border-ink pt-6 text-sm">
        No compartas datos sensibles. Esta demostración no recibe reclamos oficiales.
      </footer>
    </div>
  );
}
