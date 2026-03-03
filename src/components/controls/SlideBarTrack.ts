import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import slideBarStyles from '../styles/SlideBar.css';

/**
 * umi-slide-bar-track
 *
 * TS/Lit port of SlideBarTrack.qml
 *
 * Трек слайдера с настраиваемыми скруглёнными углами.
 * leftCorners — радиус левых углов (по умолчанию height/2, полное скругление).
 * rightCorners — радиус правых углов (по умолчанию 2px).
 * opacityValue — прозрачность трека.
 */
@customElement('umi-slide-bar-track')
export class SlideBarTrack extends LitElement {
    @property({ type: Number, attribute: 'right-corners' }) rightCorners = 2;
    @property({ type: Number, attribute: 'left-corners' })  leftCorners = 9; // height/2+1 for 16px track

    @property({ type: String }) color = 'var(--md-sys-color-primary, #6750a4)';
    @property({ type: Number, attribute: 'opacity-value' }) opacityValue = 1;

    static styles = [
        unsafeCSS(slideBarStyles),
        css`:host { display: block; height: 16px; overflow: visible; }`,
    ];

    render() {
        const r = `${this.leftCorners}px ${this.rightCorners}px ${this.rightCorners}px ${this.leftCorners}px`;
        return html`
            <div
                class="track-root"
                style="
                    background:${this.color};
                    border-radius:${r};
                    opacity:${this.opacityValue};
                    width:100%;
                "
            ></div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-slide-bar-track': SlideBarTrack;
    }
}
