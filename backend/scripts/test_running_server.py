import urllib.request
import json

def test_running_server():
    print("Testing running CHEF server at http://127.0.0.1:8001...")
    url = "http://127.0.0.1:8001/api/demo/seed"
    req = urllib.request.Request(url, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            body = response.read().decode('utf-8')
            print(f"Status Code: {status}")
            print(f"Response: {body}")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_running_server()
