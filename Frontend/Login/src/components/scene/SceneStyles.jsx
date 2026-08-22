import { SCENE_BACKGROUND_IMAGE } from "../../constants/assets";

const sceneBg = SCENE_BACKGROUND_IMAGE;

export default function SceneStyles() {
  return (
    <style>{`

*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
:root{
  --p:#a855f7;--pd:#7c3aed;
  --bg:#050408;--card:rgba(8,5,22,0.88);
  --ib:rgba(140,80,255,0.22);
  --t1:#ffffff;--t2:rgba(255,255,255,0.5);--t3:rgba(255,255,255,0.28);
}
html,body{width:100%;height:100%;background:var(--bg);overflow:hidden;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
  color:var(--t1);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}

.scene{position:relative;width:100vw;height:100dvh;display:flex;overflow:hidden;}

.scene::before{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;
  background-image:linear-gradient(180deg,rgba(5,4,8,0.55) 0%,rgba(5,4,8,0.35) 40%,rgba(5,4,8,0.75) 100%), url('${sceneBg}');
  background-size:cover,cover;background-position:center,center;background-repeat:no-repeat,no-repeat;
  opacity:0;will-change:opacity;
  transition:opacity 1.8s cubic-bezier(.16,1,.3,1);}
.scene.bg-in::before{opacity:1;}
.scene.bg-settled::before{will-change:auto;}
.scene.bg-dim::before{opacity:.82;transition:opacity 1.2s ease;}
@media(max-width:1024px){
  .scene::before{background-position:74% 62%,74% 62%;}
}
.pcv{position:absolute;inset:0;pointer-events:none;z-index:1;opacity:0;
  transition:opacity .8s ease;}

.cz{position:relative;flex:0 0 50%;z-index:2;display:flex;align-items:center;justify-content:center;}
@media(max-width:1024px){.cz{position:absolute;inset:0;flex:none;width:100%;height:100%;}}

.rw{position:absolute;left:50%;top:36%;transform:translate(-50%,-50%);
  width:min(54vh,46vw);height:min(54vh,46vw);z-index:2;opacity:0;
  transition:opacity .05s linear;will-change:opacity,filter,transform;}
@media(max-width:1024px){.rw{top:30%;width:min(80vw,56vh);height:min(80vw,56vh);}}
.rgb{position:absolute;left:50%;top:36%;transform:translate(-50%,-50%);
  width:min(90vh,78vw);height:min(90vh,78vw);z-index:1;opacity:0;
  transition:opacity 2.2s ease;pointer-events:none;
  background:radial-gradient(circle,rgba(140,70,255,.16) 0%,rgba(100,45,180,.07) 32%,transparent 62%);}
@media(max-width:1024px){.rgb{top:30%;}}

.rw.pulse{animation:rpulse 4.5s ease-in-out infinite, rbreathe 7.5s ease-in-out infinite;}
@keyframes rpulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.3)}}
@keyframes rbreathe{0%,100%{transform:translate(-50%,-50%) scale(1);}50%{transform:translate(-50%,-50%) scale(1.022);}}

#swirlOuter,#swirlMid{will-change:transform;}
#ro,#rb,#rd{transition:opacity 1.4s ease-out;will-change:opacity;}
#rt{transition:stroke-dashoffset 1.9s cubic-bezier(.45,.05,.55,.95);will-change:opacity;}

.wr{position:absolute;left:50%;top:12%;transform:translateX(-50%);
  height:70vh;width:auto;z-index:3;pointer-events:none;user-select:none;
  will-change:filter,opacity;
  filter:brightness(0) blur(15px) drop-shadow(0 0 0px rgba(140,80,255,0));opacity:0;}
@media(max-width:1024px){.wr{top:9%;height:64vh;}}

.cz.shk{will-change:transform;}
@keyframes shk1{
  0%{transform:translate(0,0)}8%{transform:translate(-6.8px,3.6px)}16%{transform:translate(6.1px,-3.1px)}
  24%{transform:translate(-5.3px,2.4px)}32%{transform:translate(4.9px,-3.8px)}40%{transform:translate(-4.2px,2.1px)}
  48%{transform:translate(3.6px,-2.6px)}56%{transform:translate(-2.9px,1.8px)}64%{transform:translate(2.3px,-1.5px)}
  72%{transform:translate(-1.7px,1.1px)}80%{transform:translate(1.2px,-0.8px)}88%{transform:translate(-0.6px,0.4px)}
  100%{transform:translate(0,0)}
}
@keyframes shk2{
  0%{transform:translate(0,0)}10%{transform:translate(3.9px,-2.1px)}20%{transform:translate(-3.5px,1.9px)}
  30%{transform:translate(3.0px,-1.6px)}40%{transform:translate(-2.4px,1.3px)}50%{transform:translate(1.9px,-1.0px)}
  60%{transform:translate(-1.4px,0.8px)}70%{transform:translate(1.0px,-0.5px)}80%{transform:translate(-0.6px,0.3px)}
  90%{transform:translate(0.3px,-0.2px)}100%{transform:translate(0,0)}
}
.cz.shk1{animation:shk1 .55s linear;}
.cz.shk2{animation:shk2 .4s linear;}

.gf{position:absolute;bottom:0;left:0;right:0;height:34%;
  background:linear-gradient(to top,var(--bg) 0%,transparent 100%);
  pointer-events:none;z-index:4;}

.fz{position:relative;flex:0 0 50%;display:flex;align-items:center;justify-content:center;
  z-index:10;padding:20px;opacity:0;
  transition:opacity .3s ease-out;}
.fz.in{opacity:1;}

/* Staggered per-element entrance for the initial login reveal only.
   Order: Logo -> Title -> Email -> Password -> Forgot Password -> Login Button -> Sign Up.
   Each direct child of the login .scr is faded/slid in individually; transition-delay
   for the 80ms stagger is assigned per-child via JS in initRouter(). */
.scr.intro>*{opacity:0;transform:translateY(16px);
  transition:opacity .3s ease-out,transform .3s ease-out;}
.scr.intro.in>*{opacity:1;transform:translateY(0);}
.fz::before{content:'';position:absolute;inset:-10%;z-index:-1;pointer-events:none;
  background:radial-gradient(closest-side,rgba(5,4,10,.5) 0%,rgba(5,4,10,.22) 55%,transparent 78%);}
@media(max-width:1024px){.fz::before{display:none;}}
@media(max-width:1024px){
  .fz{position:absolute;bottom:0;left:0;right:0;flex:none;width:100%;
    padding:0 18px 32px;align-items:flex-end;
    background:linear-gradient(to top,rgba(5,4,12,.97) 45%,rgba(5,4,12,.82) 72%,transparent 100%);}
}

@property --bangle{syntax:'<angle>';inherits:false;initial-value:0deg;}
.fc{position:relative;width:100%;max-width:380px;isolation:isolate;
  border-radius:22px;padding:38px 34px;}
.fc::before{content:'';position:absolute;inset:0;border-radius:inherit;
  padding:1px;pointer-events:none;z-index:2;
  background:conic-gradient(from var(--bangle,0deg),
    rgba(168,85,247,0) 0%,rgba(216,180,254,.95) 6%,rgba(168,85,247,0) 18%,
    rgba(168,85,247,0) 52%,rgba(124,58,237,.9) 66%,rgba(168,85,247,0) 80%,
    rgba(168,85,247,0) 100%);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;
  animation:fc-orbit 8s linear infinite;}
@keyframes fc-orbit{to{--bangle:360deg;}}
.fc::after{content:'';position:absolute;inset:0;border-radius:inherit;z-index:-1;
  background:var(--card);
  backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);
  box-shadow:0 0 80px -14px rgba(140,70,255,.5),
    0 26px 64px rgba(0,0,0,.58),
    inset 0 1px 0 rgba(255,255,255,.05),
    inset 0 0 42px rgba(120,60,220,.07);}
@media(max-width:1024px){.fc{padding:18px 6px;max-width:100%;}
  .fc::before,.fc::after{display:none;}}

.scr{transition:opacity .22s ease,transform .26s ease;}
.scr.out{opacity:0;transform:translateY(-8px);}
.scr.hide{display:none;}

.lg {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 15px 0 23px;

  margin-left: -6px;
}

.lg-img{
  height:65px; 
  width:auto;
  display:block;
  filter:
    drop-shadow(0 0 12px rgba(168,85,247,.45))
    drop-shadow(0 1px 1px rgba(0,0,0,.35));
}

.sh{font-size:22px;font-weight:600;margin-bottom:22px;line-height:1.3;
  text-shadow:0 0 22px rgba(168,85,247,.28);}
.sh-sm{font-size:18px;font-weight:600;margin-bottom:10px;line-height:1.4;
  text-shadow:0 0 18px rgba(168,85,247,.25);}
.tx{font-size:13px;color:rgba(255,255,255,.57);margin-bottom:22px;line-height:1.6;}

.iw{position:relative;margin-bottom:14px;}
.iic{position:absolute;left:15px;top:50%;transform:translateY(-50%);
  width:16px;height:16px;color:rgba(196,160,255,.55);pointer-events:none;z-index:2;
  transition:color .28s cubic-bezier(.4,0,.2,1),filter .28s cubic-bezier(.4,0,.2,1);}
.iw:focus-within .iic{color:#dbb4ff;filter:drop-shadow(0 0 6px rgba(168,85,247,.65));}
.inp{width:100%;padding:14px 16px;
  background:linear-gradient(180deg,rgba(255,255,255,.065),rgba(255,255,255,.02));
  border:1px solid rgba(168,85,247,.32);border-radius:12px;color:var(--t1);
  font-size:14px;font-family:inherit;outline:none;
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  box-shadow:0 4px 16px rgba(124,58,237,.16),
    inset 0 1px 0 rgba(255,255,255,.07),
    inset 0 0 0 1px rgba(255,255,255,.02);
  transition:border-color .28s cubic-bezier(.4,0,.2,1),
    box-shadow .28s cubic-bezier(.4,0,.2,1),
    background .28s cubic-bezier(.4,0,.2,1);
  -webkit-appearance:none;appearance:none;}
.inp.pl{padding-left:44px;}
.inp:hover{border-color:rgba(168,85,247,.48);
  background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03));
  box-shadow:0 6px 20px rgba(124,58,237,.2),
    inset 0 1px 0 rgba(255,255,255,.08),
    inset 0 0 0 1px rgba(255,255,255,.03);}
.inp:focus{border-color:#a855f7;
  background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.035));
  animation:inp-pulse 2.6s ease-in-out infinite;}
@keyframes inp-pulse{
  0%,100%{box-shadow:0 6px 22px rgba(124,58,237,.26),
    0 0 0 3px rgba(168,85,247,.13),
    0 0 18px rgba(168,85,247,.2),
    inset 0 1px 0 rgba(255,255,255,.09);}
  50%{box-shadow:0 6px 26px rgba(124,58,237,.34),
    0 0 0 4px rgba(168,85,247,.18),
    0 0 30px rgba(168,85,247,.32),
    inset 0 1px 0 rgba(255,255,255,.09);}}
.inp::placeholder{color:rgba(255,255,255,.34);transition:color .28s ease;}
.inp:focus::placeholder{color:rgba(255,255,255,.44);}
.inp.pr{padding-right:44px;}
.eye{position:absolute;right:14px;top:50%;transform:translateY(-50%);
  display:flex;align-items:center;justify-content:center;
  width:20px;height:20px;
  cursor:pointer;user-select:none;color:rgba(255,255,255,.42);
  line-height:1;opacity:.85;z-index:2;
  transition:color .25s cubic-bezier(.4,0,.2,1),
    opacity .25s cubic-bezier(.4,0,.2,1),
    filter .25s cubic-bezier(.4,0,.2,1);}
.eye:hover{color:#c084fc;opacity:1;
  filter:drop-shadow(0 0 6px rgba(168,85,247,.45));}
.eye:active{transform:translateY(-50%) scale(.9);}
.eye-icon{width:18px;height:18px;display:block;pointer-events:none;}

.btn{width:100%;padding:14px;position:relative;overflow:hidden;isolation:isolate;
  background:linear-gradient(135deg,#7c3aed,#5b21b6);
  border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:600;
  cursor:pointer;letter-spacing:.02em;margin-top:8px;
  box-shadow:0 6px 26px rgba(124,58,237,.4),inset 0 1px 0 rgba(255,255,255,.15);
  transition:filter .2s,transform .1s,box-shadow .25s;font-family:inherit;}
.btn::before{content:'';position:absolute;top:0;left:-60%;width:40%;height:100%;
  background:linear-gradient(120deg,transparent,rgba(255,255,255,.35),transparent);
  transform:skewX(-20deg);transition:left .55s ease;pointer-events:none;}
.btn:hover::before{left:130%;}
.btn:hover{filter:brightness(1.18);
  box-shadow:0 8px 34px rgba(124,58,237,.55),inset 0 1px 0 rgba(255,255,255,.2);}
.btn:active{transform:scale(.985);}
.btn.out{background:transparent;border:1px solid rgba(140,80,255,.35);
  color:rgba(255,255,255,.78);margin-top:10px;filter:none;box-shadow:none;}
.btn.out::before{display:none;}
.btn.out:hover{border-color:var(--p);background:rgba(168,85,247,.08);filter:none;
  box-shadow:0 0 22px rgba(168,85,247,.18);}

.lk{color:var(--p);cursor:pointer;text-decoration:none;}
.lk:hover{color:#c084fc;}

.fr{display:flex;justify-content:flex-end;margin:8px 0 14px;}
.fr .lk{font-size:13px;color:rgba(196,132,252,.62);}
.fr .lk:hover{color:#c084fc;}
.bt{text-align:center;font-size:13px;color:var(--t2);margin-top:18px;}

.isc{text-align:center;padding:6px 0;}
.ic{width:68px;height:68px;border-radius:50%;border:2px solid rgba(140,80,255,.4);
  display:flex;align-items:center;justify-content:center;
  margin:0 auto 20px;font-size:26px;color:var(--p);}
.cc{width:68px;height:68px;border-radius:50%;border:2px solid rgba(74,222,128,.4);
  display:flex;align-items:center;justify-content:center;
  margin:0 auto 20px;font-size:26px;color:#4ade80;}
.isc h3{font-size:18px;font-weight:600;margin-bottom:10px;line-height:1.4;}
.isc p{font-size:13px;color:var(--t2);margin-bottom:22px;line-height:1.6;}

.pwr{font-size:11px;color:rgba(255,255,255,.38);margin:8px 0 4px;padding-left:2px;line-height:1.9;}

.gw{margin:4px 0 6px;}
.gw-lbl{font-size:13px;font-weight:600;color:var(--t1);letter-spacing:.01em;}
.req{color:#c084fc;margin-left:3px;}
.gw-sub{font-size:11.5px;color:rgba(255,255,255,.42);margin:4px 0 12px;line-height:1.5;}
.gopts{display:flex;gap:10px;}
.gopt{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;
  padding:14px 8px 12px;cursor:pointer;font-family:inherit;
  background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015));
  border:1px solid rgba(168,85,247,.24);border-radius:12px;color:rgba(255,255,255,.62);
  font-size:13px;font-weight:500;
  transition:border-color .25s cubic-bezier(.4,0,.2,1),
    background .25s cubic-bezier(.4,0,.2,1),
    color .2s ease,box-shadow .25s cubic-bezier(.4,0,.2,1),transform .1s;}
.gopt .gic{width:20px;height:20px;color:rgba(196,160,255,.55);
  transition:color .25s cubic-bezier(.4,0,.2,1);}
.gopt:hover{border-color:rgba(168,85,247,.46);color:rgba(255,255,255,.85);
  background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02));}
.gopt:hover .gic{color:#dbb4ff;}
.gopt:active{transform:scale(.98);}
.gopt.active{border-color:#a855f7;color:#fff;
  background:linear-gradient(180deg,rgba(168,85,247,.22),rgba(124,58,237,.08));
  box-shadow:0 0 0 3px rgba(168,85,247,.13),0 0 18px rgba(168,85,247,.22),
    inset 0 1px 0 rgba(255,255,255,.08);}
.gopt.active .gic{color:#e9d5ff;filter:drop-shadow(0 0 6px rgba(168,85,247,.65));}
.gw.err .gopt{border-color:rgba(248,113,113,.4);}
.gerr{font-size:11.5px;color:#f87171;margin-top:8px;line-height:1.5;}

.gtrig{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:13px 14px;margin-top:4px;cursor:pointer;text-align:left;font-family:inherit;
  background:linear-gradient(180deg,rgba(255,255,255,.065),rgba(255,255,255,.02));
  border:1px solid rgba(168,85,247,.32);border-radius:12px;color:rgba(255,255,255,.5);
  font-size:13.5px;
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  box-shadow:0 4px 16px rgba(124,58,237,.16),
    inset 0 1px 0 rgba(255,255,255,.07),
    inset 0 0 0 1px rgba(255,255,255,.02);
  transition:border-color .25s cubic-bezier(.4,0,.2,1),
    background .25s cubic-bezier(.4,0,.2,1),
    box-shadow .25s cubic-bezier(.4,0,.2,1);}
.gtrig:hover{border-color:rgba(168,85,247,.48);
  background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03));}
.gtrig.picked{color:#fff;}
.gw.err .gtrig{border-color:rgba(248,113,113,.4);}
.gtrig-left{display:flex;align-items:center;gap:9px;min-width:0;}
.gtrig-left .gic{width:17px;height:17px;color:#dbb4ff;flex-shrink:0;}
.gtrig-txt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gtrig-txt.ph{color:rgba(255,255,255,.34);}
.gtrig-chev{width:15px;height:15px;color:rgba(196,160,255,.55);flex-shrink:0;
  transition:color .25s ease;}
.gtrig:hover .gtrig-chev{color:#dbb4ff;}

.gmodal-ov{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;
  padding:20px;background:rgba(4,3,10,.72);
  backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
  animation:gmodal-fade .2s ease-out;}
@keyframes gmodal-fade{from{opacity:0;}to{opacity:1;}}
.gmodal-box{position:relative;width:100%;max-width:360px;border-radius:20px;
  padding:30px 26px 26px;background:var(--card);
  border:1px solid rgba(168,85,247,.32);
  backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);
  box-shadow:0 0 80px -14px rgba(140,70,255,.5),
    0 26px 64px rgba(0,0,0,.58),
    inset 0 1px 0 rgba(255,255,255,.05);
  animation:gmodal-pop .22s cubic-bezier(.16,1,.3,1);}
@keyframes gmodal-pop{
  from{opacity:0;transform:scale(.94) translateY(8px);}
  to{opacity:1;transform:scale(1) translateY(0);}}
.gmodal-x{position:absolute;top:14px;right:14px;width:28px;height:28px;
  display:flex;align-items:center;justify-content:center;border-radius:50%;
  border:none;cursor:pointer;background:rgba(255,255,255,.06);
  color:rgba(255,255,255,.6);font-size:13px;line-height:1;
  transition:background .2s ease,color .2s ease;}
.gmodal-x:hover{background:rgba(168,85,247,.18);color:#fff;}
.gmodal-box .gw-lbl{font-size:15px;}
.gmodal-box .gw-sub{margin-bottom:16px;}

.btn:disabled{opacity:.45;cursor:not-allowed;filter:none;box-shadow:none;}
.btn:disabled::before{display:none;}
.btn:disabled:hover{filter:none;box-shadow:none;}

/* ---- Sign-up card only: premium but slightly tighter than login,
   since it holds more fields (username/email/2x password/gender). ---- */
.fc-su{padding:30px 34px;}
.fc-su .lg{margin:8px 0 15px;}
.fc-su .lg-img{height:58px;}
.fc-su .sh{margin-bottom:16px;}
.fc-su .tx{margin-bottom:16px;}
.fc-su .iw{margin-bottom:12px;}
.fc-su .inp{padding-top:13px;padding-bottom:13px;}
.fc-su .gw{margin:2px 0 5px;}
.fc-su .gtrig{padding:12px 14px;}
.fc-su .btn{padding:13px;margin-top:10px;}
.fc-su .bt{margin-top:14px;}

    `}</style>
  );
}
