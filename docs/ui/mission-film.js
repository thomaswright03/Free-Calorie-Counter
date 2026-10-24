// The mission video in the Home Screen walkthrough (install-gate.js). For
// someone new it opens full screen by itself and plays with sound, and the
// walkthrough goes on only once it ends; the "Our mission" step's picture
// plays it again later. The file, its captions and posters are in video/.

import { h, svg, uid, prefs } from './dom.js';
import { announce } from './feedback.js';
import { motionAllowed } from './motion.js';

const WATCHED_KEY = 'missionVideoWatched';

/** A play triangle, for the video's play buttons. */
function playIcon() {
  const icon = svg('svg', { viewBox: '0 0 24 24', width: 28, height: 28, 'aria-hidden': 'true', focusable: 'false' });
  icon.append(svg('path', { d: 'M8 5.5v13l11-6.5z', fill: 'currentColor' }));
  return icon;
}

/**
 * True when the page can make any element fill the screen. iPhone's Safari
 * can't (only a video itself goes full screen there, in its own player).
 */
function elementFullscreen() {
  const doc = /** @type {Document & { webkitFullscreenEnabled?: boolean }} */ (document);
  return !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
}

/** @param {HTMLElement} el */
function enterFullscreen(el) {
  const target = /** @type {HTMLElement & { webkitRequestFullscreen?: () => void }} */ (el);
  try {
    if (target.requestFullscreen) target.requestFullscreen().catch(() => {});
    else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
  } catch {
    // The layer already covers the whole page.
  }
}

/** @param {HTMLVideoElement} video */
function leaveFullscreen(video) {
  const doc = /** @type {Document & { webkitFullscreenElement?: Element, webkitExitFullscreen?: () => void }} */ (document);
  const player = /** @type {HTMLVideoElement & { webkitDisplayingFullscreen?: boolean, webkitExitFullscreen?: () => void }} */ (video);
  try {
    if (doc.fullscreenElement) doc.exitFullscreen().catch(() => {});
    else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    if (player.webkitDisplayingFullscreen && player.webkitExitFullscreen) player.webkitExitFullscreen();
  } catch {
    // Already back in the page.
  }
}

/**
 * The mission video, full screen. It opens by itself the first time the
 * "Our mission" step opens and starts with sound (the tap that got there
 * lets a phone play sound). There's no way out until it ends; then Next
 * goes on to the first step. On iPhone the video plays in iPhone's own
 * full-screen player (Safari can't make a page element fill the screen)
 * and comes back to this layer when it ends. A video that can't load never
 * holds anyone up: the layer says so and offers Next. A phone set to reduce
 * motion gets a play button instead of a video that starts by itself.
 * @param {() => void} onNext Next was tapped at the end
 * @param {() => void} onWatched the video has ended (or can't play) for the first time
 */
export function missionFilm(onNext, onWatched) {
  let watched = prefs.get(WATCHED_KEY, null) === '1';
  let broken = false;
  const inline = elementFullscreen();
  const ui = buildFilm(inline);
  const { layer, video, playBtn, end, endTitle, endText, againBtn, nextBtn, closeBtn } = ui;
  const play = followPlayback(ui);
  const app = document.querySelector('.app');
  /** @type {Element | null} */
  let returnFocus = null;

  /** @param {boolean} ok */
  const finish = (ok) => {
    if (!ok) broken = true;
    if (!layer.hidden) {
      leaveFullscreen(video);
      if (inline) enterFullscreen(layer);
      endTitle.textContent = ok ? 'That’s our mission.' : 'The video couldn’t play here.';
      endText.textContent = ok ? 'Now let’s put Free Calorie Counter on your Home Screen.' : 'That’s okay. Let’s put Free Calorie Counter on your Home Screen.';
      againBtn.hidden = !ok;
      playBtn.hidden = true;
      end.hidden = false;
      layer.classList.add('is-ended');
      nextBtn.focus();
      announce(`${endTitle.textContent} ${endText.textContent}`);
    }
    if (watched) return;
    watched = true;
    if (ok) prefs.set(WATCHED_KEY, '1');
    onWatched();
  };
  const close = () => {
    video.pause();
    leaveFullscreen(video);
    layer.hidden = true;
    layer.classList.remove('is-ended');
    if (app) app.removeAttribute('inert');
    document.body.classList.remove('is-film');
  };

  video.addEventListener('ended', () => finish(true));
  // A video that can't load (offline, say) never holds anyone up.
  const failed = () => finish(false);
  video.addEventListener('error', failed);
  const source = video.querySelector('source');
  if (source) source.addEventListener('error', failed);
  againBtn.addEventListener('click', () => {
    end.hidden = true;
    layer.classList.remove('is-ended');
    play();
  });
  nextBtn.addEventListener('click', () => {
    close();
    onNext();
  });
  closeBtn.addEventListener('click', () => {
    close();
    if (returnFocus instanceof HTMLElement && document.contains(returnFocus)) returnFocus.focus();
  });
  layer.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && watched) closeBtn.click();
  });

  return {
    get watched() {
      return watched;
    },
    /** Opens the layer and starts the video. Call from a tap, so sound is allowed. */
    open() {
      returnFocus = document.activeElement;
      layer.hidden = false;
      end.hidden = true;
      closeBtn.hidden = !watched;
      if (app) app.setAttribute('inert', '');
      document.body.classList.add('is-film');
      if (broken) return finish(false);
      if (inline) enterFullscreen(layer);
      if (motionAllowed()) play();
      else {
        playBtn.hidden = false;
        playBtn.focus();
      }
      if (playBtn.hidden) video.focus();
    },
  };
}

/**
 * The full-screen layer's parts.
 * @param {boolean} inline the video plays in the page (not in iPhone's own player)
 */
function buildFilm(inline) {
  const titleId = uid('film');
  const video = /** @type {HTMLVideoElement} */ (
    h(
      'video',
      { class: 'film-video', 'data-mission-video': '', controls: true, playsinline: inline, preload: 'metadata', poster: 'video/mission-poster.jpg', width: 540, height: 960 },
      h('source', { src: 'video/mission.mp4', type: 'video/mp4' }),
      h('track', { kind: 'captions', src: 'video/mission.vtt', srclang: 'en', label: 'English', default: true })
    )
  );
  const playBtn = h('button', { type: 'button', class: 'walk-play film-play', 'aria-label': 'Play our mission video', hidden: true }, playIcon());
  const endTitle = h('p', { class: 'film-end-title' });
  const endText = h('p', { class: 'film-end-text' });
  const againBtn = h('button', { type: 'button', class: 'btn btn-secondary', text: 'Watch again' });
  const nextBtn = h('button', { type: 'button', class: 'btn btn-primary', text: 'Next' });
  const end = h('div', { class: 'film-end', hidden: true }, endTitle, endText, h('div', { class: 'film-end-actions' }, againBtn, nextBtn));
  const closeBtn = h('button', { type: 'button', class: 'film-close', 'aria-label': 'Close the video', hidden: true, text: '×' });
  const bar = h('span');
  const layer = h(
    'div',
    { class: 'film', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, hidden: true, 'data-mission-film': '' },
    h('h2', { class: 'visually-hidden', id: titleId, text: 'Our mission video' }),
    video,
    playBtn,
    h('span', { class: 'film-progress', 'aria-hidden': 'true' }, bar),
    end,
    closeBtn
  );
  document.body.append(layer);
  return { layer, video, playBtn, end, endTitle, endText, againBtn, nextBtn, closeBtn, bar };
}

/**
 * Keeps the progress bar and the big play button in step with the video.
 * @param {ReturnType<typeof buildFilm>} ui
 * @returns {() => void} plays the video (from the start once it has ended)
 */
function followPlayback({ layer, video, playBtn, end, bar }) {
  const play = () => {
    playBtn.hidden = true;
    if (video.ended) video.currentTime = 0;
    video.play().catch(() => {
      playBtn.hidden = false;
      playBtn.focus();
    });
  };
  video.addEventListener('timeupdate', () => {
    if (video.duration > 0) bar.style.transform = `scaleX(${Math.min(1, video.currentTime / video.duration)})`;
  });
  // Paused (or back from iPhone's player before the end): a big play button.
  video.addEventListener('pause', () => {
    if (!video.ended && !layer.hidden && end.hidden) playBtn.hidden = false;
  });
  video.addEventListener('play', () => {
    playBtn.hidden = true;
  });
  playBtn.addEventListener('click', play);
  return play;
}

/**
 * The mission step's picture: the video's poster with a play button. A tap
 * opens the video full screen (missionFilm).
 * @param {() => void} open
 */
export function missionArt(open) {
  const button = h(
    'button',
    { type: 'button', class: 'walk-video', 'data-mission-poster': '', 'aria-label': 'Play our mission video, one minute long' },
    h('img', { class: 'walk-video-poster', src: 'video/mission-thumb.jpg', alt: '', width: 520, height: 320 }),
    h('span', { class: 'walk-play' }, playIcon()),
    h('span', { class: 'walk-video-text', 'aria-hidden': 'true', text: 'Watch · 1 min' })
  );
  button.addEventListener('click', open);
  return h('div', { class: 'walk-art walk-art-video' }, button);
}
