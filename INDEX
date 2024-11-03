<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quote Widget</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f0f0f0;
        }

        .widget {
            width: 300px;
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            text-align: center;
        }

        .quote {
            font-size: 16px;
            margin-bottom: 20px;
            color: #333;
        }

        .image {
            width: 100%;
            height: auto;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <div class="widget">
        <div class="quote" id="quote">Loading quote...</div>
        <img src="" alt="Immagine del giorno" class="image" id="quoteImage">
    </div>

    <script>
        // Array of quotes with associated images
        const quotes = [
            { text: "La vita è ciò che accade mentre siamo impegnati a fare altri progetti.", image: "https://via.placeholder.com/300/ff7f7f" },
            { text: "Non aspettare. Il momento giusto non arriverà mai.", image: "https://via.placeholder.com/300/7f7fff" },
            { text: "Il successo è la somma di piccoli sforzi, ripetuti giorno dopo giorno.", image: "https://via.placeholder.com/300/7fff7f" }
        ];

        // Function to display a random quote and image
        function displayRandomQuote() {
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            document.getElementById('quote').textContent = randomQuote.text;
            document.getElementById('quoteImage').src = randomQuote.image;
        }

        // Display a quote on page load
        displayRandomQuote();
    </script>
</body>
</html>
