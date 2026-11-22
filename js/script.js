/**
 * Smart Shopping Cart & Cash Out Charge Calculator
 * Developed for Tanym Barakah
 * Futuristic Materialistic UI Engine & Android APK WebView WhatsApp Share Fix
 */

// ==========================================================================
// Application State
// ==========================================================================
let currentOperator = 'bkash'; // 'bkash', 'nagad', 'rocket', 'upay'
let currentMethod = 'app';     // 'app', 'ussd'
let isCartSyncActive = true;

// MFS Rates configuration (% charge)
const MFS_RATES = {
    bkash: {
        name: 'বিকাশ',
        app: 1.85,
        priyo: 1.49,
        ussd: 1.85,
        appPerThousand: 18.50,
        priyoPerThousand: 14.90,
        ussdPerThousand: 18.50
    },
    nagad: {
        name: 'নগদ',
        app: 1.494, // 1.25% + VAT = ~1.494%
        ussd: 1.99,
        appPerThousand: 14.94,
        ussdPerThousand: 19.90
    },
    rocket: {
        name: 'রকেট',
        app: 1.67,
        ussd: 1.67,
        appPerThousand: 16.70,
        ussdPerThousand: 16.70
    },
    upay: {
        name: 'উপায়',
        app: 1.40,
        ussd: 1.40,
        appPerThousand: 14.00,
        ussdPerThousand: 14.00
    }
};

// ==========================================================================
// Core Cart Management Functions (Backward-Compatible)
// ==========================================================================

/**
 * Adds a new item row to the shopping cart
 */
function addItem(name = "", price = "", isCompleted = false) {
    const cartBody = document.getElementById("cart-body");
    if (!cartBody) return;

    const newRow = cartBody.insertRow(cartBody.rows.length);
    newRow.className = "cart-row" + (isCompleted ? " is-completed" : "");

    const itemCell = newRow.insertCell(0);
    const priceCell = newRow.insertCell(1);
    const actionCell = newRow.insertCell(2);

    actionCell.className = "action-cell";
    actionCell.style.textAlign = "center";

    // Item name input
    itemCell.innerHTML = `
        <input type="text" 
               class="item-input ${isCompleted ? 'complete-mark' : ''}" 
               placeholder="Item name / বিবরণ" 
               value="${escapeHtml(name)}" 
               oninput="saveCartToStorage(); updateStats();"
               aria-label="Item description">
    `;

    // Price input with currency symbol
    priceCell.innerHTML = `
        <div class="price-input-wrapper">
            <span class="currency-symbol">৳</span>
            <input type="number" 
                   class="price-input ${isCompleted ? 'complete-mark' : ''}" 
                   placeholder="0.00" 
                   step="0.01" 
                   min="0" 
                   value="${price !== "" ? price : ""}" 
                   oninput="updateTotal(); saveCartToStorage();"
                   onkeydown="handlePriceKeydown(event, this)"
                   aria-label="Item price in BDT">
        </div>
    `;

    // Action buttons
    actionCell.innerHTML = `
        <button type="button" 
                class="action-btn complete-btn ${isCompleted ? 'completed' : ''}" 
                onclick="completePurchase(this)" 
                title="${isCompleted ? 'Mark Pending' : 'Complete Purchase'}">
            <i class="fa-solid ${isCompleted ? 'fa-circle-check' : 'fa-check'}"></i>
            <span class="btn-text">${isCompleted ? 'Done' : 'Complete'}</span>
        </button>
        <button type="button" 
                class="action-btn delete-btn" 
                onclick="deleteItem(this)" 
                title="Delete Item">
            <i class="fa-solid fa-trash-can"></i>
            <span class="btn-text">Delete</span>
        </button>
    `;

    updateTotal();
    checkEmptyState();
    saveCartToStorage();

    // Auto-focus on new input if manually added
    if (!name && !price) {
        const input = itemCell.querySelector(".item-input");
        if (input) input.focus();
    }
}

/**
 * Handles enter key in price input to quickly add next item
 */
function handlePriceKeydown(e, input) {
    if (e.key === "Enter") {
        e.preventDefault();
        addItem();
    }
}

/**
 * Removes an item row from the shopping cart
 */
function deleteItem(button) {
    const row = button.closest("tr");
    if (!row) return;

    row.style.opacity = "0";
    row.style.transform = "translateX(20px)";
    row.style.transition = "all 0.25s ease";

    setTimeout(() => {
        if (row.parentNode) {
            row.parentNode.removeChild(row);
        }
        updateTotal();
        checkEmptyState();
        saveCartToStorage();
    }, 200);
}

/**
 * Marks an item as completed or toggles status
 */
function completePurchase(button) {
    const row = button.closest("tr");
    if (!row) return;

    const itemInput = row.querySelector(".item-input");
    const priceInput = row.querySelector(".price-input");

    const item = itemInput ? itemInput.value.trim() : "";
    const price = priceInput ? priceInput.value.trim() : "";

    if (item === "" || isNaN(parseFloat(price))) {
        showToast("দয়া করে আইটেমের নাম এবং সঠিক দাম লিখুন!", "warning");
        if (itemInput && item === "") itemInput.focus();
        else if (priceInput) priceInput.focus();
        return;
    }

    const isAlreadyCompleted = row.classList.contains("is-completed");

    if (isAlreadyCompleted) {
        // Uncomplete
        row.classList.remove("is-completed");
        if (itemInput) itemInput.classList.remove("complete-mark");
        if (priceInput) priceInput.classList.remove("complete-mark");
        button.classList.remove("completed");
        button.innerHTML = '<i class="fa-solid fa-check"></i> <span class="btn-text">Complete</span>';
        button.title = "Complete Purchase";
        showToast(`আইটেম পেন্ডিং তালিকায় ফেরত নেওয়া হয়েছে: ${item}`, "info");
    } else {
        // Complete
        row.classList.add("is-completed");
        if (itemInput) itemInput.classList.add("complete-mark");
        if (priceInput) priceInput.classList.add("complete-mark");
        button.classList.add("completed");
        button.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span class="btn-text">Done</span>';
        button.title = "Mark Pending";
        showToast(`ক্রয় সম্পন্ন: ${item} (৳${parseFloat(price).toFixed(2)})`, "success");
    }

    updateTotal();
    saveCartToStorage();
}

/**
 * Recalculates the grand total of all shopping items
 */
function updateTotal() {
    let total = 0;
    const priceInputs = document.getElementsByClassName("price-input");

    for (let i = 0; i < priceInputs.length; i++) {
        const val = parseFloat(priceInputs[i].value);
        if (!isNaN(val) && val > 0) {
            total += val;
        }
    }

    // Exact string output preservation: "Grand Total: ৳0.00"
    const totalElem = document.getElementById("total");
    if (totalElem) {
        totalElem.textContent = "Grand Total: ৳" + total.toFixed(2);
    }

    updateStats();
    
    // Automatically recalculate Cash Out Charge if auto-sync is on
    if (isCartSyncActive) {
        updateCashOutCalculation(total);
    }
}

/**
 * Updates quick stats counters
 */
function updateStats() {
    const rows = document.querySelectorAll("#cart-body tr");
    let totalItems = 0;
    let doneItems = 0;
    let pendingItems = 0;

    rows.forEach(row => {
        const itemInput = row.querySelector(".item-input");
        const priceInput = row.querySelector(".price-input");
        const hasText = itemInput && itemInput.value.trim() !== "";
        const hasPrice = priceInput && !isNaN(parseFloat(priceInput.value));

        if (hasText || hasPrice) {
            totalItems++;
            if (row.classList.contains("is-completed")) {
                doneItems++;
            } else {
                pendingItems++;
            }
        }
    });

    const statTotal = document.getElementById("statTotalItems");
    const statDone = document.getElementById("statDoneItems");
    const statPending = document.getElementById("statPendingItems");
    const badge = document.getElementById("itemCountBadge");

    if (statTotal) statTotal.textContent = toBengaliNum(totalItems);
    if (statDone) statDone.textContent = toBengaliNum(doneItems);
    if (statPending) statPending.textContent = toBengaliNum(pendingItems);
    if (badge) badge.textContent = `${toBengaliNum(totalItems)} টি পণ্য`;
}

/**
 * Checks if cart is empty and toggles empty state illustration
 */
function checkEmptyState() {
    const cartBody = document.getElementById("cart-body");
    const emptyState = document.getElementById("emptyState");
    const cartTable = document.getElementById("cart");

    if (!cartBody || !emptyState) return;

    if (cartBody.rows.length === 0) {
        emptyState.style.display = "flex";
        if (cartTable) cartTable.style.display = "table";
    } else {
        emptyState.style.display = "none";
        if (cartTable) cartTable.style.display = "table";
    }
}

/**
 * Clears the entire cart with confirmation
 */
function clearCart() {
    const rows = document.querySelectorAll("#cart-body tr");
    if (rows.length === 0) {
        showToast("শপিং লিস্ট ইতিমধ্যেই খালি!", "info");
        return;
    }

    if (window.confirm("আপনি কি নিশ্চিত যে সম্পূর্ণ শপিং লিস্ট মুছে ফেলতে চান?")) {
        const cartBody = document.getElementById("cart-body");
        if (cartBody) cartBody.innerHTML = "";
        updateTotal();
        checkEmptyState();
        saveCartToStorage();
        showToast("সম্পূর্ণ তালিকা মুছে ফেলা হয়েছে!", "info");
    }
}

// ==========================================================================
// WHATSAPP SHARE FIX (DESKTOP + ANDROID APK WEBVIEW 100% COMPATIBLE)
// ==========================================================================

/**
 * Generates formatted text of the shopping cart
 */
function generateCartText() {
    const cartItems = document.querySelectorAll(".item-input");
    const cartPrices = document.querySelectorAll(".price-input");

    let message = "🛒 Shopping Cart:\n";
    let validItemCount = 0;

    for (let i = 0; i < cartItems.length; i++) {
        const item = cartItems[i].value.trim();
        const price = cartPrices[i].value.trim();

        if (item !== "" && !isNaN(parseFloat(price))) {
            const row = cartItems[i].closest("tr");
            const isDone = row && row.classList.contains("is-completed");
            const mark = isDone ? "✅ " : "▫️ ";
            message += `${mark}${item}: ৳${parseFloat(price).toFixed(2)}\n`;
            validItemCount++;
        }
    }

    const totalElement = document.getElementById("total");
    const totalValue = totalElement ? totalElement.textContent : "Grand Total: ৳0.00";
    message += "\n" + totalValue;

    // Check if Cash Out details should be included
    const includeCashout = document.getElementById("includeCashoutInShare");
    if (includeCashout && includeCashout.checked) {
        const fee = document.getElementById("calcFeeAmount")?.textContent || "";
        const totalNeeded = document.getElementById("calcTotalNeeded")?.textContent || "";
        const rateLabel = document.getElementById("calcOpRateLabel")?.textContent || "";

        if (fee && totalNeeded && fee !== "৳০.০০") {
            message += `\n\n💳 ক্যাশ আউট চার্জ (${rateLabel}): ${fee}`;
            message += `\nসর্বমোট টাকা প্রয়োজন: ${totalNeeded}`;
        }
    }

    // Adding date and time
    const dateTime = new Date().toLocaleString();
    message += "\nDate and Time: " + dateTime;

    return { message, validItemCount };
}

/**
 * Share to WhatsApp - Fixed for Android APK WebView & PC Browsers
 */
function shareToWhatsApp() {
    const { message, validItemCount } = generateCartText();

    if (validItemCount === 0) {
        showToast("দয়া করে শেয়ার করার আগে অন্তত একটি আইটেম যোগ করুন!", "warning");
        return;
    }

    const encodedMessage = encodeURIComponent(message);

    // URI schemes
    const whatsappUri = "whatsapp://send?text=" + encodedMessage;
    const waMeUrl = "https://wa.me/?text=" + encodedMessage;
    const apiWhatsAppUrl = "https://api.whatsapp.com/send?text=" + encodedMessage;

    // Detect Android, iOS, and Mobile environments
    const ua = navigator.userAgent || navigator.vendor || window.opera || "";
    const isAndroid = /android/i.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isMobile = isAndroid || isIOS;

    showToast("হোয়াটসঅ্যাপ খোলা হচ্ছে...", "info");

    if (isMobile) {
        /**
         * WHY ANDROID APK FAILED PREVIOUSLY:
         * In an Android WebView (Website-to-APK wrapper), window.open(url, '_blank') fails 
         * because multi-window support is disabled by default in WebView.
         * 
         * FIX:
         * 1. Triggering an <a> tag with whatsapp:// URI and target="_top" or directly navigating
         *    causes Android's WebViewClient / OS Intent resolver to invoke the WhatsApp application directly!
         * 2. If the APK wrapper doesn't handle custom URI schemes (ERR_UNKNOWN_URL_SCHEME),
         *    a fallback timer uses Web Share API or navigates to wa.me!
         */
        let openedApp = false;

        try {
            // Anchor tag trigger with whatsapp:// scheme
            const anchor = document.createElement("a");
            anchor.setAttribute("href", whatsappUri);
            anchor.setAttribute("target", "_top");
            anchor.style.display = "none";
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            openedApp = true;
        } catch (err) {
            console.warn("Anchor intent trigger error, falling back:", err);
            window.location.href = whatsappUri;
        }

        // Safety fallback timer for strict WebViews
        const startTime = Date.now();
        setTimeout(() => {
            // If user did not leave the app/page (e.g. WhatsApp didn't open within 700ms)
            if (Date.now() - startTime < 1800 && !document.hidden) {
                if (navigator.share) {
                    navigator.share({
                        title: "শপিং লিস্ট (Shopping List)",
                        text: message
                    }).catch(shareErr => {
                        if (shareErr.name !== "AbortError") {
                            window.location.href = waMeUrl;
                        }
                    });
                } else {
                    window.location.href = waMeUrl;
                }
            }
        }, 700);

    } else {
        // Desktop PC Browser:
        // window.open to api.whatsapp.com opens WhatsApp Web or WhatsApp Desktop
        const win = window.open(apiWhatsAppUrl, "_blank", "noopener,noreferrer");
        if (!win || win.closed || typeof win.closed === "undefined") {
            // If popup blocker intervened, redirect in current tab
            window.location.href = apiWhatsAppUrl;
        }
    }
}

/**
 * Copies shopping cart text to system clipboard
 */
function copyToClipboard() {
    const { message, validItemCount } = generateCartText();

    if (validItemCount === 0) {
        showToast("কপি করার জন্য অন্তত একটি আইটেম যোগ করুন!", "warning");
        return;
    }

    // Modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message)
            .then(() => {
                showToast("শপিং লিস্ট সফলভাবে কপি করা হয়েছে!", "success");
            })
            .catch(() => {
                fallbackCopyText(message);
            });
    } else {
        fallbackCopyText(message);
    }
}

/**
 * Fallback copy method for older WebViews / HTTP contexts
 */
function fallbackCopyText(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showToast("শপিং লিস্ট সফলভাবে কপি করা হয়েছে!", "success");
        } else {
            showToast("ক্লিপবোর্ডে কপি করা যায়নি!", "warning");
        }
    } catch (err) {
        console.error("Copy command failed:", err);
        showToast("কপি করতে সমস্যা হয়েছে!", "warning");
    } finally {
        document.body.removeChild(textarea);
    }
}

// ==========================================================================
// CENTERED CASH OUT CHARGE CALCULATOR ENGINE
// ==========================================================================

/**
 * Sets selected MFS Operator (bkash, nagad, rocket, upay)
 */
function selectOperator(opKey) {
    if (!MFS_RATES[opKey]) return;
    currentOperator = opKey;

    // Update active button state
    const buttons = document.querySelectorAll(".op-btn");
    buttons.forEach(btn => {
        if (btn.getAttribute("data-op") === opKey) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // Toggle bKash Priyo option visibility
    const priyoContainer = document.getElementById("bkashPriyoContainer");
    if (priyoContainer) {
        priyoContainer.style.display = (opKey === "bkash" && currentMethod === "app") ? "inline-flex" : "none";
    }

    updateCashOutCalculation();
}

/**
 * Sets cash out method ('app' or 'ussd')
 */
function setCashoutMethod(method) {
    currentMethod = method;

    const appBtn = document.getElementById("methodAppBtn");
    const ussdBtn = document.getElementById("methodUssdBtn");

    if (method === 'app') {
        if (appBtn) appBtn.classList.add("active");
        if (ussdBtn) ussdBtn.classList.remove("active");
    } else {
        if (appBtn) appBtn.classList.remove("active");
        if (ussdBtn) ussdBtn.classList.add("active");
    }

    // Toggle Priyo option
    const priyoContainer = document.getElementById("bkashPriyoContainer");
    if (priyoContainer) {
        priyoContainer.style.display = (currentOperator === "bkash" && method === "app") ? "inline-flex" : "none";
    }

    updateCashOutCalculation();
}

/**
 * Toggles auto-sync with shopping cart grand total
 */
function toggleCartSync() {
    const checkbox = document.getElementById("syncWithCartCheckbox");
    const manualWrapper = document.getElementById("manualAmountWrapper");

    isCartSyncActive = checkbox ? checkbox.checked : true;

    if (manualWrapper) {
        manualWrapper.style.display = isCartSyncActive ? "none" : "block";
    }

    if (!isCartSyncActive) {
        const manualInput = document.getElementById("customCashoutAmount");
        if (manualInput) {
            const currentTotal = getCartTotalNumeric();
            manualInput.value = currentTotal > 0 ? currentTotal : "";
            manualInput.focus();
        }
    }

    updateCashOutCalculation();
}

/**
 * Extracts numeric value of shopping cart total
 */
function getCartTotalNumeric() {
    let total = 0;
    const priceInputs = document.getElementsByClassName("price-input");
    for (let i = 0; i < priceInputs.length; i++) {
        const val = parseFloat(priceInputs[i].value);
        if (!isNaN(val) && val > 0) total += val;
    }
    return total;
}

/**
 * Updates the Cash Out Charge calculation display
 */
function updateCashOutCalculation(explicitAmount = null) {
    let amount = 0;

    if (isCartSyncActive) {
        amount = explicitAmount !== null ? explicitAmount : getCartTotalNumeric();
    } else {
        const manualInput = document.getElementById("customCashoutAmount");
        const val = manualInput ? parseFloat(manualInput.value) : 0;
        amount = !isNaN(val) && val > 0 ? val : 0;
    }

    const opData = MFS_RATES[currentOperator] || MFS_RATES.bkash;
    let rate = opData.app;
    let rateLabel = `${opData.name} অ্যাপ (${rate}%)`;
    let perThousand = opData.appPerThousand;

    if (currentMethod === 'ussd') {
        rate = opData.ussd;
        perThousand = opData.ussdPerThousand;
        rateLabel = `${opData.name} ইউএসএসডি (${rate}%)`;
    } else if (currentOperator === 'bkash') {
        const priyoCheckbox = document.getElementById("bkashPriyoCheckbox");
        if (priyoCheckbox && priyoCheckbox.checked) {
            rate = opData.priyo;
            perThousand = opData.priyoPerThousand;
            rateLabel = `${opData.name} প্রিয় এজেন্ট (${rate}%)`;
        }
    }

    // Calculate fee: (amount * rate) / 100
    const fee = (amount * rate) / 100;
    const totalNeeded = amount + fee;

    // Update DOM
    const baseElem = document.getElementById("calcBaseAmount");
    const rateElem = document.getElementById("calcOpRateLabel");
    const feeElem = document.getElementById("calcFeeAmount");
    const perThousandElem = document.getElementById("calcFeePerThousand");
    const totalNeededElem = document.getElementById("calcTotalNeeded");

    if (baseElem) baseElem.textContent = `৳${formatNumber(amount)}`;
    if (rateElem) rateElem.textContent = rateLabel;
    if (feeElem) feeElem.textContent = `৳${formatNumber(fee)}`;
    if (perThousandElem) perThousandElem.textContent = `৳${perThousand.toFixed(2)} প্রতি হাজারে`;
    if (totalNeededElem) totalNeededElem.textContent = `৳${formatNumber(totalNeeded)}`;
}

// ==========================================================================
// Theme Management & Local Storage Persistence
// ==========================================================================

/**
 * Toggles Dark & Light Theme
 */
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme") || "dark";
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    html.setAttribute("data-theme", newTheme);
    localStorage.setItem("shopping_cart_theme", newTheme);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute("content", newTheme === "dark" ? "#080c14" : "#f0f4f9");
    }
}

/**
 * Initializes saved theme
 */
function initTheme() {
    const savedTheme = localStorage.getItem("shopping_cart_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute("content", savedTheme === "dark" ? "#080c14" : "#f0f4f9");
    }
}

// ==========================================================================
// Toast Notification Engine
// ==========================================================================
let toastTimer = null;

function showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMsg");
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.className = `toast show ${type}`;

    const icon = toast.querySelector("i");
    if (icon) {
        if (type === "success") icon.className = "fa-solid fa-circle-check";
        else if (type === "warning") icon.className = "fa-solid fa-triangle-exclamation";
        else icon.className = "fa-solid fa-circle-info";
    }

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.className = "toast";
    }, 3200);
}

// ==========================================================================
// Local Storage Persistence for Shopping Items
// ==========================================================================

function saveCartToStorage() {
    const rows = document.querySelectorAll("#cart-body tr");
    const items = [];

    rows.forEach(row => {
        const itemInput = row.querySelector(".item-input");
        const priceInput = row.querySelector(".price-input");
        const isCompleted = row.classList.contains("is-completed");

        if (itemInput && priceInput) {
            items.push({
                name: itemInput.value,
                price: priceInput.value,
                isCompleted: isCompleted
            });
        }
    });

    try {
        localStorage.setItem("shopping_cart_items", JSON.stringify(items));
    } catch (e) {
        console.warn("Could not save to localStorage:", e);
    }
}

function loadCartFromStorage() {
    try {
        const saved = localStorage.getItem("shopping_cart_items");
        if (saved) {
            const items = JSON.parse(saved);
            if (Array.isArray(items) && items.length > 0) {
                items.forEach(item => {
                    addItem(item.name || "", item.price || "", !!item.isCompleted);
                });
                return;
            }
        }
    } catch (e) {
        console.warn("Could not load from localStorage:", e);
    }

    // Default: Add one empty row to get started
    addItem();
}

// ==========================================================================
// Utility Helpers
// ==========================================================================

function formatNumber(num) {
    return parseFloat(num).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function toBengaliNum(num) {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().replace(/\d/g, d => bengaliDigits[d]);
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================================================
// Initialization on Page Load
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    loadCartFromStorage();
    updateCashOutCalculation();
});
