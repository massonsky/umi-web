import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import progressStyles from '../styles/ProgressBars.css';

function easeInQuint(t: number): number { return t * t * t * t * t; }

@customElement('umi-il-progress-bar')
export class ILProgressBar extends LitElement {
    @property({ type: Number }) thickness = 4;
    @property({ type: Number, attribute: 'gap-size' }) gapSize = 4;
    @property({ type: Number, attribute: 'min-gap-size' }) minGapSize = 2;
    @property({ type: Boolean }) running = true;
    @property({ type: Number, attribute: 'appear-duration' }) appearDuration = 250;

    @property({ type: String, attribute: 'track-color' }) trackColor = '';
    @property({ type: String, attribute: 'indicator-color' }) indicatorColor = '';

    @property({ type: Number, attribute: 'animation-duration' }) animationDuration = 1200;
    @property({ type: Number, attribute: 'inter-bar-delay' }) interBarDelay = 550;

    @state() private _pos1 = 0;
    @state() private _pos2 = 0;
    @state() private _widthPx = 240;

    private _raf = 0;
    private _startTs = 0;
    private _ro?: ResizeObserver;

    static styles = unsafeCSS(progressStyles);

    connectedCallback() {
        super.connectedCallback();
        this._ro = new ResizeObserver(() => {
            this._widthPx = Math.max(1, this.getBoundingClientRect().width || 240);
        });
        this._ro.observe(this);
        this._widthPx = Math.max(1, this.getBoundingClientRect().width || 240);
        if (this.running) this._start();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._ro?.disconnect();
        this._stop();
    }

    updated(changed: Map<string, unknown>) {
        if (changed.has('running')) {
            this.running ? this._start(true) : this._stop();
        }
    }

    private _start(reset = false) {
        if (this._raf && !reset) return;
        if (reset) this._stop();
        this._startTs = performance.now();
        this._raf = requestAnimationFrame((t) => this._tick(t));
    }

    private _stop() {
        if (!this._raf) return;
        cancelAnimationFrame(this._raf);
        this._raf = 0;
    }

    private _calcMove(ts: number, cycle: number, delay = 0): number {
        const minW = Math.max(1, this.thickness);
        const from = -minW;
        const to = this._widthPx + 10;
        const local = ts % cycle;
        if (local < delay) return from;
        if (local >= delay + this.animationDuration) return to;
        const t = (local - delay) / this.animationDuration;
        const k = easeInQuint(Math.max(0, Math.min(1, t)));
        return from + (to - from) * k;
    }

    private _indicatorWidth(position: number): number {
        const minW = Math.max(1, this.thickness);
        const maxW = this._widthPx;
        const normalized = position / Math.max(1, this._widthPx);
        if (normalized < 0.6) {
            return minW + (maxW - minW) * (normalized / 0.6);
        }
        const shrink = (normalized - 0.6) / 0.4;
        return maxW * (1 - shrink);
    }

    private _tick(t: number) {
        const elapsed = t - this._startTs;

        // Mirrors QML:
        // - bar1 animates for animationDuration, then holds at end
        // - bar2 starts after interBarDelay and animates for animationDuration
        // - both loop together with one common cycle
        const cycle = this.animationDuration + this.interBarDelay;
        this._pos1 = this._calcMove(elapsed, cycle, 0);
        this._pos2 = this._calcMove(elapsed, cycle, this.interBarDelay);

        this.requestUpdate();
        this._raf = requestAnimationFrame((tt) => this._tick(tt));
    }

    render() {
        const thickness = Math.max(1, this.thickness);
        const indicatorColor = this.indicatorColor || 'var(--md-primary)';
        const trackColor = this.trackColor || 'var(--md-secondary-container)';
        const effectiveGap = Math.max(this.gapSize, Math.max(this.minGapSize, thickness));

        const w1 = Math.max(0, this._indicatorWidth(this._pos1));
        const w2 = Math.max(0, this._indicatorWidth(this._pos2));

        const i1Start = Math.min(this._pos1, this._widthPx);
        const i2Start = Math.min(this._pos2, this._widthPx);

        const i1End = i1Start + Math.min(w1, Math.max(0, this._widthPx - i1Start));
        const i2End = i2Start + Math.min(w2, Math.max(0, this._widthPx - i2Start));

        const leftEnd = Math.max(thickness, Math.min(i1Start, i2Start) - effectiveGap);

        const midStartRaw = Math.min(i1End, i2End) + effectiveGap;
        const midEndRaw = Math.max(i1Start, i2Start) - effectiveGap;
        const midX = Math.max(0, Math.min(this._widthPx, Math.min(midStartRaw, midEndRaw)));
        const midW = Math.max(0, Math.min(this._widthPx, Math.max(midStartRaw, midEndRaw)) - midX);

        const rightX = Math.min(this._widthPx, Math.max(i1End, i2End) + effectiveGap);
        const rightW = Math.max(thickness, this._widthPx - rightX);

        return html`
            <div class="linear-root ${this.running ? 'scale-visible' : 'scale-hidden'}" style="--thickness:${thickness}px; width:100%; min-width:240px; transition-duration:${this.appearDuration}ms" role="progressbar" aria-label="Индикатор неопределённого прогресса">
                <div class="bar-segment" style="left:0; width:${leftEnd}px; background:${trackColor}"></div>

                ${i1Start < this._widthPx && w1 > 0 ? html`
                    <div class="bar-segment" style="left:${Math.max(0, i1Start)}px; width:${Math.max(0, Math.min(w1, this._widthPx - Math.max(0, i1Start)))}px; background:${indicatorColor}"></div>
                ` : null}

                ${midW > 0 ? html`
                    <div class="bar-segment" style="left:${midX}px; width:${midW}px; background:${trackColor}"></div>
                ` : null}

                ${i2Start < this._widthPx && w2 > 0 ? html`
                    <div class="bar-segment" style="left:${Math.max(0, i2Start)}px; width:${Math.max(0, Math.min(w2, this._widthPx - Math.max(0, i2Start)))}px; background:${indicatorColor}"></div>
                ` : null}

                ${rightX < this._widthPx ? html`
                    <div class="bar-segment" style="left:${rightX}px; width:${rightW}px; background:${trackColor}"></div>
                ` : null}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-il-progress-bar': ILProgressBar;
    }
}
