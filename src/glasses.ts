// Sloj za naocale. Sve sto ide na ekran naocala prolazi kroz ovaj fajl,
// tako da se kasnije moze dodati podrska za druge naocale (npr. Meta)
// bez mijenjanja ostatka aplikacije.
import {
  CreateStartUpPageContainer,
  OsEventTypeList,
  RebuildPageContainer,
  TextContainerProperty,
  TextContainerUpgrade,
  StartUpPageCreateResult,
  waitForEvenAppBridge,
  type EvenAppBridge,
  type EvenHubEvent,
} from '@evenrealities/even_hub_sdk';
import { ASCII_FALLBACK } from './config';

export type GlassesView = {
  header: string;
  log: string;
  draft: string;
  keymap: string;
};

export type GlassesInput = 'doubleClick' | 'scrollUp' | 'scrollDown';

type Slot = keyof GlassesView;

// G2 ekran je 576 x 288 piksela, ishodiste gore lijevo.
const LAYOUT: Record<Slot, { id: number; y: number; h: number; capture: 0 | 1; brightness: number }> = {
  header: { id: 1, y: 0, h: 34, capture: 0, brightness: 2 },
  log: { id: 2, y: 36, h: 118, capture: 1, brightness: 4 },
  draft: { id: 3, y: 156, h: 40, capture: 0, brightness: 4 },
  keymap: { id: 4, y: 198, h: 90, capture: 0, brightness: 3 },
};

const MAP: Record<string, string> = { č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'dj', Č: 'C', Ć: 'C', Š: 'S', Ž: 'Z', Đ: 'Dj' };
const ascii = (s: string) => (ASCII_FALLBACK ? s.replace(/[čćšžđČĆŠŽĐ]/g, (c) => MAP[c] ?? c) : s);

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

/** Ceka da Even aplikacija (ili simulator) ubaci svoj most u stranicu. */
async function waitForHost(ms: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (typeof (window as any).flutter_inappwebview !== 'undefined') return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

export class Glasses {
  mode: 'device' | 'preview' = 'preview';
  private bridge: EvenAppBridge | null = null;
  private last: Partial<GlassesView> = {};
  private queue: Promise<unknown> = Promise.resolve();
  private listeners: ((i: GlassesInput) => void)[] = [];

  /** Povezuje se sa Even aplikacijom. Ako je nema (obican preglednik), prelazi u nacin pregleda. */
  async init(first: GlassesView): Promise<void> {
    // U obicnom pregledniku nema Even aplikacije, pa odmah prelazimo na simulaciju ekrana.
    const hasHost = await waitForHost(1500);
    const bridge = hasHost ? await withTimeout(waitForEvenAppBridge().catch(() => null), 4000) : null;
    if (!bridge) {
      this.mode = 'preview';
      this.renderPreview(first);
      return;
    }
    this.bridge = bridge;
    this.mode = 'device';

    const textObject = (Object.keys(LAYOUT) as Slot[]).map((slot, i) => new TextContainerProperty({
      xPosition: 0,
      yPosition: LAYOUT[slot].y,
      width: 576,
      height: LAYOUT[slot].h,
      containerID: LAYOUT[slot].id,
      containerName: slot,
      zOrderIndex: i + 1,
      content: ascii(first[slot]),
      textColor: LAYOUT[slot].brightness,
      isEventCapture: LAYOUT[slot].capture,
    }));

    const result = await bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({ containerTotalNum: textObject.length, textObject }),
    );
    if (result !== StartUpPageCreateResult.success) {
      // Stranica vec postoji (npr. nakon ponovnog ucitavanja), pa je samo obnovimo.
      const ok = await bridge.rebuildPageContainer(
        new RebuildPageContainer({ containerTotalNum: textObject.length, textObject }),
      );
      if (!ok) console.error('Prikaz na naocalama nije uspio, kod:', result);
    }
    this.last = { ...first };

    bridge.onEvenHubEvent((ev: EvenHubEvent) => {
      const type = ev.textEvent?.eventType ?? ev.sysEvent?.eventType;
      let input: GlassesInput | null = null;
      if (type === OsEventTypeList.DOUBLE_CLICK_EVENT) input = 'doubleClick';
      else if (type === OsEventTypeList.SCROLL_TOP_EVENT) input = 'scrollUp';
      else if (type === OsEventTypeList.SCROLL_BOTTOM_EVENT) input = 'scrollDown';
      if (input) this.listeners.forEach((l) => l(input!));
    });
  }

  onInput(fn: (i: GlassesInput) => void) {
    this.listeners.push(fn);
  }

  /** Salje na naocale samo dijelove ekrana koji su se promijenili. */
  render(view: GlassesView) {
    if (this.mode === 'preview') {
      this.renderPreview(view);
      return;
    }
    const bridge = this.bridge!;
    (Object.keys(LAYOUT) as Slot[]).forEach((slot) => {
      if (this.last[slot] === view[slot]) return;
      this.last[slot] = view[slot];
      const content = ascii(view[slot]);
      this.queue = this.queue
        .then(() => bridge.textContainerUpgrade(new TextContainerUpgrade({ containerID: LAYOUT[slot].id, containerName: slot, content })))
        .catch((e) => console.error('Slanje na naocale nije uspjelo:', e));
    });
  }

  /** U obicnom pregledniku crta simulaciju ekrana naocala ispod telefona. */
  private renderPreview(view: GlassesView) {
    const box = document.getElementById('glassesPreview');
    if (!box) return;
    box.hidden = false;
    (Object.keys(LAYOUT) as Slot[]).forEach((slot) => {
      const el = box.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
      if (el) el.textContent = ascii(view[slot]);
    });
  }
}
