import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import snackBarStyles from '../styles/SnackBar.css';

export type SnackType = 'info' | 'warning' | 'error' | 'success';

export interface SnackAction {
    text: string;
    handler?: () => void;
}

interface SnackRecord {
    id: number;
    messageText: string;
    messageType: SnackType;
    actionText: string;
    actionHandler?: () => void;
    showIcon: boolean;
    timeout: number;
    actionMode: boolean;
    visible: boolean;
    closing: boolean;
    dragX: number;
    pointerStartX: number;
    pointerDragging: boolean;
    timerId?: number;
    timerStartedAt?: number;
    remainingMs?: number;
    enteredAt: number;
}

export interface SnackHandle {
    id: number;
    close: () => void;
    startActionMode: () => void;
    endActionMode: () => void;
    updateMessage: (text: string) => void;
}

@customElement('umi-snackbar')
export class SnackBar extends LitElement {
    static readonly AlignView = {
        Bottom: 0,
        Top: 1,
        Center: 2,
        TopLeft: 3,
        TopRight: 4,
        BottomLeft: 5,
        BottomRight: 6,
        Left: 7,
        Right: 8,
    } as const;

    @property({ type: Number }) spacing = 16;

    @property({ type: Number, attribute: 'timeout-short' }) timeoutShort = 4000;
    @property({ type: Number, attribute: 'timeout-medium' }) timeoutMedium = 7000;
    @property({ type: Number, attribute: 'timeout-long' }) timeoutLong = 10000;
    @property({ type: Number, attribute: 'timeout-indefinite' }) timeoutIndefinite = -1;

    @property({ type: String, attribute: 'container-color' }) containerColor = 'var(--md-sys-color-surface, #f3edf7)';
    @property({ type: String, attribute: 'content-color' }) contentColor = 'var(--md-sys-color-on-surface, #1d1b20)';
    @property({ type: String, attribute: 'action-color' }) actionColor = 'var(--md-sys-color-primary, #6750a4)';

    @property({ type: String, attribute: 'warning-container-color' }) warningContainerColor = 'var(--md-sys-color-tertiary, #7d5260)';
    @property({ type: String, attribute: 'warning-content-color' }) warningContentColor = 'var(--md-sys-color-on-tertiary, #ffffff)';
    @property({ type: String, attribute: 'warning-action-color' }) warningActionColor = 'var(--md-sys-color-on-tertiary, #ffffff)';

    @property({ type: String, attribute: 'error-container-color' }) errorContainerColor = 'var(--md-sys-color-error, #b3261e)';
    @property({ type: String, attribute: 'error-content-color' }) errorContentColor = 'var(--md-sys-color-on-error, #ffffff)';
    @property({ type: String, attribute: 'error-action-color' }) errorActionColor = 'var(--md-sys-color-on-error, #ffffff)';

    @property({ type: String, attribute: 'success-container-color' }) successContainerColor = 'var(--md-sys-color-primary, #6750a4)';
    @property({ type: String, attribute: 'success-content-color' }) successContentColor = 'var(--md-sys-color-on-primary, #ffffff)';
    @property({ type: String, attribute: 'success-action-color' }) successActionColor = 'var(--md-sys-color-on-primary, #ffffff)';

    @property({ type: Number, attribute: 'align-view' }) alignView: number = SnackBar.AlignView.Top;
    @property({ type: Boolean, attribute: 'reverse-view' }) reverseView = false;
    @property({ type: Number, attribute: 'max-visible' }) maxVisible = 3;

    @property({ type: Number, attribute: 'margin-horizontal' }) marginHorizontal = 16;
    @property({ type: Number, attribute: 'margin-vertical' }) marginVertical = 16;
    @property({ type: Number, attribute: 'offset-horizontal' }) offsetHorizontal = 0;
    @property({ type: Number, attribute: 'offset-vertical' }) offsetVertical = 0;
    @property({ type: Number, attribute: 'corner-margin' }) cornerMargin = 24;

    @state() private _snacks: SnackRecord[] = [];
    @state() private _viewportWidth = window.innerWidth;
    @state() private _viewportHeight = window.innerHeight;

    private _idSeq = 1;
    private _ro?: ResizeObserver;

    static styles = unsafeCSS(snackBarStyles);

    connectedCallback(): void {
        super.connectedCallback();
        this._ro = new ResizeObserver(() => this._measureViewport());
        this._ro.observe(this);
        window.addEventListener('resize', this._onWindowResize);
        this._measureViewport();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this._ro?.disconnect();
        window.removeEventListener('resize', this._onWindowResize);
        for (const snack of this._snacks) {
            this._clearSnackTimer(snack);
        }
    }

    // Public API (QML-compatible names)
    info(text: string, action: SnackAction | null = null, timeout = this.timeoutShort): SnackHandle {
        return this.createSnack(text, 'info', action, timeout, true);
    }

    warning(text: string, action: SnackAction | null = null, timeout = this.timeoutMedium): SnackHandle {
        return this.createSnack(text, 'warning', action, timeout, true);
    }

    error(text: string, action: SnackAction | null = null, timeout = this.timeoutIndefinite): SnackHandle {
        return this.createSnack(text, 'error', action, timeout, true);
    }

    success(text: string, action: SnackAction | null = null, timeout = this.timeoutShort): SnackHandle {
        return this.createSnack(text, 'success', action, timeout, true);
    }

    infoNoIcon(text: string, action: SnackAction | null = null, timeout = this.timeoutShort): SnackHandle {
        return this.createSnack(text, 'info', action, timeout, false);
    }

    warningNoIcon(text: string, action: SnackAction | null = null, timeout = this.timeoutMedium): SnackHandle {
        return this.createSnack(text, 'warning', action, timeout, false);
    }

    errorNoIcon(text: string, action: SnackAction | null = null, timeout = this.timeoutIndefinite): SnackHandle {
        return this.createSnack(text, 'error', action, timeout, false);
    }

    successNoIcon(text: string, action: SnackAction | null = null, timeout = this.timeoutShort): SnackHandle {
        return this.createSnack(text, 'success', action, timeout, false);
    }

    message(text: string, action: SnackAction | null = null, timeout = this.timeoutShort): SnackHandle {
        return this.createSnack(text, 'info', action, timeout, false);
    }

    createActionSnack(text: string, type: SnackType = 'info', action: SnackAction | null = null, showIcon = false): SnackHandle {
        const handle = this.createSnack(text, type, action, this.timeoutIndefinite, showIcon);
        handle.startActionMode();
        return handle;
    }

    clearAll(): void {
        for (const snack of this._snacks) {
            this._closeSnack(snack.id);
        }
    }

    createSnack(text: string, type: SnackType = 'info', action: SnackAction | null = null, timeout = this.timeoutShort, showIcon = true): SnackHandle {
        const id = this._idSeq++;
        const snack: SnackRecord = {
            id,
            messageText: text,
            messageType: type,
            actionText: action?.text ?? '',
            actionHandler: action?.handler,
            showIcon,
            timeout,
            actionMode: false,
            visible: true,
            closing: false,
            dragX: 0,
            pointerStartX: 0,
            pointerDragging: false,
            enteredAt: performance.now(),
        };

        this._snacks = [...this._snacks, snack];
        this._scheduleAutoClose(snack);

        this.dispatchEvent(new CustomEvent('snack-opened', {
            detail: { id, type, text },
            bubbles: true,
            composed: true,
        }));

        return {
            id,
            close: () => this._closeSnack(id),
            startActionMode: () => this._setActionMode(id, true),
            endActionMode: () => {
                this._setActionMode(id, false);
                this._closeSnack(id);
            },
            updateMessage: (msg: string) => this._updateMessage(id, msg),
        };
    }

    private _onWindowResize = () => this._measureViewport();

    private _measureViewport(): void {
        const rect = this.getBoundingClientRect();
        this._viewportWidth = Math.max(1, rect.width || window.innerWidth);
        this._viewportHeight = Math.max(1, rect.height || window.innerHeight);
    }

    private _updateMessage(id: number, msg: string): void {
        this._snacks = this._snacks.map((s) => (s.id === id ? { ...s, messageText: msg } : s));
    }

    private _setActionMode(id: number, value: boolean): void {
        const snack = this._snacks.find((s) => s.id === id);
        if (!snack) return;
        snack.actionMode = value;
        if (value) {
            this._clearSnackTimer(snack);
        } else {
            this._scheduleAutoClose(snack);
        }
        this.requestUpdate();
    }

    private _scheduleAutoClose(snack: SnackRecord): void {
        this._clearSnackTimer(snack);
        if (snack.actionMode || snack.timeout <= 0) return;

        const duration = snack.remainingMs ?? snack.timeout;
        snack.remainingMs = duration;
        snack.timerStartedAt = performance.now();
        snack.timerId = window.setTimeout(() => this._closeSnack(snack.id), duration);
    }

    private _pauseAutoClose(id: number): void {
        const snack = this._snacks.find((s) => s.id === id);
        if (!snack || snack.actionMode || snack.timeout <= 0) return;
        if (!snack.timerId || !snack.timerStartedAt) return;

        const elapsed = performance.now() - snack.timerStartedAt;
        snack.remainingMs = Math.max(0, (snack.remainingMs ?? snack.timeout) - elapsed);
        this._clearSnackTimer(snack);
    }

    private _resumeAutoClose(id: number): void {
        const snack = this._snacks.find((s) => s.id === id);
        if (!snack || snack.actionMode || snack.timeout <= 0) return;
        this._scheduleAutoClose(snack);
    }

    private _clearSnackTimer(snack: SnackRecord): void {
        if (snack.timerId) {
            clearTimeout(snack.timerId);
            snack.timerId = undefined;
            snack.timerStartedAt = undefined;
        }
    }

    private _closeSnack(id: number): void {
        const snack = this._snacks.find((s) => s.id === id);
        if (!snack || snack.closing) return;
        snack.closing = true;
        this._clearSnackTimer(snack);
        this.requestUpdate();

        window.setTimeout(() => {
            const closingSnack = this._snacks.find((s) => s.id === id);
            if (!closingSnack) return;
            this._snacks = this._snacks.filter((s) => s.id !== id);
            this.dispatchEvent(new CustomEvent('snack-closed', {
                detail: { id },
                bubbles: true,
                composed: true,
            }));
        }, 120);
    }

    private _onActionClick(id: number): void {
        const snack = this._snacks.find((s) => s.id === id);
        if (!snack) return;
        snack.actionHandler?.();

        this.dispatchEvent(new CustomEvent('snack-action-clicked', {
            detail: { id, type: snack.messageType, text: snack.messageText },
            bubbles: true,
            composed: true,
        }));

        if (!snack.actionMode) {
            this._closeSnack(id);
        }
    }

    private _onPointerDown(event: PointerEvent, id: number): void {
        const snack = this._snacks.find((s) => s.id === id);
        if (!snack || snack.actionMode) return;
        snack.pointerDragging = true;
        snack.pointerStartX = event.clientX - snack.dragX;
        this._pauseAutoClose(id);

        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }

    private _onPointerMove(event: PointerEvent, id: number): void {
        const snack = this._snacks.find((s) => s.id === id);
        if (!snack || !snack.pointerDragging) return;
        snack.dragX = event.clientX - snack.pointerStartX;
        this.requestUpdate();
    }

    private _onPointerUp(event: PointerEvent, id: number): void {
        const snack = this._snacks.find((s) => s.id === id);
        if (!snack) return;
        snack.pointerDragging = false;

        const width = (event.currentTarget as HTMLElement).getBoundingClientRect().width || 1;
        const shouldDismiss = Math.abs(snack.dragX) > width / 2;

        if (shouldDismiss) {
            this._closeSnack(id);
        } else {
            snack.dragX = 0;
            this._resumeAutoClose(id);
            this.requestUpdate();
        }
    }

    private _resolveColors(type: SnackType): { container: string; content: string; action: string; icon: string } {
        switch (type) {
            case 'warning':
                return {
                    container: this.warningContainerColor,
                    content: this.warningContentColor,
                    action: this.warningActionColor,
                    icon: 'warning',
                };
            case 'error':
                return {
                    container: this.errorContainerColor,
                    content: this.errorContentColor,
                    action: this.errorActionColor,
                    icon: 'error',
                };
            case 'success':
                return {
                    container: this.successContainerColor,
                    content: this.successContentColor,
                    action: this.successActionColor,
                    icon: 'check_circle',
                };
            case 'info':
            default:
                return {
                    container: this.containerColor,
                    content: this.contentColor,
                    action: this.actionColor,
                    icon: 'info',
                };
        }
    }

    private _visibleSnacks(): SnackRecord[] {
        const visibleCount = Math.min(this.maxVisible, this._snacks.length);
        const subset = this._snacks.slice(this._snacks.length - visibleCount);
        return this.reverseView ? [...subset].reverse() : subset;
    }

    private _calculateSnackWidth(): string {
        const vw = this._viewportWidth;
        switch (this.alignView) {
            case SnackBar.AlignView.Bottom:
            case SnackBar.AlignView.Top:
            case SnackBar.AlignView.Center:
                return `${Math.max(220, vw - this.marginHorizontal * 2)}px`;

            case SnackBar.AlignView.TopLeft:
            case SnackBar.AlignView.TopRight:
            case SnackBar.AlignView.BottomLeft:
            case SnackBar.AlignView.BottomRight:
                return `${Math.max(220, Math.min(vw - this.cornerMargin * 2, 400))}px`;

            case SnackBar.AlignView.Left:
            case SnackBar.AlignView.Right:
                return `${Math.max(220, Math.min(vw - this.marginHorizontal * 2, 320))}px`;

            default:
                return `${Math.max(220, vw - this.marginHorizontal * 2)}px`;
        }
    }

    private _stackClass(): string {
        switch (this.alignView) {
            case SnackBar.AlignView.Bottom: return 'bottom';
            case SnackBar.AlignView.Top: return 'top';
            case SnackBar.AlignView.Center: return 'center';
            case SnackBar.AlignView.TopLeft: return 'top-left';
            case SnackBar.AlignView.TopRight: return 'top-right';
            case SnackBar.AlignView.BottomLeft: return 'bottom-left';
            case SnackBar.AlignView.BottomRight: return 'bottom-right';
            case SnackBar.AlignView.Left: return 'left';
            case SnackBar.AlignView.Right: return 'right';
            default: return 'top';
        }
    }

    private _stackStyle(): string {
        const styleParts: string[] = [
            `--umi-snackbar-spacing:${this.spacing}px`,
            `max-width:${Math.max(220, this._viewportWidth - 8)}px`,
        ];

        switch (this.alignView) {
            case SnackBar.AlignView.Bottom:
                styleParts.push(
                    `left:${this.marginHorizontal + this.offsetHorizontal}px`,
                    `right:${this.marginHorizontal - this.offsetHorizontal}px`,
                    `bottom:${this.marginVertical - this.offsetVertical}px`,
                    'align-items:center',
                );
                break;
            case SnackBar.AlignView.Top:
                styleParts.push(
                    `left:${this.marginHorizontal + this.offsetHorizontal}px`,
                    `right:${this.marginHorizontal - this.offsetHorizontal}px`,
                    `top:${this.marginVertical + this.offsetVertical}px`,
                    'align-items:center',
                );
                break;
            case SnackBar.AlignView.Center:
                styleParts.push(
                    `left:${this.marginHorizontal + this.offsetHorizontal}px`,
                    `right:${this.marginHorizontal - this.offsetHorizontal}px`,
                    `top:${this._viewportHeight / 2 + this.offsetVertical}px`,
                    'transform:translateY(-50%)',
                    'align-items:center',
                );
                break;
            case SnackBar.AlignView.TopLeft:
                styleParts.push(
                    `left:${this.cornerMargin + this.offsetHorizontal}px`,
                    `top:${this.cornerMargin + this.offsetVertical}px`,
                    'align-items:flex-start',
                );
                break;
            case SnackBar.AlignView.TopRight:
                styleParts.push(
                    `right:${this.cornerMargin - this.offsetHorizontal}px`,
                    `top:${this.cornerMargin + this.offsetVertical}px`,
                    'align-items:flex-end',
                );
                break;
            case SnackBar.AlignView.BottomLeft:
                styleParts.push(
                    `left:${this.cornerMargin + this.offsetHorizontal}px`,
                    `bottom:${this.cornerMargin - this.offsetVertical}px`,
                    'align-items:flex-start',
                );
                break;
            case SnackBar.AlignView.BottomRight:
                styleParts.push(
                    `right:${this.cornerMargin - this.offsetHorizontal}px`,
                    `bottom:${this.cornerMargin - this.offsetVertical}px`,
                    'align-items:flex-end',
                );
                break;
            case SnackBar.AlignView.Left:
                styleParts.push(
                    `left:${this.marginHorizontal + this.offsetHorizontal}px`,
                    `top:${this._viewportHeight / 2 + this.offsetVertical}px`,
                    'transform:translateY(-50%)',
                    'align-items:flex-start',
                );
                break;
            case SnackBar.AlignView.Right:
                styleParts.push(
                    `right:${this.marginHorizontal - this.offsetHorizontal}px`,
                    `top:${this._viewportHeight / 2 + this.offsetVertical}px`,
                    'transform:translateY(-50%)',
                    'align-items:flex-end',
                );
                break;
            default:
                break;
        }
        return styleParts.join(';');
    }

    render() {
        const snackWidth = this._calculateSnackWidth();
        const list = this._visibleSnacks();

        return html`
            <div class="stack ${this._stackClass()}" style="${this._stackStyle()}">
                ${list.map((snack) => {
                    const colors = this._resolveColors(snack.messageType);
                    const isEntering = performance.now() - snack.enteredAt < 260;
                    return html`
                        <div
                            class="snack ${snack.closing ? 'closing' : ''} ${isEntering ? 'enter' : ''}"
                            style="
                                width:${snackWidth};
                                background:${colors.container};
                                color:${colors.content};
                                --drag-x:${snack.dragX}px;
                            "
                            @mouseenter=${() => this._pauseAutoClose(snack.id)}
                            @mouseleave=${() => this._resumeAutoClose(snack.id)}
                            @pointerdown=${(e: PointerEvent) => this._onPointerDown(e, snack.id)}
                            @pointermove=${(e: PointerEvent) => this._onPointerMove(e, snack.id)}
                            @pointerup=${(e: PointerEvent) => this._onPointerUp(e, snack.id)}
                            @pointercancel=${(e: PointerEvent) => this._onPointerUp(e, snack.id)}
                            role="status"
                            aria-live="polite"
                        >
                            ${snack.showIcon ? html`<span class="icon" aria-hidden="true">${colors.icon}</span>` : null}
                            <div class="message">${snack.messageText}</div>
                            ${snack.actionText ? html`
                                <button
                                    class="action"
                                    style="color:${colors.action}"
                                    @click=${() => this._onActionClick(snack.id)}
                                >
                                    ${snack.actionText}
                                </button>
                            ` : null}
                            ${snack.timeout < 0 && !snack.actionMode ? html`
                                <button class="close" style="color:${colors.content}" @click=${() => this._closeSnack(snack.id)} aria-label="Закрыть">
                                    close
                                </button>
                            ` : null}
                        </div>
                    `;
                })}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'umi-snackbar': SnackBar;
    }
}
