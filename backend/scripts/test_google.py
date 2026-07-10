import urllib.request
import urllib.parse

query = "Palak Paneer recipe food"
query_encoded = urllib.parse.quote(query)
url = f"https://www.google.com/search?q={query_encoded}&tbm=isch"
req = urllib.request.Request(
    url, 
    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
)

try:
    with urllib.request.urlopen(req, timeout=10) as r:
        html = r.read().decode("latin1")
        with open("backend/scripts/google_test.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("Success! Wrote HTML to backend/scripts/google_test.html")
except Exception as e:
    print("Error:", e)
