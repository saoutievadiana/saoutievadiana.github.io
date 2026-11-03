/* Diana Saoutieva portfolio
   De inhoud staat in data/site.json en data/artikels.json.
   Die pas je aan via het beheerpaneel (Pages CMS), niet hier. */

const T = {
  nl: {navHome:"Artikelen", zoek:"Zoek op titel...", alle:"Alle media", geen:"Geen artikelen gevonden.",
       leeg:"Binnenkort verschijnen hier mijn artikelen.", terug:"← Alle artikelen",
       contact:"Contact", contactSub:"Voor opdrachten, tips of samenwerkingen.", kopieer:"Kopieer", gekopieerd:"Gekopieerd",
       type:{site:"Lees hier", link:"Externe link", pdf:"PDF"}, openPdf:"Open de pdf", openLink:"Lees het artikel", locale:"nl-BE"},
  en: {navHome:"Articles", zoek:"Search by title...", alle:"All publications", geen:"No articles found.",
       leeg:"My articles will appear here soon.", terug:"← All articles",
       contact:"Contact", contactSub:"For commissions, tips or collaborations.", kopieer:"Copy", gekopieerd:"Copied",
       type:{site:"Read here", link:"External link", pdf:"PDF"}, openPdf:"Open the PDF", openLink:"Read the article", locale:"en-GB"}
};

let SITE = {}, ARTIKELS = [], lang = "nl";
try { lang = localStorage.getItem("lang") || "nl"; } catch (e) {}
const t = () => T[lang];
const main = document.getElementById("main");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt = d => { const x = new Date(d); return isNaN(x) ? "" : x.toLocaleDateString(t().locale, {day:"numeric", month:"long", year:"numeric"}); };
const slug = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const soort = a => ({"Op mijn site":"site","Link naar medium":"link","PDF":"pdf"}[a.type] || "site");

async function load() {
  const [s, a] = await Promise.all([
    fetch("data/site.json", {cache:"no-cache"}).then(r => r.json()).catch(() => ({})),
    fetch("data/artikels.json", {cache:"no-cache"}).then(r => r.json()).catch(() => [])
  ]);
  SITE = s || {};
  ARTIKELS = (Array.isArray(a) ? a : []).filter(x => x && x.titel).map(x => ({...x, id: slug(x.titel), soort: soort(x)}));
  document.getElementById("foto").src = SITE.profielfoto || "";
  if (SITE.achtergrond) document.getElementById("side").style.setProperty("--bg-img", `url("${SITE.achtergrond}")`);
  document.querySelectorAll(".lang button").forEach(b => b.onclick = () => setLang(b.dataset.lang));
  setLang(lang === "en" ? "en" : "nl");
}

/* Vertaalde velden: in het Engels toont de site de _en-versie als die bestaat */
const tr = (a, k) => (lang === "en" && a[k + "_en"]) ? a[k + "_en"] : a[k];
const heeftEn = a => !!(a.titel_en || a.tekst_en);

function setLang(l) {
  lang = l; try { localStorage.setItem("lang", l); } catch (e) {}
  document.documentElement.lang = l;
  document.getElementById("intro").textContent = (l === "en" ? SITE.intro_en : SITE.intro_nl) || "";
  document.querySelector('[data-t="navHome"]').textContent = t().navHome;
  document.querySelectorAll(".lang button").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === l));
  route(true);
}

function thumb(a, extra = "") {
  return a.foto ? `<img src="${esc(a.foto)}" alt="" loading="lazy">${extra}` : extra;
}

function home() {
  if (!ARTIKELS.length) { main.innerHTML = `<p class="empty">${t().leeg}</p>`; return; }
  const media = [...new Set(ARTIKELS.map(a => a.medium).filter(Boolean))];
  main.innerHTML = `<div class="toolbar">
      <input id="zoek" type="search" placeholder="${t().zoek}" aria-label="${t().zoek}">
      ${media.length > 1 ? `<select id="medium" aria-label="${t().alle}"><option value="">${t().alle}</option>${media.map(m => `<option>${esc(m)}</option>`).join("")}</select>` : ""}
    </div><div class="grid" id="grid"></div>`;
  const draw = () => {
    const q = document.getElementById("zoek").value.toLowerCase();
    const m = document.getElementById("medium")?.value || "";
    const list = ARTIKELS.filter(a => (a.titel + " " + (a.titel_en || "")).toLowerCase().includes(q) && (!m || a.medium === m))
                         .sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
    document.getElementById("grid").innerHTML = list.length ? list.map(a => {
      const href = a.soort === "link" ? a.link : a.soort === "pdf" ? a.pdf : "#artikel-" + a.id;
      const ext = a.soort === "site" ? "" : ' target="_blank" rel="noopener"';
      return `<a class="card" href="${esc(href)}"${ext}>
        <div class="thumb" style="background:var(--line)">${thumb(a, `<span>${t().type[a.soort]}</span>`)}</div>
        <div class="meta">${[esc(a.medium), fmt(a.datum)].filter(Boolean).join(" · ")}</div>
        <h3>${esc(tr(a, "titel"))}</h3>${tr(a, "intro") ? `<p>${esc(tr(a, "intro"))}</p>` : ""}</a>`;
    }).join("") : `<p class="empty">${t().geen}</p>`;
  };
  document.getElementById("zoek").oninput = draw;
  const sel = document.getElementById("medium"); if (sel) sel.onchange = draw;
  draw();
}

function contact() {
  main.innerHTML = `<div class="page"><h2>${t().contact}</h2><p>${t().contactSub}</p>
    ${SITE.email ? `<div class="contact-row"><b>E-mail</b><span id="mail">${esc(SITE.email)}</span><button class="copy" id="copy">${t().kopieer}</button></div>` : ""}
    ${SITE.linkedin ? `<div class="contact-row"><b>LinkedIn</b><a href="${esc(SITE.linkedin)}" target="_blank" rel="noopener">Diana Saoutieva</a></div>` : ""}</div>`;
  const b = document.getElementById("copy");
  if (b) b.onclick = () => navigator.clipboard.writeText(SITE.email).then(() => b.textContent = t().gekopieerd).catch(() => {
    const r = document.createRange(); r.selectNodeContents(document.getElementById("mail"));
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  });
}

/* Opgemaakte tekst uit de tekstverwerker: alleen veilige opmaak behouden */
const TOEGELATEN = new Set(["P","H2","H3","H4","STRONG","B","EM","I","U","S","A","UL","OL","LI","BLOCKQUOTE","BR","HR","IMG","FIGURE","FIGCAPTION"]);
function schoon(html) {
  const doc = new DOMParser().parseFromString("<div>" + html + "</div>", "text/html");
  const wrap = doc.body.firstChild;
  (function walk(node) {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) return;
      if (n.nodeType !== 1) { n.remove(); return; }
      if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|META|LINK|TITLE|NOSCRIPT|SVG|FORM)$/.test(n.tagName)) { n.remove(); return; }
      walk(n);
      if (n.tagName === "H1") { const h = doc.createElement("h2"); h.append(...n.childNodes); n.replaceWith(h); return; }
      if (!TOEGELATEN.has(n.tagName)) { n.replaceWith(...n.childNodes); return; }
      const href = n.getAttribute("href"), src = n.getAttribute("src"), alt = n.getAttribute("alt");
      [...n.attributes].forEach(at => n.removeAttribute(at.name));
      if (n.tagName === "A" && href && /^(https?:|mailto:|\/|#)/i.test(href)) { n.setAttribute("href", href); if (/^https?:/i.test(href)) { n.setAttribute("target", "_blank"); n.setAttribute("rel", "noopener"); } }
      if (n.tagName === "IMG") { if (src && /^(https?:|\/)/i.test(src)) { n.setAttribute("src", src); n.setAttribute("alt", alt || ""); n.setAttribute("loading", "lazy"); } else n.remove(); }
      if (n.tagName === "P" && !n.textContent.trim() && !n.querySelector("img")) n.remove();
    });
  })(wrap);
  return wrap.innerHTML;
}
function tekstNaarHtml(tekst) {
  const s = String(tekst || "");
  if (/<\s*(p|h[1-4]|ul|ol|blockquote|strong|em|br)\b/i.test(s)) return schoon(s);
  return s.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
}

function artikel(id) {
  const a = ARTIKELS.find(x => x.id === id); if (!a) return home();
  main.innerHTML = `<article class="page lees">
    <div class="lees-top"><button class="back" id="back">${t().terug}</button>
      ${heeftEn(a) ? `<div class="art-lang" role="group" aria-label="${lang === "en" ? "Article language" : "Taal van het artikel"}"><button data-lang="nl" aria-pressed="${lang === "nl"}">Nederlands</button><button data-lang="en" aria-pressed="${lang === "en"}">English</button></div>` : ""}</div>
    <header class="lees-kop">
      <div class="meta">${[esc(a.medium), fmt(a.datum)].filter(Boolean).join(" · ")}</div>
      <h2>${esc(tr(a, "titel"))}</h2>
      ${tr(a, "intro") ? `<p class="lead">${esc(tr(a, "intro"))}</p>` : ""}
    </header>
    ${a.foto ? `<figure class="hero-img"><img src="${esc(a.foto)}" alt=""></figure>` : ""}
    <div class="article-body" lang="${lang === "en" && a.tekst_en ? "en" : "nl"}">${tekstNaarHtml(tr(a, "tekst"))}</div>
    <footer class="lees-voet"><button class="back" id="back2">${t().terug}</button></footer>
  </article>`;
  document.getElementById("back").onclick = document.getElementById("back2").onclick = () => location.hash = "home";
  document.title = tr(a, "titel") + " · Diana Saoutieva";
  main.querySelectorAll(".art-lang button").forEach(b => b.onclick = () => setLang(b.dataset.lang));
}

function route(keepScroll) {
  const h = location.hash.slice(1) || "home";
  document.title = "Diana Saoutieva";
  document.querySelectorAll("nav a").forEach(a => {
    const on = a.getAttribute("href") === "#" + (h.startsWith("artikel-") ? "home" : h);
    on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
  });
  if (h === "contact") contact(); else if (h.startsWith("artikel-")) artikel(h.slice(8)); else home();
  if (keepScroll !== true) window.scrollTo(0, 0);
}

addEventListener("hashchange", () => route());
load();
