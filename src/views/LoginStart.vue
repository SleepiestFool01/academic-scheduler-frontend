<script setup>
import SocialLogin from '../components/SocialLogin.vue';
</script>

<template>
  <div class="login-root">

    <!-- Ambient background blobs -->
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="grid-overlay"></div>

    <!-- Left panel — branding -->
    <div class="left-panel">
      <div class="brand">
        <img src="../assets/cowork_logo_dark.png" alt="CoWork" class="brand-logo" />
        <span class="brand-name">Cowork</span>
      </div>

      <div class="hero-text">
        <p class="eyebrow">Campus Workforce</p>
        <h1 class="headline">
          Shifts, simplified<span class="dot">.</span>
        </h1>
        <p class="subline">
          One platform for every department on campus — from The Brew to IT, schedules that actually work.
        </p>
      </div>

      <div class="dept-chips">
        <span class="chip">The Dub</span>
        <span class="chip">Student Success</span>
        <span class="chip">IT</span>
        <span class="chip">Library</span>
        <span class="chip">The Brew</span>
      </div>
    </div>

    <!-- Right panel — login card -->
    <div class="right-panel">
      <div class="login-card">
        <div class="card-top">
          <p class="card-label">GET STARTED</p>
          <h2 class="card-title">Sign in to your account</h2>
          <p class="card-sub">Use your campus Google account to continue.</p>
        </div>

        <div class="divider">
          <span class="divider-line"></span>
          <span class="divider-text">continue with</span>
          <span class="divider-line"></span>
        </div>

        <div class="google-wrap">
          <SocialLogin />
        </div>

        <p class="card-footer">
          By signing in you agree to your department's scheduling policies.
        </p>
      </div>
    </div>

  </div>
</template>

<style scoped>
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.login-root {
  font-family: 'Satoshi', sans-serif;
  display: flex;
  min-height: 100vh;
  background: #08060a;
  color: #e2e8f0;
  overflow: hidden;
  position: relative;
}

/* ── Ambient background ── */
.blob {
  position: fixed;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.blob-1 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(255,23,68,0.12) 0%, transparent 70%);
  top: -100px; left: -100px;
  animation: drift 12s ease-in-out infinite alternate;
}
.blob-2 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(240,230,211,0.05) 0%, transparent 70%);
  bottom: -80px; right: 200px;
  animation: drift 16s ease-in-out infinite alternate-reverse;
}
@keyframes drift {
  from { transform: translate(0, 0); }
  to   { transform: translate(40px, 30px); }
}

.grid-overlay {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,23,68,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,23,68,0.03) 1px, transparent 1px);
  background-size: 48px 48px;
  pointer-events: none;
  z-index: 0;
}

/* ── Left panel ── */
.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60px 64px;
  position: relative;
  z-index: 1;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 80px;
}
.brand-logo {
  height: 52px;
  width: auto;
  object-fit: contain;
}
.brand-name {
  font-family: 'DM Mono', monospace;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: #e2e8f0;
}

.hero-text {
  margin-bottom: 40px;
}
.eyebrow {
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  letter-spacing: 0.2em;
  color: #FF1744;
  text-transform: uppercase;
  margin-bottom: 16px;
}
.headline {
  font-family: 'Playfair Display', serif;
  font-size: clamp(42px, 5vw, 64px);
  font-weight: 700;
  line-height: 1.1;
  color: #f1f5f9;
  margin-bottom: 20px;
}
.dot { color: #FF1744; }
.subline {
  font-size: 17px;
  color: #64748b;
  line-height: 1.7;
  max-width: 380px;
  font-weight: 300;
}

.dept-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 100px;
  border: 1px solid rgba(255,23,68,0.2);
  color: #475569;
  background: rgba(255,23,68,0.04);
  letter-spacing: 0.04em;
}

/* ── Right panel ── */
.right-panel {
  width: 460px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 48px;
  position: relative;
  z-index: 1;
  border-left: 1px solid rgba(255,255,255,0.05);
  background: rgba(13,13,20,0.6);
  backdrop-filter: blur(20px);
}

.login-card {
  width: 100%;
}

.card-top { margin-bottom: 36px; }
.card-label {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.2em;
  color: #FF1744;
  margin-bottom: 12px;
}
.card-title {
  font-size: 26px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}
.card-sub {
  font-size: 15px;
  color: #475569;
  line-height: 1.6;
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}
.divider-line {
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.07);
}
.divider-text {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  color: #334155;
  letter-spacing: 0.1em;
  white-space: nowrap;
}

.google-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}

.card-footer {
  font-size: 13px;
  color: #334155;
  text-align: center;
  line-height: 1.6;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .login-root { flex-direction: column; }
  .left-panel { padding: 48px 32px 32px; }
  .right-panel { width: 100%; border-left: none; border-top: 1px solid rgba(255,255,255,0.05); padding: 40px 32px; }
  .brand { margin-bottom: 40px; }
  .hero-text { margin-bottom: 28px; }
}
</style>