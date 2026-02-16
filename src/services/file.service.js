// path: optional. content: string
export async function openFile() {
  if (window?.electronAPI?.openFile) {
    try {
      const res = await window.electronAPI.openFile();
      // expected shape: { path, content } or null
      return res;
    } catch (err) {
      console.error("openFile failed:", err);
      return null;
    }
  } else {
    console.warn("openFile: electronAPI not available (running in browser?).");
    return null;
  }
}

export async function saveFile(path, content) {
  if (window?.electronAPI?.saveFile) {
    try {
      const res = await window.electronAPI.saveFile(path, content);
      // expected shape: { path } or null
      return res;
    } catch (err) {
      console.error("saveFile failed:", err);
      return null;
    }
  } else {
    console.warn("saveFile: electronAPI not available (running in browser?).");
    try {
      // quick fallback: store in localStorage as untitled
      localStorage.setItem("saturn-last", content);
      return { path: null };
    } catch {
      return null;
    }
  }
}

export async function readFile(path) {
  if (window?.electronAPI?.readFile) {
    try {
      const content = await window.electronAPI.readFile(path);
      return content;
    } catch (err) {
      console.error("readFile failed:", err);
      return null;
    }
  } else {
    console.warn("readFile: electronAPI not available.");
    return null;
  }
}
