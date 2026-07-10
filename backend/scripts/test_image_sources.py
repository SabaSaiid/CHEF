import urllib.request
import urllib.parse
import json
import re

TEST_DISHES = ["Palak Paneer", "Chole Bhature", "Besan Ladoo", "Matar Paneer"]

def test_wikipedia(query):
    title = query.strip().title()
    url = "https://en.wikipedia.org/w/api.php?action=query&titles=" + urllib.parse.quote(title) + "&prop=pageimages&format=json&pithumbsize=500&redirects=1"
    
    # Using a specific non-generic User-Agent as required by Wikipedia API policy
    req = urllib.request.Request(
        url, 
        headers={"User-Agent": "CHEFRecipeApp/1.0 (contact@chefapp.com; http://chefapp.com)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res = json.loads(response.read().decode("utf-8"))
            pages = res.get("query", {}).get("pages", {})
            for page_id, page_data in pages.items():
                if "thumbnail" in page_data:
                    return page_data["thumbnail"]["source"]
    except Exception as e:
        return f"Error: {e}"
    return "No image found"

def test_google_images(query):
    query_encoded = urllib.parse.quote(query + " recipe food")
    url = f"https://www.google.com/search?q={query_encoded}&tbm=isch"
    req = urllib.request.Request(
        url, 
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode("latin1")
            
            # Match both direct (=) and escaped (\u003d) gstatic URLs
            links = re.findall(r'https?://encrypted-tbn0\.gstatic\.com/images\?q=(?:[a-zA-Z0-9_=&%\\;-]+)', html)
            if links:
                # Clean up any escaped characters like \u003d
                cleaned = links[0].replace(r"\u003d", "=").replace("\\u003d", "=")
                return cleaned
    except Exception as e:
        return f"Error: {e}"
    return "No image found"

def main():
    print("=" * 60)
    print("Testing Image Sources on User Machine")
    print("=" * 60)
    
    for dish in TEST_DISHES:
        print(f"\nDish: '{dish}'")
        wiki_img = test_wikipedia(dish)
        google_img = test_google_images(dish)
        print(f"  ↳ Wikipedia: {wiki_img}")
        print(f"  ↳ Google Images: {google_img}")

if __name__ == "__main__":
    main()
