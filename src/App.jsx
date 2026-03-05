import { useState, useMemo, useCallback, useEffect } from "react";
import { fetchStampi, fetchMateriali, upsertStampo, deleteStampo, upsertMateriale, deleteMateriale } from "./db.js";

// ── DATI SEED (usati solo al primo avvio se il DB è vuoto) ────────────────────
const SEED_MATERIALI = [
  { id:1, codice:"ABS-NAT",  nome:"ABS",  colore:"Naturale", densita:1.05, tipoEssic:"Deumidificazione", tempEssic:80,  oreEssic:4, note:"Sensibile all'umidità" },
  { id:2, codice:"PA66-NAT", nome:"PA66", colore:"Naturale", densita:1.14, tipoEssic:"Deumidificazione", tempEssic:85,  oreEssic:6, note:"Molto igroscopico" },
  { id:3, codice:"PP-NAT",   nome:"PP",   colore:"Naturale", densita:0.91, tipoEssic:"Nessuna",          tempEssic:0,   oreEssic:0, note:"" },
  { id:4, codice:"PC-NAT",   nome:"PC",   colore:"Naturale", densita:1.20, tipoEssic:"Deumidificazione", tempEssic:120, oreEssic:4, note:"Alta temp. essic." },
  { id:5, codice:"POM-NAT",  nome:"POM",  colore:"Naturale", densita:1.41, tipoEssic:"Essiccazione",     tempEssic:90,  oreEssic:3, note:"" },
  { id:6, codice:"PA6-NAT",  nome:"PA6",  colore:"Naturale", densita:1.13, tipoEssic:"Deumidificazione", tempEssic:80,  oreEssic:6, note:"Igroscopico" },
  { id:7, codice:"PET-NAT",  nome:"PET",  colore:"Naturale", densita:1.35, tipoEssic:"Deumidificazione", tempEssic:170, oreEssic:5, note:"" },
  { id:8, codice:"TPE-NAT",  nome:"TPE",  colore:"Naturale", densita:0.88, tipoEssic:"Essiccazione",     tempEssic:60,  oreEssic:2, note:"" },
];

const PRESSE = [
  "Negri Bossi V40","Negri Bossi V70","Negri Bossi V90","Negri Bossi V180",
  "Engel 250T","Engel 350T","Engel 500T",
  "Arburg 180T","Arburg 280T",
  "KM 350T","KM 500T",
  "Sandretto 200T",
];
const TIPI_ESSIC = ["Nessuna","Essiccazione","Deumidificazione"];

// Turni di lavoro
// Continuo: 08:00–18:00 = 10h = 600 min
// Con operatore: 08:00–12:00 + 14:00–18:00 = 8h = 480 min
const TURNO_CONTINUO  = 600; // minuti
const TURNO_OPERATORE = 480; // minuti

const SEED_STAMPI = [
  { id:1, codice:"ST-001", cliente:"Fiat", articolo:"Supporto motore", codiceArticolo:"FA-3321",
    pressa:"Negri Bossi V180", tempStampo:240, pesoStampata:190, densita:1.05, nrCavita:4, tempoCiclo:38,
    materialeCodice:"ABS-NAT", master:"MB-BLACK-01", concentrazione:2.5,
    tipoEssic:"Deumidificazione", tempEssic:80, orarioEssic:4,
    cameraCalda:true, braccioRobot:false, recuperoMaterozza:true,
    presenza:false,
    tipoScatola:"Cartone 40x30x20", pezziScatola:50, scatolePerBancale:20,
    difettiFrquenti:"Segni di bruciatura alle gate", note:"Verificare temperature ugelli" },
  { id:2, codice:"ST-002", cliente:"Bosch", articolo:"Cover sensore", codiceArticolo:"BS-7782",
    pressa:"Negri Bossi V70", tempStampo:210, pesoStampata:123, densita:1.2, nrCavita:8, tempoCiclo:22,
    materialeCodice:"PA66-NAT", master:"MB-WHITE-03", concentrazione:1.8,
    tipoEssic:"Deumidificazione", tempEssic:90, orarioEssic:6,
    cameraCalda:false, braccioRobot:true, recuperoMaterozza:false,
    presenza:true,
    tipoScatola:"Blister 6x4", pezziScatola:24, scatolePerBancale:40,
    difettiFrquenti:"Deformazione post-estrazione", note:"Usare antistatico" },
  { id:3, codice:"ST-003", cliente:"Interne", articolo:"Vassoio componenti", codiceArticolo:"INT-0044",
    pressa:"Negri Bossi V90", tempStampo:195, pesoStampata:171, densita:0.97, nrCavita:2, tempoCiclo:55,
    materialeCodice:"PP-NAT", master:"", concentrazione:0,
    tipoEssic:"Nessuna", tempEssic:0, orarioEssic:0,
    cameraCalda:false, braccioRobot:false, recuperoMaterozza:true,
    presenza:false,
    tipoScatola:"", pezziScatola:0, scatolePerBancale:0,
    difettiFrquenti:"Linee di flusso visibili", note:"" },
];

// ── ICONE ─────────────────────────────────────────────────────────────────────
const Ico = {
  db:     ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>,
  mat:    ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  mix:    ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>,
  clock:  ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  csv:    ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  plus:   ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit:   ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  del:    ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
  x:      ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="19" height="19"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  search: ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  filter: ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  box:    ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  user:   ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
};

// ── UTILS ─────────────────────────────────────────────────────────────────────
const fmt      = (n, d=2) => isFinite(n) && n !== "" ? Number(n).toFixed(d) : "—";
const calcDos  = (peso, nrCav) => (!peso||!nrCav||nrCav<=0) ? 0 : parseFloat(peso)/parseFloat(nrCav);
const calcVol  = (peso, nrCav, dens) => (!peso||!nrCav||!dens||nrCav<=0||dens<=0) ? 0 : (parseFloat(peso)/parseFloat(nrCav))/parseFloat(dens);
const sacchi25 = kg => Math.ceil(Math.max(0,parseFloat(kg)||0)/25);

// Pezzi prodotti per minuto
const pezziPerMin = (cicloSec, nrCav) => {
  if (!cicloSec||!nrCav||cicloSec<=0) return 0;
  return (parseFloat(nrCav)*60)/parseFloat(cicloSec);
};

// Formatta minuti → "Xh Ymin"
const fmtDurata = min => {
  if (!isFinite(min)||min<=0) return "—";
  const h = Math.floor(min/60);
  const m = Math.round(min%60);
  return h>0 ? `${h}h ${m>0?m+"min":""}`.trim() : `${m}min`;
};

// Calcola quanti turni e giorni servono
const calcolaTempi = (quantita, nrCav, cicloSec, turnoMin) => {
  if (!quantita||!nrCav||!cicloSec||cicloSec<=0||turnoMin<=0) return null;
  const pzPerMin   = pezziPerMin(cicloSec, nrCav);
  const minTotali  = parseFloat(quantita) / pzPerMin;
  const turniInteri = Math.ceil(minTotali / turnoMin);
  const pzPerTurno  = Math.floor(pzPerMin * turnoMin);
  return { pzPerMin, minTotali, turniInteri, pzPerTurno };
};

function exportCSV(stampi, materiali) {
  const gM = cod => materiali.find(m=>m.codice===cod);
  const H = ["Codice","Cliente","Articolo","Cod.Art.","Pressa","T.Stampo°C",
    "Peso Stampata g","Densità g/cm³","Dos./Cav g","Nr.Cav","Ciclo s",
    "Materiale","Master","Conc.%","Tipo Essic.","T.Essic.°C","Ore Essic.",
    "Cam.Calda","Robot","Rec.Mater.","Presenza Operatore",
    "Tipo Scatola","Pezzi/Scatola","Scatole/Bancale","Difetti","Note"];
  const R = stampi.map(s=>{
    const m=gM(s.materialeCodice);
    return [s.codice,s.cliente,s.articolo,s.codiceArticolo,s.pressa,s.tempStampo,
      s.pesoStampata,s.densita,fmt(calcDos(s.pesoStampata,s.nrCavita)),
      s.nrCavita,s.tempoCiclo,m?`${m.nome}(${m.codice})`:s.materialeCodice,
      s.master,s.concentrazione,s.tipoEssic,s.tempEssic,s.orarioEssic,
      s.cameraCalda?"SÌ":"NO",s.braccioRobot?"SÌ":"NO",s.recuperoMaterozza?"SÌ":"NO",
      s.presenza?"SÌ":"NO",
      s.tipoScatola||"—",s.pezziScatola||"—",s.scatolePerBancale||"—",
      s.difettiFrquenti,s.note];
  });
  const csv=[H,...R].map(r=>r.map(v=>`"${v}"`).join(";")).join("\n");
  const b=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  const u=URL.createObjectURL(b);
  const a=document.createElement("a");a.href=u;a.download="libreria_stampi_LM.csv";a.click();
  URL.revokeObjectURL(u);
}

// ── STILI ─────────────────────────────────────────────────────────────────────
const inp = { width:"100%", background:"#0d0d0d", border:"1px solid #222", color:"#eee",
  borderRadius:4, padding:"8px 10px", fontSize:13, outline:"none", boxSizing:"border-box" };
const lbl = { display:"block", fontSize:10, color:"#555", marginBottom:4,
  textTransform:"uppercase", letterSpacing:"0.1em" };
const card  = (b="#1e1e1e") => ({ background:"#141414", border:`1px solid ${b}`, borderRadius:8, padding:20 });
const secT  = (c="#cc1f1f") => ({ fontSize:11, color:c, textTransform:"uppercase", letterSpacing:3,
  borderBottom:"1px solid #1e1e1e", paddingBottom:6, marginBottom:14 });
const btnR  = { display:"flex", alignItems:"center", gap:7, padding:"8px 18px",
  background:"linear-gradient(135deg,#cc1f1f,#8b0000)", border:"none",
  color:"#fff", borderRadius:5, cursor:"pointer", fontWeight:700, fontSize:12, letterSpacing:1 };
const btnG  = { display:"flex", alignItems:"center", gap:7, padding:"8px 16px",
  background:"#0d1a0d", border:"1px solid #2e7d32", color:"#4caf50",
  borderRadius:5, cursor:"pointer", fontSize:12, fontWeight:600 };
const btnGh = { display:"flex", alignItems:"center", gap:7, padding:"8px 16px",
  background:"#1a1a1a", border:"1px solid #2a2a2a", color:"#777",
  borderRadius:5, cursor:"pointer", fontSize:12 };

function FInp({ v, s, type="text", style:xs, ...p }) {
  const hc = useCallback(e => s(e.target.value), [s]);
  return <input type={type} value={v} onChange={hc}
    style={{ ...inp, ...xs }}
    onFocus={e=>e.target.style.borderColor="#cc1f1f"}
    onBlur={e=>e.target.style.borderColor="#222"} {...p}/>;
}
function FSel({ v, s, opts }) {
  return <select value={v} onChange={e=>s(e.target.value)} style={inp}>
    {opts.map(o=>typeof o==="string"
      ?<option key={o} value={o}>{o}</option>
      :<option key={o.v} value={o.v}>{o.l}</option>)}
  </select>;
}
function Tog({ on, s, label, sublabel }) {
  return <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={()=>s(!on)}>
    <div style={{ width:36,height:20,borderRadius:10,background:on?"#2e7d32":"#252525",
      position:"relative",transition:"background .2s",flexShrink:0 }}>
      <div style={{ position:"absolute",top:2,left:on?18:2,width:16,height:16,
        borderRadius:"50%",background:"#fff",transition:"left .2s" }}/>
    </div>
    <div>
      <span style={{ fontSize:13, color:on?"#4caf50":"#666" }}>{label}</span>
      {sublabel && <div style={{ fontSize:10, color:"#444", marginTop:1 }}>{sublabel}</div>}
    </div>
  </div>;
}
function RRow({ label, val, unit, color="#ccc", big, sub }) {
  return <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
    padding:"9px 0",borderBottom:"1px solid #181818" }}>
    <div>
      <span style={{ fontSize:12, color:"#666" }}>{label}</span>
      {sub && <div style={{ fontSize:10, color:"#444" }}>{sub}</div>}
    </div>
    <span style={{ fontFamily:"'Courier New',monospace",fontSize:big?20:14,color,fontWeight:700 }}>
      {val} <span style={{ fontSize:10, color:"#444", fontWeight:400 }}>{unit}</span>
    </span>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL STAMPO
// ═══════════════════════════════════════════════════════════════════════════════
const emptyStampo = {
  id:null, codice:"", cliente:"", articolo:"", codiceArticolo:"",
  pressa:PRESSE[0], tempStampo:200,
  pesoStampata:"", densita:1.05, nrCavita:1, tempoCiclo:30,
  materialeCodice:"", master:"", concentrazione:0,
  tipoEssic:"Nessuna", tempEssic:80, orarioEssic:4,
  cameraCalda:false, braccioRobot:false, recuperoMaterozza:false,
  presenza:false,
  tipoScatola:"", pezziScatola:"", scatolePerBancale:"",
  difettiFrquenti:"", note:"",
};

function StampoModal({ stampo, materiali, onSave, onClose }) {
  const [f, setF] = useState(()=>stampo?{...stampo}:{...emptyStampo});
  const set = useCallback((k,v)=>setF(p=>({...p,[k]:v})),[]);

  const dens   = parseFloat(f.densita)||0;
  const nrCav  = parseFloat(f.nrCavita)||1;
  const peso   = parseFloat(f.pesoStampata)||0;
  const vol    = calcVol(peso,nrCav,dens);
  const dos    = calcDos(peso,nrCav);

  const onMatChange = useCallback(cod=>{
    const m=materiali.find(x=>x.codice===cod);
    setF(p=>({...p,materialeCodice:cod,
      densita:m?m.densita:p.densita,
      tipoEssic:m?m.tipoEssic:p.tipoEssic,
      tempEssic:m?m.tempEssic:p.tempEssic,
      orarioEssic:m?m.oreEssic:p.orarioEssic,
    }));
  },[materiali]);

  const matSel = materiali.find(m=>m.codice===f.materialeCodice);
  const col={flex:"1 1 44%",minWidth:165};
  const L=({c})=><label style={lbl}>{c}</label>;

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"#141414",border:"1px solid #cc1f1f",borderRadius:8,
        width:"100%",maxWidth:840,maxHeight:"93vh",overflowY:"auto",
        boxShadow:"0 0 60px rgba(204,31,31,.2)" }}>

        <div style={{ background:"linear-gradient(90deg,#cc1f1f,#8b0000)",padding:"13px 20px",
          display:"flex",justifyContent:"space-between",alignItems:"center",borderRadius:"7px 7px 0 0" }}>
          <span style={{ fontFamily:"'Courier New',monospace",fontWeight:700,fontSize:14,color:"#fff",letterSpacing:2 }}>
            {f.id?`✏ MODIFICA — ${f.codice}`:"＋ NUOVO STAMPO"}
          </span>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#fff",cursor:"pointer" }}><Ico.x/></button>
        </div>

        <div style={{ padding:20 }}>
          {/* riepilogo calcolato */}
          <div style={{ background:"#0d1a0d",border:"1px solid #2e7d32",borderRadius:6,
            padding:"11px 18px",marginBottom:20,display:"flex",gap:32,flexWrap:"wrap",alignItems:"center" }}>
            <div>
              <div style={{ fontSize:9,color:"#4caf50",textTransform:"uppercase",letterSpacing:2,marginBottom:2 }}>Dosaggio / cavità</div>
              <div style={{ fontSize:26,fontWeight:700,color:"#4caf50",fontFamily:"'Courier New',monospace" }}>
                {fmt(dos)} <span style={{ fontSize:12 }}>g</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize:9,color:"#4caf50",textTransform:"uppercase",letterSpacing:2,marginBottom:2 }}>Volume cav. (dedotto)</div>
              <div style={{ fontSize:26,fontWeight:700,color:"#82c982",fontFamily:"'Courier New',monospace" }}>
                {fmt(vol,3)} <span style={{ fontSize:12 }}>cm³</span>
              </div>
            </div>
            <div style={{ fontSize:11,color:"#444",marginLeft:"auto" }}>
              {peso}g ÷ {nrCav}cav ÷ {dens}g/cm³
              {matSel&&<span style={{ marginLeft:8,color:"#4caf50" }}>[{matSel.nome}]</span>}
            </div>
          </div>

          {/* IDENTIFICAZIONE */}
          <div style={{ marginBottom:16 }}>
            <div style={secT()}>◆ Identificazione</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:12 }}>
              <div style={col}><L c="Codice Stampo *"/><FInp v={f.codice} s={v=>set("codice",v)} placeholder="ST-XXX"/></div>
              <div style={col}><L c="Cliente *"/><FInp v={f.cliente} s={v=>set("cliente",v)}/></div>
              <div style={col}><L c="Articolo *"/><FInp v={f.articolo} s={v=>set("articolo",v)}/></div>
              <div style={col}><L c="Codice Articolo"/><FInp v={f.codiceArticolo} s={v=>set("codiceArticolo",v)}/></div>
            </div>
          </div>

          {/* MACCHINA */}
          <div style={{ marginBottom:16 }}>
            <div style={secT()}>◆ Macchina & Parametri</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:12 }}>
              <div style={col}><L c="Pressa"/><FSel v={f.pressa} s={v=>set("pressa",v)} opts={PRESSE}/></div>
              <div style={col}><L c="Temp. Stampo (°C)"/><FInp v={f.tempStampo} s={v=>set("tempStampo",v)} type="number"/></div>
              <div style={col}><L c="Nr. Cavità"/><FInp v={f.nrCavita} s={v=>set("nrCavita",v)} type="number"/></div>
              <div style={col}><L c="Tempo Ciclo (s)"/><FInp v={f.tempoCiclo} s={v=>set("tempoCiclo",v)} type="number"/></div>
            </div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:20,marginTop:14 }}>
              <Tog on={f.cameraCalda}       s={v=>set("cameraCalda",v)}       label="Camera Calda / Ugelli Caldi"/>
              <Tog on={f.braccioRobot}      s={v=>set("braccioRobot",v)}      label="Braccio Robot"/>
              <Tog on={f.recuperoMaterozza} s={v=>set("recuperoMaterozza",v)} label="Recupero Materozza"/>
            </div>
            <div style={{ marginTop:14, padding:"10px 14px", background:"#0d0d0d",
              border:`1px solid ${f.presenza?"#2e7d32":"#252525"}`, borderRadius:6 }}>
              <Tog on={f.presenza} s={v=>set("presenza",v)}
                label="Presenza operatore richiesta"
                sublabel={f.presenza
                  ? "Turno 8-12 / 14-18 (8h effettive)"
                  : "Ciclo automatico 8-18 (10h continuative)"}/>
            </div>
          </div>

          {/* MATERIALE */}
          <div style={{ marginBottom:16 }}>
            <div style={secT()}>◆ Materiale & Peso</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:12 }}>
              <div style={col}><L c="Materiale (database)"/>
                <select value={f.materialeCodice} onChange={e=>onMatChange(e.target.value)} style={inp}>
                  <option value="">— seleziona —</option>
                  {materiali.map(m=><option key={m.codice} value={m.codice}>{m.nome} — {m.codice}</option>)}
                </select>
              </div>
              <div style={col}><L c="Densità (g/cm³)"/><FInp v={f.densita} s={v=>set("densita",v)} type="number" step="0.01"/></div>
              <div style={{ flex:"1 1 100%",display:"flex",gap:12,flexWrap:"wrap" }}>
                <div style={col}>
                  <L c="⭐ Peso Stampata (g)"/>
                  <FInp v={f.pesoStampata} s={v=>set("pesoStampata",v)} type="number" step="0.1"
                    placeholder="es. 190" style={{ border:"1px solid #cc1f1f44",fontSize:15 }}/>
                  <div style={{ fontSize:10,color:"#444",marginTop:4 }}>
                    Vol. cav.: <span style={{ color:"#82c982" }}>{fmt(vol,3)} cm³</span>
                    &nbsp;·&nbsp; Dosaggio/cav: <span style={{ color:"#4caf50" }}>{fmt(dos,2)} g</span>
                  </div>
                </div>
              </div>
              <div style={col}><L c="Codice Master/Colorante"/><FInp v={f.master} s={v=>set("master",v)} placeholder="MB-XXX"/></div>
              <div style={col}><L c="Concentrazione (%)"/><FInp v={f.concentrazione} s={v=>set("concentrazione",v)} type="number" step="0.1"/></div>
            </div>
          </div>

          {/* ESSICCAZIONE */}
          <div style={{ marginBottom:16 }}>
            <div style={secT()}>◆ Essiccazione / Deumidificazione</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:12,alignItems:"flex-end" }}>
              <div style={col}><L c="Tipo Trattamento"/><FSel v={f.tipoEssic} s={v=>set("tipoEssic",v)} opts={TIPI_ESSIC}/></div>
              {f.tipoEssic!=="Nessuna"&&<>
                <div style={col}><L c="Temperatura (°C)"/><FInp v={f.tempEssic} s={v=>set("tempEssic",v)} type="number"/></div>
                <div style={col}><L c="Durata (ore)"/><FInp v={f.orarioEssic} s={v=>set("orarioEssic",v)} type="number"/></div>
              </>}
            </div>
          </div>

          {/* IMBALLO & PALLETTIZZAZIONE */}
          <div style={{ marginBottom:16 }}>
            <div style={secT("#4caf50")}>◆ Imballo & Pallettizzazione (facoltativo)</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:12 }}>
              <div style={{ flex:"1 1 100%" }}>
                <L c="Tipo / Descrizione Scatola"/>
                <FInp v={f.tipoScatola} s={v=>set("tipoScatola",v)} placeholder="es. Cartone 40x30x20, Blister 6x4, Sacchetto PE…"/>
              </div>
              <div style={col}><L c="Pezzi per Scatola"/><FInp v={f.pezziScatola} s={v=>set("pezziScatola",v)} type="number" placeholder="es. 50"/></div>
              <div style={col}><L c="Scatole per Bancale"/><FInp v={f.scatolePerBancale} s={v=>set("scatolePerBancale",v)} type="number" placeholder="es. 20"/></div>
            </div>
            {f.pezziScatola>0&&f.scatolePerBancale>0&&(
              <div style={{ marginTop:10,padding:10,background:"#0d0d0d",borderRadius:6,
                border:"1px solid #1e3a1e",fontSize:12,color:"#555" }}>
                Pezzi per bancale completo:{" "}
                <span style={{ color:"#4caf50",fontFamily:"'Courier New',monospace",fontWeight:700 }}>
                  {(parseFloat(f.pezziScatola)||0)*(parseFloat(f.scatolePerBancale)||0)} pz
                </span>
              </div>
            )}
          </div>

          {/* NOTE */}
          <div style={{ marginBottom:20 }}>
            <div style={secT()}>◆ Note & Qualità</div>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              <div><L c="Difetti Frequenti"/>
                <textarea value={f.difettiFrquenti} onChange={e=>set("difettiFrquenti",e.target.value)}
                  rows={2} style={{ ...inp,resize:"vertical" }}/>
              </div>
              <div><L c="Note Operatore"/>
                <textarea value={f.note} onChange={e=>set("note",e.target.value)}
                  rows={2} style={{ ...inp,resize:"vertical" }}/>
              </div>
            </div>
          </div>

          <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
            <button onClick={onClose} style={btnGh}>Annulla</button>
            <button onClick={()=>onSave(f)} style={btnR}><Ico.plus/> SALVA STAMPO</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE STAMPI
// ═══════════════════════════════════════════════════════════════════════════════
function DatabaseStampi({ stampi, materiali, onAdd, onEdit, onDelete }) {
  const [search, setSearch]           = useState("");
  const [filterCliente, setFCliente]  = useState("TUTTI");
  const [filterPressa,  setFPressa]   = useState("TUTTE");
  const [sel, setSel]                 = useState(null);
  const gM = cod => materiali.find(m=>m.codice===cod);

  const clientiList = useMemo(()=>["TUTTI",...new Set(stampi.map(s=>s.cliente).sort())],[stampi]);
  const presseList  = useMemo(()=>["TUTTE",...new Set(stampi.map(s=>s.pressa).sort())] ,[stampi]);

  const filtered = useMemo(()=>stampi.filter(s=>{
    const t=[s.codice,s.cliente,s.articolo,s.materialeCodice,s.pressa].join(" ").toLowerCase();
    return t.includes(search.toLowerCase())
      &&(filterCliente==="TUTTI"||s.cliente===filterCliente)
      &&(filterPressa==="TUTTE"||s.pressa===filterPressa);
  }),[stampi,search,filterCliente,filterPressa]);

  const selS = { background:"#0d0d0d",border:"1px solid #222",color:"#ccc",
    borderRadius:4,padding:"7px 10px",fontSize:12,outline:"none",cursor:"pointer" };

  return (
    <div>
      <div style={{ display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center" }}>
        <div style={{ flex:"1 1 200px",display:"flex",alignItems:"center",gap:8,
          background:"#111",border:"1px solid #1e1e1e",borderRadius:5,padding:"7px 12px" }}>
          <Ico.search/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Cerca codice, articolo..."
            style={{ background:"none",border:"none",color:"#eee",outline:"none",flex:1,fontSize:13 }}/>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
          <Ico.filter/>
          <select value={filterCliente} onChange={e=>setFCliente(e.target.value)} style={selS}>
            {clientiList.map(c=><option key={c} value={c}>{c==="TUTTI"?"Tutti i clienti":c}</option>)}
          </select>
        </div>
        <select value={filterPressa} onChange={e=>setFPressa(e.target.value)} style={selS}>
          {presseList.map(p=><option key={p} value={p}>{p==="TUTTE"?"Tutte le presse":p}</option>)}
        </select>
        <button onClick={()=>exportCSV(stampi,materiali)} style={btnG}><Ico.csv/> CSV</button>
        <button onClick={onAdd} style={btnR}><Ico.plus/> NUOVO STAMPO</button>
      </div>

      <div style={{ display:"flex",gap:10,marginBottom:16,alignItems:"center" }}>
        <div style={{ fontSize:12,color:"#444" }}>
          {filtered.length} stampi{filtered.length!==stampi.length?` (di ${stampi.length})`:""}
        </div>
        {(filterCliente!=="TUTTI"||filterPressa!=="TUTTE"||search)&&(
          <button onClick={()=>{setSearch("");setFCliente("TUTTI");setFPressa("TUTTE");}}
            style={{ fontSize:11,color:"#cc1f1f",background:"none",border:"1px solid #cc1f1f33",
              borderRadius:4,padding:"3px 10px",cursor:"pointer" }}>✕ reset filtri</button>
        )}
      </div>

      <div style={{ overflowX:"auto",borderRadius:8,border:"1px solid #1a1a1a" }}>
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
          <thead>
            <tr style={{ background:"#0d0d0d" }}>
              {["CODICE","CLIENTE","ARTICOLO","PRESSA","MAT.","CAV","DOS./CAV","TURNO","IMBALLO",""].map((h,i)=>(
                <th key={i} style={{ padding:"10px 13px",textAlign:"left",fontSize:10,color:"#3a3a3a",
                  textTransform:"uppercase",letterSpacing:2,borderBottom:"1px solid #181818",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s,i)=>{
              const m=gM(s.materialeCodice);
              const isS=sel===s.id;
              const dos=calcDos(s.pesoStampata,s.nrCavita);
              const pzBancale=s.pezziScatola&&s.scatolePerBancale?(s.pezziScatola*s.scatolePerBancale):null;
              return (
                <tr key={s.id} onClick={()=>setSel(isS?null:s.id)}
                  style={{ background:isS?"#1a0808":i%2===0?"#0f0f0f":"#111",cursor:"pointer" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#160606"}
                  onMouseLeave={e=>e.currentTarget.style.background=isS?"#1a0808":i%2===0?"#0f0f0f":"#111"}>
                  <td style={{ padding:"10px 13px",color:"#cc1f1f",fontFamily:"'Courier New',monospace",fontWeight:700 }}>{s.codice}</td>
                  <td style={{ padding:"10px 13px",color:"#ddd" }}>{s.cliente}</td>
                  <td style={{ padding:"10px 13px",color:"#bbb" }}>{s.articolo}</td>
                  <td style={{ padding:"10px 13px",color:"#555",fontSize:12 }}>{s.pressa}</td>
                  <td style={{ padding:"10px 13px" }}>
                    <span style={{ background:"#0d1a0d",border:"1px solid #1e3a1e",color:"#4caf50",
                      borderRadius:4,padding:"2px 8px",fontSize:11 }}>
                      {m?m.nome:s.materialeCodice||"—"}
                    </span>
                  </td>
                  <td style={{ padding:"10px 13px",color:"#666",textAlign:"center" }}>{s.nrCavita}</td>
                  <td style={{ padding:"10px 13px",fontFamily:"'Courier New',monospace",color:"#4caf50" }}>{fmt(dos)} g</td>
                  <td style={{ padding:"10px 13px" }}>
                    <span style={{ fontSize:11,
                      color:s.presenza?"#ffb74d":"#64b5f6",
                      background:"#111",borderRadius:4,padding:"2px 7px",border:"1px solid #222" }}>
                      {s.presenza?"👤 Op.":"⚙ Auto"}
                    </span>
                  </td>
                  <td style={{ padding:"10px 13px" }}>
                    {s.tipoScatola
                      ? <span style={{ fontSize:11,color:"#888" }}>
                          {s.pezziScatola}pz/{s.tipoScatola.length>12?s.tipoScatola.slice(0,12)+"…":s.tipoScatola}
                          {pzBancale&&<span style={{ color:"#4caf50",marginLeft:4 }}>·{pzBancale}pz/pal</span>}
                        </span>
                      : <span style={{ color:"#2a2a2a",fontSize:11 }}>—</span>
                    }
                  </td>
                  <td style={{ padding:"10px 13px" }}>
                    <div style={{ display:"flex",gap:6 }}>
                      <button onClick={e=>{e.stopPropagation();onEdit(s);}}
                        style={{ background:"#1a1a1a",border:"1px solid #252525",color:"#666",borderRadius:4,padding:"5px 7px",cursor:"pointer" }}>
                        <Ico.edit/>
                      </button>
                      <button onClick={e=>{e.stopPropagation();onDelete(s.id);}}
                        style={{ background:"#1a0808",border:"1px solid #350d0d",color:"#cc1f1f",borderRadius:4,padding:"5px 7px",cursor:"pointer" }}>
                        <Ico.del/>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length===0&&<div style={{ padding:40,textAlign:"center",color:"#2a2a2a" }}>Nessuno stampo trovato</div>}
      </div>

      {/* DETAIL PANEL */}
      {sel&&(()=>{
        const s=stampi.find(x=>x.id===sel); if(!s) return null;
        const m=gM(s.materialeCodice);
        const vol=calcVol(s.pesoStampata,s.nrCavita,s.densita);
        const dos=calcDos(s.pesoStampata,s.nrCavita);
        const pzBancale=s.pezziScatola&&s.scatolePerBancale?s.pezziScatola*s.scatolePerBancale:null;
        return (
          <div style={{ marginTop:14,background:"#111",border:"1px solid #1a1a1a",borderRadius:8,padding:18 }}>
            <div style={secT()}>◆ DETTAGLIO — {s.codice} / {s.articolo}</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:18 }}>
              {[["Materiale",m?m.nome:s.materialeCodice],["Cod. Art.",s.codiceArticolo||"—"],
                ["T. Stampo",`${s.tempStampo}°C`],["Peso Stamp.",`${s.pesoStampata} g`],
                ["Vol. Cav.",`${fmt(vol,3)} cm³`],["Dos./cav",`${fmt(dos,2)} g`],
                ["Nr. Cavità",s.nrCavita],["Ciclo",`${s.tempoCiclo}s`],
                ["Master",s.master||"—"],["Conc.",`${s.concentrazione}%`],
                ["Turno",s.presenza?"Operatore (8h)":"Automatico (10h)"],
                [s.tipoEssic,s.tipoEssic!=="Nessuna"?`${s.tempEssic}°C/${s.orarioEssic}h`:"—"],
              ].map(([k,v])=>(
                <div key={k} style={{ flex:"1 1 140px" }}>
                  <div style={{ fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:2 }}>{k}</div>
                  <div style={{ fontSize:13,color:"#ccc",marginTop:3 }}>{v}</div>
                </div>
              ))}
            </div>
            {s.tipoScatola&&(
              <div style={{ marginTop:12,padding:10,background:"#0d140d",borderLeft:"3px solid #2e7d32",
                borderRadius:4,fontSize:13,color:"#bbb" }}>
                <div style={{ fontSize:9,color:"#4caf50",textTransform:"uppercase",letterSpacing:2,marginBottom:6 }}>📦 Imballo</div>
                <div style={{ display:"flex",gap:24,flexWrap:"wrap" }}>
                  <span>Scatola: <strong>{s.tipoScatola}</strong></span>
                  <span>Pezzi/scatola: <strong style={{ color:"#4caf50" }}>{s.pezziScatola}</strong></span>
                  <span>Scatole/bancale: <strong style={{ color:"#4caf50" }}>{s.scatolePerBancale}</strong></span>
                  {pzBancale&&<span>Pezzi/bancale: <strong style={{ color:"#4caf50" }}>{pzBancale}</strong></span>}
                </div>
              </div>
            )}
            {s.difettiFrquenti&&(
              <div style={{ marginTop:8,padding:10,background:"#1a0808",borderLeft:"3px solid #cc1f1f",
                borderRadius:4,fontSize:13,color:"#bbb" }}>
                <div style={{ fontSize:9,color:"#cc1f1f",textTransform:"uppercase",letterSpacing:2,marginBottom:3 }}>⚠ Difetti Frequenti</div>
                {s.difettiFrquenti}
              </div>
            )}
            {s.note&&(
              <div style={{ marginTop:8,padding:10,background:"#0d0d0d",borderLeft:"3px solid #444",
                borderRadius:4,fontSize:13,color:"#bbb" }}>
                <div style={{ fontSize:9,color:"#666",textTransform:"uppercase",letterSpacing:2,marginBottom:3 }}>📝 Note</div>
                {s.note}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE MATERIALI
// ═══════════════════════════════════════════════════════════════════════════════
const emptyMat={id:null,codice:"",nome:"",colore:"Naturale",densita:1.00,tipoEssic:"Nessuna",tempEssic:80,oreEssic:4,note:""};

function MatModal({mat,onSave,onClose}){
  const [f,setF]=useState(()=>mat?{...mat}:{...emptyMat});
  const set=useCallback((k,v)=>setF(p=>({...p,[k]:v})),[]);
  const L=({c})=><label style={lbl}>{c}</label>;
  return(
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"#141414",border:"1px solid #2e7d32",borderRadius:8,
        width:"100%",maxWidth:560,boxShadow:"0 0 40px rgba(46,125,50,.2)" }}>
        <div style={{ background:"linear-gradient(90deg,#1b5e20,#2e7d32)",padding:"13px 20px",
          display:"flex",justifyContent:"space-between",alignItems:"center",borderRadius:"7px 7px 0 0" }}>
          <span style={{ fontFamily:"'Courier New',monospace",fontWeight:700,fontSize:14,color:"#fff",letterSpacing:2 }}>
            {f.id?`✏ MODIFICA — ${f.nome}`:"＋ NUOVO MATERIALE"}
          </span>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#fff",cursor:"pointer" }}><Ico.x/></button>
        </div>
        <div style={{ padding:20,display:"flex",flexDirection:"column",gap:14 }}>
          <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
            <div style={{ flex:"1 1 44%" }}><L c="Codice *"/><FInp v={f.codice} s={v=>set("codice",v)} placeholder="ABS-BLK-01"/></div>
            <div style={{ flex:"1 1 44%" }}><L c="Nome *"/><FInp v={f.nome} s={v=>set("nome",v)} placeholder="ABS"/></div>
            <div style={{ flex:"1 1 44%" }}><L c="Colore/Variante"/><FInp v={f.colore} s={v=>set("colore",v)}/></div>
            <div style={{ flex:"1 1 44%" }}><L c="Densità (g/cm³)"/><FInp v={f.densita} s={v=>set("densita",v)} type="number" step="0.01"/></div>
          </div>
          <div style={secT("#4caf50")}>◆ Trattamento</div>
          <div style={{ display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end" }}>
            <div style={{ flex:"1 1 44%" }}><L c="Tipo"/><FSel v={f.tipoEssic} s={v=>set("tipoEssic",v)} opts={TIPI_ESSIC}/></div>
            {f.tipoEssic!=="Nessuna"&&<>
              <div style={{ flex:"1 1 44%" }}><L c="Temperatura °C"/><FInp v={f.tempEssic} s={v=>set("tempEssic",v)} type="number"/></div>
              <div style={{ flex:"1 1 44%" }}><L c="Ore"/><FInp v={f.oreEssic} s={v=>set("oreEssic",v)} type="number"/></div>
            </>}
          </div>
          <div><L c="Note"/><textarea value={f.note} onChange={e=>set("note",e.target.value)} rows={2}
            style={{ ...inp,resize:"vertical" }}/></div>
          <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:4 }}>
            <button onClick={onClose} style={btnGh}>Annulla</button>
            <button onClick={()=>onSave(f)} style={{ ...btnR,background:"linear-gradient(135deg,#2e7d32,#1b5e20)" }}>
              <Ico.plus/> SALVA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DatabaseMateriali({materiali,onSaveMat,onDeleteMat}){
  const [modal,setModal]=useState(null);
  return(
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <div style={{ fontSize:12,color:"#444" }}>{materiali.length} materiali registrati</div>
        <button onClick={()=>setModal({mat:null})}
          style={{ ...btnR,background:"linear-gradient(135deg,#2e7d32,#1b5e20)" }}>
          <Ico.plus/> NUOVO MATERIALE
        </button>
      </div>
      <div style={{ overflowX:"auto",borderRadius:8,border:"1px solid #1a1a1a" }}>
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
          <thead>
            <tr style={{ background:"#0d0d0d" }}>
              {["CODICE","NOME","COLORE","DENSITÀ","TRATTAMENTO","TEMP.","ORE","NOTE",""].map((h,i)=>(
                <th key={i} style={{ padding:"10px 13px",textAlign:"left",fontSize:10,color:"#3a3a3a",
                  textTransform:"uppercase",letterSpacing:2,borderBottom:"1px solid #181818" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {materiali.map((m,i)=>(
              <tr key={m.id} style={{ background:i%2===0?"#0f0f0f":"#111" }}
                onMouseEnter={e=>e.currentTarget.style.background="#131313"}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#0f0f0f":"#111"}>
                <td style={{ padding:"10px 13px",color:"#4caf50",fontFamily:"'Courier New',monospace",fontWeight:700 }}>{m.codice}</td>
                <td style={{ padding:"10px 13px",color:"#ddd",fontWeight:600 }}>{m.nome}</td>
                <td style={{ padding:"10px 13px",color:"#777" }}>{m.colore}</td>
                <td style={{ padding:"10px 13px",fontFamily:"'Courier New',monospace",color:"#ccc" }}>{m.densita}</td>
                <td style={{ padding:"10px 13px" }}>
                  {m.tipoEssic==="Nessuna"?<span style={{ color:"#2a2a2a" }}>—</span>
                    :<span style={{ fontSize:11,color:m.tipoEssic==="Deumidificazione"?"#64b5f6":"#ffb74d" }}>
                      {m.tipoEssic==="Deumidificazione"?"🌿 Deumidificazione":"🔥 Essiccazione"}
                    </span>}
                </td>
                <td style={{ padding:"10px 13px",color:"#666" }}>{m.tipoEssic!=="Nessuna"?`${m.tempEssic}°C`:"—"}</td>
                <td style={{ padding:"10px 13px",color:"#666" }}>{m.tipoEssic!=="Nessuna"?`${m.oreEssic}h`:"—"}</td>
                <td style={{ padding:"10px 13px",color:"#444",fontSize:12 }}>{m.note||"—"}</td>
                <td style={{ padding:"10px 13px" }}>
                  <div style={{ display:"flex",gap:6 }}>
                    <button onClick={()=>setModal({mat:m})}
                      style={{ background:"#1a1a1a",border:"1px solid #252525",color:"#666",borderRadius:4,padding:"5px 7px",cursor:"pointer" }}>
                      <Ico.edit/>
                    </button>
                    <button onClick={()=>onDeleteMat(m.id)}
                      style={{ background:"#1a0808",border:"1px solid #350d0d",color:"#cc1f1f",borderRadius:4,padding:"5px 7px",cursor:"pointer" }}>
                      <Ico.del/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal&&<MatModal mat={modal.mat} onSave={f=>{onSaveMat(f);setModal(null);}} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL MESCOLA
// ═══════════════════════════════════════════════════════════════════════════════
function ToolMescola({materiali}){
  const [matCod,setMatCod]=useState("");
  const [kgV,setKgV]=useState("100");
  const [mPerc,setMPerc]=useState("2");
  const [macKg,setMacKg]=useState("0");
  const [cKg,setCKg]=useState("100");
  const [cP,setCP]=useState("2");
  const [c2Kg,setC2Kg]=useState("2");
  const [c2P,setC2P]=useState("2");

  const matSel=materiali.find(m=>m.codice===matCod);
  const vKg=parseFloat(kgV)||0;
  const mKg=parseFloat(macKg)||0;
  const mp=parseFloat(mPerc)||0;
  const masterKg=vKg*(mp/100);
  const totM=vKg+masterKg+mKg;
  const sV=sacchi25(vKg);
  const colGr=(parseFloat(cKg)||0)*(parseFloat(cP)||0)/100*1000;
  const matDaC=(parseFloat(c2P)||0)>0?(parseFloat(c2Kg)||0)/((parseFloat(c2P)||0)/100):0;
  const nI={...inp,textAlign:"right",fontFamily:"'Courier New',monospace",fontSize:15,padding:"9px 12px"};

  return(
    <div style={{ display:"flex",flexDirection:"column",gap:18 }}>
      <div style={card("#1e1e1e")}>
        <div style={secT()}>⚗ RICETTA MESCOLA</div>
        <div style={{ display:"flex",gap:18,flexWrap:"wrap" }}>
          <div style={{ flex:"1 1 260px",display:"flex",flexDirection:"column",gap:14 }}>
            <div>
              <label style={lbl}>Materiale Base</label>
              <select value={matCod} onChange={e=>setMatCod(e.target.value)} style={inp}>
                <option value="">— seleziona dal database —</option>
                {materiali.map(m=><option key={m.codice} value={m.codice}>{m.nome} — {m.codice}</option>)}
              </select>
              {matSel&&<div style={{ marginTop:5,fontSize:11,color:"#555" }}>
                ρ <span style={{ color:"#4caf50" }}>{matSel.densita} g/cm³</span>
                {matSel.tipoEssic!=="Nessuna"&&<span style={{ marginLeft:10,color:"#64b5f6" }}>{matSel.tipoEssic}: {matSel.tempEssic}°C/{matSel.oreEssic}h</span>}
              </div>}
            </div>
            <div>
              <label style={lbl}>Materiale Vergine (kg) — sacchi 25 kg</label>
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                <input type="number" value={kgV} onChange={e=>setKgV(e.target.value)} style={{ ...nI,flex:1 }}/>
                <div style={{ background:"#0d1a0d",border:"1px solid #1e3a1e",borderRadius:6,
                  padding:"7px 12px",minWidth:72,textAlign:"center",flexShrink:0 }}>
                  <div style={{ fontSize:9,color:"#4caf50",letterSpacing:1 }}>SACCHI</div>
                  <div style={{ fontSize:20,fontWeight:700,color:"#4caf50",fontFamily:"'Courier New',monospace" }}>{sV}</div>
                  <div style={{ fontSize:9,color:"#2e7d32" }}>× 25 kg</div>
                </div>
              </div>
            </div>
            <div>
              <label style={lbl}>% Master / Colorante granulo</label>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <input type="range" min={0} max={10} step={0.1} value={mPerc} onChange={e=>setMPerc(e.target.value)} style={{ flex:1,accentColor:"#cc1f1f" }}/>
                <input type="number" value={mPerc} onChange={e=>setMPerc(e.target.value)} step="0.1" style={{ ...nI,width:66 }}/>
                <span style={{ fontSize:12,color:"#555" }}>%</span>
              </div>
            </div>
            <div>
              <label style={lbl}>Macinato aggiuntivo (kg)</label>
              <input type="number" value={macKg} onChange={e=>setMacKg(e.target.value)} style={nI}/>
            </div>
          </div>
          <div style={{ flex:"1 1 220px",background:"#0d0d0d",borderRadius:8,border:"1px solid #1a1a1a",padding:18 }}>
            <div style={{ fontSize:10,color:"#cc1f1f",textTransform:"uppercase",letterSpacing:3,marginBottom:12 }}>▸ Composizione</div>
            <RRow label="Materiale vergine"         val={fmt(vKg)}    unit="kg"/>
            <RRow label={`Master (${mp}%)`}         val={fmt(masterKg)} unit="kg" color="#cc1f1f"/>
            <RRow label="Macinato aggiuntivo"       val={fmt(mKg)}    unit="kg" color="#4caf50"/>
            <RRow label="TOTALE MESCOLA"            val={fmt(totM)}   unit="kg" color="#fff" big/>
            <div style={{ marginTop:12 }}>
              <div style={{ height:12,borderRadius:4,overflow:"hidden",display:"flex" }}>
                <div style={{ flex:Math.max(vKg,0.01),background:"#2a2a2a" }}/>
                <div style={{ flex:Math.max(masterKg,0),background:"#cc1f1f" }}/>
                <div style={{ flex:Math.max(mKg,0),background:"#2e7d32" }}/>
              </div>
              <div style={{ display:"flex",gap:12,marginTop:5 }}>
                {[["Vergine","#3a3a3a"],["Master","#cc1f1f"],["Macinato","#2e7d32"]].map(([l,c])=>(
                  <div key={l} style={{ display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#555" }}>
                    <div style={{ width:8,height:8,borderRadius:2,background:c }}/>{l}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop:12,padding:10,background:"#111",borderRadius:6,border:"1px solid #1a1a1a" }}>
              <div style={{ fontSize:9,color:"#4caf50",textTransform:"uppercase",letterSpacing:2,marginBottom:6 }}>📦 Sacchi vergine</div>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:13 }}>
                <span style={{ color:"#666" }}>Vergine (25 kg)</span>
                <span style={{ fontFamily:"'Courier New',monospace",color:"#ddd" }}>{sV} sacchi</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display:"flex",gap:16,flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 260px",...card("#cc1f1f33") }}>
          <div style={secT()}>🎨 COLORANTE da materiale</div>
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            <div><label style={lbl}>Materiale da colorare (kg)</label>
              <input type="number" value={cKg} onChange={e=>setCKg(e.target.value)} style={nI}/>
            </div>
            <div><label style={lbl}>% Colorante</label>
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                <input type="range" min={0.1} max={10} step={0.1} value={cP} onChange={e=>setCP(e.target.value)} style={{ flex:1,accentColor:"#cc1f1f" }}/>
                <input type="number" value={cP} onChange={e=>setCP(e.target.value)} step="0.1" style={{ ...nI,width:66 }}/>
                <span style={{ fontSize:12,color:"#555" }}>%</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop:16,background:"#0d0d0d",borderRadius:8,padding:14,border:"1px solid #1a1a1a",textAlign:"center" }}>
            <div style={{ fontSize:10,color:"#555",textTransform:"uppercase",letterSpacing:2 }}>Colorante necessario</div>
            <div style={{ fontSize:36,fontWeight:800,color:"#cc1f1f",fontFamily:"'Courier New',monospace",margin:"6px 0" }}>
              {colGr<1000?<>{fmt(colGr,1)}<span style={{ fontSize:15 }}> g</span></>
               :<>{fmt(colGr/1000,3)}<span style={{ fontSize:15 }}> kg</span></>}
            </div>
            <div style={{ fontSize:11,color:"#555" }}>{cKg} kg × {cP}% = {fmt(colGr,1)} g</div>
          </div>
        </div>
        <div style={{ flex:"1 1 260px",...card("#2e7d3233") }}>
          <div style={secT("#4caf50")}>📦 MATERIALE da colorante</div>
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            <div><label style={lbl}>Colorante disponibile (kg)</label>
              <input type="number" value={c2Kg} onChange={e=>setC2Kg(e.target.value)} style={nI}/>
            </div>
            <div><label style={lbl}>% da usare</label>
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                <input type="range" min={0.1} max={10} step={0.1} value={c2P} onChange={e=>setC2P(e.target.value)} style={{ flex:1,accentColor:"#2e7d32" }}/>
                <input type="number" value={c2P} onChange={e=>setC2P(e.target.value)} step="0.1" style={{ ...nI,width:66 }}/>
                <span style={{ fontSize:12,color:"#555" }}>%</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop:16,background:"#0d0d0d",borderRadius:8,padding:14,border:"1px solid #1a1a1a",textAlign:"center" }}>
            <div style={{ fontSize:10,color:"#555",textTransform:"uppercase",letterSpacing:2 }}>Materiale producibile</div>
            <div style={{ fontSize:36,fontWeight:800,color:"#4caf50",fontFamily:"'Courier New',monospace",margin:"6px 0" }}>
              {matDaC>0?<>{fmt(matDaC,matDaC>=100?1:2)}<span style={{ fontSize:15 }}> kg</span></> :<span style={{ fontSize:16,color:"#333" }}>—</span>}
            </div>
            <div style={{ fontSize:11,color:"#555" }}>{c2Kg} kg ÷ {c2P}% = {matDaC>0?fmt(matDaC,2):"—"} kg</div>
            {matDaC>0&&<div style={{ marginTop:6,fontSize:12,color:"#2e7d32" }}>≈ {sacchi25(matDaC)} sacchi da 25 kg</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUZIONE — tempi + scatole/bancali
// ═══════════════════════════════════════════════════════════════════════════════
function ToolProduzione({ stampi }) {
  const [stampoSel, setStampoSel] = useState("");
  const [quantita,  setQuantita]  = useState("1000");
  // override manuali
  const [ciclOvr,   setCiclOvr]   = useState("");
  const [nrCavOvr,  setNrCavOvr]  = useState("");
  // imballo
  const [pzScOvr,   setPzScOvr]   = useState("");
  const [scBancOvr, setScBancOvr] = useState("");

  const s = stampi.find(x=>x.id===parseInt(stampoSel));

  const ciclo  = parseFloat(ciclOvr)  || (s?.tempoCiclo)||0;
  const nrCav  = parseFloat(nrCavOvr) || (s?.nrCavita) ||1;
  const pzSc   = parseFloat(pzScOvr)  || (s?.pezziScatola)||0;
  const scBanc = parseFloat(scBancOvr)|| (s?.scatolePerBancale)||0;
  const qty    = parseFloat(quantita)||0;
  const presenza = s?.presenza||false;

  const turnoMin = presenza ? TURNO_OPERATORE : TURNO_CONTINUO;
  const turnoLabel = presenza ? "Operatore 8-12 / 14-18 (8h)" : "Automatico 8-18 (10h)";

  const res = calcolaTempi(qty, nrCav, ciclo, turnoMin);
  const resCont = calcolaTempi(qty, nrCav, ciclo, TURNO_CONTINUO);
  const resOp   = calcolaTempi(qty, nrCav, ciclo, TURNO_OPERATORE);

  // imballo
  const pzBancale  = pzSc>0&&scBanc>0 ? pzSc*scBanc : 0;
  const scatoleNec = pzSc>0&&qty>0     ? Math.ceil(qty/pzSc) : 0;
  const bancaliNec = pzBancale>0&&qty>0 ? Math.ceil(qty/pzBancale) : 0;
  const pzRimanenti = scatoleNec>0 ? (scatoleNec*pzSc)-qty : 0;

  const nI = {...inp,textAlign:"right",fontFamily:"'Courier New',monospace",fontSize:15,padding:"9px 12px"};
  const selS = {...inp,fontSize:13};

  // Render turno card
  const TurnoCard = ({label, icon, color, r, min, highlight}) => {
    if(!r) return null;
    const pzOra = Math.round(r.pzPerMin*60);
    return (
      <div style={{ flex:"1 1 220px", background: highlight?"#0d1a0d":"#0d0d0d",
        border:`1px solid ${highlight?color+"55":"#1a1a1a"}`,
        borderRadius:8, padding:18 }}>
        <div style={{ fontSize:10, color, textTransform:"uppercase", letterSpacing:3, marginBottom:12 }}>
          {icon} {label}
        </div>
        <div style={{ fontSize:9, color:"#444", marginBottom:8 }}>{min} min/turno</div>
        <RRow label="Pezzi/ora" val={pzOra} unit="pz/h" color="#ccc"/>
        <RRow label="Pezzi/turno" val={r.pzPerTurno} unit="pz"/>
        <RRow label="Turni necessari" val={r.turniInteri} unit="turni" color={color} big/>
        <RRow label="Tempo totale" val={fmtDurata(r.minTotali)} unit="" color="#ddd"/>
        <div style={{ marginTop:12, padding:10, background:"#111", borderRadius:6, border:"1px solid #1a1a1a" }}>
          <div style={{ fontSize:9, color:"#444", textTransform:"uppercase", letterSpacing:2, marginBottom:6 }}>Giorni lavorativi</div>
          <div style={{ fontFamily:"'Courier New',monospace", fontSize:18, fontWeight:700, color }}>
            {r.turniInteri} <span style={{ fontSize:11, color:"#555", fontWeight:400 }}>
              giorn{r.turniInteri===1?"o":"i"}
            </span>
          </div>
          <div style={{ fontSize:10, color:"#555", marginTop:4 }}>1 turno = 1 giorno lavorativo</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* SELEZIONE STAMPO */}
      <div style={card("#1e1e1e")}>
        <div style={secT()}>⏱ CALCOLO TEMPI DI PRODUZIONE</div>
        <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:20 }}>
          <div style={{ flex:"2 1 260px" }}>
            <label style={lbl}>Seleziona stampo (opzionale — o inserisci manuale)</label>
            <select value={stampoSel} onChange={e=>setStampoSel(e.target.value)} style={selS}>
              <option value="">— inserimento manuale —</option>
              {stampi.map(s=><option key={s.id} value={s.id}>
                {s.codice} · {s.articolo} ({s.cliente})
              </option>)}
            </select>
            {s&&(
              <div style={{ marginTop:6, fontSize:11, color:"#555", display:"flex", gap:16, flexWrap:"wrap" }}>
                <span>Ciclo: <span style={{ color:"#cc1f1f" }}>{s.tempoCiclo}s</span></span>
                <span>Cavità: <span style={{ color:"#4caf50" }}>{s.nrCavita}</span></span>
                <span>Turno: <span style={{ color:s.presenza?"#ffb74d":"#64b5f6" }}>{s.presenza?"Operatore":"Automatico"}</span></span>
                {s.tipoScatola&&<span>Scatola: <span style={{ color:"#4caf50" }}>{s.pezziScatola}pz</span></span>}
              </div>
            )}
          </div>
          <div style={{ flex:"1 1 120px" }}>
            <label style={lbl}>Quantità da produrre (pz)</label>
            <input type="number" value={quantita} onChange={e=>setQuantita(e.target.value)} style={nI}/>
          </div>
        </div>

        {/* override manuali */}
        <div style={{ background:"#0d0d0d",border:"1px solid #1e1e1e",borderRadius:6,padding:14,marginBottom:20 }}>
          <div style={{ fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:3,marginBottom:12 }}>
            ✏ Override manuale (lascia vuoto per usare dati stampo)
          </div>
          <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
            <div style={{ flex:"1 1 140px" }}>
              <label style={lbl}>Ciclo (s)</label>
              <input type="number" value={ciclOvr} onChange={e=>setCiclOvr(e.target.value)}
                placeholder={s?`${s.tempoCiclo}`:"es. 30"} style={{ ...nI,fontSize:13 }}/>
            </div>
            <div style={{ flex:"1 1 140px" }}>
              <label style={lbl}>Nr. Cavità</label>
              <input type="number" value={nrCavOvr} onChange={e=>setNrCavOvr(e.target.value)}
                placeholder={s?`${s.nrCavita}`:"es. 4"} style={{ ...nI,fontSize:13 }}/>
            </div>
          </div>
          {(ciclo>0&&nrCav>0)&&(
            <div style={{ marginTop:10,fontSize:12,color:"#555" }}>
              Produzione: <span style={{ color:"#4caf50",fontFamily:"'Courier New',monospace" }}>
                {Math.round(pezziPerMin(ciclo,nrCav)*60)} pz/h
              </span>
              &nbsp;·&nbsp;
              <span style={{ color:"#4caf50",fontFamily:"'Courier New',monospace" }}>
                {Math.round(pezziPerMin(ciclo,nrCav)*60*nrCav/nrCav)} pz/h totali
              </span>
            </div>
          )}
        </div>

        {/* CONFRONTO TURNI */}
        {resCont&&resOp&&(
          <div>
            <div style={{ fontSize:10,color:"#555",textTransform:"uppercase",letterSpacing:3,
              borderBottom:"1px solid #1e1e1e",paddingBottom:6,marginBottom:14 }}>
              ▸ Confronto turni — {qty.toLocaleString()} pezzi
            </div>
            <div style={{ display:"flex",gap:14,flexWrap:"wrap",marginBottom:16 }}>
              <TurnoCard
                label="Automatico 8-18" icon="⚙" color="#64b5f6"
                r={resCont} min={TURNO_CONTINUO}
                highlight={!presenza}/>
              <TurnoCard
                label="Con operatore 8-12/14-18" icon="👤" color="#ffb74d"
                r={resOp} min={TURNO_OPERATORE}
                highlight={presenza}/>
            </div>
            {/* banner riepilogo */}
            <div style={{ padding:14,background:"#111",borderRadius:8,border:"1px solid #1e1e1e",
              display:"flex",gap:24,flexWrap:"wrap",alignItems:"center" }}>
              <div>
                <div style={{ fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:2 }}>
                  Turno attivo per questo stampo
                </div>
                <div style={{ fontSize:14,fontWeight:700,color:presenza?"#ffb74d":"#64b5f6",marginTop:3 }}>
                  {presenza?"👤 Operatore":"⚙ Automatico"} — {turnoLabel}
                </div>
              </div>
              {res&&<div>
                <div style={{ fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:2 }}>Turni necessari</div>
                <div style={{ fontSize:28,fontWeight:800,color:presenza?"#ffb74d":"#64b5f6",
                  fontFamily:"'Courier New',monospace" }}>{res.turniInteri}</div>
              </div>}
              <div style={{ marginLeft:"auto",fontSize:12,color:"#555" }}>
                Differenza: {resOp&&resCont?
                  <span style={{ color:"#ccc" }}>{resOp.turniInteri-resCont.turniInteri} turni aggiuntivi con operatore</span>
                  :"—"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* IMBALLO */}
      <div style={card("#2e7d3233")}>
        <div style={secT("#4caf50")}>📦 CALCOLO SCATOLE & BANCALI</div>
        <div style={{ display:"flex",gap:14,flexWrap:"wrap",marginBottom:20 }}>
          <div style={{ flex:"2 1 260px" }}>
            <label style={lbl}>Usa dati stampo o inserisci manuale</label>
            {s&&s.tipoScatola&&(
              <div style={{ marginBottom:8,padding:8,background:"#0d1a0d",border:"1px solid #1e3a1e",
                borderRadius:5,fontSize:12,color:"#4caf50" }}>
                📦 {s.tipoScatola} · {s.pezziScatola}pz/sc · {s.scatolePerBancale}sc/pal
              </div>
            )}
          </div>
        </div>
        <div style={{ display:"flex",gap:14,flexWrap:"wrap",marginBottom:16 }}>
          <div style={{ flex:"1 1 140px" }}>
            <label style={lbl}>Quantità pezzi</label>
            <input type="number" value={quantita} onChange={e=>setQuantita(e.target.value)} style={nI}/>
          </div>
          <div style={{ flex:"1 1 140px" }}>
            <label style={lbl}>Pezzi per scatola</label>
            <input type="number" value={pzScOvr} onChange={e=>setPzScOvr(e.target.value)}
              placeholder={s?.pezziScatola||"es. 50"} style={{ ...nI,fontSize:13 }}/>
          </div>
          <div style={{ flex:"1 1 140px" }}>
            <label style={lbl}>Scatole per bancale</label>
            <input type="number" value={scBancOvr} onChange={e=>setScBancOvr(e.target.value)}
              placeholder={s?.scatolePerBancale||"es. 20"} style={{ ...nI,fontSize:13 }}/>
          </div>
        </div>

        {(pzSc>0&&qty>0) ? (
          <div style={{ display:"flex",gap:14,flexWrap:"wrap" }}>
            {/* scatole */}
            <div style={{ flex:"1 1 160px",background:"#0d0d0d",border:"1px solid #1a1a1a",
              borderRadius:8,padding:16,textAlign:"center" }}>
              <div style={{ fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:2,marginBottom:8 }}>
                📦 Scatole necessarie
              </div>
              <div style={{ fontSize:42,fontWeight:800,color:"#4caf50",
                fontFamily:"'Courier New',monospace",lineHeight:1 }}>{scatoleNec}</div>
              <div style={{ fontSize:12,color:"#555",marginTop:4 }}>
                {qty.toLocaleString()} ÷ {pzSc} pz/sc
              </div>
              {pzRimanenti>0&&(
                <div style={{ marginTop:8,fontSize:11,color:"#ffb74d",
                  background:"#1a1500",borderRadius:4,padding:"4px 8px" }}>
                  ultima scatola: {pzSc-pzRimanenti} pz vuota
                </div>
              )}
            </div>
            {/* bancali */}
            {scBanc>0&&(
              <div style={{ flex:"1 1 160px",background:"#0d0d0d",border:"1px solid #1a1a1a",
                borderRadius:8,padding:16,textAlign:"center" }}>
                <div style={{ fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:2,marginBottom:8 }}>
                  🪵 Bancali necessari
                </div>
                <div style={{ fontSize:42,fontWeight:800,color:"#82c982",
                  fontFamily:"'Courier New',monospace",lineHeight:1 }}>{bancaliNec}</div>
                <div style={{ fontSize:12,color:"#555",marginTop:4 }}>
                  {scatoleNec} sc ÷ {scBanc} sc/pal
                </div>
                <div style={{ marginTop:8,fontSize:11,color:"#555" }}>
                  {pzBancale.toLocaleString()} pz/bancale completo
                </div>
              </div>
            )}
            {/* riepilogo */}
            <div style={{ flex:"2 1 200px",background:"#0d0d0d",border:"1px solid #1a1a1a",
              borderRadius:8,padding:16 }}>
              <div style={{ fontSize:10,color:"#4caf50",textTransform:"uppercase",letterSpacing:3,marginBottom:12 }}>
                ▸ Riepilogo imballo
              </div>
              <RRow label="Pezzi da imballare"    val={qty.toLocaleString()}    unit="pz"/>
              <RRow label="Pezzi per scatola"     val={pzSc}                    unit="pz/sc"/>
              {scBanc>0&&<RRow label="Scatole per bancale" val={scBanc}         unit="sc/pal"/>}
              {pzBancale>0&&<RRow label="Pezzi per bancale"  val={pzBancale.toLocaleString()} unit="pz/pal" color="#82c982"/>}
              <RRow label="Scatole totali"        val={scatoleNec}              unit="sc"  color="#4caf50" big/>
              {bancaliNec>0&&<RRow label="Bancali totali" val={bancaliNec}     unit="pal" color="#82c982" big/>}
            </div>
          </div>
        ) : (
          <div style={{ padding:24,textAlign:"center",color:"#333",fontSize:13 }}>
            Inserisci quantità pezzi e pezzi per scatola per calcolare
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP ROOT — con Supabase
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab,       setTab]       = useState("db");
  const [stampi,    setStampi]    = useState([]);
  const [materiali, setMateriali] = useState([]);
  const [modal,     setModal]     = useState(null);
  const [delConf,   setDelConf]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [dbError,   setDbError]   = useState(null);
  const [saving,    setSaving]    = useState(false);

  // ── Caricamento iniziale da Supabase ────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true);
        setDbError(null);
        const [mat, stp] = await Promise.all([fetchMateriali(), fetchStampi()]);
        // Se il DB è vuoto al primo avvio, inserisce i dati seed
        if (mat.length === 0) {
          for (const m of SEED_MATERIALI) {
            const { id, ...rest } = m;
            await upsertMateriale(rest);
          }
          const freshMat = await fetchMateriali();
          setMateriali(freshMat);
        } else {
          setMateriali(mat);
        }
        setStampi(stp);
      } catch (err) {
        setDbError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  // ── Salvataggio stampo ──────────────────────────────────────────────────────
  const saveStampo = useCallback(async f => {
    try {
      setSaving(true);
      const { id, ...rest } = f;
      const saved = await upsertStampo(id ? f : rest);
      setStampi(p => id ? p.map(x => x.id === id ? saved : x) : [...p, saved]);
      setModal(null);
    } catch (err) {
      alert("Errore salvataggio stampo: " + err.message);
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Salvataggio materiale ───────────────────────────────────────────────────
  const saveMat = useCallback(async f => {
    try {
      setSaving(true);
      const { id, ...rest } = f;
      const saved = await upsertMateriale(id ? f : rest);
      setMateriali(p => id ? p.map(x => x.id === id ? saved : x) : [...p, saved]);
    } catch (err) {
      alert("Errore salvataggio materiale: " + err.message);
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Eliminazione materiale ──────────────────────────────────────────────────
  const delMat = useCallback(async id => {
    if (!window.confirm("Eliminare questo materiale?")) return;
    try {
      await deleteMateriale(id);
      setMateriali(p => p.filter(x => x.id !== id));
    } catch (err) {
      alert("Errore eliminazione: " + err.message);
    }
  }, []);

  const TABS=[
    {id:"db",      label:"STAMPI",       icon:<Ico.db/>},
    {id:"mat",     label:"MATERIALI",    icon:<Ico.mat/>},
    {id:"mescola", label:"TOOL MESCOLA", icon:<Ico.mix/>},
    {id:"prod",    label:"PRODUZIONE",   icon:<Ico.clock/>},
  ];

  // ── SCHERMATA ERRORE DB ─────────────────────────────────────────────────────
  if (dbError) return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex",
      alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:"#141414", border:"1px solid #cc1f1f", borderRadius:12,
        padding:32, maxWidth:480, textAlign:"center" }}>
        <div style={{ fontSize:36, marginBottom:16 }}>⚠️</div>
        <div style={{ fontSize:16, color:"#cc1f1f", fontWeight:700, marginBottom:8 }}>
          Errore connessione database
        </div>
        <div style={{ fontSize:13, color:"#777", marginBottom:20, lineHeight:1.6 }}>
          {dbError}
        </div>
        <div style={{ fontSize:12, color:"#555", background:"#0d0d0d", borderRadius:6,
          padding:12, textAlign:"left", fontFamily:"'Courier New',monospace", marginBottom:20 }}>
          Verifica che le chiavi in src/supabase.js siano corrette.<br/>
          SUPABASE_URL e SUPABASE_ANON_KEY devono essere quelle del tuo progetto.
        </div>
        <button onClick={()=>window.location.reload()}
          style={{ ...btnR, margin:"0 auto" }}>
          Riprova
        </button>
      </div>
    </div>
  );

  // ── SCHERMATA CARICAMENTO ───────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex",
      alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ width:40, height:40, border:"3px solid #1e1e1e",
        borderTop:"3px solid #cc1f1f", borderRadius:"50%",
        animation:"spin 0.8s linear infinite" }}/>
      <div style={{ fontSize:12, color:"#444", letterSpacing:3, textTransform:"uppercase" }}>
        Connessione al database…
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:"#0a0a0a",color:"#ddd",fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <header style={{ background:"#0d0d0d",borderBottom:"1px solid #141414",padding:"0 20px",
        display:"flex",alignItems:"center",height:52,boxShadow:"0 2px 24px rgba(0,0,0,.8)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginRight:28 }}>
          <div style={{ width:5,height:30,background:"linear-gradient(180deg,#cc1f1f,#2e7d32)",borderRadius:2 }}/>
          <div>
            <div style={{ fontSize:13,fontWeight:800,color:"#fff",letterSpacing:3,
              fontFamily:"'Courier New',monospace",lineHeight:1.1 }}>LM STAMPI</div>
            <div style={{ fontSize:9,color:"#333",letterSpacing:4,textTransform:"uppercase" }}>Reparto Stampaggio</div>
          </div>
        </div>
        <nav style={{ display:"flex",gap:2,flex:1 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ display:"flex",alignItems:"center",gap:7,padding:"7px 14px",
                background:tab===t.id?"rgba(204,31,31,.14)":"transparent",
                border:tab===t.id?"1px solid rgba(204,31,31,.3)":"1px solid transparent",
                color:tab===t.id?"#eee":"#444",borderRadius:5,cursor:"pointer",
                fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",transition:"all .15s" }}>
              {t.icon}{t.label}
            </button>
          ))}
        </nav>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          {saving&&<div style={{ fontSize:10,color:"#cc1f1f",letterSpacing:2,animation:"pulse 1s infinite" }}>
            SALVATAGGIO…
          </div>}
          <div style={{ fontSize:10,color:"#252525" }}>{stampi.length}st · {materiali.length}mat</div>
        </div>
      </header>

      <main style={{ padding:20,maxWidth:1300,margin:"0 auto" }}>
        <div style={{ height:2,background:"linear-gradient(90deg,#cc1f1f,#8b0000 40%,#2e7d32 80%,transparent)",
          borderRadius:1,marginBottom:20 }}/>
        {tab==="db"      && <DatabaseStampi stampi={stampi} materiali={materiali}
          onAdd={()=>setModal({type:"stampo",data:null})}
          onEdit={s=>setModal({type:"stampo",data:s})}
          onDelete={id=>setDelConf(id)}/>}
        {tab==="mat"     && <DatabaseMateriali materiali={materiali} onSaveMat={saveMat} onDeleteMat={delMat}/>}
        {tab==="mescola" && <ToolMescola materiali={materiali}/>}
        {tab==="prod"    && <ToolProduzione stampi={stampi}/>}
      </main>

      {modal?.type==="stampo"&&(
        <StampoModal stampo={modal.data} materiali={materiali}
          onSave={saveStampo} onClose={()=>setModal(null)}/>
      )}

      {delConf&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:2000,
          display:"flex",alignItems:"center",justifyContent:"center" }}>
          <div style={{ background:"#141414",border:"1px solid #cc1f1f",borderRadius:8,
            padding:28,maxWidth:340,width:"90%",textAlign:"center",
            boxShadow:"0 0 40px rgba(204,31,31,.3)" }}>
            <div style={{ fontSize:30,marginBottom:10 }}>🗑</div>
            <div style={{ fontSize:15,color:"#ddd",marginBottom:6 }}>Eliminare lo stampo?</div>
            <div style={{ fontSize:12,color:"#555",marginBottom:22 }}>Operazione non reversibile.</div>
            <div style={{ display:"flex",gap:10,justifyContent:"center" }}>
              <button onClick={()=>setDelConf(null)} style={btnGh}>Annulla</button>
              <button onClick={async()=>{
                try {
                  await deleteStampo(delConf);
                  setStampi(p=>p.filter(x=>x.id!==delConf));
                } catch(err) {
                  alert("Errore: "+err.message);
                }
                setDelConf(null);
              }} style={{ ...btnR,padding:"9px 24px" }}>Elimina</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
      <footer style={{ textAlign:"center",padding:"14px",color:"#1a1a1a",
        fontSize:10,borderTop:"1px solid #0f0f0f",letterSpacing:3,marginTop:20 }}>
        LM STAMPI SRL — SISTEMA GESTIONALE REPARTO STAMPAGGIO
      </footer>
    </div>
  );
}
