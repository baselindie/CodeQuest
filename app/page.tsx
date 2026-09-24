import Script from "next/script";

export default function Home() {
  return <>
    <header className="appbar"><button className="brand" id="homeBtn" aria-label="CodeQuest, ir al inicio"><img src="/icon.svg" alt=""/><span><strong>CodeQuest</strong><small>Aprende conquistando</small></span></button><div className="stats"><span>🔥 <b id="streak">1</b></span><span>🪙 <b id="coins">0</b></span><span>⚡ <b id="xp">0</b> XP</span><a href="/?view=account" id="accountBtn" className="account-btn" aria-label="Cuenta y sincronización" title="Cuenta y nube">☁️</a><button id="installBtn">Instalar</button></div></header>
    <button id="globalSync" className="global-sync" data-open-account aria-label="Comprobando cuenta: abrir cuenta y sincronización"><span>☁️</span><b id="globalSyncText">Comprobando cuenta…</b></button>
    <main id="app"><section className="welcome-screen"><div className="kicker">CODEQUEST · APRENDE CREANDO</div><h1>Tu aventura para aprender a programar</h1><p>Aprende HTML, CSS y JavaScript desde cero mediante misiones, práctica libre y proyectos que puedes enseñar en tu portafolio.</p><div className="welcome-actions"><span>🧱 131 misiones</span><span>🧪 Editor con vista previa</span><span>🚀 Proyectos reales</span></div><p className="welcome-hint">Cargando tu mapa de aprendizaje…</p></section></main>
    <aside className="install-notice" id="installNotice" role="status" aria-live="polite"><img src="/icon-96.png" alt=""/><div><strong>Instala CodeQuest</strong><small>Aprende como una app desde tu pantalla principal.</small></div><button className="install-now" id="installNow">Instalar</button><button className="install-later" id="installLater" aria-label="Cerrar">×</button></aside>
    <nav className="bottom" aria-label="Navegación principal"><button className="active" id="mapBtn" aria-label="Mapa">🗺️<span>Mapa</span></button><button id="practiceBtn" aria-label="Práctica">🧪<span>Práctica</span></button><button id="projectsBtn" aria-label="Proyectos">🚀<span>Proyectos</span></button><button id="rewardsBtn" aria-label="Premios">🎁<span>Premios</span></button><button id="achievementsBtn" aria-label="Logros">🏆<span>Logros</span></button></nav>
    <dialog id="modal"><button type="button" className="close" id="closeModal" aria-label="Cerrar">×</button><div id="modalContent"></div></dialog>
    <Script type="module" src="/app.js?v=53" strategy="afterInteractive" />
  </>;
}
