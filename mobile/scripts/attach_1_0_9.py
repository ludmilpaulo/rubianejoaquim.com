#!/usr/bin/env python3
"""Attach Zenda iOS build 41 to App Store version 1.0.9 without inventing listing copy.

Reads ASC credentials from env (never prints secrets):
  EXPO_ASC_API_KEY_PATH, EXPO_ASC_KEY_ID, EXPO_ASC_ISSUER_ID
or falls back to ~/.zenda-build/AuthKey_*.p8 + KEY_ID/ISSUER_ID env.
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import jwt

APP_ID = "6758412176"
TARGET_VERSION = "1.0.9"
TARGET_BUILD = "41"
PRIVACY_URL = "https://www.rubianejoaquim.com/privacy-policy"
DELETE_ACCOUNT_URL = "https://www.rubianejoaquim.com/delete-account"
BASE = "https://api.appstoreconnect.apple.com/v1"


def load_creds() -> tuple[str, str, str]:
    # Prefer env, then the same App Store Connect key already used by asc_api.py.
    key_path = os.environ.get("EXPO_ASC_API_KEY_PATH") or os.environ.get("ASC_API_KEY_PATH") or ""
    key_id = os.environ.get("EXPO_ASC_KEY_ID") or os.environ.get("ASC_KEY_ID") or ""
    issuer = os.environ.get("EXPO_ASC_ISSUER_ID") or os.environ.get("ASC_ISSUER_ID") or ""
    if not key_path:
        key_path = "/Users/ludmil/Downloads/AuthKey_67F47B76ZR.p8"
    if not key_id:
        key_id = "67F47B76ZR"
    if not issuer:
        issuer = "0cf240e3-a3d1-465d-bb95-734a26332c10"
    if not Path(key_path).is_file():
        print("ASC API key file is missing", file=sys.stderr)
        sys.exit(1)
    return key_path, key_id, issuer


def token() -> str:
    key_path, key_id, issuer = load_creds()
    private_key = Path(key_path).read_text()
    now = int(time.time())
    payload = {"iss": issuer, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"}
    return jwt.encode(payload, private_key, algorithm="ES256", headers={"kid": key_id, "typ": "JWT"})


def api(path: str, method: str = "GET", body: dict | None = None):
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
        print(err[:2000], file=sys.stderr)
        raise


def summary() -> dict:
    builds = api(f"/builds?filter[app]={APP_ID}&sort=-uploadedDate&limit=15")
    print("=== Recent builds ===")
    build_41 = None
    for b in builds.get("data", []):
        a = b["attributes"]
        ver = str(a.get("version") or "")
        state = a.get("processingState")
        print(f"  id={b['id']} build={ver} state={state}")
        if ver == TARGET_BUILD and build_41 is None:
            build_41 = {"id": b["id"], **a}

    versions = api(
        f"/apps/{APP_ID}/appStoreVersions?filter[platform]=IOS&limit=20"
    )
    print("\n=== App Store versions ===")
    version_109 = None
    editable = []
    for item in versions.get("data", []):
        a = item["attributes"]
        print(
            f"  id={item['id']} version={a.get('versionString')} "
            f"state={a.get('appStoreState')}"
        )
        if a.get("versionString") == TARGET_VERSION:
            version_109 = item
        if a.get("appStoreState") in (
            "PREPARE_FOR_SUBMISSION",
            "WAITING_FOR_REVIEW",
            "REJECTED",
            "DEVELOPER_REJECTED",
            "METADATA_REJECTED",
            "INVALID_BINARY",
        ):
            editable.append(item)

    print("\n=== Privacy URLs (confirm, do not invent copy) ===")
    print(f"  privacy={PRIVACY_URL}")
    print(f"  delete-account={DELETE_ACCOUNT_URL}")
    return {"build_41": build_41, "version_109": version_109, "editable": editable, "builds": builds}


def ensure_version() -> dict:
    data = summary()
    if data["version_109"]:
        print(f"\nVersion {TARGET_VERSION} already exists: {data['version_109']['id']}")
        return data["version_109"]

    created = api(
        "/appStoreVersions",
        method="POST",
        body={
            "data": {
                "type": "appStoreVersions",
                "attributes": {
                    "platform": "IOS",
                    "versionString": TARGET_VERSION,
                },
                "relationships": {"app": {"data": {"type": "apps", "id": APP_ID}}},
            }
        },
    )
    print(f"Created App Store version {TARGET_VERSION}: {created['data']['id']}")
    return created["data"]


def wait_for_build(timeout_s: int = 1200) -> dict:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        builds = api(f"/builds?filter[app]={APP_ID}&sort=-uploadedDate&limit=15")
        for b in builds.get("data", []):
            a = b["attributes"]
            if str(a.get("version") or "") != TARGET_BUILD:
                continue
            state = a.get("processingState")
            print(f"build {TARGET_BUILD} id={b['id']} state={state}")
            if state == "VALID":
                return {"id": b["id"], **a}
            if state in ("FAILED", "INVALID"):
                print(f"Build {TARGET_BUILD} failed processing: {state}", file=sys.stderr)
                sys.exit(1)
        time.sleep(30)
    print("Timed out waiting for build 41 to become VALID", file=sys.stderr)
    sys.exit(1)


def link_build(version_id: str, build_id: str) -> None:
    api(
        f"/appStoreVersions/{version_id}",
        method="PATCH",
        body={
            "data": {
                "type": "appStoreVersions",
                "id": version_id,
                "relationships": {"build": {"data": {"type": "builds", "id": build_id}}},
            }
        },
    )
    print(f"Linked build {build_id} to version {version_id}")


def find_version(version_string: str) -> dict | None:
    versions = api(f"/apps/{APP_ID}/appStoreVersions?filter[platform]=IOS&limit=20")
    for item in versions.get("data", []):
        if item["attributes"].get("versionString") == version_string:
            return item
    return None


def copy_listing_from_108(new_version_id: str) -> None:
    """Reuse 1.0.8 listing + review notes. Do not invent store copy."""
    source = find_version("1.0.8")
    if not source:
        print("Version 1.0.8 not found; skipping listing copy")
        return
    source_id = source["id"]

    src_locs = api(f"/appStoreVersions/{source_id}/appStoreVersionLocalizations")
    dst_locs = api(f"/appStoreVersions/{new_version_id}/appStoreVersionLocalizations")
    dst_by_locale = {
        loc["attributes"].get("locale"): loc for loc in dst_locs.get("data", [])
    }
    copy_fields = (
        "description",
        "keywords",
        "marketingUrl",
        "promotionalText",
        "supportUrl",
        "whatsNew",
    )
    for src in src_locs.get("data", []):
        locale = src["attributes"].get("locale")
        dst = dst_by_locale.get(locale)
        if not dst:
            print(f"No destination localization for {locale}")
            continue
        attrs = {k: src["attributes"].get(k) for k in copy_fields if src["attributes"].get(k)}
        if not attrs:
            continue
        api(
            f"/appStoreVersionLocalizations/{dst['id']}",
            method="PATCH",
            body={
                "data": {
                    "type": "appStoreVersionLocalizations",
                    "id": dst["id"],
                    "attributes": attrs,
                }
            },
        )
        print(f"Copied 1.0.8 listing fields to {locale} ({','.join(attrs)})")

    try:
        src_detail = api(f"/appStoreVersions/{source_id}/appStoreReviewDetail")
        src_attrs = src_detail["data"]["attributes"]
        keep = {
            k: src_attrs.get(k)
            for k in (
                "contactEmail",
                "contactFirstName",
                "contactLastName",
                "contactPhone",
                "demoAccountName",
                "demoAccountPassword",
                "demoAccountRequired",
                "notes",
            )
            if src_attrs.get(k) is not None
        }
        dst_detail = api(f"/appStoreVersions/{new_version_id}/appStoreReviewDetail")
        dst_id = dst_detail["data"]["id"]
        api(
            f"/appStoreReviewDetails/{dst_id}",
            method="PATCH",
            body={
                "data": {
                    "type": "appStoreReviewDetails",
                    "id": dst_id,
                    "attributes": keep,
                }
            },
        )
        print(f"Copied 1.0.8 review details (notes_len={len(keep.get('notes') or '')})")
    except urllib.error.HTTPError as e:
        print(f"Review detail copy skipped: {e.code}")

    try:
        src_phased = api(f"/appStoreVersions/{source_id}")
        release_type = src_phased["data"]["attributes"].get("releaseType")
        if release_type:
            api(
                f"/appStoreVersions/{new_version_id}",
                method="PATCH",
                body={
                    "data": {
                        "type": "appStoreVersions",
                        "id": new_version_id,
                        "attributes": {"releaseType": release_type},
                    }
                },
            )
            print(f"Copied releaseType={release_type}")
    except urllib.error.HTTPError as e:
        print(f"releaseType copy skipped: {e.code}")


def disable_game_center(version_id: str) -> None:
    try:
        detail = api(f"/appStoreVersions/{version_id}/gameCenterAppVersion")
        data = detail.get("data") if isinstance(detail, dict) else None
        if not data:
            print("Game Center not configured on this version")
            return
        gcid = data["id"]
        api(
            f"/gameCenterAppVersions/{gcid}",
            method="PATCH",
            body={
                "data": {
                    "type": "gameCenterAppVersions",
                    "id": gcid,
                    "attributes": {"enabled": False},
                }
            },
        )
        print("Disabled Game Center")
    except urllib.error.HTTPError as e:
        print(f"Game Center skip: {e.code}")


def confirm_review_and_privacy(version_id: str) -> None:
    try:
        detail = api(f"/appStoreVersions/{version_id}/appStoreReviewDetail")
        d = detail.get("data", {})
        attrs = d.get("attributes") or {}
        print("=== Review detail (existing, not rewritten) ===")
        for k in (
            "contactEmail",
            "contactFirstName",
            "demoAccountName",
            "demoAccountRequired",
        ):
            if attrs.get(k) is not None:
                print(f"  {k}={attrs.get(k)}")
        notes = attrs.get("notes") or ""
        print(f"  notes_len={len(notes)}")
    except urllib.error.HTTPError as e:
        print(f"Review detail skipped: {e.code}")

    try:
        app_info = api(f"/apps/{APP_ID}/appInfos?include=appInfoLocalizations")
        for included in app_info.get("included") or []:
            if included["type"] != "appInfoLocalizations":
                continue
            loc = included["attributes"].get("locale")
            url = included["attributes"].get("privacyPolicyUrl")
            print(f"  privacyPolicyUrl ({loc})={url}")
    except urllib.error.HTTPError as e:
        print(f"App info skipped: {e.code}")


def attach() -> None:
    version = ensure_version()
    version_id = version["id"]
    state = (version.get("attributes") or {}).get("appStoreState")
    print(f"Version state={state}")
    copy_listing_from_108(version_id)
    disable_game_center(version_id)
    build = wait_for_build()
    try:
        link_build(version_id, build["id"])
    except urllib.error.HTTPError as e:
        if e.code not in (409, 422):
            raise
        print("Build link skipped (already linked or version not editable)")
    confirm_review_and_privacy(version_id)
    print("Done. Confirm in App Store Connect; do not raise APP_MINIMUM_VERSION.")


def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "summary"
    if cmd == "summary":
        summary()
    elif cmd == "attach":
        attach()
    elif cmd == "copy-listing":
        version = find_version(TARGET_VERSION)
        if not version:
            print("Version 1.0.9 not found", file=sys.stderr)
            sys.exit(1)
        copy_listing_from_108(version["id"])
        disable_game_center(version["id"])
        confirm_review_and_privacy(version["id"])
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()
