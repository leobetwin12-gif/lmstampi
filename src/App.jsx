import { useState, useMemo, useCallback, useEffect } from "react";
import { fetchStampi, fetchMateriali, upsertStampo, deleteStampo, upsertMateriale, deleteMateriale } from "./db.js";

// --- CONFIGURAZIONE PRESSE ---
const PRESSE = [
  "Negri Bossi V40","Negri Bossi V70","Negri Bossi V90","Negri Bossi V180",
  "Engel 250T","Engel 350T","Engel 500T",
  "Arburg 180T","Arburg 280T",
  "KM 350T","KM 500T",
  "Sandretto 200T",
];
const TIPI_ESSIC = ["Nessuna","Essiccazione","Deumidificazione"];

// Turni di lavoro (Minuti)
const TURNO_CONTINUO  = 600; // 08-18
const TURNO_OPERATORE = 480; // 08-12 / 14-18

// --- ICONE ---
const Ico = {
  db:      ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>,
  mat:     ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  mix:     ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>,
  clock:   ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  plus:    ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit:    ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  del:     ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
  x:       ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="19" height="19"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  search:  ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  filter:  ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
};

// --- UTILS ---
const fmt = (n, d=2) => (isFinite(n) && n !== null && n !== "") ? Number(n).toFixed(d) : "0.00";
const calcVol = (peso, nrCav, dens) => (!peso || !nrCav || !dens || nrCav <= 0 || dens <= 0) ? 0 : (parseFloat(peso)/parseFloat(nrCav))/parseFloat(dens);
const calcDos = (peso, nrCav) => (!peso || !nrCav || nrCav <= 0) ? 0 : parseFloat(peso)/parseFloat(nrCav);

// --- COMPONENTI UI ---
function FInp({ v, s, type="text", style:xs, ...p }) {
  const hc = useCallback(e => s(e.target.value), [s]);
  return <input type={type} value={v} onChange={hc} style={{
    width:"100%", background:"#0d0d0d", border:"1px solid #222", color:"#eee",
    borderRadius:4, padding:"10px", fontSize:14, outline:"none", boxSizing:"border-box", ...xs
  }} {...p}/>;
}

function Tog({ on, s, label, sublabel }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"5px 0" }} onClick={()=>s(!on)}>
      <div style={{ width:40, height:22, borderRadius:11, background:on?"#2e7d32":"#252525", position:"relative", transition:"0.2s", flexShrink:0 }}>
        <div style={{ position:"absolute", top:2, left:on?20:2, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"0.2s" }}/>
      </div>
      <div>
        <div style={{ fontSize:14, color:on?"#4caf50":"#999" }}>{label}</div>
        {sublabel && <div style={{ fontSize:11, color:"#555" }}>{sublabel}</div>}
      </div>
    </div>
  );
}

// --- MAIN APP ---
export default function App() {
  const [tab, setTab] = useState("stampi");
  const [stampi, setStampi] = useState([]);
  const [materiali, setMateriali] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    async function load() {
      const [s, m] = await Promise.all([fetchStampi(), fetchMateriali()]);
      setStampi(s); setMateriali(m);
      setLoading(false);
    }
    load();
  }, []);

  const handleSaveStampo = async (data) => {
    const saved = await upsertStampo(data);
    if (saved) {
      setStampi(prev => {
        const idx = prev.findIndex(x => x.id === saved.id);
        if (idx >= 0) {
          const newArr = [...prev];
          newArr[idx] = saved;
          return newArr;
        }
        return [saved, ...prev];
      });
      setModalOpen(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questo stampo?")) {
      const ok = await deleteStampo(id);
      if (ok) setStampi(prev => prev.filter(x => x.id !== id));
    }
  };

  if (loading) return <div style={{ color: "#8b0000", textAlign: "center", padding: 50 }}>Caricamento database...</div>;

  return (
    <div style={{ minHeight:"100vh", background:"#080808", color:"#eee", fontFamily:"sans-serif", paddingBottom:40 }}>
      {/* MOBILE FRIENDLY VIEWPORT FIX */}
      <style>{`
        meta[name="viewport"] { content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" }
        body { margin: 0; padding: 0; overflow-x: hidden; }
        * { box-sizing: border-box; }
        .tab-btn { flex: 1; padding: 12px; border: none; background: #111; color: #555; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; transition: 0.3s; border-bottom: 2px solid transparent; }
        .tab-btn.active { color: #cc1f1f; background: #1a0808; border-bottom: 2px solid #cc1f1f; }
        @media (max-width: 600px) {
          .navbar { flex-wrap: wrap; }
          .tab-btn { min-width: 50%; border-bottom: none; }
          .tab-btn.active { border-left: 3px solid #cc1f1f; }
          .header-title { font-size: 18px !important; }
        }
      `}</style>

      {/* HEADER */}
      <div style={{ background: "#000", borderBottom: "1px solid #cc1f1f", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 35, height: 35, background: "#cc1f1f", borderRadius: 6, display: "flex", alignItems: "center", justifyCenter: "center", fontWeight: "bold" }}>LM</div>
          <span className="header-title" style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1 }}>DATABASE <span style={{ color: "#cc1f1f" }}>STAMPI</span></span>
        </div>
      </div>

      {/* NAVBAR RESPONSIVA */}
      <nav className="navbar" style={{ display: "flex", background: "#000" }}>
        <button className={`tab-btn ${tab === 'stampi' ? 'active' : ''}`} onClick={() => setTab("stampi")}><Ico.db/> STAMPI</button>
        <button className={`tab-btn ${tab === 'materiali' ? 'active' : ''}`} onClick={() => setTab("materiali")}><Ico.mat/> MATERIALI</button>
        <button className={`tab-btn ${tab === 'produzione' ? 'active' : ''}`} onClick={() => setTab("produzione")}><Ico.clock/> PRODUZIONE</button>
      </nav>

      {/* CONTENUTO */}
      <main style={{ padding: "15px", maxWidth: 1200, margin: "0 auto" }}>
        {tab === "stampi" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15, gap: 10 }}>
              <button onClick={() => { setEditItem(null); setModalOpen(true); }} style={{ background: "#cc1f1f", border: "none", color: "#fff", padding: "10px 20px", borderRadius: 5, fontWeight: "bold", flex: 1 }}>
                + NUOVO STAMPO
              </button>
            </div>

            {/* TABELLA CON SCROLL LATERALE PER MOBILE */}
            <div style={{ overflowX: "auto", background: "#111", borderRadius: 8, border: "1px solid #222" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead>
                  <tr style={{ background: "#000", textAlign: "left", fontSize: 11, color: "#666" }}>
                    <th style={{ padding: 12 }}>CODICE</th>
                    <th style={{ padding: 12 }}>CLIENTE / ARTICOLO</th>
                    <th style={{ padding: 12 }}>PRESSA</th>
                    <th style={{ padding: 12 }}>DATI TECNICI</th>
                    <th style={{ padding: 12 }}>AZIONI</th>
                  </tr>
                </thead>
                <tbody>
                  {stampi.map(s => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                      <td style={{ padding: 12, fontWeight: "bold", color: "#cc1f1f" }}>{s.codice}</td>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontSize: 14 }}>{s.cliente}</div>
                        <div style={{ fontSize: 12, color: "#555" }}>{s.articolo}</div>
                      </td>
                      <td style={{ padding: 12, fontSize: 13 }}>{s.pressa}</td>
                      <td style={{ padding: 12, fontSize: 12, color: "#888" }}>
                        {s.nr_cavita} cav · {s.peso_stampata}g · {s.tempo_ciclo}s
                      </td>
                      <td style={{ padding: 12 }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => { setEditItem(s); setModalOpen(true); }} style={{ background: "#222", border: "none", padding: 8, borderRadius: 4, color: "#fff" }}><Ico.edit/></button>
                          <button onClick={() => handleDelete(s.id)} style={{ background: "#1a0808", border: "none", padding: 8, borderRadius: 4, color: "#cc1f1f" }}><Ico.del/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "produzione" && <div style={{ padding: 20, textAlign: "center", color: "#444" }}>Sezione Produzione Online</div>}
        {tab === "materiali" && <div style={{ padding: 20, textAlign: "center", color: "#444" }}>Database Materiali Online</div>}
      </main>

      {/* MODAL STAMPO RESPONSIVO */}
      {modalOpen && (
        <StampoForm 
          item={editItem} 
          materiali={materiali}
          onSave={handleSaveStampo} 
          onClose={() => setModalOpen(false)} 
        />
      )}
    </div>
  );
}

// --- FORM STAMPO (SOTTO-COMPONENTE) ---
function StampoForm({ item, materiali, onSave, onClose }) {
  const [f, setF] = useState(item || {
    codice: "", cliente: "", articolo: "", pressa: PRESSE[0],
    peso_stampata: "", nr_cavita: 1, tempo_ciclo: "",
    materiale_id: "", camera_calda: false, braccio_robot: false,
    recupero_materozza: false, operatore_richiesto: false
  });

  const save = () => {
    if (!f.codice || !f.cliente) return alert("Codice e Cliente obbligatori");
    onSave(f);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "10px", overflowY: "auto" }}>
      <div style={{ background: "#111", width: "100%", maxWidth: 600, borderRadius: 10, border: "1px solid #cc1f1f", marginTop: "20px", marginBottom: "40px" }}>
        <div style={{ padding: "15px 20px", borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: "bold" }}>{f.id ? "MODIFICA STAMPO" : "NUOVO STAMPO"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff" }}><Ico.x/></button>
        </div>
        
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 15 }}>
          <div>
            <label style={{ fontSize: 10, color: "#555" }}>IDENTIFICAZIONE</label>
            <div style={{ display: "flex", gap: 10, marginTop: 5 }}>
              <FInp placeholder="Codice" v={f.codice} s={v => setF({...f, codice: v})} />
              <FInp placeholder="Cliente" v={f.cliente} s={v => setF({...f, cliente: v})} />
            </div>
          </div>

          <FInp placeholder="Articolo" v={f.articolo} s={v => setF({...f, articolo: v})} />

          <div>
            <label style={{ fontSize: 10, color: "#555" }}>PARAMETRI TECNICI</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 5 }}>
              <FInp type="number" placeholder="Peso Stampata (g)" v={f.peso_stampata} s={v => setF({...f, peso_stampata: v})} />
              <FInp type="number" placeholder="Nr. Cavità" v={f.nr_cavita} s={v => setF({...f, nr_cavita: v})} />
              <FInp type="number" placeholder="Tempo Ciclo (s)" v={f.tempo_ciclo} s={v => setF({...f, tempo_ciclo: v})} />
              <select value={f.pressa} onChange={e => setF({...f, pressa: e.target.value})} style={{ background:"#0d0d0d", color:"#eee", border:"1px solid #222", padding:10, borderRadius:4 }}>
                {PRESSE.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div style={{ background: "#080808", padding: 15, borderRadius: 8, display: "flex", flexDirection: "column", gap: 10 }}>
            <Tog label="Camera Calda" on={f.camera_calda} s={v => setF({...f, camera_calda: v})} />
            <Tog label="Braccio Robot" on={f.braccio_robot} s={v => setF({...f, braccio_robot: v})} />
            <Tog label="Recupero Materozza" on={f.recupero_materozza} s={v => setF({...f, recupero_materozza: v})} />
            <Tog label="Presenza Operatore" on={f.operatore_richiesto} s={v => setF({...f, operatore_richiesto: v})} />
          </div>

          <button onClick={save} style={{ background: "#cc1f1f", color: "#fff", border: "none", padding: 15, borderRadius: 6, fontWeight: "bold", fontSize: 16, marginTop: 10 }}>
            SALVA DATI
          </button>
        </div>
      </div>
    </div>
  );
}
