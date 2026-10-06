import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, Check, Download, Headphones, Maximize2, Mic, MicOff, Pause, Play, RotateCcw, Settings2, Square, X } from "lucide-react";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import { DEFAULT_SCRIPT, TOTAL_SECONDS, clock, nextHandoff, restoreScript, sectionAt, wordAt, words, type Section, type Speaker } from "./script";
import { downloadBlob, loadTakes, preferredAudioType, saveTake, wavFromBuffer, type Take } from "./audio";
import "./style.css";

type Phase = "idle" | "countdown" | "rehearsing" | "paused" | "recording" | "saving";
const SCRIPT_KEY = "line-shared-teleprompter-v1";
const readScript = () => { try { return restoreScript(localStorage.getItem(SCRIPT_KEY)); } catch { return DEFAULT_SCRIPT; } };

function TakeCard({ take, index, onError }: { take: Take; index: number; onError: (message: string) => void }) {
  const [url, setUrl] = useState("");
  const [converting, setConverting] = useState(false);
  useEffect(() => { const objectURL = URL.createObjectURL(take.blob); setUrl(objectURL); return () => URL.revokeObjectURL(objectURL); }, [take.blob]);
  const filename = `line-moishi-ao-${new Date(take.created).toISOString().replace(/[:.]/g, "-")}`;
  const original = () => downloadBlob(take.blob, `${filename}.${take.blob.type.includes("mp4") ? "m4a" : take.blob.type.includes("ogg") ? "ogg" : "webm"}`);
  async function wav() {
    setConverting(true);
    const context = new AudioContext();
    try { const buffer = await context.decodeAudioData(await take.blob.arrayBuffer()); downloadBlob(wavFromBuffer(buffer), `${filename}.wav`); }
    catch { onError("WAV conversion isn't available for this take. Download the original audio instead."); }
    finally { await context.close(); setConverting(false); }
  }
  return <article className="take-card">
    <div className="take-title"><span>Take {index}</span><span>{clock(take.seconds)}</span></div>
    <p>{new Date(take.created).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Moishi + Ao</p>
    <audio controls src={url} preload="metadata" aria-label={`Listen to take ${index}`} />
    <div className="take-downloads"><button onClick={wav} disabled={converting}><Download size={14} />{converting ? "Converting…" : "WAV"}</button><button onClick={original}>Original audio</button></div>
  </article>;
}

function Studio() {
  const [script, setScript] = useState<Section[]>(readScript);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(3);
  const [fontSize, setFontSize] = useState(44);
  const [editing, setEditing] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [level, setLevel] = useState(0);
  const [takes, setTakes] = useState<Take[]>([]);
  const [tab, setTab] = useState<"setup" | "takes">("setup");
  const phaseRef = useRef<Phase>("idle");
  const elapsedRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const countdownRef = useRef<number | undefined>(undefined);
  const meterRef = useRef<AudioContext | null>(null);
  const startRef = useRef(0);
  const runToken = useRef(0);
  const liveWord = useRef<HTMLSpanElement>(null);
  const prompt = useRef<HTMLDivElement>(null);
  const current = sectionAt(script, elapsed);
  const currentIndex = script.findIndex(section => section.id === current.id);
  const next = script[currentIndex + 1];
  const handoff = nextHandoff(script, elapsed);
  const handoffIn = handoff ? Math.ceil(handoff.start - elapsed) : 0;
  const activeWord = wordAt(current, elapsed);
  const running = phase === "recording" || phase === "rehearsing";
  const locked = running || phase === "countdown" || phase === "saving" || connecting;
  const totalWords = script.reduce((sum, section) => sum + words(section.text).length, 0);
  const setState = (state: Phase) => { phaseRef.current = state; setPhase(state); };
  const moveClock = (time: number) => { elapsedRef.current = time; setElapsed(time); };

  useEffect(() => {
    loadTakes().then(setTakes).catch(() => setNotice("Browser storage is unavailable. Download each take before closing this page."));
    return () => { runToken.current++; window.clearTimeout(countdownRef.current); streamRef.current?.getTracks().forEach(track => track.stop()); void meterRef.current?.close(); };
  }, []);
  useEffect(() => {
    try { localStorage.setItem(SCRIPT_KEY, JSON.stringify(script)); }
    catch { setNotice("Script changes could not be saved in this browser."); }
  }, [script]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (["recording", "saving"].includes(phaseRef.current)) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  function stop() {
    runToken.current++;
    window.clearTimeout(countdownRef.current);
    if (recorderRef.current?.state === "recording") {
      setState("saving"); recorderRef.current.stop();
    } else { setState("idle"); }
  }

  useEffect(() => {
    if (!running) return;
    let frame: number;
    const tick = () => {
      const time = Math.min(TOTAL_SECONDS, (performance.now() - startRef.current) / 1000);
      moveClock(time);
      if (time >= TOTAL_SECONDS) { stop(); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // A wall-clock timer stops the recording even if animation frames are throttled.
    const hardStop = window.setTimeout(() => { moveClock(TOTAL_SECONDS); stop(); }, (TOTAL_SECONDS - elapsedRef.current) * 1000);
    return () => { cancelAnimationFrame(frame); clearTimeout(hardStop); };
  }, [phase]);

  useEffect(() => {
    if (!liveWord.current || !prompt.current) return;
    const top = liveWord.current.offsetTop - prompt.current.offsetTop - 78;
    prompt.current.scrollTo({ top: Math.max(0, top), behavior: running ? "smooth" : "instant" });
  }, [activeWord, current.id, fontSize, running]);

  useEffect(() => {
    if (!stream) { setLevel(0); return; }
    let context: AudioContext;
    try { context = new AudioContext(); } catch { return; }
    meterRef.current = context;
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser(); analyser.fftSize = 512;
    source.connect(analyser);
    void context.resume().catch(() => {});
    const data = new Uint8Array(analyser.fftSize);
    const timer = window.setInterval(() => {
      analyser.getByteTimeDomainData(data);
      const rms = Math.sqrt(data.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / data.length);
      setLevel(Math.min(1, rms * 5));
    }, 80);
    return () => { clearInterval(timer); source.disconnect(); void context.close(); meterRef.current = null; };
  }, [stream]);

  async function connectMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Open this page in Chrome, Edge, Firefox, or Safari on localhost to record your microphone."); return;
    }
    const token = ++runToken.current;
    setConnecting(true); setError("");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: false, audio: { ...(deviceId ? { deviceId: { exact: deviceId } } : {}), echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (token !== runToken.current) { media.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = media; setStream(media);
      media.getAudioTracks().forEach(track => track.addEventListener("ended", () => {
        if (streamRef.current !== media) return;
        stop(); streamRef.current = null; setStream(null); setError("The microphone disconnected. Reconnect it before the next take.");
      }));
      const inputs = await navigator.mediaDevices.enumerateDevices();
      if (token === runToken.current) setDevices(inputs.filter(device => device.kind === "audioinput"));
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setError(name === "NotAllowedError" ? "Microphone access was blocked. Allow the microphone in your browser's site settings, then try again." : name === "NotFoundError" ? "No microphone was found. Connect a microphone and try again." : "The microphone couldn't start. Check that it is connected and available, then try again.");
    } finally { setConnecting(false); }
  }

  function disconnect() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null; setStream(null);
  }

  function beginRecording() {
    const media = streamRef.current;
    if (!media || !media.getAudioTracks().some(track => track.readyState === "live")) { setError("Connect your microphone before recording."); setState("idle"); return; }
    try {
      const mimeType = preferredAudioType();
      const recorder = new MediaRecorder(media, mimeType ? { mimeType, audioBitsPerSecond: 192000 } : undefined);
      const chunks: Blob[] = [];
      let recordingError = "";
      let beganAt = 0;
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => { recordingError = "The microphone recording was interrupted. Any recovered audio is saved below."; stop(); };
      recorder.onstart = () => {
        beganAt = performance.now(); startRef.current = beganAt; moveClock(0); setState("recording");
      };
      recorder.onstop = async () => {
        setState("saving");
        const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || "audio/webm" });
        recorderRef.current = null;
        if (recordingError) setError(recordingError);
        if (blob.size) {
          const take: Take = { id: crypto.randomUUID(), created: Date.now(), seconds: Math.min(60, (performance.now() - beganAt) / 1000), blob, script: script.map(section => `${clock(section.start)} ${section.speaker}\n${section.text}`).join("\n\n") };
          setTakes(previous => [take, ...previous]); setTab("takes");
          try { await saveTake(take); setNotice("Take saved in this browser. Listen back or download the audio."); }
          catch { setNotice("This take couldn't be saved in browser storage. Download it before closing the page."); }
        } else { setError("No audio was captured. Check the microphone and try another take."); }
        setState("idle"); setFocused(false);
      };
      recorder.start(250);
    } catch { recorderRef.current = null; setState("idle"); setError("This browser couldn't start recording. Try another browser or microphone."); }
  }

  function startCountdown(record: boolean) {
    if (record && !stream) { setError("Enable the microphone first, then record."); return; }
    document.querySelectorAll("audio").forEach(audio => audio.pause());
    void meterRef.current?.resume();
    setEditing(false); setError(""); setNotice(""); moveClock(0); setCountdown(3); setState("countdown");
    const token = ++runToken.current;
    let left = 3;
    const advance = () => {
      if (token !== runToken.current) return;
      left--;
      if (left === 0) {
        if (record) beginRecording();
        else { startRef.current = performance.now(); setState("rehearsing"); }
      } else { setCountdown(left); countdownRef.current = window.setTimeout(advance, 1000); }
    };
    countdownRef.current = window.setTimeout(advance, 1000);
  }

  function rehearse() {
    if (phase === "rehearsing") { setState("paused"); return; }
    if (phase === "paused") { startRef.current = performance.now() - elapsedRef.current * 1000; setState("rehearsing"); return; }
    if (elapsed > 0 && elapsed < 60) { startRef.current = performance.now() - elapsedRef.current * 1000; setState("rehearsing"); }
    else startCountdown(false);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest("input, textarea, select, button, audio") || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (phase === "countdown" || phase === "recording") stop();
        else if (phase !== "saving" && !connecting) rehearse();
      }
      if (event.code === "Escape") { setFocused(false); if (phase === "countdown") stop(); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });

  function seek(seconds: number) { if (!locked) { moveClock(seconds); setState("idle"); } }
  function changeText(id: string, patch: Partial<Section>) { setScript(previous => previous.map(section => section.id === id ? { ...section, ...patch } : section)); }
  const timeRemaining = Math.max(0, Math.ceil(current.end - elapsed));
  const speakerSeconds = (speaker: Speaker) => script.filter(section => section.speaker === speaker).reduce((sum, section) => sum + section.end - section.start, 0);
  return <div className={`studio ${focused ? "focus-mode" : ""}`} data-speaker={current.speaker.toLowerCase()}>
    <header className="topbar">
      <a className="wordmark" href="/" title="Back to Line"><span className="line-mark"><i /><i /><i /></span>line<span className="wordmark-divider" /> <span className="studio-name">voice studio</span></a>
      <div className="top-meta"><span className="shared-names">Moishi <span>+</span> Ao</span><span className="duration-chip">ONE MINUTE</span></div>
      <button className={`icon-button ${focused ? "selected" : ""}`} onClick={() => setFocused(!focused)} aria-label={focused ? "Exit focus mode" : "Enter focus mode"} title="Focus mode"><Maximize2 size={18} /></button>
    </header>
    <main className="workspace">
      <aside className="outline">
        <div className="panel-eyebrow">THE RUN OF SHOW <span>06</span></div>
        <h1>One story.<br />Two voices.</h1>
        <p className="outline-subtitle">Follow the words.<br />We'll cue the handoffs.</p>
        <nav aria-label="Script sections" className="section-list">
          {script.map((section, i) => <button key={section.id} className={`section-link ${current.id === section.id ? "active" : ""} ${elapsed >= section.end ? "done" : ""}`} data-speaker={section.speaker.toLowerCase()} onClick={() => seek(section.start)} disabled={locked}>
            <span className="section-number">{elapsed >= section.end ? <Check size={14} /> : String(i + 1).padStart(2, "0")}</span>
            <span className="section-detail"><span>{section.title}</span><small>{section.speaker} <span>·</span> {clock(section.start)}–{clock(section.end)}</small></span>
          </button>)}
        </nav>
        <div className="speaker-share"><span><i className="moishi-dot" />Moishi <strong>{speakerSeconds("Moishi")}s</strong></span><span><i className="ao-dot" />Ao <strong>{speakerSeconds("Ao")}s</strong></span></div>
        <button className="edit-button" disabled={locked} onClick={() => setEditing(!editing)}><Settings2 size={16} />{editing ? "Back to prompter" : "Edit the words"}</button>
      </aside>

      <section className="reading-desk">
        <div className="desk-topline"><span className={`session-state ${phase === "recording" ? "is-recording" : ""}`}><i />{phase === "recording" ? "RECORDING AUDIO" : phase === "rehearsing" ? "REHEARSAL" : phase === "paused" ? "PAUSED" : phase === "saving" ? "SAVING TAKE" : phase === "countdown" ? "GET READY" : elapsed === 60 ? "THAT'S A TAKE" : "READY WHEN YOU ARE"}</span><span>{totalWords} words · 60 seconds</span></div>
        {error && <div className="message error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button></div>}
        {notice && <div className="message notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={16} /></button></div>}
        {editing ? <div className="script-editor">
          <div className="editor-heading"><h2>Make it sound like you.</h2><span>Saved as you type</span></div>
          {script.map(section => <div className="edit-section" key={section.id}>
            <div><label htmlFor={`text-${section.id}`}>{section.title} <small>{clock(section.start)}–{clock(section.end)}</small></label><select aria-label={`Speaker for ${section.title}`} value={section.speaker} onChange={event => changeText(section.id, { speaker: event.target.value as Speaker })}><option>Moishi</option><option>Ao</option></select></div>
            <textarea id={`text-${section.id}`} value={section.text} rows={4} onChange={event => changeText(section.id, { text: event.target.value })} />
            <small className={words(section.text).length / (section.end - section.start) * 60 > 155 ? "pace-warning" : ""}>{words(section.text).length} words · {Math.round(words(section.text).length / (section.end - section.start) * 60)} words/min{words(section.text).length / (section.end - section.start) * 60 > 155 ? " · A little fast. Try trimming." : ""}</small>
          </div>)}
          <button className="secondary-button" onClick={() => { setScript(DEFAULT_SCRIPT); moveClock(0); }}>Restore original script</button>
        </div> : <>
          <div className="speaker-header"><div><span className="speaker-caption">{elapsed === 60 ? "FINISHED" : "ON THE MIC"}</span><h2>{current.speaker}<span className="speaker-wave"><i /><i /><i /><i /></span></h2></div><div className="section-countdown"><strong>{String(timeRemaining).padStart(2, "0")}</strong><span>sec in this part</span></div></div>
          <div className="prompt-frame">
            <div className="reading-guide" /><div className="prompt-text" ref={prompt} style={{ fontSize: `${fontSize}px` }}>
              <p key={current.id}>{words(current.text).map((word, i) => <React.Fragment key={`${current.id}-${i}`}><span ref={i === activeWord ? liveWord : undefined} className={i < activeWord ? "word spoken" : i === activeWord && elapsed < 60 ? "word current-word" : "word"}>{word}</span>{" "}</React.Fragment>)}</p>
            </div>
            {phase === "countdown" && <div className="countdown-overlay" aria-live="assertive"><span>Moishi & Ao, ready?</span><strong>{countdown}</strong><p>{script[0].speaker} opens. Recording starts after the countdown.</p><button onClick={stop}>Cancel</button></div>}
          </div>
          <div className={`next-cue ${handoff && handoffIn <= 3 && running ? "handoff-soon" : ""}`} aria-live="polite"><span>{elapsed === 60 ? <><Check size={18} /> Finished together</> : handoff ? <><span className={`cue-dot ${handoff.speaker.toLowerCase()}-dot`} /><strong>{handoff.speaker}</strong> {handoffIn <= 3 && running ? `in ${handoffIn}…` : `takes over in ${handoffIn}s`}</> : <><Check size={18} /> Bring it home, {current.speaker}</>}</span><small>{next ? `Next: ${next.title}` : "Finish the line. Let it land."}</small></div>
          <p className="delivery-note">{current.cue}</p>
        </>}
        <div className="transport">
          <div className="timeline-head"><span className="main-clock">{clock(elapsed)}<span> / 01:00</span></span><label className="text-size">Aa<input aria-label="Teleprompter text size" type="range" min="28" max="64" value={fontSize} onChange={event => setFontSize(Number(event.target.value))} /><span>Aa</span></label></div>
          <div className="timeline" aria-label="60 second speaker timeline">{script.map(section => <button aria-label={`Jump to ${section.title}, ${section.speaker}, ${clock(section.start)}`} title={`${section.speaker} · ${section.title}`} key={section.id} onClick={() => seek(section.start)} disabled={locked} data-speaker={section.speaker.toLowerCase()} style={{ flex: section.end - section.start }}><span style={{ width: `${Math.max(0, Math.min(100, (elapsed - section.start) / (section.end - section.start) * 100))}%` }} /></button>)}</div>
          <div className="timeline-labels"><span>00:00</span><span>00:24 · Ao</span><span>00:48 · Moishi</span><span>01:00</span></div>
          <div className="transport-buttons">
            <button className="icon-button reset" title="Back to beginning" aria-label="Reset timeline" disabled={locked} onClick={() => seek(0)}><RotateCcw size={19} /></button>
            <button className="secondary-button" disabled={phase === "recording" || phase === "saving" || phase === "countdown" || connecting} onClick={rehearse}>{phase === "rehearsing" ? <Pause size={17} /> : <Play size={17} />}{phase === "rehearsing" ? "Pause" : phase === "paused" ? "Resume" : "Rehearse"}</button>
            {phase === "recording" || phase === "countdown" ? <button className="record-button stop-button" onClick={stop}><Square size={16} fill="currentColor" />{phase === "countdown" ? "Cancel countdown" : "Stop & save"}</button> : <button className="record-button" disabled={!stream || phase === "saving" || phase === "rehearsing" || connecting || script.some(section => !section.text.trim())} onClick={() => startCountdown(true)}><span className="record-circle" />{phase === "saving" ? "Saving…" : "Record both voices"}</button>}
          </div>
          <p className="transport-note">3-second count-in · automatic stop at 60s · audio only</p>
        </div>
      </section>

      <aside className="recording-panel">
        <div className="panel-tabs"><button className={tab === "setup" ? "active" : ""} onClick={() => setTab("setup")}>Microphone</button><button className={tab === "takes" ? "active" : ""} onClick={() => setTab("takes")}>Takes <span>{takes.length}</span></button></div>
        {tab === "setup" ? <>
          <div className={`mic-orb ${stream ? "connected" : ""}`} style={{ "--level": level } as React.CSSProperties}>{stream ? <Mic size={30} strokeWidth={1.5} /> : <MicOff size={30} strokeWidth={1.5} />}</div>
          <h3>{stream ? "You're connected." : "Bring both voices in."}</h3><p className="mic-copy">Use one microphone that can hear both of you. Your camera stays off here.</p>
          <label className="device-label" htmlFor="microphone">MICROPHONE</label>
          <select id="microphone" disabled={locked} value={deviceId} onChange={event => { disconnect(); setDeviceId(event.target.value); }}><option value="">System default</option>{devices.filter(device => device.deviceId !== "default").map((device, i) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${i + 1}`}</option>)}</select>
          <div className="level-display"><div className="level-bars" aria-label={`Microphone level ${Math.round(level * 100)} percent`}>{Array.from({ length: 24 }, (_, i) => <i key={i} className={level * 24 > i ? i > 20 ? "loud" : "lit" : ""} />)}</div><span>{stream ? level > 0.85 ? "A little loud. Move back slightly." : "Say a few words to check the level." : "Enable the mic to check your level."}</span></div>
          <button className="enable-mic" disabled={locked} onClick={stream ? disconnect : connectMicrophone}>{stream ? <MicOff size={16} /> : <Mic size={16} />}{connecting ? "Waiting for permission…" : stream ? "Disconnect microphone" : "Enable microphone"}</button>
          <div className="recording-details"><Headphones size={18} /><p>The countdown is silent. Both voices go into one audio file. Listen back, then download WAV for your edit.</p></div>
          <p className="local-note">Takes stay in this browser.<br />Nothing is uploaded.</p>
        </> : <div className="takes-list">{takes.length ? takes.map((take, i) => <TakeCard key={take.id} take={take} index={takes.length - i} onError={setError} />) : <div className="empty-takes"><Headphones size={30} /><h3>Your first take goes here.</h3><p>Enable the microphone and record. You can listen back and download the audio here.</p><button className="secondary-button" onClick={() => setTab("setup")}><ArrowLeft size={15} />Microphone setup</button></div>}<p className="local-note">Download the takes you want to keep.</p></div>}
      </aside>
    </main>
    <footer className="studio-footer"><span>A shared read for the Line demo.</span><span><kbd>Space</kbd> rehearse / pause / stop <span className="footer-dot">·</span> <kbd>Esc</kbd> exit focus</span></footer>
  </div>;
}

createRoot(document.getElementById("root")!).render(<Studio />);
