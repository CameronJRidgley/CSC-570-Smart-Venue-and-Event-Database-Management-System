#!/usr/bin/env python3
"""
Connection Validator - Checks if Frontend ↔ Backend ↔ Database communication works
Run this to troubleshoot before presenting.

Usage:
  python validate_stack.py
"""

import requests
import json
from typing import Dict, Tuple

# ANSI colors for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*60}")
    print(f"{text}")
    print(f"{'='*60}{Colors.ENDC}\n")

def print_success(text):
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")

def print_warning(text):
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.OKCYAN}ℹ {text}{Colors.ENDC}")

def check_backend() -> Tuple[bool, str]:
    """Check if Backend API is running."""
    print_header("Checking Backend API (http://localhost:8000)")
    
    try:
        # Use /docs (Swagger UI)—always exists on FastAPI
        response = requests.get('http://localhost:8000/docs', timeout=5)
        if response.status_code == 200:
            print_success("Backend API is running!")
            return True, "OK"
        else:
            print_error(f"Backend returned status {response.status_code}")
            return False, f"Status {response.status_code}"
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to http://localhost:8000 — is the backend running?")
        print_info("Start backend with: python -m uvicorn app.main:app --reload (or install uvicorn into your venv)")
        return False, "Connection refused"
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        return False, str(e)

def check_events_endpoint() -> bool:
    """Check if /api/events endpoint works."""
    print_header("Checking /api/events Endpoint")
    
    try:
        response = requests.get('http://localhost:8000/api/events', timeout=5)
        if response.status_code == 200:
            events = response.json()
            print_success(f"/api/events returned {len(events)} events")
            print_info(f"Sample event: {events[0]['name'] if events else 'No events'}")
            return True
        else:
            print_error(f"Got status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Failed to fetch events: {e}")
        return False

def check_auth_endpoint() -> bool:
    """Check if /api/auth/login endpoint works."""
    print_header("Checking /api/auth/login Endpoint")
    
    try:
        # Test with invalid credentials (should return 401, not error)
        response = requests.post(
            'http://localhost:8000/api/auth/login',
            json={"email": "test@example.com", "password": "wrong"},
            timeout=5
        )
        if response.status_code in [401, 422]:
            print_success("Auth endpoint is working (rejected test credentials)")
            return True
        elif response.status_code == 200:
            print_warning("Auth endpoint returned 200 (unexpected)")
            return True
        else:
            print_error(f"Auth endpoint returned {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Failed to reach auth endpoint: {e}")
        return False

def check_swagger_ui() -> bool:
    """Check if Swagger UI is accessible."""
    print_header("Checking Swagger UI (http://localhost:8000/docs)")
    
    try:
        response = requests.get('http://localhost:8000/docs', timeout=5)
        if response.status_code == 200:
            print_success("Swagger UI is accessible")
            print_info("Open http://localhost:8000/docs in browser to test APIs")
            return True
        else:
            print_error(f"Got status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Cannot reach Swagger UI: {e}")
        return False

def check_postgres() -> bool:
    """Check if PostgreSQL is accessible."""
    print_header("Checking PostgreSQL (localhost:5432)")
    
    try:
        import psycopg
        try:
            # psycopg uses 'connect_timeout' (not 'timeout') and 'dbname' for database name
            conn = psycopg.connect(
                host="localhost",
                dbname="event_mgmt",
                user="postgres",
                password="postgres",
                connect_timeout=5
            )
            print_success("PostgreSQL is running and accessible")
            
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM events;")
                count = cur.fetchone()[0]
                print_success(f"Found {count} events in database")
            
            conn.close()
            return True
        except Exception as e:
            print_error(f"Cannot connect to PostgreSQL: {e}")
            print_info("Make sure Docker container is running: docker-compose up -d")
            return False
    except ImportError:
        print_warning("psycopg not installed — skipping direct PostgreSQL check")
        print_info("Install with: pip install psycopg")
        return None

def check_mongodb() -> bool:
    """Check if MongoDB is accessible."""
    print_header("Checking MongoDB (localhost:27017)")
    
    try:
        from pymongo import MongoClient
        try:
            client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=5000)
            # Force a connection to check if it works
            client.admin.command('ping')
            print_success("MongoDB is running and accessible")
            
            db = client['event_mgmt']
            collections = db.list_collection_names()
            print_success(f"Found {len(collections)} collections: {', '.join(collections[:3])}...")
            
            return True
        except Exception as e:
            print_error(f"Cannot connect to MongoDB: {e}")
            print_info("Make sure Docker container is running: docker-compose up -d")
            return False
    except ImportError:
        print_warning("pymongo not installed — skipping direct MongoDB check")
        print_info("Install with: pip install pymongo")
        return None

def check_frontend_cors() -> bool:
    """Check if Frontend can connect to Backend (CORS test)."""
    print_header("Checking CORS Configuration")
    
    try:
        response = requests.get(
            'http://localhost:8000/api/events',
            headers={'Origin': 'http://localhost:5173'},
            timeout=5
        )
        
        # Check if CORS headers are present
        cors_header = response.headers.get('Access-Control-Allow-Origin')
        if cors_header:
            print_success(f"CORS is configured: {cors_header}")
            return True
        else:
            print_warning("No CORS header found — Frontend may not be able to connect")
            return False
    except Exception as e:
        print_error(f"CORS check failed: {e}")
        return False

def generate_report(results: Dict[str, bool]) -> None:
    """Generate a summary report."""
    print_header("VALIDATION REPORT")
    
    total = len([v for v in results.values() if v is not None])
    passed = len([v for v in results.values() if v is True])
    
    for check, result in results.items():
        if result is True:
            print_success(f"{check}")
        elif result is False:
            print_error(f"{check}")
        else:
            print_warning(f"{check} (skipped)")
    
    print_header(f"RESULT: {passed}/{total} checks passed")
    
    if passed == total:
        print(f"{Colors.OKGREEN}{Colors.BOLD}✓ ALL SYSTEMS GO! Ready to present.{Colors.ENDC}\n")
        return True
    else:
        print(f"{Colors.WARNING}{Colors.BOLD}⚠ Some issues detected. See above for fixes.{Colors.ENDC}\n")
        return False

def main():
    print(f"\n{Colors.BOLD}{Colors.OKCYAN}")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║     Smart Event Management — Full Stack Validator         ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"{Colors.ENDC}")
    
    results = {}
    
    # Check Backend
    backend_ok, backend_msg = check_backend()
    results["Backend API (localhost:8000)"] = backend_ok
    
    if backend_ok:
        # Only check endpoints if backend is running
        results["Events Endpoint (/api/events)"] = check_events_endpoint()
        results["Auth Endpoint (/api/auth/login)"] = check_auth_endpoint()
        results["Swagger UI (localhost:8000/docs)"] = check_swagger_ui()
        results["CORS Configuration"] = check_frontend_cors()
    
    # Check Databases
    results["PostgreSQL (localhost:5432)"] = check_postgres()
    results["MongoDB (localhost:27017)"] = check_mongodb()
    
    # Generate report
    all_good = generate_report(results)
    
    # Provide next steps
    print_header("NEXT STEPS")
    if all_good:
        print("1. Open http://localhost:5173 to see the Frontend")
        print("2. Open http://localhost:8000/docs for Swagger API docs")
        print("3. Open http://localhost:5050 for pgAdmin (admin/admin)")
        print("4. Test login with: organizer@example.com / organizer123!")
        print("5. Start your screen recording!\n")
    else:
        print("Please fix the issues above, then run this script again.\n")
        print("Common fixes:")
        print("  • Backend not running?  uvicorn app.main:app --reload")
        print("  • Docker not running?   docker-compose up -d")
        print("  • psycopg missing?      pip install psycopg")
        print("  • pymongo missing?      pip install pymongo\n")

if __name__ == '__main__':
    main()
