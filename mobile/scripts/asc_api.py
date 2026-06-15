#!/usr/bin/env python3
"""App Store Connect API helper for Zenda IAP submission."""
import json
import os
import sys
import time
import urllib.request
import urllib.error
from typing import Optional

import jwt

KEY_ID = "67F47B76ZR"
ISSUER_ID = "0cf240e3-a3d1-465d-bb95-734a26332c10"
KEY_PATH = "/Users/ludmil/Downloads/AuthKey_67F47B76ZR.p8"
APP_ID = "6758412176"
BUILD_21_ID = "b473a36d-b9f4-4b8b-9073-4a90947a221e"
SCREENSHOT = "/Users/ludmil/Desktop/Apps/rubianejoaquim.com/mobile/assets/iap-review-screenshot.png"
BASE = "https://api.appstoreconnect.apple.com/v1"


def token() -> str:
    with open(KEY_PATH, "r", encoding="utf-8") as f:
        private_key = f.read()
    now = int(time.time())
    payload = {"iss": ISSUER_ID, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"}
    return jwt.encode(payload, private_key, algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"})


def api(path: str, method: str = "GET", body: Optional[dict] = None):
    headers = {"Authorization": f"Bearer {token()}", "Content-Type": "application/json"}
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"HTTP {e.code} {method} {path}", file=sys.stderr)
        print(err, file=sys.stderr)
        raise


def upload_review_screenshot(screenshot_type: str, rel_key: str, rel_type: str, resource_id: str, file_path: str):
    size = os.path.getsize(file_path)
    name = os.path.basename(file_path)
    created = api(
        f"/{screenshot_type}",
        method="POST",
        body={
            "data": {
                "type": screenshot_type,
                "attributes": {"fileName": name, "fileSize": size},
                "relationships": {
                    rel_key: {"data": {"type": rel_type, "id": resource_id}}
                },
            }
        },
    )
    screenshot_id = created["data"]["id"]
    ops = created["data"]["attributes"].get("uploadOperations") or []
    if not ops:
        print(f"No upload operations for {resource_id}")
        return screenshot_id

    with open(file_path, "rb") as f:
        data = f.read()

    for op in ops:
        headers = {}
        for h in op.get("requestHeaders") or []:
            headers[h["name"]] = h["value"]
        req = urllib.request.Request(op["url"], data=data, headers=headers, method=op.get("method", "PUT"))
        with urllib.request.urlopen(req, timeout=120):
            pass

    api(
        f"/{screenshot_type}/{screenshot_id}",
        method="PATCH",
        body={
            "data": {
                "type": screenshot_type,
                "id": screenshot_id,
                "attributes": {"uploaded": True},
            }
        },
    )
    print(f"Uploaded review screenshot for {resource_id}")
    return screenshot_id


def get_version_13_id() -> Optional[str]:
    app = api(f"/apps/{APP_ID}?include=appStoreVersions")
    for item in app.get("included") or []:
        if item["type"] != "appStoreVersions":
            continue
        attrs = item["attributes"]
        if attrs.get("versionString") == "1.3":
            return item["id"]
    return None


def link_build(version_id: str, build_id: str):
    api(
        f"/appStoreVersions/{version_id}",
        method="PATCH",
        body={
            "data": {
                "type": "appStoreVersions",
                "id": version_id,
                "relationships": {
                    "build": {"data": {"type": "builds", "id": build_id}}
                },
            }
        },
    )
    print(f"Linked build {build_id} to version {version_id}")


def upload_all_screenshots():
    if not os.path.exists(SCREENSHOT):
        print(f"Screenshot missing: {SCREENSHOT}", file=sys.stderr)
        return

    iaps = api(f"/apps/{APP_ID}/inAppPurchasesV2?limit=10")
    for i in iaps.get("data", []):
        if i["attributes"].get("productId") != "course_3":
            continue
        try:
            upload_review_screenshot(
                "inAppPurchaseAppStoreReviewScreenshots",
                "inAppPurchaseV2",
                "inAppPurchases",
                i["id"],
                SCREENSHOT,
            )
        except urllib.error.HTTPError as e:
            print(f"course_3 screenshot failed: {e.code}")

    subs = api(f"/apps/{APP_ID}/subscriptionGroups?include=subscriptions")
    for s in subs.get("included") or []:
        if s["type"] != "subscriptions":
            continue
        if s["attributes"].get("productId") != "zenda_monthly":
            continue
        try:
            upload_review_screenshot(
                "subscriptionAppStoreReviewScreenshots",
                "subscription",
                "subscriptions",
                s["id"],
                SCREENSHOT,
            )
        except urllib.error.HTTPError as e:
            print(f"zenda_monthly screenshot failed: {e.code}")


def summary():
    builds = api(f"/builds?filter[app]={APP_ID}&sort=-uploadedDate&limit=5")
    print("=== Recent builds ===")
    for b in builds.get("data", []):
        a = b["attributes"]
        print(f"  id={b['id']} build={a.get('version')} state={a.get('processingState')}")

    app = api(f"/apps/{APP_ID}?include=appStoreVersions")
    print("\n=== App Store versions ===")
    for item in app.get("included") or []:
        if item["type"] == "appStoreVersions":
            a = item["attributes"]
            print(f"  id={item['id']} version={a.get('versionString')} state={a.get('appStoreState')}")

    iaps = api(f"/apps/{APP_ID}/inAppPurchasesV2?limit=10")
    print("\n=== In-App Purchases ===")
    for i in iaps.get("data", []):
        a = i["attributes"]
        print(f"  id={i['id']} {a.get('productId')} state={a.get('state')}")

    subs = api(f"/apps/{APP_ID}/subscriptionGroups?include=subscriptions")
    print("\n=== Subscriptions ===")
    for s in subs.get("included") or []:
        if s["type"] == "subscriptions":
            a = s["attributes"]
            print(f"  id={s['id']} {a.get('productId')} state={a.get('state')}")


def fix_iap_metadata():
    """Fix common MISSING_METADATA causes for Zenda IAP products."""
    # Subscription group localization (required for zenda_monthly)
    groups = api(f"/apps/{APP_ID}/subscriptionGroups?include=subscriptionGroupLocalizations")
    for g in groups.get("data", []):
        locs = g.get("relationships", {}).get("subscriptionGroupLocalizations", {}).get("data", [])
        if locs:
            print(f"Subscription group {g['id']} already localized")
            continue
        try:
            api(
                "/subscriptionGroupLocalizations",
                method="POST",
                body={
                    "data": {
                        "type": "subscriptionGroupLocalizations",
                        "attributes": {"name": "Zenda Premium", "locale": "en-US"},
                        "relationships": {
                            "subscriptionGroup": {"data": {"type": "subscriptionGroups", "id": g["id"]}}
                        },
                    }
                },
            )
            print(f"Created subscription group localization for {g['id']}")
        except urllib.error.HTTPError as e:
            print(f"Group localization failed: {e.code}")

    # course_3 availability (404 until set)
    try:
        api_v2("GET", "/inAppPurchases/6780076068/inAppPurchaseAvailability")
        print("course_3 availability already set")
    except urllib.error.HTTPError as e:
        if e.code != 404:
            raise
        api(
            "/inAppPurchaseAvailabilities",
            method="POST",
            body={
                "data": {
                    "type": "inAppPurchaseAvailabilities",
                    "attributes": {"availableInNewTerritories": True},
                    "relationships": {
                        "inAppPurchase": {"data": {"type": "inAppPurchases", "id": "6780076068"}},
                        "availableTerritories": {"data": [{"type": "territories", "id": "USA"}]},
                    },
                }
            },
        )
        print("Created course_3 availability")


def api_v2(method: str, path: str, body: Optional[dict] = None):
    base = "https://api.appstoreconnect.apple.com/v2"
    headers = {"Authorization": f"Bearer {token()}", "Content-Type": "application/json"}
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{base}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read().decode()
        return json.loads(raw) if raw else {}


def update_review_notes():
    notes = (
        "How to locate In-App Purchases in Zenda Gestão (sandbox testing):\n\n"
        "1. Install the app and sign in with demo account (test / password in review details) or create a new account.\n"
        '2. On the access screen, tap "Subscribe with Apple" / "Subscrever com Apple" for product zenda_monthly.\n'
        '3. Or tap "Browse courses & enroll", open catalog, tap "Buy with Apple" on paid course (product course_3).\n'
        "4. Use Sandbox Apple ID in Settings > App Store > Sandbox Account.\n\n"
        "Products: zenda_monthly (subscription), course_3 (consumable)."
    )
    app = api(f"/apps/{APP_ID}?include=appStoreVersions")
    version_id = None
    for item in app.get("included") or []:
        if item["type"] == "appStoreVersions" and item["attributes"].get("versionString") == "1.3":
            version_id = item["id"]
            break
    if not version_id:
        print("Version 1.3 not found")
        return
    detail = api(f"/appStoreVersions/{version_id}/appStoreReviewDetail")
    detail_id = detail["data"]["id"]
    api(
        f"/appStoreReviewDetails/{detail_id}",
        method="PATCH",
        body={"data": {"type": "appStoreReviewDetails", "id": detail_id, "attributes": {"notes": notes}}},
    )
    print("Updated App Review notes")


def disable_game_center(version_id: str):
    detail = api(f"/appStoreVersions/{version_id}/gameCenterAppVersion")
    gcid = detail["data"]["id"]
    api(
        f"/gameCenterAppVersions/{gcid}",
        method="PATCH",
        body={"data": {"type": "gameCenterAppVersions", "id": gcid, "attributes": {"enabled": False}}},
    )
    print(f"Disabled Game Center for version {version_id}")


def submit_for_review(version_id: str):
    """Create review submission with app version (IAPs must already be attached on version page)."""
    created = api(
        "/reviewSubmissions",
        method="POST",
        body={
            "data": {
                "type": "reviewSubmissions",
                "attributes": {"platform": "IOS"},
                "relationships": {"app": {"data": {"type": "apps", "id": APP_ID}}},
            }
        },
    )
    sub_id = created["data"]["id"]
    disable_game_center(version_id)
    api(
        "/reviewSubmissionItems",
        method="POST",
        body={
            "data": {
                "type": "reviewSubmissionItems",
                "relationships": {
                    "reviewSubmission": {"data": {"type": "reviewSubmissions", "id": sub_id}},
                    "appStoreVersion": {"data": {"type": "appStoreVersions", "id": version_id}},
                },
            }
        },
    )
    api(
        f"/reviewSubmissions/{sub_id}",
        method="PATCH",
        body={"data": {"type": "reviewSubmissions", "id": sub_id, "attributes": {"submitted": True}}},
    )
    print(f"Submitted review submission {sub_id}")


def prepare():
    version_id = get_version_13_id()
    if not version_id:
        print("Version 1.3 not found", file=sys.stderr)
        sys.exit(1)
    fix_iap_metadata()
    try:
        link_build(version_id, BUILD_21_ID)
    except urllib.error.HTTPError as e:
        if e.code not in (409, 422):
            raise
        print("Build link skipped (may already be linked)")
    upload_all_screenshots()
    update_review_notes()
    disable_game_center(version_id)


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "summary"
    if cmd == "summary":
        summary()
    elif cmd == "prepare":
        prepare()
    elif cmd == "link-build":
        version_id = get_version_13_id()
        if version_id:
            link_build(version_id, BUILD_21_ID)
    elif cmd == "upload-screenshots":
        upload_all_screenshots()
    elif cmd == "fix-iap-metadata":
        fix_iap_metadata()
    elif cmd == "update-review-notes":
        update_review_notes()
    elif cmd == "submit-review":
        version_id = get_version_13_id()
        if not version_id:
            print("Version 1.3 not found", file=sys.stderr)
            sys.exit(1)
        submit_for_review(version_id)
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()
