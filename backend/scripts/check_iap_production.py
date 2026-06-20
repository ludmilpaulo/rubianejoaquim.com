#!/usr/bin/env python3
"""Verify production IAP endpoint accepts StoreKit 2 JWS (no shared secret required)."""
import base64
import json
import sys
import urllib.request

API = "https://ludmilpaulo.pythonanywhere.com/api"


def register_user(username: str):
    body = json.dumps(
        {
            "username": username,
            "email": f"{username}@example.com",
            "password": "TestIap123!",
            "password_confirm": "TestIap123!",
            "first_name": "IAP",
            "last_name": "Check",
        }
    ).encode()
    req = urllib.request.Request(
        f"{API}/auth/register/",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())["token"]


def verify_jws(token: str):
    payload = {
        "productId": "zenda_monthly",
        "bundleId": "com.rubianejoaquim.zenda",
        "environment": "Sandbox",
        "transactionId": "sandbox-test-1",
    }
    p = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    jws = f"eyJhbGciOiJIUzI1NiJ9.{p}.sig"
    body = json.dumps(
        {
            "receipt_data": jws,
            "product_id": "zenda_monthly",
            "transaction_id": "sandbox-test-1",
        }
    ).encode()
    req = urllib.request.Request(
        f"{API}/subscriptions/iap/verify-apple/",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Token {token}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status, json.loads(resp.read())


def main():
    username = f"iapcheck{int(__import__('time').time())}"
    token = register_user(username)
    try:
        status, data = verify_jws(token)
        print(f"OK status={status} response={data}")
        return 0
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"FAIL HTTP {e.code}: {err}", file=sys.stderr)
        if "Server configuration error" in err:
            print(
                "\nAction required on PythonAnywhere:\n"
                "1. git pull in /home/ludmilpaulo/rubianejoaquim.com\n"
                "2. Reload web app\n"
                "3. Optional: set APPLE_SHARED_SECRET in backend/.env for legacy receipts\n",
                file=sys.stderr,
            )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
