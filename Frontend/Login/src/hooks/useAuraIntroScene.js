"use client";

import { useEffect } from "react";
import {
  WARRIOR_IMAGE,
  LOGO_IMAGE,
  SCENE_BACKGROUND_IMAGE,
} from "../constants/assets";

const warriorImg = WARRIOR_IMAGE;
const logoImg = LOGO_IMAGE;
const sceneBgImg = SCENE_BACKGROUND_IMAGE;

// Encapsulates the intro particle/lightning animation and staged reveal
// sequence that previously lived directly inside the login page's
// useEffect. The implementation is unchanged from the original — this
// hook only relocates it so app/page.jsx can stay declarative.
export function useAuraIntroScene() {
  useEffect(() => {
    function genBoltPoints(x1, y1, x2, y2, depth, jitter) {
      const pts = [{ x: x1, y: y1 }];
      function recurse(ax, ay, bx, by, d, jit) {
        if (d <= 0) {
          pts.push({ x: bx, y: by });
          return;
        }
        const mx = (ax + bx) / 2,
          my = (ay + by) / 2;
        const dx = bx - ax,
          dy = by - ay,
          len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len,
          ny = dx / len;
        const maxOff = len * 0.42;
        const off = Math.max(
          -maxOff,
          Math.min(maxOff, (Math.random() - 0.5) * jit),
        );
        const px = mx + nx * off,
          py = my + ny * off;
        recurse(ax, ay, px, py, d - 1, jit * 0.58);
        recurse(px, py, bx, by, d - 1, jit * 0.58);
      }
      recurse(x1, y1, x2, y2, depth, jitter);
      return pts;
    }
    function segLenList(pts) {
      const segs = [];
      let total = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
        segs.push(d);
        total += d;
      }
      return { segs, total };
    }
    function partialPath(pts, segs, total, drawLen) {
      if (drawLen <= 0) return [pts[0]];
      if (drawLen >= total) return pts;
      let acc = 0;
      const out = [pts[0]];
      for (let i = 0; i < segs.length; i++) {
        if (acc + segs[i] <= drawLen) {
          out.push(pts[i + 1]);
          acc += segs[i];
        } else {
          const t = (drawLen - acc) / segs[i];
          out.push({
            x: pts[i].x + (pts[i + 1].x - pts[i].x) * t,
            y: pts[i].y + (pts[i + 1].y - pts[i].y) * t,
          });
          break;
        }
      }
      return out;
    }

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    class PS {
      constructor(canvas, info) {
        this.cv = canvas;
        this.ctx = canvas.getContext("2d");
        this.pts = [];
        this.bolts = [];
        this.phase = 0;
        this.on = true;
        this.raf = null;
        this.info = info;
        this.flash = 0;
        this.cA = 0;
        this.cG = 0;
        this.cO = 0;
        this.dim = false;

        this.glow = document.createElement("canvas");
        this.glow.width = this.glow.height = 64;
        const gctx = this.glow.getContext("2d");
        const grad = gctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(210,175,255,.95)");
        grad.addColorStop(0.4, "rgba(170,110,255,.42)");
        grad.addColorStop(1, "rgba(140,80,255,0)");
        gctx.fillStyle = grad;
        gctx.fillRect(0, 0, 64, 64);
      }
      setPhase(p) {
        this.phase = p;
      }
      setDim(v) {
        this.dim = v;
      }
      setInfo(i) {
        this.info = i;
      }
      mk(o) {
        const p = {
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          sz: 1.5,
          a: 0.7,
          age: 0,
          life: 200,
          type: "a",
          r: 160,
          g: 80,
          b: 255,
          ca: 0,
        };
        for (const k in o) p[k] = o[k];
        if (this.dim) {
          p.a *= 0.68;
          p.vx *= 0.5;
          p.vy *= 0.5;
          if (p.os !== undefined) p.os *= 0.5;
        }
        p.col = `rgb(${p.r},${p.g},${p.b})`;
        this.pts.push(p);
        if (p.type === "a") this.cA++;
        else if (p.type === "g") this.cG++;
        else if (p.type === "o") this.cO++;
      }
      spawnA() {
        if (this.cA > 200) return;
        const W = this.cv.width / DPR,
          H = this.cv.height / DPR;
        const { cx, cy } = this.info;
        let x, y;
        if (Math.random() < 0.48) {
          const ang = Math.random() * Math.PI * 2,
            rad = Math.random() * 235;
          x = cx + Math.cos(ang) * rad;
          y = cy + Math.sin(ang) * rad * 0.92;
        } else {
          x = Math.random() * W;
          y = Math.random() * H;
        }
        this.mk({
          x,
          y,
          vx: (Math.random() - 0.5) * 0.25,
          vy: -Math.random() * 0.18 - 0.04,
          sz: Math.random() * 1.8 + 0.5,
          a: Math.random() * 0.5 + 0.12,
          life: Math.random() * 400 + 200,
          type: "a",
          r: 150 + Math.floor(Math.random() * 80),
          g: 55 + Math.floor(Math.random() * 30),
          b: 255,
        });
      }
      spawnG() {
        if (this.cG > 70) return;
        const W = this.cv.width / DPR,
          H = this.cv.height / DPR;
        const { cx } = this.info;
        for (let i = 0; i < 3; i++) {
          const bx = cx + (Math.random() - 0.5) * W * 0.32;
          this.mk({
            x: bx,
            y: H + 6,
            px: bx,
            py: H + 6,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -(Math.random() * 4.5 + 3.2),
            sz: Math.random() * 2.4 + 2.6,
            a: Math.random() * 0.4 + 0.55,
            life: Math.random() * 55 + 40,
            type: "g",
            r: 132,
            g: 64,
            b: 248,
          });
        }
      }
      spawnO() {
        if (this.cO > 90) return;
        const { cx, cy } = this.info;
        const ang = Math.random() * Math.PI * 2,
          rad = Math.random() * 95 + 42,
          sign = Math.random() > 0.5 ? 1 : -1;
        const sx = cx + Math.cos(ang) * rad,
          sy = cy + Math.sin(ang) * rad;
        this.mk({
          x: sx,
          y: sy,
          px: sx,
          py: sy,
          vx: 0,
          vy: 0,
          oa: ang,
          or: rad,
          os: (Math.random() * 0.022 + 0.01) * sign,
          sz: Math.random() * 1.8 + 1.4,
          a: Math.random() * 0.85 + 0.25,
          life: Math.random() * 130 + 70,
          type: "o",
          r: 180,
          g: 100,
          b: 255,
        });
      }
      spawnTipSparks(x, y, n) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2,
            sp = Math.random() * 1.4 + 0.4;
          this.mk({
            x,
            y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - 0.15,
            sz: Math.random() * 1.6 + 0.9,
            a: Math.random() * 0.7 + 0.5,
            life: Math.random() * 38 + 22,
            type: "a",
            r: 210,
            g: 170,
            b: 255,
          });
        }
      }
      spawnBolt() {
        if (this.bolts.length >= 3) return;
        const { cx, cy } = this.info;
        const H = this.cv.height / DPR,
          W = this.cv.width / DPR;
        const RING_R = 150;
        const ground = Math.random() < 0.55;
        let x1, y1, x2, y2;
        if (ground) {
          x1 = cx + (Math.random() - 0.5) * W * 0.26;
          y1 = H * 0.98;
          const a2 = Math.random() * Math.PI * 2;
          x2 = cx + Math.cos(a2) * RING_R;
          y2 = cy + Math.sin(a2) * RING_R;
        } else {
          const a1 = Math.random() * Math.PI * 2;
          x1 = cx + Math.cos(a1) * RING_R * 0.72;
          y1 = cy + Math.sin(a1) * RING_R * 0.72;
          const reach = RING_R * (0.85 + Math.random() * 0.85);
          const a2 = a1 + (Math.random() - 0.5) * 0.8;
          x2 = cx + Math.cos(a2) * reach;
          y2 = cy + Math.sin(a2) * reach;
        }
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const jitter = Math.max(14, Math.min(46, dist * 0.24));
        const pts = genBoltPoints(x1, y1, x2, y2, 4, jitter);
        const { segs, total } = segLenList(pts);
        const branches = [];
        if (pts.length > 4) {
          const forkCount =
            1 + (Math.random() < 0.65 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0); // 1-3 forks
          for (let f = 0; f < forkCount; f++) {
            const bi = Math.floor(pts.length * (0.28 + Math.random() * 0.5));
            if (bi < 1 || bi >= pts.length - 1) continue;
            const bp = pts[bi];
            const prevA = Math.atan2(
              pts[bi].y - pts[Math.max(0, bi - 1)].y,
              pts[bi].x - pts[Math.max(0, bi - 1)].x,
            );
            const ang =
              prevA +
              (Math.random() > 0.5 ? 1 : -1) * (0.55 + Math.random() * 0.75);
            const blen = total * (0.14 + Math.random() * 0.18);
            const bx2 = bp.x + Math.cos(ang) * blen,
              by2 = bp.y + Math.sin(ang) * blen;
            const bjit = Math.max(8, Math.min(24, blen * 0.3));
            const bpts = genBoltPoints(bp.x, bp.y, bx2, by2, 2, bjit);
            const bsl = segLenList(bpts);
            const mainLenToBranch = segs
              .slice(0, bi)
              .reduce((a, b) => a + b, 0);
            branches.push({
              pts: bpts,
              segs: bsl.segs,
              total: bsl.total,
              triggerLen: mainLenToBranch,
            });
          }
        }
        this.bolts.push({
          pts,
          segs,
          total,
          branches,
          age: 0,
          life: 10 + Math.random() * 8,
          seedPhase: Math.random() * 10,
        });
        if (this.phase < 6)
          this.flash = Math.min(1, this.flash + (ground ? 0.55 : 0.32));
      }
      update() {
        const { cx, cy } = this.info;
        const r = Math.random();
        const settled = this.dim;
        if (this.phase >= 1 && !settled && r < 0.38) this.spawnA();
        if (settled && r < 0.2) this.spawnA();
        if (this.phase >= 4 && !settled && r < 0.88) this.spawnG();
        if (settled && r < 0.38) this.spawnG();
        if (this.phase === 4 && r < 0.22) this.spawnO();
        if (this.phase >= 5 && !settled && r < 0.7) this.spawnO();
        if (settled && r < 0.3) this.spawnO();

        const rb = Math.random();
        if (this.phase === 4 && rb < 0.02) this.spawnBolt();
        else if (this.phase === 5 && rb < 0.05) this.spawnBolt();
        else if (settled && rb < 0.006) this.spawnBolt();

        this.flash *= 0.86;
        const pts = this.pts;
        let w = 0;
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          p.age++;
          const lt = p.age / p.life;
          if (p.type === "o") {
            p.px = p.x;
            p.py = p.y;
            p.oa += p.os;
            p.or = Math.max(16, p.or - 0.11);
            p.x = cx + Math.cos(p.oa) * p.or;
            p.y = cy + Math.sin(p.oa) * p.or;
          } else {
            if (p.type === "g") {
              p.px = p.x;
              p.py = p.y;
            }
            p.x += p.vx;
            p.y += p.vy;
            if (p.type === "g") {
              p.vx *= 0.97;
              p.vy += 0.045;
            }
          }
          const fi = lt < 0.15 ? lt / 0.15 : 1,
            fo = lt > 0.7 ? 1 - (lt - 0.7) / 0.3 : 1;
          p.ca = p.a * fi * fo;
          if (p.age < p.life && p.ca > 0.004) {
            pts[w++] = p;
          } else {
            if (p.type === "a") this.cA--;
            else if (p.type === "g") this.cG--;
            else if (p.type === "o") this.cO--;
          }
        }
        pts.length = w;

        const bolts = this.bolts;
        let bw = 0;
        for (let i = 0; i < bolts.length; i++) {
          const b = bolts[i];
          b.age++;
          if (b.age >= b.life) {
            const tip = b.pts[b.pts.length - 1];
            this.spawnTipSparks(tip.x, tip.y, 3);
            for (let bi2 = 0; bi2 < b.branches.length; bi2++) {
              const bt = b.branches[bi2].pts[b.branches[bi2].pts.length - 1];
              this.spawnTipSparks(bt.x, bt.y, 2);
            }
          } else {
            bolts[bw++] = b;
          }
        }
        bolts.length = bw;
      }
      drawBoltPath(ctx, points, alpha, dpr, thin) {
        if (points.length < 2 || alpha <= 0.01) return;
        ctx.globalAlpha = alpha;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(points[0].x * dpr, points[0].y * dpr);
        for (let i = 1; i < points.length; i++)
          ctx.lineTo(points[i].x * dpr, points[i].y * dpr);
        ctx.strokeStyle = "rgba(160,90,255,.22)";
        ctx.lineWidth = (thin ? 11 : 17) * dpr;
        ctx.stroke();
        ctx.strokeStyle = "rgba(195,145,255,.82)";
        ctx.lineWidth = (thin ? 4 : 7) * dpr;
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,.98)";
        ctx.lineWidth = (thin ? 1 : 1.6) * dpr;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      render() {
        const ctx = this.ctx,
          W = this.cv.width,
          H = this.cv.height,
          dpr = DPR,
          glow = this.glow;
        ctx.clearRect(0, 0, W, H);
        const pts = this.pts;
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          const px = p.x * dpr,
            py = p.y * dpr;
          if (p.type === "g") {
            const tx = p.px * dpr,
              ty = p.py * dpr;
            ctx.lineCap = "round";
            ctx.globalAlpha = p.ca * 0.32;
            ctx.strokeStyle = p.col;
            ctx.lineWidth = Math.max(2.6, p.sz * 1.7) * dpr;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(px, py);
            ctx.stroke();
            ctx.globalAlpha = p.ca;
            ctx.lineWidth = Math.max(1.1, p.sz * 0.7) * dpr;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(px, py);
            ctx.stroke();
          } else if (p.type === "o") {
            ctx.globalAlpha = p.ca;
            ctx.strokeStyle = p.col;
            ctx.lineWidth = Math.max(1, p.sz * 0.9) * dpr;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(p.px * dpr, p.py * dpr);
            ctx.lineTo(px, py);
            ctx.stroke();
          } else {
            const gs = p.sz * 9 * dpr;
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = p.ca * 0.85;
            ctx.drawImage(glow, px - gs / 2, py - gs / 2, gs, gs);
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = p.ca;
            ctx.fillStyle = p.col;
            ctx.beginPath();
            ctx.arc(px, py, p.sz * dpr * 0.55, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        const bolts = this.bolts;
        for (let i = 0; i < bolts.length; i++) {
          const b = bolts[i];
          const progress = b.age / b.life;
          const growP = Math.min(1, progress / 0.1);
          const holdEnd = 0.55;
          const fadeP =
            progress < holdEnd
              ? 1
              : Math.max(0, 1 - (progress - holdEnd) / (1 - holdEnd));
          const flicker = 0.82 + 0.18 * Math.sin(b.age * 2.6 + b.seedPhase);
          const alpha = growP * fadeP * flicker * (this.dim ? 0.6 : 1);
          const drawLen = growP * b.total;
          const segPts = partialPath(b.pts, b.segs, b.total, drawLen);
          this.drawBoltPath(ctx, segPts, alpha, dpr, false);
          for (let bi3 = 0; bi3 < b.branches.length; bi3++) {
            const br = b.branches[bi3];
            if (drawLen >= br.triggerLen) {
              const bGrowP = Math.min(1, Math.max(0, progress - 0.08) / 0.22);
              const bDrawLen = bGrowP * br.total;
              const bSegPts = partialPath(br.pts, br.segs, br.total, bDrawLen);
              this.drawBoltPath(ctx, bSegPts, alpha * 0.8, dpr, true);
            }
          }
        }
        if (this.flash > 0.01) {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = this.flash * 0.35;
          ctx.fillStyle = "rgba(215,195,255,1)";
          ctx.fillRect(0, 0, W, H);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
        }
      }
      tick() {
        if (!this.on) return;
        this.update();
        this.render();
        this.raf = requestAnimationFrame(() => this.tick());
      }
      start() {
        this.on = true;
        this.tick();
      }
      stop() {
        this.on = false;
        if (this.raf) cancelAnimationFrame(this.raf);
      }
    }

    const pendingTimers = [];
    function sched(fn, delayMs) {
      const t = {
        fn,
        remaining: delayMs,
        startedAt: performance.now(),
        id: null,
      };
      t.id = setTimeout(() => {
        const i = pendingTimers.indexOf(t);
        if (i >= 0) pendingTimers.splice(i, 1);
        fn();
      }, delayMs);
      pendingTimers.push(t);
      return t;
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        const now = performance.now();
        for (const t of pendingTimers) {
          clearTimeout(t.id);
          t.remaining = Math.max(0, t.remaining - (now - t.startedAt));
        }
      } else {
        for (const t of pendingTimers) {
          t.startedAt = performance.now();
          t.id = setTimeout(() => {
            const i = pendingTimers.indexOf(t);
            if (i >= 0) pendingTimers.splice(i, 1);
            t.fn();
          }, t.remaining);
        }
      }
    });
    function at(seconds, fn) {
      sched(fn, seconds * 1000);
    }

    function shake(el, variant) {
      el.classList.remove("shk1", "shk2");
      void el.offsetWidth;
      el.classList.add("shk");
      el.classList.add(variant);
      el.addEventListener(
        "animationend",
        function h() {
          el.classList.remove("shk", variant);
          el.removeEventListener("animationend", h);
        },
        { once: true },
      );
    }

    function initScene() {
      const cv = document.getElementById("pcv");
      const cz = document.querySelector(".cz");
      const wr = document.getElementById("wr");
      const rw = document.getElementById("rw");
      const ro = document.getElementById("ro");
      const rb = document.getElementById("rb");
      const rd = document.getElementById("rd");
      const rt = document.getElementById("rt");
      const swirlOuter = document.getElementById("swirlOuter");
      const swirlMid = document.getElementById("swirlMid");
      const forksA = document.getElementById("forksA");
      const forksB = document.getElementById("forksB");
      const fz = document.getElementById("fz");

      function resizeCanvas() {
        const W = window.innerWidth,
          H = window.innerHeight,
          dpr = DPR;
        cv.width = W * dpr;
        cv.height = H * dpr;
        cv.style.width = W + "px";
        cv.style.height = H + "px";
        return { W, H, dpr };
      }
      let { W, H } = resizeCanvas();
      const isMob = () => window.innerWidth <= 768;
      const info = {
        cx: isMob() ? W * 0.5 : W * 0.25,
        cy: H * 0.48,
        h: H * 0.68,
      };
      const ps = new PS(cv, info);
      ps.start();

      let resizePending = false;
      window.addEventListener("resize", () => {
        if (resizePending) return;
        resizePending = true;
        requestAnimationFrame(() => {
          resizePending = false;
          const r = resizeCanvas();
          ps.setInfo({
            cx: isMob() ? r.W * 0.5 : r.W * 0.25,
            cy: r.H * 0.48,
            h: r.H * 0.68,
          });
        });
      });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) ps.on = false;
        else {
          ps.on = true;
          ps.tick();
        }
      });

      at(0.5, () => {
        cv.style.opacity = "1";
        ps.setPhase(1);
      });

      const rgb = document.getElementById("rgb");
      at(0.95, () => {
        rw.style.opacity = "1";
        rgb.style.opacity = "1";
      });
      at(1.0, () => {
        requestAnimationFrame(() => {
          ro.style.opacity = "0.9";
          rb.style.opacity = "0.95";
          rd.style.opacity = "1";
          rt.style.strokeDashoffset = "0";
        });

        at(1.5, () => {
          forksA.style.transition = "opacity .18s ease";
          let flickers = 0;
          const flick = () => {
            forksA.style.opacity = flickers % 2 === 0 ? "0.7" : "0.3";
            flickers++;
            if (flickers < 6) sched(flick, 70 + Math.random() * 80);
            else forksA.style.opacity = "0.4";
          };
          flick();
        });
      });

      function startSwirl() {
        swirlOuter.style.transition = "transform 72s linear";
        swirlMid.style.transition = "transform 50s linear";
        requestAnimationFrame(() => {
          swirlOuter.style.transform = "rotate(360deg)";
          swirlMid.style.transform = "rotate(-360deg)";
        });
        const reswirl = () => {
          swirlOuter.style.transition = "none";
          swirlOuter.style.transform = "rotate(0deg)";
          swirlMid.style.transition = "none";
          swirlMid.style.transform = "rotate(0deg)";
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              swirlOuter.style.transition = "transform 72s linear";
              swirlMid.style.transition = "transform 50s linear";
              swirlOuter.style.transform = "rotate(360deg)";
              swirlMid.style.transform = "rotate(-360deg)";
            }),
          );
        };
        const loopSwirl = () => {
          reswirl();
          sched(loopSwirl, 72000);
        };
        sched(loopSwirl, 72000);
      }

      function idleCrackle() {
        const dur = 2400 + Math.random() * 3400;
        sched(() => {
          const layer = Math.random() > 0.5 ? forksA : forksB;
          const base = layer === forksA ? 0.28 : 0.4;
          layer.style.transition = "opacity .08s ease";
          layer.style.opacity = "0.62";
          sched(() => {
            layer.style.opacity = String(base);
            idleCrackle();
          }, 90);
        }, dur);
      }

      at(1.72, () => {
        wr.style.transition = "opacity .45s ease-in, filter .45s ease-in";
        requestAnimationFrame(() => {
          wr.style.opacity = "0.35";
          wr.style.filter =
            "brightness(0.06) blur(0px) drop-shadow(0 0 0px rgba(140,80,255,0))";
        });
      });
      at(2.1, () => {
        wr.style.transition = "opacity 1.4s ease-out, filter 1.4s ease-out";
        requestAnimationFrame(() => {
          wr.style.opacity = "1";
          wr.style.filter =
            "brightness(1) blur(0px) drop-shadow(0 0 0px rgba(140,80,255,0))";
        });
      });

      at(2.6, () => {
        ps.setPhase(4);
        shake(cz, "shk1");
        forksB.style.transition = "opacity .5s ease";
        forksB.style.opacity = "0.55";
      });

      at(3.5, () => {
        ps.setPhase(5);
        shake(cz, "shk2");
        forksA.style.opacity = "0.55";
        wr.style.transition = "filter .9s ease-out";
        requestAnimationFrame(() => {
          wr.style.filter =
            "brightness(1.06) blur(0px) drop-shadow(0 0 28px rgba(140,80,255,.65))";
        });
      });

      at(4.5, () => {
        fz.classList.add("in");
        const introScr = document.querySelector(".scr.intro");
        if (introScr) introScr.classList.add("in");
        rgb.style.opacity = "0.75";
        forksA.style.transition = "opacity .7s ease";
        forksA.style.opacity = "0.28";
        forksB.style.transition = "opacity .7s ease";
        forksB.style.opacity = "0.4";
        const sceneEl = document.querySelector(".scene");
        if (sceneEl) sceneEl.classList.add("bg-dim");
      });
      at(4.6, () => {
        ps.setPhase(6);
        ps.setDim(true);
      });

      at(5.4, () => {
        rw.classList.add("pulse");
        idleCrackle();
        startSwirl();
      });

      return ps;
    }

    function preloadCriticalImages() {
      const urls = [warriorImg, logoImg, sceneBgImg];
      const decodes = urls.map((src) => {
        const img = new Image();
        img.src = src;
        return img.decode
          ? img.decode().catch(() => {})
          : new Promise((res) => {
              img.onload = res;
              img.onerror = res;
            });
      });
      const timeout = new Promise((res) => setTimeout(res, 500));
      return Promise.race([Promise.all(decodes), timeout]);
    }

    preloadCriticalImages().then(() => {
      initScene();

      const scene = document.querySelector(".scene");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scene.classList.add("bg-in");
        });
      });
      scene.addEventListener("transitionend", (e) => {
        if (e.propertyName === "opacity" && e.target === scene) {
          scene.classList.add("bg-settled");
        }
      });
    });
  }, []);
}
