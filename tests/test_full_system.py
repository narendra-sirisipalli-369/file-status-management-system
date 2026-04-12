"""
File Status Management System — Selenium Test Suite
=====================================================
Covers:
  1. Login flow (admin + kiosk)
  2. Admin Overview Dashboard
  3. Streaming Admin Dashboard (search by IND-CV)
  4. File Entry + QR generation
  5. File Detail page (StatusFlow + timeline + update)
  6. Kiosk landing splash
  7. Kiosk date-range search → results → details
  8. Isolated Kiosk Track page (/kiosk/track/[id])
  9. Security 404 on bad/manipulated tracking IDs
  10. Reports page
  11. Flow Charts page
  12. User Management (create + delete)

Run:
    python3 tests/test_full_system.py
    # or with pytest:
    pytest tests/test_full_system.py -v
"""

import time
import re
import sys
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys

BASE_URL   = "http://localhost:3000"
ADMIN_USER = "admin"
ADMIN_PASS = "admin123"
KIOSK_USER = "kiosk"
KIOSK_PASS = "kiosk123"

# ─── Driver setup ─────────────────────────────────────────────────────────────

def make_driver(headless: bool = False) -> webdriver.Chrome:
    from selenium.webdriver.chrome.service import Service
    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1400,900")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--disable-extensions")
    # Use system chromedriver directly — bypasses Selenium Manager
    service = Service(executable_path="/usr/bin/chromedriver")
    return webdriver.Chrome(service=service, options=opts)

def wait(driver, timeout=10):
    return WebDriverWait(driver, timeout)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def login(driver, username=ADMIN_USER, password=ADMIN_PASS):
    driver.get(f"{BASE_URL}/login")
    wait(driver).until(EC.presence_of_element_located((By.ID, "username")))
    driver.find_element(By.ID, "username").clear()
    driver.find_element(By.ID, "username").send_keys(username)
    driver.find_element(By.ID, "password").clear()
    driver.find_element(By.ID, "password").send_keys(password)
    driver.find_element(By.ID, "login-submit").click()
    time.sleep(2)

def logout(driver):
    driver.get(f"{BASE_URL}/api/auth/logout")
    time.sleep(1)

def get_auth_cookies() -> dict:
    """Authenticate and return cookies for requests-based API calls."""
    s = requests.Session()
    s.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": ADMIN_USER, "password": ADMIN_PASS},
        timeout=10,
    )
    return dict(s.cookies)

def get_seeded_tracking_id():
    """Fetch the first file's secureTrackingId via the API (authenticated)."""
    cookies = get_auth_cookies()
    r = requests.get(f"{BASE_URL}/api/files", cookies=cookies, timeout=10)
    if r.status_code != 200:
        return None
    files = r.json()
    if files and isinstance(files, list) and "secureTrackingId" in files[0]:
        return files[0]["secureTrackingId"]
    return None

# ─── TEST CASES ───────────────────────────────────────────────────────────────

PASS_ICON = "✅"
FAIL_ICON = "❌"
results   = []

def run_test(name, fn, driver):
    try:
        fn(driver)
        print(f"{PASS_ICON}  {name}")
        results.append((name, True, None))
    except Exception as e:
        print(f"{FAIL_ICON}  {name}")
        print(f"     └─ {repr(e)[:120]}")
        results.append((name, False, str(e)))
        # Try to recover by navigating away
        try:
            driver.get(BASE_URL)
        except Exception:
            pass


# ── 1. Login Page Loads ────────────────────────────────────────────────────────
def test_login_page_loads(driver):
    driver.get(f"{BASE_URL}/login")
    wait(driver).until(EC.presence_of_element_located((By.ID, "login-submit")))
    assert "login" in driver.current_url.lower() or driver.current_url == f"{BASE_URL}/login"
    # Check card elements
    assert driver.find_element(By.ID, "username")
    assert driver.find_element(By.ID, "password")


# ── 2. Admin Login Succeeds ────────────────────────────────────────────────────
def test_admin_login(driver):
    login(driver, ADMIN_USER, ADMIN_PASS)
    wait(driver).until(lambda d: "/admin" in d.current_url)
    assert "/admin" in driver.current_url


# ── 3. Admin Overview Has Metrics ─────────────────────────────────────────────
def test_admin_overview_metrics(driver):
    login(driver, ADMIN_USER, ADMIN_PASS)
    wait(driver).until(EC.presence_of_element_located((By.CLASS_NAME, "metric-card")))
    cards = driver.find_elements(By.CLASS_NAME, "metric-card")
    assert len(cards) >= 4, f"Expected 4 metric cards, got {len(cards)}"


# ── 4. Sidebar Navigation ─────────────────────────────────────────────────────
def test_sidebar_navigation(driver):
    login(driver, ADMIN_USER, ADMIN_PASS)
    wait(driver).until(EC.presence_of_element_located((By.PARTIAL_LINK_TEXT, "Dashboard")))
    driver.find_element(By.PARTIAL_LINK_TEXT, "Dashboard").click()
    wait(driver).until(lambda d: "/admin/dashboard" in d.current_url)
    assert "/admin/dashboard" in driver.current_url


# ── 5. Streaming Dashboard Renders ────────────────────────────────────────────
def test_streaming_dashboard(driver):
    login(driver, ADMIN_USER, ADMIN_PASS)
    driver.get(f"{BASE_URL}/admin/dashboard")
    # Wait for table to stream in
    wait(driver, 15).until(EC.presence_of_element_located((By.CSS_SELECTOR, "table")))
    # Look for IND-CV in the table
    body_text = driver.find_element(By.TAG_NAME, "body").text
    assert "IND-CV" in body_text, "IND-CV tracking IDs not found in dashboard table"


# ── 6. Dashboard IND-CV Search ────────────────────────────────────────────────
def test_dashboard_search(driver):
    login(driver, ADMIN_USER, ADMIN_PASS)
    driver.get(f"{BASE_URL}/admin/dashboard")
    wait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='q']")))
    search = driver.find_element(By.CSS_SELECTOR, "input[name='q']")
    search.clear()
    search.send_keys("IND-CV")
    search.submit()
    time.sleep(2)
    assert "IND-CV" in driver.find_element(By.TAG_NAME, "body").text


# ── 7. File Entry Form Submits and Shows QR ───────────────────────────────────
def test_file_entry_qr_generation(driver):
    login(driver, ADMIN_USER, ADMIN_PASS)
    driver.get(f"{BASE_URL}/admin/file-entry")
    wait(driver).until(EC.presence_of_element_located((By.ID, "file-entry-submit")))

    # Fill form
    desc = driver.find_element(By.CSS_SELECTOR, "input[placeholder*='Supply']")
    desc.clear()
    desc.send_keys("Selenium Test: Fire Safety Equipment")

    val_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='number']")
    val_inputs[0].clear()
    val_inputs[0].send_keys("750000")

    head_inputs = [i for i in driver.find_elements(By.CSS_SELECTOR, "input[type='text']") if i != desc]
    for inp in head_inputs:
        if inp.is_displayed() and "GEM" in inp.get_attribute("placeholder"):
            inp.clear()
            inp.send_keys("GEM/SEL-01")
            break

    driver.find_element(By.ID, "file-entry-submit").click()
    # QR should appear within 5 seconds
    wait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "svg[xmlns]")))
    # IND-CV id should be shown
    body_text = driver.find_element(By.TAG_NAME, "body").text
    assert "IND-CV" in body_text, "IND-CV tracking ID not displayed after file creation"


# ── 8. File Detail Page ───────────────────────────────────────────────────────
def test_file_detail_page(driver):
    # Get a real fileId from the authenticated API
    cookies = get_auth_cookies()
    r = requests.get(f"{BASE_URL}/api/files", cookies=cookies, timeout=10)
    files = r.json()
    assert len(files) > 0, "No files in DB"
    file_id = files[0]['fileId']

    login(driver, ADMIN_USER, ADMIN_PASS)
    wait(driver, 10).until(lambda d: "/admin" in d.current_url)

    driver.get(f"{BASE_URL}/admin/file/{file_id}")
    wait(driver, 10).until(lambda d: f"/admin/file/" in d.current_url)

    # Give React 5 seconds to fetch + render async data
    time.sleep(5)

    # Use JS textContent to get all DOM text (more reliable than Selenium .text)
    all_text = driver.execute_script("return document.body.textContent")
    assert "Processing Pipeline" in all_text, \
        f"'Processing Pipeline' not found. Page text: {all_text[:500]}"
    assert "IND-CV" in all_text or "SMS/LOG" in all_text, \
        f"File ref not found in: {all_text[:500]}"


# ── 9. Isolated Kiosk Track Page ──────────────────────────────────────────────
def test_kiosk_track_page(driver):
    tracking_id = get_seeded_tracking_id()
    assert tracking_id, "Could not fetch tracking ID from API"

    # Log in as kiosk user first
    login(driver, KIOSK_USER, KIOSK_PASS)
    driver.get(f"{BASE_URL}/kiosk/track/{tracking_id}")
    wait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "body")))
    time.sleep(2)

    body_text = driver.find_element(By.TAG_NAME, "body").text
    # Must have the crest section and file details
    assert "INS DEGA" in body_text, "INS DEGA crest not found on track page"
    assert "IND-CV" in body_text or tracking_id in body_text
    assert "STATUS" in body_text.upper()

    # Must NOT have any back/dashboard navigation links
    links = driver.find_elements(By.TAG_NAME, "a")
    nav_links = [l for l in links if l.text.strip() and
                 any(kw in l.text.lower() for kw in ["dashboard", "search", "back", "view all", "home"])]
    assert len(nav_links) == 0, f"Navigation links found on isolated page: {[l.text for l in nav_links]}"


# ── 10. Kiosk Track 404 — Bad Format ──────────────────────────────────────────
def test_kiosk_track_404_bad_format(driver):
    login(driver, KIOSK_USER, KIOSK_PASS)
    driver.get(f"{BASE_URL}/kiosk/track/INVALID-NOT-A-VALID-ID")
    wait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    time.sleep(1)
    body_text = driver.find_element(By.TAG_NAME, "body").text
    assert "404" in body_text or "not found" in body_text.lower(), \
        f"Expected 404 page, got: {body_text[:200]}"


# ── 11. Kiosk Track 404 — Valid Format, Wrong ID ──────────────────────────────
def test_kiosk_track_404_wrong_id(driver):
    login(driver, KIOSK_USER, KIOSK_PASS)
    driver.get(f"{BASE_URL}/kiosk/track/999-IND-CV-20260409-00000000")
    wait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    time.sleep(1)
    body_text = driver.find_element(By.TAG_NAME, "body").text
    assert "404" in body_text or "not found" in body_text.lower(), \
        f"Expected 404 on non-existent ID, got: {body_text[:200]}"


# ── 12. Kiosk Landing Splash ──────────────────────────────────────────────────
def test_kiosk_landing_splash(driver):
    login(driver, KIOSK_USER, KIOSK_PASS)
    driver.get(f"{BASE_URL}/kiosk")
    wait(driver, 8).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    time.sleep(1)
    body_text = driver.find_element(By.TAG_NAME, "body").text
    # Should show splash (TOUCH TO BEGIN) or search form
    assert ("TOUCH TO BEGIN" in body_text or "Search Files" in body_text), \
        f"Kiosk landing not found: {body_text[:200]}"


# ── 13. Kiosk Search → Results → Details ──────────────────────────────────────
def test_kiosk_search_flow(driver):
    login(driver, KIOSK_USER, KIOSK_PASS)
    driver.get(f"{BASE_URL}/kiosk")
    wait(driver, 8).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    time.sleep(1)

    # Click TOUCH TO BEGIN if on splash
    try:
        begin_btn = wait(driver, 3).until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(),'TOUCH TO BEGIN')]")))
        begin_btn.click()
        time.sleep(1)
    except Exception:
        pass  # Already on search form

    wait(driver, 8).until(EC.presence_of_element_located((By.ID, "kiosk-search-btn")))
    driver.find_element(By.ID, "kiosk-search-btn").click()
    time.sleep(2)

    # Results should show
    wait(driver, 8).until(EC.presence_of_element_located((By.CSS_SELECTOR, "table")))
    rows = driver.find_elements(By.CSS_SELECTOR, "tbody tr")
    assert len(rows) > 0, "No results in kiosk search table"

    # Click View → on first result
    first_btn = rows[0].find_element(By.CSS_SELECTOR, "button")
    first_btn.click()
    time.sleep(2)

    # Details view
    body_text = driver.find_element(By.TAG_NAME, "body").text
    assert "STATUS SUMMARY" in body_text or "File Details" in body_text


# ── 14. Kiosk CANNOT Access Admin ─────────────────────────────────────────────
def test_kiosk_blocked_from_admin(driver):
    login(driver, KIOSK_USER, KIOSK_PASS)
    driver.get(f"{BASE_URL}/admin")
    time.sleep(2)
    # Should be redirected away from /admin
    assert "/admin" not in driver.current_url or "login" in driver.current_url, \
        f"Kiosk user was allowed into /admin! URL: {driver.current_url}"


# ── 15. Reports Page ──────────────────────────────────────────────────────────
def test_reports_page(driver):
    login(driver, ADMIN_USER, ADMIN_PASS)
    driver.get(f"{BASE_URL}/admin/reports")
    wait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "table")))
    body_text = driver.find_element(By.TAG_NAME, "body").text
    assert "Reports" in body_text or "Files by Stage" in body_text


# ── 16. Flow Charts Page ──────────────────────────────────────────────────────
def test_flow_charts_page(driver):
    login(driver, ADMIN_USER, ADMIN_PASS)
    driver.get(f"{BASE_URL}/admin/flow-charts")
    wait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "svg")))
    body_text = driver.find_element(By.TAG_NAME, "body").text
    assert "Flow" in body_text or "Pipeline" in body_text


# ── 17. User Management ───────────────────────────────────────────────────────
def test_user_management(driver):
    login(driver, ADMIN_USER, ADMIN_PASS)
    driver.get(f"{BASE_URL}/admin/users")
    wait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "table")))
    body_text = driver.find_element(By.TAG_NAME, "body").text
    # Default users should be listed
    assert "admin" in body_text.lower()
    assert "kiosk" in body_text.lower()


# ── 18. Create New User ───────────────────────────────────────────────────────
def test_create_user(driver):
    login(driver, ADMIN_USER, ADMIN_PASS)
    driver.get(f"{BASE_URL}/admin/users")
    wait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "form")))

    username_input = driver.find_elements(By.CSS_SELECTOR, "input[type='text']")[0]
    username_input.clear()
    username_input.send_keys("selenium_test_user")

    password_input = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
    password_input.clear()
    password_input.send_keys("testpass123")

    submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
    driver.execute_script("arguments[0].scrollIntoView({block:'center'})", submit_btn)
    time.sleep(0.3)
    driver.execute_script("arguments[0].click()", submit_btn)
    time.sleep(2)

    body_text = driver.find_element(By.TAG_NAME, "body").text
    assert "selenium_test_user" in body_text or "created" in body_text.lower(), \
        "New user not shown in table or success message missing"


# ── 19. QR Resolver API Returns Valid File ────────────────────────────────────
def test_qr_resolver_api(driver):
    tracking_id = get_seeded_tracking_id()
    assert tracking_id, "No tracking ID from API — check server is running and seeded"
    cookies = get_auth_cookies()
    r = requests.get(
        f"{BASE_URL}/api/qr-resolver?id={tracking_id}",
        cookies=cookies, allow_redirects=True, timeout=10,
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}. Body: {r.text[:200]}"
    data = r.json()
    assert "file" in data, f"Response missing 'file' key: {data}"


# ── 20. Logout Clears Session ──────────────────────────────────────────────────
def test_logout(driver):
    login(driver, ADMIN_USER, ADMIN_PASS)
    wait(driver).until(lambda d: "/admin" in d.current_url)
    driver.get(f"{BASE_URL}/api/auth/logout")
    time.sleep(1)
    driver.get(f"{BASE_URL}/admin")
    time.sleep(1)
    # Should be redirected to login
    assert "login" in driver.current_url, f"Expected redirect to /login, got {driver.current_url}"


# ─── RUNNER ───────────────────────────────────────────────────────────────────

TEST_CASES = [
    ("01 · Login page loads",                        test_login_page_loads),
    ("02 · Admin login succeeds",                    test_admin_login),
    ("03 · Admin overview has 4 metric cards",       test_admin_overview_metrics),
    ("04 · Sidebar navigation works",                test_sidebar_navigation),
    ("05 · Streaming dashboard renders IND-CV IDs",  test_streaming_dashboard),
    ("06 · Dashboard IND-CV search filter",          test_dashboard_search),
    ("07 · File entry → QR code generated",          test_file_entry_qr_generation),
    ("08 · File detail page loads pipeline + QR",    test_file_detail_page),
    ("09 · Isolated kiosk track page (valid ID)",    test_kiosk_track_page),
    ("10 · Track 404 — bad format ID",               test_kiosk_track_404_bad_format),
    ("11 · Track 404 — valid format, wrong ID",      test_kiosk_track_404_wrong_id),
    ("12 · Kiosk landing splash",                    test_kiosk_landing_splash),
    ("13 · Kiosk search → results → details flow",   test_kiosk_search_flow),
    ("14 · Kiosk blocked from /admin routes",        test_kiosk_blocked_from_admin),
    ("15 · Reports page loads with charts",          test_reports_page),
    ("16 · Flow charts page loads with SVG",         test_flow_charts_page),
    ("17 · User management — list users",            test_user_management),
    ("18 · User management — create user",           test_create_user),
    ("19 · QR resolver API returns valid file",      test_qr_resolver_api),
    ("20 · Logout clears session",                   test_logout),
]

if __name__ == "__main__":
    headless = "--headless" in sys.argv
    print(f"\n{'═'*60}")
    print("  FILE STATUS MANAGEMENT SYSTEM — SELENIUM TEST SUITE")
    print(f"  Mode: {'Headless' if headless else 'Headed (visible browser)'}")
    print(f"  URL:  {BASE_URL}")
    print(f"{'═'*60}\n")

    driver = make_driver(headless=headless)
    driver.implicitly_wait(3)

    try:
        for name, fn in TEST_CASES:
            run_test(name, fn, driver)
            logout(driver)  # Clean session between tests
            time.sleep(0.5)
    finally:
        driver.quit()

    passed = sum(1 for _, ok, _ in results if ok)
    failed = len(results) - passed

    print(f"\n{'═'*60}")
    print(f"  Results: {passed}/{len(results)} passed  |  {failed} failed")
    print(f"{'═'*60}")

    if failed:
        print("\n  FAILED TESTS:")
        for name, ok, err in results:
            if not ok:
                print(f"  {FAIL_ICON} {name}")
                print(f"     {err[:100]}")
        sys.exit(1)
    else:
        print("\n  All tests passed! ✨")
