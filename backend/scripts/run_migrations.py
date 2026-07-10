import os
import sqlite3

def run_migrations():
    # Detect all possible chef.db paths
    db_paths = [
        "/Users/sabasaeed/0_Saba CSE/IIT Patna/Sem 2/Capstone/CHEF/CHEF/chef.db",
        "/Users/sabasaeed/chef.db",
        "/Users/sabasaeed/0_Saba CSE/IIT Patna/Sem 2/Capstone/CHEF/CHEF/backend/chef.db"
    ]
    
    print("Starting CHEF Database Migrations...")
    
    for path in db_paths:
        if not os.path.exists(path):
            print(f"Skipping non-existent path: {path}")
            continue
            
        print(f"\nMigrating database at: {path}")
        try:
            conn = sqlite3.connect(path)
            cursor = conn.cursor()
            
            # 1. Add allergens column to user_profiles if missing
            cursor.execute("PRAGMA table_info(user_profiles);")
            columns = [col[1] for col in cursor.fetchall()]
            if "allergens" not in columns:
                print("-> Adding column 'allergens' to table 'user_profiles'")
                cursor.execute("ALTER TABLE user_profiles ADD COLUMN allergens VARCHAR(500);")
            else:
                print("-> Column 'allergens' already exists in 'user_profiles'")
                
            # 2. Create pantry_items table if missing
            print("-> Creating table 'pantry_items' if not exists")
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS pantry_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                ingredient_name VARCHAR(255) NOT NULL,
                quantity FLOAT NOT NULL DEFAULT 1.0,
                unit VARCHAR(50) NOT NULL DEFAULT 'serving',
                updated_at DATETIME NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
            """)
            
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_pantry_items_user_id ON pantry_items (user_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_pantry_items_ingredient_name ON pantry_items (ingredient_name);")
            
            conn.commit()
            conn.close()
            print("✓ Migration completed successfully!")
            
        except Exception as e:
            print(f"✗ Migration failed for {path}: {e}")

if __name__ == "__main__":
    run_migrations()
