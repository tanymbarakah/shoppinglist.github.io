function addItem() {
    var cartBody = document.getElementById("cart-body");
    var newRow = cartBody.insertRow(cartBody.rows.length);
    var itemCell = newRow.insertCell(0);
    var priceCell = newRow.insertCell(1);
    var actionCell = newRow.insertCell(2);

    itemCell.innerHTML = '<input type="text" class="item-input" placeholder="Item">';
    priceCell.innerHTML = '<input type="number" class="price-input" placeholder="Price" step="0.01">';
    actionCell.innerHTML = '<button class="action-btn" onclick="completePurchase(this)">Complete Purchase</button> ' +
        '<button class="action-btn" onclick="deleteItem(this)">Delete</button>';

    updateTotal();
}

function deleteItem(button) {
    var row = button.parentNode.parentNode;
    row.parentNode.removeChild(row);
    updateTotal();
}

function completePurchase(button) {
    var row = button.parentNode.parentNode;
    var item = row.querySelector(".item-input").value;
    var price = row.querySelector(".price-input").value;

    if (item.trim() === "" || isNaN(parseFloat(price))) {
        window.confirm("Please fill in both item and price before completing the purchase.");
        return;
    }

    // Add logic for completing the purchase (e.g., send data to server)
    window.confirm("Purchase completed for item: " + item + " with a price of ৳" + parseFloat(price).toFixed(2));

    // Add complete mark
    row.querySelector(".item-input").classList.add('complete-mark');
    row.querySelector(".price-input").classList.add('complete-mark');

    // Update the total after the purchase
    updateTotal();
}

function updateTotal() {
    var total = 0;
    var priceInputs = document.getElementsByClassName("price-input");

    for (var i = 0; i < priceInputs.length; i++) {
        if (!isNaN(parseFloat(priceInputs[i].value))) {
            total += parseFloat(priceInputs[i].value);
        }
    }

    document.getElementById("total").textContent = "Grand Total: ৳" + total.toFixed(2);
}

function shareToWhatsApp() {
    var cartItems = document.querySelectorAll(".item-input");
    var cartPrices = document.querySelectorAll(".price-input");

    var message = "Shopping Cart:\n";

    for (var i = 0; i < cartItems.length; i++) {
        var item = cartItems[i].value.trim();
        var price = cartPrices[i].value.trim();

        if (item !== "" && !isNaN(parseFloat(price))) {
            message += "Item: " + item + ", Price: ৳" + parseFloat(price).toFixed(2) + "\n";
        }
    }

    var totalValue = document.getElementById("total").textContent;
    message += "\n" + totalValue;

    // Adding date and time
    var dateTime = new Date().toLocaleString();
    message += "\nDate and Time: " + dateTime;

    // Creating a WhatsApp share link
    var whatsappLink = "https://api.whatsapp.com/send?text=" + encodeURIComponent(message);
window.open(whatsappLink, "_blank");
}


function shareOnMessenger() {
            var cartItems = document.querySelectorAll(".item-input");
            var cartPrices = document.querySelectorAll(".price-input");

            var message = "Shopping Cart:\n";

            for (var i = 0; i < cartItems.length; i++) {
                var item = cartItems[i].value.trim();
                var price = cartPrices[i].value.trim();

                if (item !== "" && !isNaN(parseFloat(price))) {
                    message += "Item: " + item + ", Price: ৳" + parseFloat(price).toFixed(2) + "\n";
                }
            }

            var totalValue = document.getElementById("total").textContent;
            message += "\n" + totalValue;

            // Adding date and time
            var dateTime = new Date().toLocaleString();
            message += "\nDate and Time: " + dateTime;

            // Creating a Messenger share link
            var messengerLink = "https://www.facebook.com/dialog/send?link=" + encodeURIComponent(window.location.href) + "&app_id=123456789&redirect_uri=" + encodeURIComponent(window.location.href) + "&display=popup&quote=" + encodeURIComponent(message);
            window.open(messengerLink, "_blank");
        }

        function copyToClipboard() {
        var cartItems = document.querySelectorAll(".item-input");
        var cartPrices = document.querySelectorAll(".price-input");

        var message = "Shopping Cart:\n";

        for (var i = 0; i < cartItems.length; i++) {
            var item = cartItems[i].value.trim();
            var price = cartPrices[i].value.trim();

            if (item !== "" && !isNaN(parseFloat(price))) {
                message += "Item: " + item + ", Price: ৳" + parseFloat(price).toFixed(2) + "\n";
            }
        }

        var totalValue = document.getElementById("total").textContent;
        message += "\n" + totalValue;

        // Adding date and time
        var dateTime = new Date().toLocaleString();
        message += "\nDate and Time: " + dateTime;

        // Create a temporary textarea element to hold the message
        var textarea = document.createElement("textarea");
        textarea.value = message;
        document.body.appendChild(textarea);

        // Use the Clipboard API to copy the content to the clipboard
        navigator.clipboard.writeText(textarea.value)
            .then(function () {
                alert("Shopping cart content copied to clipboard. You can now paste it anywhere.");
            })
            .catch(function (err) {
                console.error('Unable to copy to clipboard', err);
            })
            .finally(function () {
                // Remove the temporary textarea
                document.body.removeChild(textarea);
            });
    
        }
