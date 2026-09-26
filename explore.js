import { collection, getDocs, query, limit, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { fetchSiteSettings, loadSiteSettings, optimizeImage } from './common.js';

let products = [];
let categories = new Map();
let activeProduct = null;
let companyName = 'JR-UD-HUB';
let lastMalayalam = true;

const escapeHTML = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
const normalise = value => String(value || '').toLowerCase();
const isMalayalam = text => /[\u0D00-\u0D7F]/.test(text);
const tokens = text => normalise(text).split(/[^\p{L}\p{N}]+/u).filter(word => word.length > 1);
const discountPercent = product => {
    const mrp = Number(product.mrp || 0); const price = Number(product.price || 0);
    return mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
};

export async function initExplorePage() {
    const messages = document.getElementById('chat-messages');
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    if (!messages || !form || !input) return;
    await loadSiteSettings();
    const settings = await fetchSiteSettings();
    companyName = settings?.logoText || companyName;
    document.getElementById('chatbot-brand').textContent = companyName;
    addAssistantMessage(welcomeMessage());
    loadCatalogData();
    form.addEventListener('submit', event => { event.preventDefault(); submitQuestion(input.value); });
    document.getElementById('clear-chat-btn')?.addEventListener('click', () => { activeProduct = null; messages.innerHTML = ''; addAssistantMessage(welcomeMessage()); input.focus(); });
    input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 130)}px`; });
}
document.addEventListener('DOMContentLoaded', initExplorePage, { once: true });

async function loadCatalogData() {
    try {
        const [productSnapshot, categorySnapshot] = await Promise.all([
            getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(100))),
            getDocs(collection(db, 'categories'))
        ]);
        products = productSnapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        categories = new Map(categorySnapshot.docs.map(item => [item.id, item.data().name || '']));
    } catch (error) {
        console.error('ChatBot catalog loading error:', error);
        const productSnapshot = await getDocs(query(collection(db, 'products'), limit(100)));
        products = productSnapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    }
}

function welcomeMessage() { return `Hello! ഞാൻ ${companyName} Assistant ആണ്.\n\nഞങ്ങളുടെ products-ുമായി ബന്ധപ്പെട്ട എന്ത് ചോദ്യവും മലയാളത്തിലോ English-ലോ അയക്കാം.`; }

async function submitQuestion(question) {
    const input = document.getElementById('chat-input'); const send = document.getElementById('chat-send-btn');
    const cleanQuestion = question.trim(); if (!cleanQuestion) return;
    lastMalayalam = isMalayalam(cleanQuestion);
    addUserMessage(cleanQuestion); input.value = ''; input.style.height = 'auto'; send.disabled = true;
    if (!products.length) await loadCatalogData();
    const response = answerQuestion(cleanQuestion);
    addAssistantMessage(response.text, response.products); send.disabled = false; input.focus();
}

function answerQuestion(question) {
    const ml = isMalayalam(question); const q = normalise(question);
    const searchText = activeProduct ? `${activeProduct.name} ${question}` : question;
    let matches = rankProducts(searchText);
    const discountQuery = /discount|offer|%|percentage|ഡിസ്കൗണ്ട്|ഓഫർ|ശതമാനം/.test(q);
    const priceLimit = extractPriceLimit(q);
    const categoryIds = matchingCategoryIds(q);
    if (categoryIds.length) matches = matches.filter(item => categoryIds.includes(item.categoryId));
    if (discountQuery) matches = matches.filter(item => discountPercent(item) > 0);
    if (priceLimit) matches = matches.filter(item => Number(item.price || 0) <= priceLimit);
    matches = sortForQuestion(matches, q).slice(0, 10);
    const selected = activeProduct || matches[0];
    const wantsProtein = /protein|പ്രോട്ടീൻ/.test(q);
    const wantsIngredients = /ingredient|ingredients|ചേരുവ|ഇൻഗ്രീഡിയൻറ്/.test(q);
    const wantsSpecs = /specification|specifications|spec|സ്പെസിഫിക്ക/.test(q);
    if (isGeneralProductQuestion(q, categoryIds, wantsProtein, wantsIngredients, wantsSpecs, discountQuery, priceLimit)) {
        return { text: categoryOverview(ml), products: [] };
    }
    if ((wantsProtein || wantsIngredients || wantsSpecs) && selected) return { text: productDetailsAnswer(selected, wantsProtein, wantsIngredients, wantsSpecs, ml), products: [selected] };
    if (discountQuery || priceLimit || categoryIds.length || matches.length) {
        const intro = resultIntro(matches.length, categoryIds, discountQuery, priceLimit, ml);
        return { text: intro, products: matches };
    }
    return { text: ml ? 'യോജിക്കുന്ന product അല്ലെങ്കിൽ category കണ്ടെത്താനായില്ല. പേര്, category, price, discount, ingredients അല്ലെങ്കിൽ protein ചേർത്ത് വീണ്ടും ചോദിക്കൂ.' : 'I could not find a matching product or category. Please try a name, category, price, discount, ingredients, or protein.', products: [] };
}

function isGeneralProductQuestion(question, categoryIds, protein, ingredients, specs, discount, priceLimit) {
    const asksForProducts = /product|products|പ്രോഡക്റ്റ്|ഉൽപ്പന്ന/.test(question);
    return asksForProducts && !categoryIds.length && !protein && !ingredients && !specs && !discount && !priceLimit;
}

function categoryOverview(ml) {
    const names = [...categories.values()].filter(Boolean);
    if (!names.length) return ml ? 'Products load ചെയ്യുന്നു. ഒരു നിമിഷം കഴിഞ്ഞ് വീണ്ടും ചോദിക്കൂ.' : 'Products are loading. Please ask again in a moment.';
    const categoryList = names.join(', ');
    return ml
        ? `ഞങ്ങൾക്ക് ലഭ്യമായ categories: ${categoryList}.\n\nനിങ്ങൾക്ക് ഏത് category ആണ് വേണ്ടത്? Category name പറഞ്ഞാൽ അതിലെ products കാണിക്കാം.`
        : `Available categories: ${categoryList}.\n\nWhich category do you need? Tell me a category name and I will show its products.`;
}

function rankProducts(question) {
    const words = tokens(question);
    return products.map(product => {
        const categoryName = categories.get(product.categoryId) || '';
        const searchable = normalise([product.name, categoryName, product.description, product.specification, product.ingredients, product.dietTags, product.searchKeywords, product.proteinPerServing, product.allergens].join(' '));
        const score = words.reduce((total, word) => total + (searchable.includes(word) ? 2 : 0), 0) + (normalise(product.name).includes(normalise(question)) ? 8 : 0);
        return { ...product, score };
    }).filter(product => product.score > 0);
}

function matchingCategoryIds(question) {
    const words = tokens(question);
    return [...categories.entries()].filter(([, name]) => {
        const categoryWords = tokens(name);
        return categoryWords.some(word => words.some(queryWord => word.includes(queryWord) || queryWord.includes(word) || word.slice(0, 5) === queryWord.slice(0, 5)));
    }).map(([id]) => id);
}

function sortForQuestion(items, question) {
    const highDiscount = /highest|more discount|കൂടുതൽ.*ഡിസ്കൗണ്ട്|വലിയ.*ഡിസ്കൗണ്ട്/.test(question);
    const lowDiscount = /lowest|less discount|കുറഞ്ഞ.*ഡിസ്കൗണ്ട്/.test(question);
    const highPrice = /highest price|expensive|വില.*കൂടിയ|കൂടിയ.*വില/.test(question);
    const lowPrice = /lowest price|cheapest|വില.*കുറഞ്ഞ|കുറഞ്ഞ.*വില/.test(question);
    return [...items].sort((a, b) => {
        if (highDiscount) return discountPercent(b) - discountPercent(a);
        if (lowDiscount) return discountPercent(a) - discountPercent(b);
        if (highPrice) return Number(b.price || 0) - Number(a.price || 0);
        if (lowPrice) return Number(a.price || 0) - Number(b.price || 0);
        return b.score - a.score;
    });
}

function resultIntro(count, categoryIds, discount, priceLimit, ml) {
    const categoryName = categoryIds.length ? categories.get(categoryIds[0]) : '';
    if (ml) return `${categoryName ? `${categoryName} category-യിലെ ` : ''}${discount ? 'discount ഉള്ള ' : ''}${priceLimit ? `₹${priceLimit} ന് താഴെയുള്ള ` : ''}${count} products കണ്ടെത്തി.`;
    return `Found ${count} ${discount ? 'discounted ' : ''}${categoryName ? `${categoryName} ` : ''}${priceLimit ? `products under ₹${priceLimit}` : 'matching products'}.`;
}

function extractPriceLimit(question) { const match = question.match(/(?:under|below|less than|താഴെ|കുറവ്|₹|rs\.?)[^\d]{0,6}(\d{2,6})|(\d{2,6})\s*(?:ന്|രൂപ|rs|inr)/i); return Number(match?.[1] || match?.[2] || 0) || null; }
function productDetailsAnswer(product, protein, ingredients, specs, ml) {
    const details = [];
    if (protein) details.push(product.proteinPerServing ? `Protein per serving: ${product.proteinPerServing}` : (ml ? 'Protein വിവരം ഇപ്പോൾ ലഭ്യമല്ല.' : 'Protein information is not available yet.'));
    if (ingredients) details.push(product.ingredients ? `Ingredients: ${product.ingredients}` : (ml ? 'Ingredients വിവരം ഇപ്പോൾ ലഭ്യമല്ല.' : 'Ingredients information is not available yet.'));
    if (specs) details.push(product.specification ? `Specification: ${product.specification}` : (ml ? 'Specification വിവരം ഇപ്പോൾ ലഭ്യമല്ല.' : 'Specification information is not available yet.'));
    return `${product.name}\n\n${details.join('\n\n')}`;
}

function addUserMessage(text) { addMessage('user', 'You', escapeHTML(text)); }
function addAssistantMessage(text, recommendedProducts = []) { addMessage('assistant', `${companyName} Assistant`, escapeHTML(text), recommendedProducts); }
function addMessage(role, label, text, recommendedProducts = [], controls = []) {
    const messages = document.getElementById('chat-messages'); const element = document.createElement('article');
    element.className = `chat-message ${role}`; element.innerHTML = `<span class="message-label">${escapeHTML(label)}</span><div class="message-bubble">${text}</div>`;
    if (controls.length) { const actions = document.createElement('div'); actions.className = 'chat-followup-options'; controls.forEach(control => { const button = document.createElement('button'); button.textContent = control.label; button.addEventListener('click', control.action); actions.appendChild(button); }); element.appendChild(actions); }
    if (recommendedProducts.length) { const cards = document.createElement('div'); cards.className = 'chat-products'; recommendedProducts.forEach(product => cards.appendChild(productCard(product))); element.appendChild(cards); }
    messages.appendChild(element); messages.scrollTop = messages.scrollHeight;
}
function productCard(product) {
    const card = document.createElement('article'); card.className = 'chat-product'; const image = product.images?.[0] || 'https://placehold.co/300x300/1e1e1e/D4AF37?text=Product';
    const discount = discountPercent(product); const meta = discount ? `${discount}% OFF` : (product.dietTags || product.proteinPerServing || '');
    card.innerHTML = `<img src="${escapeHTML(optimizeImage(image, 300))}" alt="${escapeHTML(product.name)}" loading="lazy"><div class="chat-product-info"><p class="chat-product-name">${escapeHTML(product.name)}</p><div class="chat-product-price">₹${escapeHTML(product.price || 0)}</div>${meta ? `<p class="chat-product-meta">${escapeHTML(meta)}</p>` : ''}<div class="chat-product-actions"><a href="product.html?id=${encodeURIComponent(product.id)}">View</a><button type="button">Follow up</button></div></div>`;
    card.querySelector('button').addEventListener('click', () => openFollowUp(product)); return card;
}
function openFollowUp(product) {
    activeProduct = product;
    const unavailable = label => lastMalayalam ? `${label} വിവരം ഇപ്പോൾ ലഭ്യമല്ല.` : `${label} information is not available yet.`;
    addMessage('assistant', `${companyName} Assistant`, lastMalayalam ? `ഇനി ${product.name} -നെക്കുറിച്ച് തിരഞ്ഞെടുക്കൂ.` : `Choose what you want to know about ${product.name}.`, [], [
        { label: 'Description', action: () => sendFollowUpChoice('Description', product.description ? `${product.name}\n\n${product.description}` : unavailable('Description')) },
        { label: 'Specification', action: () => sendFollowUpChoice('Specification', product.specification ? `${product.name}\n\n${product.specification}` : unavailable('Specification')) },
        { label: 'Price', action: () => sendFollowUpChoice('Price', priceMessage(product)) }
    ]);
    document.getElementById('chat-input')?.focus();
}
function sendFollowUpChoice(label, response) {
    addUserMessage(label);
    addAssistantMessage(response);
}
function priceMessage(product) {
    const mrp = Number(product.mrp || 0); const price = Number(product.price || 0); const saving = mrp > price ? mrp - price : 0; const discount = discountPercent(product);
    return lastMalayalam
        ? `${product.name}\n\nMRP: ₹${mrp || price}\nOffer price: ₹${price}\n${saving ? `ലാഭം: ₹${saving} (${discount}% OFF)` : 'നിലവിലെ വില മുകളിൽ കാണിച്ചിരിക്കുന്നു.'}`
        : `${product.name}\n\nMRP: ₹${mrp || price}\nOffer price: ₹${price}\n${saving ? `You save: ₹${saving} (${discount}% OFF)` : 'The current selling price is shown above.'}`;
}
