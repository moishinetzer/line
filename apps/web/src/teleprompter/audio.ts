export type Take = {
  id: string;
  created: number;
  seconds: number;
  blob: Blob;
  script: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("line-voice-takes", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("takes", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Close older teleprompter tabs to save takes."));
  });
}

export async function loadTakes(): Promise<Take[]> {
  const db = await openDatabase();
  try {
    return await new Promise<Take[]>((resolve, reject) => {
      const request = db.transaction("takes").objectStore("takes").getAll();
      request.onsuccess = () => resolve(request.result.sort((a: Take, b: Take) => b.created - a.created));
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

export async function saveTake(take: Take): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("takes", "readwrite");
      tx.objectStore("takes").put(take);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}

export function preferredAudioType(): string | undefined {
  return ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"].find(type => MediaRecorder.isTypeSupported(type));
}

export function wavFromBuffer(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const size = buffer.length * channels * 2;
  const view = new DataView(new ArrayBuffer(44 + size));
  const str = (offset: number, text: string) => [...text].forEach((letter, i) => view.setUint8(offset + i, letter.charCodeAt(0)));
  str(0, "RIFF"); view.setUint32(4, 36 + size, true); str(8, "WAVE");
  str(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, channels, true); view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true);
  str(36, "data"); view.setUint32(40, size, true);
  for (let frame = 0; frame < buffer.length; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[frame]));
      view.setInt16(44 + (frame * channels + channel) * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
  }
  return new Blob([view.buffer], { type: "audio/wav" });
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
