import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  ChartLineUp,
  CheckCircle,
  Desktop,
  DeviceMobile,
  DownloadSimple,
  FilePdf,
  ShieldCheck,
  VideoCamera,
} from "@phosphor-icons/react";
import "./landing-page.css";

const installerUrl = "/downloads/DeebCenter-Setup-1.0.0-x64.exe";
const androidApkUrl = "/downloads/DeebCenter-Android-2.0.2-preview.apk";

function Brand() {
  return (
    <a className="download-brand" href="#top" aria-label="Deeb Center home">
      <span className="brand-mark"><BookOpen weight="duotone" aria-hidden="true" /></span>
      <span className="brand-name">Deeb Center<small>FOCUSED LEARNING</small></span>
    </a>
  );
}

function DownloadLinks() {
  return (
    <div className="download-actions download-actions-hero">
      <a className="download-button download-button-windows" href={installerUrl} download>
        <Desktop weight="duotone" aria-hidden="true" />
        <span>Download for Windows</span>
        <ArrowRight weight="bold" aria-hidden="true" />
      </a>
      <a className="download-button download-button-android" href={androidApkUrl} download>
        <DeviceMobile weight="duotone" aria-hidden="true" />
        <span>Get Android APK</span>
        <span className="preview-chip">Preview</span>
        <ArrowRight weight="bold" aria-hidden="true" />
      </a>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="product-preview" role="img" aria-label="Illustration of a Deeb Center lesson with course materials and notes">
      <div className="preview-window">
        <div className="preview-window-bar">
          <span className="preview-window-brand"><span className="mini-brand-mark"><BookOpen weight="duotone" /></span> Deeb Center <span className="preview-window-label">Student workspace</span></span>
          <span className="preview-window-avatar">S</span>
        </div>
        <div className="preview-workspace">
          <aside className="preview-courses">
            <span className="preview-overline">YOUR COURSES</span>
            <div className="preview-course active"><span className="course-dot" /> Biology <ArrowRight weight="bold" /></div>
            <div className="preview-course"><span className="course-dot course-dot-sage" /> Chemistry</div>
            <div className="preview-course"><span className="course-dot course-dot-amber" /> Mathematics</div>
            <div className="preview-course-rule" />
            <div className="preview-progress-label"><span>Course progress</span><strong>In progress</strong></div>
            <div className="preview-progress-line"><span /></div>
          </aside>
          <section className="preview-lesson">
            <span className="preview-overline">BIOLOGY · LESSON</span>
            <h2>Cellular Biology</h2>
            <p className="preview-lesson-subtitle">Lesson materials in one place</p>
            <div className="preview-video-card">
              <img src="/figma/student-dashboard-desktop-lesson-thumbnail.png" alt="" />
              <span className="preview-play"><VideoCamera weight="fill" aria-hidden="true" /></span>
              <span className="preview-video-caption">Lesson video</span>
            </div>
            <div className="preview-materials"><span><FilePdf weight="duotone" /> Lesson handout</span><span><CheckCircle weight="duotone" /> Progress saved</span></div>
          </section>
          <aside className="preview-notes">
            <div className="preview-notes-heading"><span>Lesson notes</span><BookOpen weight="duotone" /></div>
            <div className="preview-note-line preview-note-line-long" />
            <div className="preview-note-line" />
            <div className="preview-note-line preview-note-line-short" />
            <div className="preview-notes-callout"><span>KEY IDEA</span><p>Review the lesson and its supporting materials together.</p></div>
            <div className="preview-note-line preview-note-line-long" />
            <div className="preview-note-line" />
          </aside>
        </div>
        <div className="preview-window-footer"><span><span className="status-dot" /> Your course workspace</span><span>Lessons <i /> Materials <i /> Progress</span></div>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <main className="download-site" id="top">
      <header className="download-nav">
        <div className="download-nav-inner">
          <Brand />
          <nav aria-label="Main navigation">
            <a href="#learning">Features</a>
            <a href="#protection">Privacy</a>
            <a href="#downloads">Downloads</a>
          </nav>
          <a className="nav-download" href="#downloads">Get the app <ArrowDown weight="bold" aria-hidden="true" /></a>
        </div>
      </header>

      <section className="download-hero">
        <div className="hero-copy">
          <p className="hero-kicker"><span /> A focused learning space</p>
          <h1>Quiet focus for your<br className="desktop-break" /> coursework.</h1>
          <p className="hero-description">Lessons, materials, and progress come together in a calm workspace for Windows and Android.</p>
          <DownloadLinks />
        </div>
        <ProductPreview />
        <div className="hero-caption"><span>LESSONS</span><i /><span>STUDY MATERIALS</span><i /><span>COURSE PROGRESS</span></div>
      </section>

      <section className="learning-section" id="learning">
        <div className="section-intro">
          <p className="section-kicker">Made for focused study</p>
          <h2>Your learning,<br />in one clear place.</h2>
          <p>Move from a lesson to its notes and resources without losing your place.</p>
        </div>
        <div className="learning-points">
          <article className="learning-point learning-point-featured">
            <span className="point-icon"><BookOpen weight="duotone" /></span>
            <div><h3>Course materials, together</h3><p>Watch lesson videos alongside the notes and resources that support them.</p></div>
            <img src="/figma/student-dashboard-desktop-lesson-thumbnail.png" alt="Illustrated biology lesson material" loading="lazy" />
          </article>
          <article className="learning-point">
            <span className="point-icon"><ChartLineUp weight="duotone" /></span>
            <div><h3>Progress you can follow</h3><p>Return to your courses and see what you have completed and what comes next.</p></div>
          </article>
          <article className="learning-point">
            <span className="point-icon"><DeviceMobile weight="duotone" /></span>
            <div><h3>Study across screens</h3><p>Use Deeb Center on your Windows desktop or Android phone.</p></div>
          </article>
        </div>
      </section>

      <section className="privacy-section" id="protection">
        <div className="privacy-copy">
          <p className="section-kicker">Content protection</p>
          <h2>Designed to help keep lessons private.</h2>
          <p>Deeb Center uses platform capture protections to help safeguard course materials while you study.</p>
          <p className="privacy-caveat">Protection depends on the operating system and capture method. It cannot block every recording method or an external camera.</p>
        </div>
        <div className="protection-card" aria-label="Screen capture protection by platform">
          <div className="protection-card-heading"><span className="protection-icon"><ShieldCheck weight="duotone" /></span><span><strong>Screen-capture protection</strong><small>Platform-specific safeguards</small></span></div>
          <div className="protection-row"><span className="platform-icon"><Desktop weight="duotone" /></span><span><strong>Windows desktop</strong><small>Excludes the app from supported capture tools.</small></span><CheckCircle weight="fill" /></div>
          <div className="protection-row"><span className="platform-icon"><DeviceMobile weight="duotone" /></span><span><strong>Android app</strong><small>Restricts screenshots and recordings through Android secure-window protection.</small></span><CheckCircle weight="fill" /></div>
        </div>
      </section>

      <section className="download-final" id="downloads">
        <div className="download-heading">
          <p className="section-kicker">Choose your device</p>
          <h2>Ready for your<br />next study session?</h2>
          <p>Download Deeb Center for the device you use to learn.</p>
        </div>
        <div className="download-cards">
          <article className="download-card download-card-featured">
            <div className="download-card-topline"><span className="download-card-label"><CheckCircle weight="duotone" /> Desktop app</span><Desktop weight="duotone" /></div>
            <h3>Deeb Center for Windows</h3>
            <p>Install the desktop learning app on your Windows PC.</p>
            <a className="download-card-action download-card-action-primary" href={installerUrl} download><DownloadSimple weight="bold" /> Download for Windows</a>
            <small>Windows installer</small>
          </article>
          <article className="download-card">
            <div className="download-card-topline"><span className="download-card-label download-card-label-preview">Android preview</span><DeviceMobile weight="duotone" /></div>
            <h3>Deeb Center for Android</h3>
            <p>Uninstall an older preview build before installing this update.</p>
            <a className="download-card-action download-card-action-secondary" href={androidApkUrl} download><DownloadSimple weight="bold" /> Get Android APK</a>
            <small>Preview APK · 61 MB</small>
          </article>
        </div>
      </section>

      <footer className="download-footer">
        <Brand />
        <span>© {new Date().getFullYear()} Deeb Center</span>
        <nav aria-label="Footer navigation"><a href="#protection">Privacy</a><a href="#downloads">Downloads</a><a href="#top">Back to top <ArrowDown weight="bold" aria-hidden="true" /></a></nav>
      </footer>
    </main>
  );
}

export default function App() {
  return <LandingPage />;
}
