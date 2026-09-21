/*
  STATIC PORTFOLIO INTEGRATION
  - Leaves the main website portrait.png untouched.
  - Uses the separate Lanyard assets in /public/assets/lanyard/.
  - Replaces only the existing .hero-draw kart SVG.
*/

(async function () {
  const mount = document.querySelector('.hero-draw');
  if (!mount) return;

  // React + ReactDOM are loaded by this module.
  const React = await import('https://esm.sh/react@19.1.0');
  const ReactDOM = await import('https://esm.sh/react-dom@19.1.0/client?external=react&deps=react@19.1.0');

  // Babel is used only to turn the Lanyard component's JSX into browser JS.
  const babel = await import('https://esm.sh/@babel/standalone@7.26.10');
  const source = await fetch('/lanyard/Lanyard.js').then(r => {
    if (!r.ok) throw new Error('Could not load /lanyard/Lanyard.js');
    return r.text();
  });

  const compiled = babel.transform(source, {
    presets: [['react', { runtime: 'classic' }]],
    sourceType: 'module',
    filename: 'Lanyard.jsx'
  }).code;

  // Convert the compiled source into an importable module.
  const blob = new Blob([compiled], { type: 'text/javascript' });
  const moduleUrl = URL.createObjectURL(blob);

  try {
    const mod = await import(moduleUrl);
    const Lanyard = mod.default;

    // Remove ONLY the old kart drawing.
    mount.replaceChildren();
    mount.classList.add('lanyard-mounted');

    const root = ReactDOM.createRoot(mount);
    root.render(
      React.createElement(Lanyard, {
        position: [0, 0, 27],
        gravity: [0, -40, 0],
        fov: 20,
        transparent: true,

        // These are deliberately different from portrait.png.
        frontImage: '/assets/lanyard/front-photo.png',
        backImage: '/assets/lanyard/back-photo.jpg',
        lanyardImage: '/assets/lanyard/lanyard-pattern.png',
        lanyardWidth: 1.15
      })
    );
  } catch (error) {
    console.error('Lanyard failed to load:', error);
    mount.innerHTML = '<div style="font-family:monospace;color:#7FA0BE;padding:20px">LANYARD LOAD ERROR — check browser console</div>';
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
})();
