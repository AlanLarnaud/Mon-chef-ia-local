import { CreateMLCEngine } from "@mlc-ai/web-llm";
import "./style.css";

const MODELS = [
  {
    id: "Qwen3-0.6B-q4f16_1-MLC",
    label: "Qwen3 0,6B – léger (recommandé pour le premier test)",
    note: "Plus léger, mais réponses parfois moins nuancées."
  },
  {
    id: "Qwen3-1.7B-q4f16_1-MLC",
    label: "Qwen3 1,7B – plus capable (expérimental sur iPhone)",
    note: "Meilleure capacité potentielle, mais risque accru de ralentissement ou fermeture de Safari."
  }
];


const SYSTEM_PROMPT = `/no_think
Tu es Mon Chef IA, un chef cuisinier français.
Tu réponds TOUJOURS en français. C'est une règle absolue.
N'écris aucune phrase en anglais.
Tu es chaleureux, naturel, créatif et précis.
Tu improvises des recettes à partir des ingrédients disponibles.
Tu respectes les quantités et le nombre de personnes.
Tu donnes des étapes simples, numérotées et faciles à suivre.
Si une information manque, pose une question en français.
Même pour les noms techniques, explique tout en français.
`;

RÈGLES IMPORTANTES :
- Respecte les quantités disponibles. Ne prétends jamais qu'un ingrédient non mentionné est disponible.
- Si une information essentielle manque (nombre de personnes, matériel, ingrédient indispensable), pose une seule question claire.
- Propose des substitutions uniquement en les identifiant comme facultatives et demande confirmation si elles impliquent un ingrédient non déclaré.
- Distingue les quantités disponibles des quantités réellement utilisées.
- Donne des mesures concrètes en grammes, millilitres, unités, températures et durées.
- Pour les calculs de portions, explique brièvement les ajustements et vérifie leur cohérence.
- Pour une recette, donne d'abord un aperçu, le temps total, puis les ingrédients et les étapes numérotées.
- Si l'utilisateur demande un accompagnement pas à pas, donne uniquement l'étape suivante et attends son retour.
- Les calories et macros sont des estimations, jamais des mesures exactes. Signale les hypothèses et les marques/produits pouvant faire varier les valeurs.
- Respecte les règles d'hygiène et de sécurité alimentaire. Ne conseille jamais de goûter un aliment douteux.
- N'invente pas de températures internes réglementaires si tu n'es pas sûr ; recommande un thermomètre et des références officielles si nécessaire.
- Réponds en français, avec des explications simples et adaptées à une personne qui cuisine chez elle.`;

const state = {
  engine: null,
  loading: false,
  messages: JSON.parse(localStorage.getItem("chef_messages") || "[]"),
  favorites: JSON.parse(localStorage.getItem("chef_favorites") || "[]"),
  ingredients: localStorage.getItem("chef_ingredients") || "",
  servings: Number(localStorage.getItem("chef_servings") || 2),
  selectedModel: localStorage.getItem("chef_model") || MODELS[0].id,
  stepMode: localStorage.getItem("chef_step_mode") !== "false"
};

const app = document.querySelector("#app");

app.innerHTML = `
  <header class="topbar">
    <div class="brand-mark">✳</div>
    <div class="brand-copy"><div class="eyebrow">CUISINE PERSONNELLE</div><h1>Mon Chef IA</h1></div>
    <div class="privacy"><span class="dot"></span> Local</div>
  </header>
  <main>
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">TON COMPAGNON EN CUISINE</p>
        <h2>On cuisine avec<br><em>ce que tu as.</em></h2>
        <p class="hero-sub">Des idées, des proportions justes et un accompagnement à ton rythme.</p>
      </div>
      <div class="hero-art" aria-hidden="true">🥘</div>
    </section>

    <section class="panel setup-panel">
      <div class="section-head">
        <div><p class="eyebrow">01 / TON ASSISTANT</p><h3>Préparer le chef</h3></div>
        <span class="local-pill">AUCUN COMPTE</span>
      </div>
      <label class="field-label" for="model">Modèle IA sur ton iPhone</label>
      <select id="model"></select>
      <p class="hint" id="model-note"></p>
      <button class="primary" id="load-model">Télécharger / démarrer le modèle</button>
      <div class="progress-wrap" id="progress-wrap" hidden>
        <div class="progress-track"><div id="progress-bar"></div></div>
        <p id="progress-text" class="hint">Préparation…</p>
      </div>
      <p class="status" id="status"><span class="status-dot"></span> Modèle non chargé</p>
      <p class="privacy-note">Le modèle répond sur l'appareil. Le premier téléchargement nécessite Internet ; les poids du modèle sont ensuite mis en cache par le navigateur.</p>
    </section>

    <section class="panel ingredients-panel">
      <div class="section-head">
        <div><p class="eyebrow">02 / TON FRIGO</p><h3>Mes ingrédients</h3></div>
        <span class="step-number">✎</span>
      </div>
      <label class="field-label" for="ingredients">Liste les ingrédients et leurs quantités</label>
      <textarea id="ingredients" rows="4" placeholder="Ex. : 180 g de poulet&#10;120 g de riz cru&#10;1 courgette (200 g)&#10;15 cl de crème légère"></textarea>
      <div class="servings-row">
        <label class="field-label" for="servings">Nombre de personnes</label>
        <div class="stepper">
          <button id="minus" aria-label="Diminuer">−</button>
          <strong id="servings-value">2</strong>
          <button id="plus" aria-label="Augmenter">+</button>
        </div>
      </div>
      <label class="switch-row"><span><strong>Mode pas à pas</strong><small>Le chef donne une étape à la fois.</small></span><input id="step-mode" type="checkbox"><span class="switch"></span></label>
      <div class="quick-prompts">
        <button class="chip" data-prompt="Propose-moi une recette avec mes ingrédients.">🍳 Une recette</button>
        <button class="chip" data-prompt="Adapte les quantités pour le nombre de personnes indiqué.">⚖️ Adapter les portions</button>
        <button class="chip" data-prompt="Donne-moi une estimation des calories et protéines de ce repas.">🥗 Calories & protéines</button>
      </div>
    </section>

    <section class="panel chat-panel">
      <div class="section-head">
        <div><p class="eyebrow">03 / DISCUSSION</p><h3>Parlons cuisine</h3></div>
        <button class="text-button" id="clear-chat">Effacer</button>
      </div>
      <div id="chat" class="chat">
        <div class="welcome-message">
          <div class="chef-avatar">👨‍🍳</div>
          <div><strong>Salut ! Je suis ton chef.</strong><p>Charge d'abord le modèle, renseigne tes ingrédients, puis demande-moi ce que tu veux cuisiner.</p></div>
        </div>
      </div>
      <form id="chat-form" class="composer">
        <textarea id="message" rows="1" placeholder="Ex. : Je veux quelque chose de rapide…" aria-label="Ton message"></textarea>
        <button id="send" type="submit" aria-label="Envoyer">↑</button>
      </form>
      <p class="hint composer-hint">Le chat et tes favoris restent enregistrés sur cet appareil.</p>
    </section>

    <section class="panel favorites-panel">
      <div class="section-head">
        <div><p class="eyebrow">TES IDÉES À GARDER</p><h3>Recettes favorites</h3></div>
        <span class="step-number">♡</span>
      </div>
      <div id="favorites" class="favorites-empty">Tes recettes sauvegardées apparaîtront ici.</div>
    </section>
  </main>
  <footer><span>MON CHEF IA</span><span>Privé par conception · Sans compte · Sans API</span></footer>
`;

const $ = (s) => document.querySelector(s);
const modelSelect = $("#model");
for (const model of MODELS) {
  const option = document.createElement("option");
  option.value = model.id;
  option.textContent = model.label;
  modelSelect.append(option);
}
modelSelect.value = state.selectedModel;
$("#model-note").textContent = MODELS.find(m => m.id === state.selectedModel)?.note || "";
modelSelect.addEventListener("change", () => {
  state.selectedModel = modelSelect.value;
  localStorage.setItem("chef_model", state.selectedModel);
  $("#model-note").textContent = MODELS.find(m => m.id === state.selectedModel)?.note || "";
  if (state.engine) setStatus("Modèle changé : redémarre le modèle pour l'utiliser.", "warn");
});

$("#ingredients").value = state.ingredients;
$("#servings-value").textContent = state.servings;
$("#step-mode").checked = state.stepMode;

$("#ingredients").addEventListener("input", e => {
  state.ingredients = e.target.value;
  localStorage.setItem("chef_ingredients", state.ingredients);
});
function setServings(n) {
  state.servings = Math.max(1, Math.min(12, n));
  $("#servings-value").textContent = state.servings;
  localStorage.setItem("chef_servings", String(state.servings));
}
$("#minus").addEventListener("click", () => setServings(state.servings - 1));
$("#plus").addEventListener("click", () => setServings(state.servings + 1));
$("#step-mode").addEventListener("change", e => {
  state.stepMode = e.target.checked;
  localStorage.setItem("chef_step_mode", String(state.stepMode));
});

function setStatus(message, kind = "neutral") {
  $("#status").className = `status ${kind}`;
  $("#status").innerHTML = `<span class="status-dot"></span>${escapeHtml(message)}`;
}
function updateProgress(text, progress) {
  $("#progress-wrap").hidden = false;
  $("#progress-text").textContent = text;
  $("#progress-bar").style.width = `${Math.max(0, Math.min(100, (progress || 0) * 100))}%`;
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}

$("#load-model").addEventListener("click", async () => {
  if (state.loading) return;
  if (state.engine && state.selectedModel === state.engineModel) {
    setStatus("Le modèle est déjà prêt.", "ok");
    return;
  }
  state.loading = true;
  $("#load-model").disabled = true;
  $("#load-model").textContent = "Chargement…";
  setStatus("Initialisation du moteur local…", "warn");
  try {
    if (!("gpu" in navigator)) {
      throw new Error("WebGPU n'est pas disponible dans ce contexte Safari. Essaie d'abord la page dans Safari (pas un aperçu intégré), puis vérifie iOS et Safari.");
    }
    const modelId = state.selectedModel;
    const engine = await CreateMLCEngine(modelId, {
      initProgressCallback: report => updateProgress(report.text || "Téléchargement du modèle…", report.progress)
    });
    state.engine = engine;
    state.engineModel = modelId;
    $("#progress-wrap").hidden = true;
    setStatus("Ton chef est prêt. Tu peux couper Internet pour tester.", "ok");
    $("#load-model").textContent = "Modèle prêt ✓";
  } catch (error) {
    console.error(error);
    setStatus(`Impossible de démarrer : ${error.message || error}`, "error");
    $("#load-model").textContent = "Réessayer";
  } finally {
    state.loading = false;
    $("#load-model").disabled = false;
  }
});

function renderChat() {
  const chat = $("#chat");
  if (!state.messages.length) {
    chat.innerHTML = `<div class="welcome-message"><div class="chef-avatar">👨‍🍳</div><div><strong>Salut ! Je suis ton chef.</strong><p>Charge le modèle, renseigne tes ingrédients et demandons-lui une recette.</p></div></div>`;
  } else {
    chat.innerHTML = state.messages.map((m, i) => `
      <article class="message ${m.role === "user" ? "user-message" : "assistant-message"}">
        <div class="message-label">${m.role === "user" ? "TOI" : "TON CHEF"}</div>
        <div class="message-body">${formatText(m.content)}</div>
        ${m.role === "assistant" ? `<button class="save-recipe" data-index="${i}">♡ Enregistrer cette réponse</button>` : ""}
      </article>
    `).join("");
    chat.querySelectorAll(".save-recipe").forEach(button => button.addEventListener("click", () => {
      const item = state.messages[Number(button.dataset.index)];
      if (!state.favorites.some(f => f.content === item.content)) {
        state.favorites.unshift({ content: item.content, date: new Date().toLocaleDateString("fr-FR") });
        localStorage.setItem("chef_favorites", JSON.stringify(state.favorites));
        renderFavorites();
        button.textContent = "✓ Enregistrée";
      }
    }));
  }
  chat.scrollTop = chat.scrollHeight;
}
function formatText(text) {
  return escapeHtml(text)
    .replace(/^### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^## (.*)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^\s*[-*] (.*)$/gm, "• $1")
    .replace(/\n/g, "<br>");
}
function renderFavorites() {
  const box = $("#favorites");
  if (!state.favorites.length) {
    box.className = "favorites-empty";
    box.textContent = "Tes recettes sauvegardées apparaîtront ici.";
    return;
  }
  box.className = "favorite-list";
  box.innerHTML = state.favorites.map((f, i) => `
    <article class="favorite-item"><div><strong>Recette enregistrée</strong><small>${escapeHtml(f.date)}</small><p>${escapeHtml(f.content.slice(0, 170))}${f.content.length > 170 ? "…" : ""}</p></div><button data-remove="${i}" aria-label="Supprimer">×</button></article>
  `).join("");
  box.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => {
    state.favorites.splice(Number(b.dataset.remove), 1);
    localStorage.setItem("chef_favorites", JSON.stringify(state.favorites));
    renderFavorites();
  }));
}
function persistMessages() {
  localStorage.setItem("chef_messages", JSON.stringify(state.messages.slice(-40)));
}
renderChat();
renderFavorites();

async function sendMessage(text) {
  if (!text.trim()) return;
  if (!state.engine) {
    setStatus("Charge d'abord le modèle IA.", "warn");
    return;
  }
  const userText = text.trim();
  const context = `\n\nCONTEXTE ACTUEL DE CUISINE :\nIngrédients disponibles :\n${state.ingredients.trim() || "Non renseignés"}\nNombre de personnes : ${state.servings}\nMode pas à pas : ${state.stepMode ? "activé : ne donner que la prochaine étape si la recette est en cours" : "désactivé"}`;
  state.messages.push({ role: "user", content: userText });
  persistMessages();
  renderChat();
  $("#message").value = "";
  $("#send").disabled = true;
  const assistantMessage = { role: "assistant", content: "" };
  state.messages.push(assistantMessage);
  renderChat();
  try {
    const history = state.messages.slice(-12, -2).map(m => ({ role: m.role, content: m.content }));
    const response = await state.engine.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT + context },
        ...history,
        { role: "user", content: userText }
      ],
      temperature: 0.65,
      max_tokens: 700,
      stream: true
    });
    let answer = "";
    for await (const chunk of response) {
      answer += chunk.choices?.[0]?.delta?.content || "";
      assistantMessage.content = answer;
      renderChat();
    }
    if (!answer.trim()) assistantMessage.content = "Je n'ai pas réussi à formuler une réponse. Peux-tu reformuler ?";
  } catch (error) {
    assistantMessage.content = `Je rencontre un problème pendant la génération : ${error.message || error}`;
    setStatus("Erreur pendant la génération. Le modèle est peut-être trop lourd pour Safari.", "error");
  } finally {
    persistMessages();
    renderChat();
    $("#send").disabled = false;
    $("#message").focus();
  }
}
$("#chat-form").addEventListener("submit", e => {
  e.preventDefault();
  sendMessage($("#message").value);
});
$("#message").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $("#chat-form").requestSubmit();
  }
});
document.querySelectorAll(".chip").forEach(button => button.addEventListener("click", () => sendMessage(button.dataset.prompt)));
$("#clear-chat").addEventListener("click", () => {
  if (confirm("Effacer la conversation enregistrée sur cet iPhone ?")) {
    state.messages = [];
    persistMessages();
    renderChat();
  }
});

