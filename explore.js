import { collection, getDocs, query, limit, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { fetchSiteSettings, loadSiteSettings, optimizeImage } from './common.js';

let products = [];
let activeProduct = null;
let companyName = 'JR-UD-HUB';

const escapeHTML = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
const isMalayalam = text => /[\u0D00-\u0D7F]/.test(text) || /\b(venam|undo|entha|parayu|kanikku|protein|diet)\b/i.test(text);
const normalise = value => String(value || '').toLowerCase();

export async function initExplorePage() {
    const messages = document.getElementById('chat-messages');
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    if (!messages || !form || !input) return;
    await loadSiteSettings();
    const settings = await fetchSiteSettings();
    companyName = settings?.logoText || companyName;
    document.getElementById('chatbot-brand').textContent = companyName;
    addAssistantMessage(welcomeMessage(), []);
    loadProducts();
    form.addEventListener('submit', event => { event.preventDefault(); submitQuestion(input.value); });
    document.getElementById('clear-chat-btn')?.addEventListener('click', () => { activeProduct = null; messages.innerHTML = ''; addAssistantMessage(welcomeMessage(), []); input.focus(); });
    input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 130)}px`; });
}
document.addEventListener('DOMContentLoaded', initExplorePage, { once: true });

async function loadProducts() {
    try {
        const snapshot = await getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(100)));
        products = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    } catch (error) {
        console.error('ChatBot product loading error:', error);
        try {
            const snapshot = await getDocs(query(collection(db, 'products'), limit(100)));
            products = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        } catch (fallbackError) { console.error('ChatBot fallback product loading error:', fallbackError); }
    }
}

function welcomeMessage() {
    return `Hello! ഞാൻ ${companyName} Assistant ആണ്.\n\nഞങ്ങളുടെ products-ുമായി ബന്ധപ്പെട്ട എന്ത് ചോദ്യവും മലയാളത്തിലോ English-ലോ അയക്കാം.`;
}

async function submitQuestion(question) {
    const input = document.getElementById('chat-input');
    const send = document.getElementById('chat-send-btn');
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;
    addUserMessage(cleanQuestion);
    input.value = ''; input.style.height = 'auto'; send.disabled = true;
    if (!products.length) await loadProducts();
    const response = answerQuestion(cleanQuestion);
    addAssistantMessage(response.text, response.products);
    send.disabled = false; input.focus();
}

function answerQuestion(question) {
    const malayalam = isMalayalam(question);
    const q = normalise(question);
    const matchingQuestion = activeProduct ? `${normalise(activeProduct.name)} ${q}` : q;
    const matches = rankProducts(matchingQuestion);
    const product = matches[0];
    const wantsProtein = /protein|പ്രോട്ടീൻ/.test(q);
    const wantsIngredients = /ingredient|ingredients|ചേരുവ|ഇൻഗ്രീഡിയൻറ്/.test(q);
    const wantsSpecs = /specification|specifications|spec|സ്പെസിഫിക്ക/.test(q);
    const wantsDiet = /diet|weight|loss|keto|fitness|healthy|ഡയറ്റ്|വണ്ണം|തടി|ഭാരം/.test(q);
    const priceLimit = extractPriceLimit(q);
    const priceMatches = priceLimit ? products.filter(item => Number(item.price || 0) <= priceLimit) : [];

    if ((wantsProtein || wantsIngredients || wantsSpecs) && product && product.score > 1) {
        return { text: productDetailsAnswer(product, wantsProtein, wantsIngredients, wantsSpecs, malayalam), products: [product] };
    }
    if (priceLimit) {
        const list = priceMatches.slice(0, 4);
        return { text: malayalam ? `₹${priceLimit} ന് താഴെയുള്ള ${list.length} products കണ്ടെത്തി.` : `I found ${list.length} products under ₹${priceLimit}.`, products: list };
    }
    if (wantsDiet || wantsProtein) {
        const list = matches.filter(item => hasNutritionOrDietData(item)).slice(0, 4);
        const text = malayalam
            ? 'നിങ്ങളുടെ ആവശ്യത്തിന് അനുയോജ്യമായ products താഴെ കാണിക്കുന്നു. Nutrition/ingredients വിവരങ്ങൾ product data-യിൽ ഉള്ളതിനെ അടിസ്ഥാനമാക്കിയതാണ്. ആരോഗ്യപ്രശ്നങ്ങളോ പ്രത്യേക diet ആവശ്യങ്ങളോ ഉണ്ടെങ്കിൽ dietitian അല്ലെങ്കിൽ doctor-നോട് ചോദിക്കുക.'
            : 'Here are products that may match your request. Nutrition and ingredient details are based only on the product information provided. For medical conditions or a personalised diet, consult a dietitian or doctor.';
        return { text, products: list.length ? list : (matches.length ? matches.slice(0, 4) : products.filter(hasNutritionOrDietData).slice(0, 4)) };
    }
    if (product && product.score > 1) {
        return { text: malayalam ? `${product.name} സംബന്ധിച്ച വിവരങ്ങൾ താഴെ കാണിക്കുന്നു. Ingredients, protein, specification എന്നിവ അറിയാൻ product name ചേർത്ത് ചോദിക്കൂ.` : `Here is the closest product match: ${product.name}. Ask with the product name for its ingredients, protein, or specification.`, products: [product] };
    }
    return { text: malayalam ? 'നിങ്ങളുടെ ചോദ്യത്തിന് യോജിക്കുന്ന product വിവരങ്ങൾ കണ്ടെത്താനായില്ല. Product name, budget, protein, ingredients, അല്ലെങ്കിൽ category ചേർത്ത് വീണ്ടും ചോദിക്കൂ.' : 'I could not find a matching product. Please try a product name, budget, protein, ingredients, or category.', products: matches.slice(0, 4) };
}

function rankProducts(question) {
    const tokens = question.split(/[^\p{L}\p{N}]+/u).filter(token => token.length > 1);
    return products.map(item => {
        const searchable = normalise([item.name, item.description, item.specification, item.ingredients, item.dietTags, item.searchKeywords, item.proteinPerServing, item.allergens].join(' '));
        const score = tokens.reduce((total, token) => total + (searchable.includes(token) ? 2 : 0), 0) + (normalise(item.name).includes(question) ? 8 : 0);
        return { ...item, score };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
}

function extractPriceLimit(question) {
    const match = question.match(/(?:under|below|less than|താഴെ|കുറവ്|₹|rs\.?)[^\d]{0,6}(\d{2,6})|(\d{2,6})\s*(?:ന്|രൂപ|rs|inr)/i);
    return Number(match?.[1] || match?.[2] || 0) || null;
}

function hasNutritionOrDietData(product) { return Boolean(product.proteinPerServing || product.ingredients || product.dietTags || product.nutrition); }

function productDetailsAnswer(product, protein, ingredients, specs, malayalam) {
    const details = [];
    if (protein) details.push(product.proteinPerServing ? (malayalam ? `Protein per serving: ${product.proteinPerServing}` : `Protein per serving: ${product.proteinPerServing}`) : (malayalam ? 'Protein വിവരം ഇപ്പോൾ ലഭ്യമല്ല.' : 'Protein information is not available yet.'));
    if (ingredients) details.push(product.ingredients ? `${malayalam ? 'Ingredients' : 'Ingredients'}: ${product.ingredients}` : (malayalam ? 'Ingredients വിവരം ഇപ്പോൾ ലഭ്യമല്ല.' : 'Ingredients information is not available yet.'));
    if (specs) details.push(product.specification ? `${malayalam ? 'Specification' : 'Specification'}: ${product.specification}` : (malayalam ? 'Specification വിവരം ഇപ്പോൾ ലഭ്യമല്ല.' : 'Specification information is not available yet.'));
    return `${product.name}\n\n${details.join('\n\n')}`;
}

function addUserMessage(text) { addMessage('user', 'You', escapeHTML(text)); }
function addAssistantMessage(text, recommendedProducts) {
    addMessage('assistant', `${companyName} Assistant`, escapeHTML(text), recommendedProducts);
}
function addMessage(role, label, text, recommendedProducts = []) {
    const messages = document.getElementById('chat-messages');
    const element = document.createElement('article');
    element.className = `chat-message ${role}`;
    element.innerHTML = `<span class="message-label">${label}</span><div class="message-bubble">${text}</div>`;
    if (recommendedProducts.length) {
        const cards = document.createElement('div'); cards.className = 'chat-products';
        recommendedProducts.forEach(product => cards.appendChild(productCard(product)));
        element.appendChild(cards);
    }
    messages.appendChild(element); messages.scrollTop = messages.scrollHeight;
}
function productCard(product) {
    const card = document.createElement('article'); card.className = 'chat-product';
    const image = product.images?.[0] || 'https://placehold.co/300x300/1e1e1e/D4AF37?text=Product';
    const protein = product.proteinPerServing ? `Protein: ${escapeHTML(product.proteinPerServing)}` : (product.dietTags ? escapeHTML(product.dietTags) : '');
    card.innerHTML = `<img src="${escapeHTML(optimizeImage(image, 300))}" alt="${escapeHTML(product.name)}" loading="lazy"><div class="chat-product-info"><p class="chat-product-name">${escapeHTML(product.name)}</p><div class="chat-product-price">₹${escapeHTML(product.price || 0)}</div>${protein ? `<p class="chat-product-meta">${protein}</p>` : ''}<div class="chat-product-actions"><a href="product.html?id=${encodeURIComponent(product.id)}">View</a><button type="button">Follow up</button></div></div>`;
    card.querySelector('button').addEventListener('click', () => {
        activeProduct = product;
        addAssistantMessage(`ഇനി ${product.name} -നെക്കുറിച്ചുള്ള ചോദ്യങ്ങൾ ചോദിക്കാം.`, []);
        document.getElementById('chat-input')?.focus();
    });
    return card;
}
