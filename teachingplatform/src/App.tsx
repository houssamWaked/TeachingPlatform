import { ArrowDown, ArrowRight, BookOpen, Desktop, DeviceMobile, DownloadSimple, ShieldCheck } from "@phosphor-icons/react";
import "./landing-page.css";

const installerUrl = "/downloads/DeebCenter-Setup-1.0.0-x64.exe";
const androidApkUrl = "/downloads/DeebCenter-Android-1.0.0-preview.apk";

function Brand() {
  return (
    <a className="download-brand" href="#top" aria-label="Deeb Center home">
      <span className="download-brand-icon"><BookOpen weight="duotone" aria-hidden="true" /></span>
      <span>Deeb <strong>Center</strong></span>
    </a>
  );
}

function LessonPreview() {
  return (
    <div className="preview-wrap" aria-label="Preview of the Deeb Center learning app">
      <div className="preview-orbit preview-orbit-one" />
      <div className="preview-orbit preview-orbit-two" />
      <div className="lesson-preview">
        <div className="preview-topbar">
          <div className="preview-brand"><span className="preview-brand-mark"><BookOpen weight="duotone" /></span> Deeb Center</div>
          <span className="preview-avatar">S</span>
        </div>
        <div className="preview-greeting"><span>YOUR LEARNING SPACE</span><strong>Keep your momentum.</strong><small>Your lessons are ready when you are.</small></div>
        <div className="preview-course">
          <div className="preview-course-art"><BookOpen weight="duotone" /></div>
          <div className="preview-course-copy"><span>CONTINUE LEARNING</span><strong>Foundations of Biology</strong><small>Lesson 4 · Cell structure</small></div>
          <span className="preview-play" aria-hidden="true"><ArrowRight weight="bold" /></span>
        </div>
        <div className="preview-progress"><span><b>Course progress</b><small>4 of 8 lessons</small></span><span className="progress-track"><i /></span></div>
        <div className="preview-footer"><span><BookOpen weight="duotone" /> Lessons</span><span><ShieldCheck weight="duotone" /> Private access</span></div>
      </div>
      <div className="preview-note"><span className="preview-note-icon"><ShieldCheck weight="duotone" /></span><span><b>Made for focused learning</b><small>Your courses, in one place</small></span></div>
    </div>
  );
}

function LandingPage() {
  return (
    <main className="download-site" id="top">
      <header className="download-nav">
        <div className="download-nav-inner">
          <Brand />
          <nav aria-label="Main navigation"><a href="#learning">The experience</a><a href="#protection">Privacy</a></nav>
          <a className="nav-download" href={installerUrl} download>Download app <ArrowDown weight="bold" aria-hidden="true" /></a>
        </div>
      </header>

      <section className="download-hero">
        <div className="download-hero-inner">
          <div className="hero-copy">
            <p className="hero-kicker"><span /> A calmer way to learn</p>
            <h1>Make room for<br /><em>understanding.</em></h1>
            <p className="hero-description">Lessons, study materials, and progress come together in one focused space—so you can spend less time searching and more time learning.</p>
            <div className="hero-actions"><a className="primary-download" href={installerUrl} download><DownloadSimple weight="bold" aria-hidden="true" /> Download for Windows <ArrowRight weight="bold" aria-hidden="true" /></a><a className="android-download" href={androidApkUrl} download><DeviceMobile weight="duotone" aria-hidden="true" /> Android APK</a><a className="text-link" href="#learning">Explore the app <ArrowDown weight="bold" aria-hidden="true" /></a></div>
            <p className="download-meta"><Desktop weight="duotone" aria-hidden="true" /> Windows desktop app <span>·</span> Android preview available</p>
          </div>
          <LessonPreview />
        </div>
        <div className="hero-bottom-rule"><span>DEEB CENTER</span><span>LEARN AT YOUR OWN PACE</span><span>01 — 03</span></div>
      </section>

      <section className="learning-section" id="learning">
        <div className="section-intro"><p className="section-kicker">A space that keeps things simple</p><h2>Everything you need<br />to stay in the lesson.</h2><p>Pick up where you left off. Your course materials stay together, clear and easy to reach.</p></div>
        <div className="learning-points">
          <article className="learning-point"><span className="point-number">01</span><span className="point-icon"><BookOpen weight="duotone" /></span><div><h3>Lessons with context</h3><p>Watch lesson videos alongside the notes and resources that help them make sense.</p></div></article>
          <article className="learning-point"><span className="point-number">02</span><span className="point-icon"><ArrowRight weight="bold" /></span><div><h3>Progress you can follow</h3><p>Return to your courses and see what you have completed and what comes next.</p></div></article>
          <article className="learning-point"><span className="point-number">03</span><span className="point-icon"><DeviceMobile weight="duotone" /></span><div><h3>Designed for your screen</h3><p>A clear desktop experience today, with the same learning space being brought to mobile.</p></div></article>
        </div>
      </section>

      <section className="privacy-section" id="protection">
        <div className="privacy-mark"><ShieldCheck weight="duotone" /></div>
        <div className="privacy-copy"><p className="section-kicker">Learning deserves privacy</p><h2>Your lessons stay<br />in your space.</h2><p>Deeb Center uses private access to keep your learning connected to your device. The desktop app also enables Windows capture protection for supported screenshot and recording tools.</p></div>
        <div className="privacy-side"><span className="privacy-side-line" /><p>Built for focus.<br /><b>Designed with care.</b></p></div>
      </section>

      <section className="download-final">
        <div><p className="section-kicker">Ready when you are</p><h2>Start with your<br /><em>next lesson.</em></h2></div>
        <div className="final-action"><a className="primary-download" href={installerUrl} download><DownloadSimple weight="bold" aria-hidden="true" /> Download for Windows <ArrowRight weight="bold" aria-hidden="true" /></a><a className="android-download" href={androidApkUrl} download><DeviceMobile weight="duotone" aria-hidden="true" /> Download Android APK</a><p>Windows 10 or later <span>·</span> Android preview</p></div>
      </section>

      <footer className="download-footer"><Brand /><span>© {new Date().getFullYear()} Deeb Center</span><a href="#top">Back to top <ArrowDown weight="bold" aria-hidden="true" /></a></footer>
    </main>
  );
}

export default function App() {
  return <LandingPage />;
}
