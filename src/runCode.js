export function runTests(code, tests, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const workerCode = `
      self.onmessage = (e) => {
        const { code, tests } = e.data;
        try {
          const fn = new Function(code + "; return typeof solve === 'function' ? solve : null;")();
          if (!fn) {
            self.postMessage({ error: "solve function nahi mila. 'function solve(...)' likhein." });
            return;
          }
          const results = tests.map((t) => {
            try {
              const out = fn(...t.input);
              const got = JSON.stringify(out);
              const expected = JSON.stringify(t.expected);
              return { input: JSON.stringify(t.input), expected, got, pass: got === expected };
            } catch (err) {
              return { input: JSON.stringify(t.input), expected: JSON.stringify(t.expected), error: err.message, pass: false };
            }
          });
          self.postMessage({ results });
        } catch (err) {
          self.postMessage({ error: err.message });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));

    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ error: "Time limit exceed. Kya code mein infinite loop hai?" });
    }, timeoutMs);

    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(e.data);
    };

    worker.postMessage({ code, tests });
  });
}