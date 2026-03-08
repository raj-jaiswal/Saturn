// Author: Divya Swaroop Jaiswal  
// Roll Number: 2401CS38

// Declaration of authorship:  
// I, Divya Swaroop Jaiswal, declare that I am the author of this 
// project and repository. All code, design and documentation in 
// this repository represent my own work unless external libraries
// are explicitly used and cited. 

export async function openFile() {
  if (window?.electronAPI?.openFile) {
    try {
      const res = await window.electronAPI.openFile();
      // expected: { path, content } | null
      return res;
    } catch (err) {
      console.error("openFile failed:", err);
      return null;
    }
  } else {
    console.warn("openFile: electronAPI not available (browser mode)");
    return null;
  }
}

export async function saveFile(path, content) {
  if (!path) return null;

  if (window?.electronAPI?.saveFile) {
    try {
      const res = await window.electronAPI.saveFile(path, content);
      return res;
    } catch (err) {
      console.error("saveFile failed:", err);
      return null;
    }
  } else {
    try {
      localStorage.setItem("saturn-last", content);
      return { path: null };
    } catch {
      return null;
    }
  }
}

export async function saveFileAs(content) {
  if (window?.electronAPI?.saveFileAs) {
    try {
      const res = await window.electronAPI.saveFileAs(content);
      // expected: { path } | null
      return res;
    } catch (err) {
      console.error("saveFileAs failed:", err);
      return null;
    }
  } else {
    // fallback: store as untitled if no path found
    try {
      localStorage.setItem("saturn-untitled", content);
      return { path: null };
    } catch {
      return null;
    }
  }
}

export async function readFile(path) {
  if (!path) return null;

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