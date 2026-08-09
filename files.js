export const files = {
  'package.json': {
    file: {
      contents: JSON.stringify({
        name: "in-browser-converter",
        type: "module",
        dependencies: {
          "markitdown-js": "^0.0.14"
        }
      }, null, 2)
    }
  },
  'worker-convert.js': {
    file: {
      contents: `
        import Markitdown from 'markitdown-js';
        import fs from 'fs';

        async function processFile() {
          try {
            const converter = new Markitdown();
            // Read the binary file injected into our virtual filesystem
            const result = await converter.convert('./target-doc');
            
            // Output marker to easily catch it via the process buffer stream
            console.log('---BEGIN_MARKDOWN---');
            console.log(result.textContent);
            console.log('---END_MARKDOWN---');
          } catch (err) {
            console.error('CONVERSION_ERROR:', err.message);
          }
        }
        processFile();
      `
    }
  }
};
