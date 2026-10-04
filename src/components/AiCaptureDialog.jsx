import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, LoaderCircle, RefreshCw, Sparkles, X } from "lucide-react";
import { captureApi } from "../api/captures";
import { acceptedCaptureImages, capturePhase, captureToday, validateCaptureImages } from "../lib/captureUi";
import IntegrationDialog from "./IntegrationDialog";

export default function AiCaptureDialog({ open, onClose, onSuccess, initialDate, targetDomain, title, description, placeholder, label, examples = [], submitLabel = "Save with AI", imageLabel = "Add photos or screenshots", images = true, dated = false, task = false, onManual }) {
  const [text, setText] = useState(""), [date, setDate] = useState(initialDate || captureToday()), [dueDate, setDueDate] = useState("");
  const [files, setFiles] = useState([]), [previews, setPreviews] = useState([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(null), [organization, setOrganization] = useState(null);
  const [pollPaused, setPollPaused] = useState(false);
  const [provider, setProvider] = useState(null);
  const [uncertain, setUncertain] = useState(false);
  const [undone, setUndone] = useState(false);
  const [background, setBackground] = useState([]);
  const input = useRef(null), writing = useRef(false), startedAt = useRef(0), sequence = useRef(0), notified = useRef(null);
  const notify = useRef(onSuccess);
  const textInput = useRef(null);
  useEffect(() => {
    if (!open || saved) return;
    const frame = window.requestAnimationFrame(() => textInput.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open, saved]);
  useEffect(() => { notify.current = onSuccess; }, [onSuccess]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    captureApi.providerStatus().then(value => { if (active) setProvider(value); }).catch(() => { if (active) setProvider(null); });
    return () => { active = false; };
  }, [open]);
  useEffect(() => {
    if (open && !saved) {
      if (!text.trim() && !files.length) setDate(initialDate || captureToday());
      setError("");
    }
  }, [open, initialDate, targetDomain]);
  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file)); setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);
  useEffect(() => () => { sequence.current++; }, []);
  function publish(message) {
    try { Promise.resolve(notify.current?.(message)).catch(() => {}); } catch { /* A page refresh must not mark a saved capture as failed. */ }
  }
  const phase = capturePhase(organization);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current && (phase === "complete" || undone)) {
      sequence.current++; setSaved(null); setOrganization(null); setError(""); setPollPaused(false); setUndone(false);
    }
    wasOpen.current = open;
  }, [open, phase, undone]);
  useEffect(() => {
    // MCP may finish the saved capture even when in-app generation is unavailable.
    if (!saved || undone || phase !== "processing" || pollPaused) return;
    let stopped = false, timer;
    const version = sequence.current;
    async function sync() {
      if (stopped) return;
      if (Date.now() - startedAt.current > 15 * 60 * 1000) { setPollPaused(true); return; }
      if (document.visibilityState !== "visible") { timer = window.setTimeout(sync, 5000); return; }
      try {
        const result = await captureApi.organization(saved.id);
        if (stopped || version !== sequence.current) return;
        setOrganization(result); setError("");
        if (capturePhase(result) === "complete" && notified.current !== saved.id) {
          notified.current = saved.id;
          publish(result.receipt?.summary || "Your capture has been added to your records.");
        }
      } catch (reason) { if (!stopped && version === sequence.current) setError(reason.message || "Could not check progress. The capture is already saved."); }
      if (!stopped) timer = window.setTimeout(sync, 3000);
    }
    sync();
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [saved?.id, phase, pollPaused, provider?.configured, undone]);

  function choose(event) {
    try {
      const next = validateCaptureImages([...files, ...Array.from(event.target.files || [])]);
      setFiles(next); setError("");
    } catch (reason) { setError(reason.message); }
    event.target.value = "";
  }
  async function submit(event) {
    event.preventDefault();
    if (writing.current || saved) return;
    const content = [text.trim(), task && dueDate ? "Requested task due date: " + dueDate : ""].filter(Boolean).join("\n");
    if (!text.trim() && !files.length) { setError("Add a description or a photo to begin."); return; }
    if (content.length > 4000) { setError("Keep the description and date instructions within 4,000 characters."); return; }
    const selectedDate = date || initialDate || captureToday();
    if (dated && (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate) || selectedDate > captureToday())) { setError("Choose today or an earlier date (India time)."); return; }
    writing.current = true; setBusy(true); setError(""); const version = sequence.current;
    try {
      const payload = { text: content || title + " from image", captureDate: selectedDate, targetDomain };
      const result = files.length ? await captureApi.createWithImages(payload, files) : await captureApi.create(payload);
      if (version !== sequence.current) return;
      startedAt.current = Date.now(); setSaved(result); setOrganization(null); setPollPaused(false);
      setText(""); setFiles([]); setDueDate(""); setUncertain(false);
      publish("Capture saved. AI is organizing it; your records will refresh when ready.");
    } catch (reason) { if (version === sequence.current) { setUncertain(Boolean(reason.uncertain)); setError((reason.message || "Could not save this capture. Your draft is still here.") + (reason.uncertain && reason.requestId ? ` Receipt reference: ${reason.requestId}` : "")); } }
    finally { writing.current = false; if (version === sequence.current) setBusy(false); }
  }
  async function retry() {
    if (writing.current || !saved) return;
    writing.current = true; setBusy(true); setError("");
    const version = sequence.current;
    try {
      // Retry the existing capture, never upload/create a duplicate.
      await captureApi.organize(saved.id);
      if (version === sequence.current) { startedAt.current = Date.now(); setOrganization(null); setPollPaused(false); }
    } catch (reason) { if (version === sequence.current) setError(reason.message); }
    finally { writing.current = false; if (version === sequence.current) setBusy(false); }
  }
  async function undo() {
    if (writing.current || !saved) return;
    writing.current = true; setBusy(true); setError("");
    const version = sequence.current;
    try {
      const result = await captureApi.undo(saved.id);
      if (version !== sequence.current) return;
      setOrganization(result); setUndone(true);
      publish("Expense removed. Your original capture is kept; refreshed insights are independent of this undo.");
    } catch (reason) { if (version === sequence.current) setError(reason.message); }
    finally { writing.current = false; if (version === sequence.current) setBusy(false); }
  }
  useEffect(() => {
    const pending = background.filter(job => !job.undone && capturePhase(job.result) === "processing" && !job.paused);
    if (!pending.length) return;
    let stopped = false, timer;
    async function syncBackground() {
      if (stopped) return;
      if (document.visibilityState !== "visible") { timer = window.setTimeout(syncBackground, 5000); return; }
      const updates = await Promise.all(pending.map(async job => {
        if (Date.now() - job.started > 15 * 60 * 1000) return { ...job, paused: true };
        try { return { ...job, result: await captureApi.organization(job.id), error: "" }; }
        catch (failure) { return { ...job, error: failure.message || "Progress unavailable; your capture is saved." }; }
      }));
      if (stopped) return;
      setBackground(current => current.map(job => updates.find(next => next.id === job.id) || job));
      updates.filter(job => capturePhase(job.result) === "complete").forEach(job => publish(job.result.receipt?.summary || "Your earlier expense has been logged."));
    }
    timer = window.setTimeout(syncBackground, 3000);
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [background]);
  async function backgroundAction(job, undoExpense = false) {
    if (writing.current) return;
    writing.current = true; setBusy(true);
    try {
      if (undoExpense) {
        const result = await captureApi.undo(job.id);
        setBackground(current => current.map(item => item.id === job.id ? { ...item, result, undone: true, error: "" } : item));
        publish("Earlier expense removed. Your capture is kept.");
      } else {
        if (["failed", "review"].includes(capturePhase(job.result))) await captureApi.organize(job.id);
        setBackground(current => current.map(item => item.id === job.id ? { ...item, result: null, paused: false, started: Date.now(), error: "" } : item));
      }
    } catch (failure) {
      setBackground(current => current.map(item => item.id === job.id ? { ...item, error: failure.message } : item));
    } finally { writing.current = false; setBusy(false); }
  }
  function another() {
    if (saved) setBackground(current => [...current.filter(job => job.id !== saved.id), {
      id: saved.id, result: organization, started: startedAt.current, paused: pollPaused, undone, error: ""
    }]);
    sequence.current++; setSaved(null); setOrganization(null); setError(""); setPollPaused(false); setUndone(false); setDate(initialDate || captureToday()); }
  return <IntegrationDialog open={open} title={title} description={description} icon={Sparkles} busy={busy} onClose={onClose}>
    {provider?.configured === false && phase !== "complete" && <p className="inline-notice" role="status">{saved ? "Capture saved, not logged as an expense. In-app AI is unavailable. Process this existing capture through MCP; do not log a second copy." : "Automatic in-app AI is unavailable. You can save a capture for MCP processing, or use Manual entry for immediate logging."}</p>}
    {saved ? <div className="capture-result">
      <span className={"capture-result__mark is-" + phase}>{phase === "complete" || undone ? <CheckCircle2 size={30} /> : phase === "processing" && !pollPaused && provider?.configured !== false ? <LoaderCircle className="spin" size={28} /> : <Sparkles size={28} />}</span>
      <h3>{undone ? "Expense removed" : phase === "complete" ? "Added to your records" : provider?.configured === false && phase !== "complete" ? "Capture saved · AI unavailable" : phase === "failed" ? "Saved, but not organized yet" : phase === "review" ? "Saved, but needs another pass" : pollPaused ? "Your capture is saved" : "Saved. Mira is organizing it."}</h3>
      <p>{undone ? "The logged expense was undone. Your original capture is kept; it will not be logged again automatically." : phase === "complete" ? organization.receipt?.summary || "Your records have been refreshed." : provider?.configured === false ? "Use MCP to organize this existing capture when needed; it has not yet been logged as an expense." : phase === "review" ? "The AI could not finish automatically. Correct or retry this existing capture through MCP; do not create a second expense." : phase === "failed" ? "No need to upload again. Retry organizing this saved capture." : "You can close this window and carry on. Processing continues in the backend."}</p>
      <small>Capture #{saved.id} · {targetDomain.toLowerCase()}</small>
      {saved.mutationReceipt && <small>Receipt {saved.mutationReceipt.requestId} · {saved.mutationReceipt.replayed ? "Original save recovered" : "Capture saved"}</small>}
      {organization?.receipt?.entityRef && <p>Expense #{organization.receipt.entityRef} · open it in Entries to review or correct.</p>}
      {error && <p className="integration-error" role="alert">{error}</p>}
      <div className="capture-result__actions">
        {!undone && (phase === "failed" || phase === "review") && <button className="button button--secondary" type="button" disabled={busy || uncertain} onClick={retry}><RefreshCw size={16} /> Retry organizing</button>}
        {!undone && phase === "complete" && organization?.canUndo && <button className="button button--secondary" type="button" disabled={busy} onClick={undo}>Undo logged expense</button>}
        {pollPaused && <button className="button button--secondary" type="button" onClick={() => { startedAt.current = Date.now(); setPollPaused(false); }}><RefreshCw size={16} /> Check progress</button>}
        <button className="button button--secondary" type="button" disabled={busy} onClick={another}>Log another expense</button>
        <button className="button button--primary" type="button" disabled={busy || uncertain} onClick={onClose}>{phase === "complete" ? "Done" : "Keep going"}</button>
      </div>
    </div> : <>{onManual && <button className="button button--ghost" type="button" disabled={busy || uncertain} onClick={onManual}>Enter manually instead</button>}<form className="capture-form" onSubmit={submit} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); event.currentTarget.requestSubmit(); } }}>
      <label className="integration-field"><span>{label || "Describe it in your own words"}</span><textarea ref={textInput} className="text-input" rows={3} maxLength={4000} placeholder={placeholder} value={text} onChange={event => { setText(event.target.value); setError(""); }} disabled={busy || uncertain} /></label>
      {examples.length > 0 && <div className="expense-ai-examples" aria-label="Example expense descriptions"><span>Try an example, then edit it</span><div>{examples.map(example => <button key={example} type="button" disabled={busy || uncertain} onClick={() => { setText(example); setError(""); textInput.current?.focus(); }}>{example}</button>)}</div></div>}
      {(dated || task) && <details className="capture-options"><summary>Date and details · optional</summary><div className="capture-date-row">{dated && <label className="integration-field"><span>Date <small>Defaults to the selected day</small></span><input className="text-input" type="date" max={captureToday()} value={date} onChange={event => setDate(event.target.value)} disabled={busy || uncertain} /></label>}
        {task && <label className="integration-field"><span>Due date <small>optional</small></span><input className="text-input" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} disabled={busy || uncertain} /></label>}</div></details>}
      {images && <section className="capture-attachments" aria-label="Image attachments"><input ref={input} className="sr-only" tabIndex={-1} type="file" accept={acceptedCaptureImages.join(",")} multiple onChange={choose} disabled={busy || uncertain} />
        <div className="capture-previews">{previews.map((url, index) => <figure key={url}><img src={url} alt={files[index]?.name || "Selected image"} /><button type="button" disabled={busy || uncertain} aria-label={"Remove " + (files[index]?.name || "image")} onClick={() => setFiles(current => current.filter((_, i) => i !== index))}><X size={16} /></button><figcaption>{files[index]?.name}</figcaption></figure>)}</div>
        {files.length < 3 && <button className="capture-upload" type="button" disabled={busy || uncertain} onClick={() => input.current?.click()}><Camera size={19} /><span>{imageLabel}<small>JPG, PNG or WebP · up to 3 images · 5 MB each</small></span></button>}
      </section>}
      {error && <p className="integration-error" role="alert">{error}</p>}
      {uncertain && <p role="status">Your input is held unchanged. Press Save again to recover the original receipt safely.</p>}
      <footer className="capture-footer"><p>AI organizes your input. Estimates remain labelled and you can edit the saved records.</p><button className="button button--primary" type="submit" disabled={busy || !text.trim() && !files.length}>{busy ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}{busy ? "Saving…" : submitLabel}</button></footer>
    </form></>}
    {background.length > 0 && <details className="capture-options"><summary>{background.length} earlier saved {background.length === 1 ? "capture" : "captures"}</summary>{background.map(job => {
      const jobPhase = capturePhase(job.result);
      return <div className="capture-background" key={job.id}>
        <p>Capture #{job.id} · {job.undone ? "Expense removed; original capture kept" : jobPhase === "complete" ? job.result.receipt?.summary || "Expense logged" : job.paused ? "Saved; check progress when ready" : jobPhase === "processing" ? "Saved; processing in the background" : "Saved; organization needs another pass"}</p>
        {job.error && <p>{job.error}</p>}
        {!job.undone && (["failed", "review"].includes(jobPhase) || job.paused) && <button className="button button--secondary" type="button" disabled={busy} onClick={() => backgroundAction(job)}>Retry / check saved capture</button>}
        {!job.undone && jobPhase === "complete" && job.result.canUndo && <button className="button button--secondary" type="button" disabled={busy} onClick={() => backgroundAction(job, true)}>Undo logged expense</button>}
        {(jobPhase === "complete" || job.undone) && <button className="button button--ghost" type="button" onClick={() => setBackground(current => current.filter(item => item.id !== job.id))}>Dismiss status</button>}
      </div>;
    })}</details>}
  </IntegrationDialog>;
}
