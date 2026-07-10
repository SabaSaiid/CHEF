import os
import sys

# Add backend directory to sys.path so we can import app modules
backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_path)

from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, get_db
from app.models import User, UserProfile
from sqlalchemy.orm import Session

client = TestClient(app)

def test_endpoints():
    print("Testing CHEF Backend Feature Upgrades...")
    
    # 1. Test database setup - inspect UserProfile allergens column
    print("\n[1] Verifying UserProfile column: 'allergens'")
    db = next(get_db())
    try:
        # Check if allergens field is accessible in DB
        profile = db.query(UserProfile).first()
        if profile:
            print(f"Active Profile: '{profile.profile_name}', Allergens: '{profile.allergens}'")
            print("✓ Allergens field verified on UserProfile model")
        else:
            print("No profiles in database to inspect, but schema loads successfully")
    except Exception as e:
        print(f"✗ Failed to query UserProfile: {e}")
        return

    # 2. Test Swagger OpenAPI docs structure to ensure routes are registered
    print("\n[2] Checking Registered Endpoints in OpenAPI schema")
    response = client.get("/openapi.json")
    if response.status_code == 200:
        paths = response.json().get("paths", {})
        
        # Verify routes are present
        pantry_registered = "/api/pantry" in paths
        grocery_registered = "/api/mealplan/grocery-list" in paths
        coach_registered = "/api/nutrition/log/coach-insights" in paths
        
        print(f"Pantry Route Registered: {pantry_registered}")
        print(f"Grocery List Route Registered: {grocery_registered}")
        print(f"AI Coach Insights Route Registered: {coach_registered}")
        
        if pantry_registered and grocery_registered and coach_registered:
            print("✓ All 3 new API endpoints successfully registered!")
        else:
            print("✗ One or more routes missing from OpenAPI registry")
    else:
        print("✗ Failed to load OpenAPI schema")

    # 3. Test Demo Seeder
    print("\n[3] Triggering Demo Seeder endpoint")
    res = client.post("/api/demo/seed")
    print(f"Status Code: {res.status_code}")
    try:
        print(f"Response: {res.json()}")
    except Exception:
        print(f"Response (text): {res.text[:400]}")

if __name__ == "__main__":
    test_endpoints()
