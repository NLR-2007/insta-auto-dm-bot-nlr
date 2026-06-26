import mysql.connector
from mysql.connector import errorcode
import sys

def create_database():
    print("=== MySQL Database Setup ===")
    
    # Try empty password first as it is common for local development
    password = ""
    
    try:
        # Connect to MySQL Server (without specifying db to create it)
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password=password
        )
        print("[INFO] Connected to MySQL with empty password.")
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            # Empty password failed, ask user to provide password or try common local ones
            print("[INFO] Access denied with empty password. Prompting for password...")
            print("Please enter your MySQL root password below (or press Enter if none):")
            password = input("MySQL root password: ").strip()
            try:
                conn = mysql.connector.connect(
                    host="localhost",
                    user="root",
                    password=password
                )
            except mysql.connector.Error as err2:
                print(f"[ERROR] Failed to connect to MySQL: {err2}")
                return False
        else:
            print(f"[ERROR] Unexpected error connecting to MySQL: {err}")
            return False

    cursor = conn.cursor()
    db_name = "insta_automate"
    
    try:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        print(f"[SUCCESS] Database '{db_name}' created or already exists!")
        
        # Verify database select
        cursor.execute(f"USE {db_name}")
        print(f"[SUCCESS] Successfully selected '{db_name}'.")
        
        conn.commit()
    except mysql.connector.Error as err:
        print(f"[ERROR] Failed to create database: {err}")
        return False
    finally:
        cursor.close()
        conn.close()

    # Update the .env file to use MySQL
    env_path = "backend/.env"
    if os.path.exists(env_path):
        try:
            with open(env_path, "r") as f:
                content = f.read()
            
            # Replace database url with the new mysql uri
            new_url = f"DATABASE_URL=mysql+mysqlconnector://root:{password}@localhost:3306/{db_name}"
            
            # If DATABASE_URL is already there, replace it
            if "DATABASE_URL=" in content:
                import re
                content = re.sub(r"DATABASE_URL=.*", new_url, content)
            else:
                content += f"\n{new_url}\n"
                
            with open(env_path, "w") as f:
                f.write(content)
            print("[SUCCESS] Updated backend/.env to use MySQL database connection.")
        except Exception as env_err:
            print(f"[WARNING] Database created but failed to update backend/.env: {env_err}")
            print(f"Please manually set: DATABASE_URL=mysql+mysqlconnector://root:{password}@localhost:3306/{db_name}")

    return True

if __name__ == "__main__":
    import os
    create_database()
